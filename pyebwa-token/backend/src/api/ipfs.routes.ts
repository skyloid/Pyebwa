import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';
import multer from 'multer';
import { enhancedIPFSService } from '../services/ipfs-enhanced.service';
import { logger } from '../utils/logger';
import { authenticateToken } from '../middleware/auth.middleware';
import { rateLimiter } from '../middleware/rate-limit.middleware';

const router = Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
    files: 10, // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Check file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'video/mp4',
      'video/quicktime',
      'audio/mpeg',
      'audio/wav',
      'application/pdf',
      'application/json',
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

/**
 * Upload single file
 */
router.post('/upload',
  authenticateToken,
  rateLimiter({ windowMs: 60000, max: 10 }), // 10 uploads per minute
  upload.single('file'),
  [
    body('encrypt').optional().isBoolean(),
    body('metadata').optional().isJSON(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const { encrypt = true, metadata } = req.body;
      const parsedMetadata = metadata ? JSON.parse(metadata) : {};

      // Track upload progress
      let lastProgress = 0;
      const result = await enhancedIPFSService.uploadFile(
        req.file.buffer,
        req.file.originalname,
        {
          encrypt: encrypt === 'true' || encrypt === true,
          metadata: {
            ...parsedMetadata,
            userId: (req as any).user.id,
            uploadedAt: new Date().toISOString(),
          },
          onProgress: (progress) => {
            // Send progress updates via SSE if significant change
            if (progress - lastProgress >= 10) {
              lastProgress = progress;
              // Could implement SSE here
            }
          },
        }
      );

      res.json({
        success: true,
        hash: result.hash,
        size: result.size,
        url: result.url,
        provider: result.provider,
        backups: result.backups,
        uploadTime: result.uploadTime,
      });
    } catch (error: any) {
      logger.error('File upload error:', error);
      res.status(500).json({ error: error.message || 'Upload failed' });
    }
  }
);

/**
 * Upload multiple files
 */
router.post('/upload-multiple',
  authenticateToken,
  rateLimiter({ windowMs: 60000, max: 5 }), // 5 batch uploads per minute
  upload.array('files', 10),
  async (req: Request, res: Response) => {
    try {
      if (!req.files || !Array.isArray(req.files)) {
        return res.status(400).json({ error: 'No files provided' });
      }

      const uploadPromises = req.files.map(file =>
        enhancedIPFSService.uploadFile(
          file.buffer,
          file.originalname,
          {
            encrypt: req.body.encrypt !== 'false',
            metadata: {
              userId: (req as any).user.id,
              batch: true,
            },
          }
        )
      );

      const results = await Promise.allSettled(uploadPromises);

      const successful = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map(r => r.value);

      const failed = results
        .map((r, i) => ({ result: r, index: i }))
        .filter(({ result }) => result.status === 'rejected')
        .map(({ result, index }) => ({
          filename: (req.files as Express.Multer.File[])[index].originalname,
          error: (result as PromiseRejectedResult).reason?.message || 'Unknown error',
        }));

      res.json({
        success: true,
        uploaded: successful,
        failed,
        summary: {
          total: req.files.length,
          successful: successful.length,
          failed: failed.length,
        },
      });
    } catch (error: any) {
      logger.error('Batch upload error:', error);
      res.status(500).json({ error: error.message || 'Batch upload failed' });
    }
  }
);

/**
 * Upload JSON data
 */
router.post('/upload-json',
  authenticateToken,
  rateLimiter({ windowMs: 60000, max: 20 }),
  [
    body('data').isObject(),
    body('filename').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { data, filename } = req.body;

      const result = await enhancedIPFSService.uploadJSON(
        {
          ...data,
          _metadata: {
            userId: (req as any).user.id,
            uploadedAt: new Date().toISOString(),
          },
        },
        filename
      );

      res.json({
        success: true,
        hash: result.hash,
        size: result.size,
        url: result.url,
      });
    } catch (error: any) {
      logger.error('JSON upload error:', error);
      res.status(500).json({ error: error.message || 'JSON upload failed' });
    }
  }
);

/**
 * Retrieve file
 */
router.get('/retrieve/:hash',
  authenticateToken,
  rateLimiter({ windowMs: 60000, max: 100 }),
  async (req: Request, res: Response) => {
    try {
      const { hash } = req.params;
      const decrypt = req.query.decrypt === 'true';

      const content = await enhancedIPFSService.getFile(hash, decrypt);

      // Set appropriate content type
      const contentType = req.query.contentType as string || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', content.length);
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year cache

      res.send(content);
    } catch (error: any) {
      logger.error('File retrieval error:', error);
      res.status(404).json({ error: 'File not found' });
    }
  }
);

/**
 * Get gateway URL for hash
 */
router.get('/gateway-url/:hash',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { hash } = req.params;
      const url = await enhancedIPFSService.getGatewayUrl(hash);

      res.json({
        success: true,
        url,
        hash,
      });
    } catch (error: any) {
      logger.error('Gateway URL error:', error);
      res.status(500).json({ error: 'Failed to get gateway URL' });
    }
  }
);

/**
 * Search indexed content
 */
router.get('/search',
  authenticateToken,
  [
    query('filename').optional().isString(),
    query('type').optional().isString(),
    query('dateFrom').optional().isISO8601(),
    query('dateTo').optional().isISO8601(),
    query('limit').optional().isInt({ min: 1, max: 100 }),
    query('offset').optional().isInt({ min: 0 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const results = await enhancedIPFSService.searchContent({
        filename: req.query.filename as string,
        type: req.query.type as string,
        dateFrom: req.query.dateFrom ? new Date(req.query.dateFrom as string) : undefined,
        dateTo: req.query.dateTo ? new Date(req.query.dateTo as string) : undefined,
        limit: parseInt(req.query.limit as string) || 20,
        offset: parseInt(req.query.offset as string) || 0,
      });

      res.json({
        success: true,
        results,
        count: results.length,
      });
    } catch (error: any) {
      logger.error('Search error:', error);
      res.status(500).json({ error: 'Search failed' });
    }
  }
);

/**
 * Get storage analytics
 */
router.get('/analytics',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const analytics = await enhancedIPFSService.getStorageAnalytics();

      res.json({
        success: true,
        analytics,
        timestamp: new Date().toISOString(),
      });
    } catch (error: any) {
      logger.error('Analytics error:', error);
      res.status(500).json({ error: 'Failed to get analytics' });
    }
  }
);

/**
 * Admin: Run garbage collection
 */
router.post('/admin/garbage-collection',
  authenticateToken,
  // Add admin check middleware
  [
    body('retentionDays').optional().isInt({ min: 30 }),
  ],
  async (req: Request, res: Response) => {
    try {
      const { retentionDays = 365 } = req.body;

      const result = await enhancedIPFSService.runGarbageCollection(retentionDays);

      res.json({
        success: true,
        ...result,
        message: `Garbage collection completed: ${result.unpinnedCount} files unpinned`,
      });
    } catch (error: any) {
      logger.error('Garbage collection error:', error);
      res.status(500).json({ error: 'Garbage collection failed' });
    }
  }
);

/**
 * Check upload session status (for chunked uploads)
 */
router.get('/upload-session/:sessionId',
  authenticateToken,
  async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      
      // Get session from service (would need to add this method)
      const session = await enhancedIPFSService.getUploadSession(sessionId);

      if (!session) {
        return res.status(404).json({ error: 'Session not found' });
      }

      res.json({
        success: true,
        session: {
          id: session.id,
          status: session.status,
          progress: (session.uploadedChunks / session.totalChunks) * 100,
          totalChunks: session.totalChunks,
          uploadedChunks: session.uploadedChunks,
          startTime: session.startTime,
        },
      });
    } catch (error: any) {
      logger.error('Session status error:', error);
      res.status(500).json({ error: 'Failed to get session status' });
    }
  }
);

export const ipfsRouter = router;