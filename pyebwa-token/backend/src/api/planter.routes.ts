import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { verificationService } from '../services/verification.service';
import { ipfsService } from '../services/ipfs.service';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/error.middleware';
import multer from 'multer';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

interface AuthRequest extends Request {
  user?: {
    id: string;
    type: string;
    publicKey: string;
  };
}

/**
 * Register as a planter
 */
router.post('/register', [
  body('firstName').notEmpty().trim(),
  body('lastName').notEmpty().trim(),
  body('phone').isMobilePhone('any'),
  body('location.latitude').isFloat({ min: 18, max: 20.1 }),
  body('location.longitude').isFloat({ min: -74.5, max: -71.6 }),
  body('community').optional().trim(),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // TODO: Implement planter registration
    // - Create planter profile in database
    // - Send verification SMS
    // - Create blockchain account

    res.json({
      success: true,
      message: 'Planter registration initiated',
      planterId: req.user?.id,
    });
  } catch (error) {
    logger.error('Planter registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * Submit planting evidence
 */
router.post('/submit', [
  body('sessionId').notEmpty(),
  body('photos').isArray({ min: 1 }),
  body('totalTrees').isInt({ min: 1, max: 1000 }),
  body('species').isArray({ min: 1 }),
  body('location').isObject(),
], async (req: AuthRequest, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sessionId, photos, totalTrees, species, location } = req.body;

    // Validate planter is verified
    // TODO: Check planter verification status

    // Create evidence bundle
    const evidenceData = {
      planterId: req.user?.id,
      sessionId,
      photos,
      totalTrees,
      species,
      location,
      submittedAt: new Date().toISOString(),
    };

    // Upload evidence to IPFS
    const ipfsResult = await ipfsService.uploadJSON(evidenceData);

    // TODO: Submit to blockchain
    // - Call submit_planting instruction
    // - Store submission in database

    res.json({
      success: true,
      submissionId: `sub_${Date.now()}`,
      ipfsHash: ipfsResult.hash,
      message: 'Evidence submitted for verification',
    });
  } catch (error) {
    logger.error('Submission error:', error);
    res.status(500).json({ error: 'Submission failed' });
  }
});

/**
 * Upload photo for planting evidence
 */
router.post('/upload-photo', upload.single('photo'), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo provided' });
    }

    const metadata = {
      planterId: req.user?.id,
      timestamp: req.body.timestamp,
      location: JSON.parse(req.body.location || '{}'),
      species: req.body.species,
      treeCount: parseInt(req.body.treeCount || '1'),
    };

    // Upload to IPFS
    const ipfsResult = await ipfsService.uploadFile(
      req.file.buffer,
      metadata,
      false // Don't encrypt planting photos
    );

    res.json({
      success: true,
      ipfsHash: ipfsResult.hash,
      url: ipfsResult.url,
    });
  } catch (error) {
    logger.error('Photo upload error:', error);
    res.status(500).json({ error: 'Upload failed' });
  }
});

/**
 * Get planter earnings
 */
router.get('/earnings', async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Implement earnings calculation
    // - Fetch from blockchain
    // - Calculate pending payments
    // - Get payment history

    const mockEarnings = {
      totalEarnings: 15000, // tokens
      pendingPayments: 2000,
      paidOut: 13000,
      treesPlanted: 150,
      treesVerified: 140,
      conversionRate: 0.0001, // USD per token
      earnings: {
        total: '$1.50',
        pending: '$0.20',
        paid: '$1.30',
      },
    };

    res.json(mockEarnings);
  } catch (error) {
    logger.error('Earnings fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch earnings' });
  }
});

/**
 * Get planting history
 */
router.get('/history', async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = parseInt(req.query.offset as string) || 0;

    // TODO: Fetch from database
    const mockHistory = [
      {
        id: 'sub_1',
        date: '2024-01-15',
        trees: 10,
        species: ['mango', 'moringa'],
        status: 'verified',
        payment: 2000,
        location: { latitude: 18.5944, longitude: -72.3074 },
      },
    ];

    res.json({
      history: mockHistory,
      total: 1,
      limit,
      offset,
    });
  } catch (error) {
    logger.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

/**
 * Get pending submissions
 */
router.get('/pending', async (req: AuthRequest, res: Response) => {
  try {
    // TODO: Fetch pending submissions from database
    
    res.json({
      pending: [],
      total: 0,
    });
  } catch (error) {
    logger.error('Pending fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch pending submissions' });
  }
});

export const planterRouter = router;