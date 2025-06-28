import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { authenticateToken } from '../middleware/auth.middleware';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

/**
 * Get user info by public key
 */
router.get('/info/:publicKey', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { publicKey } = req.params;
    
    const query = `
      SELECT 
        u.id,
        u.public_key,
        u.user_type,
        u.email,
        COALESCE(u.first_name, pp.first_name, fp.family_name) as first_name,
        COALESCE(u.last_name, pp.last_name) as last_name,
        u.created_at,
        u.last_login
      FROM users u
      LEFT JOIN planter_profiles pp ON u.id = pp.user_id
      LEFT JOIN family_profiles fp ON u.id = fp.user_id
      WHERE u.public_key = $1
    `;
    
    const result = await pool.query(query, [publicKey]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      success: true,
      user: {
        id: user.id,
        publicKey: user.public_key,
        userType: user.user_type,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at,
        lastLogin: user.last_login,
      },
    });
  } catch (error: any) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

/**
 * Get current user info (based on JWT token)
 */
router.get('/me', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    
    const query = `
      SELECT 
        u.id,
        u.public_key,
        u.user_type,
        u.email,
        COALESCE(u.first_name, pp.first_name, fp.family_name) as first_name,
        COALESCE(u.last_name, pp.last_name) as last_name,
        u.created_at,
        u.last_login
      FROM users u
      LEFT JOIN planter_profiles pp ON u.id = pp.user_id
      LEFT JOIN family_profiles fp ON u.id = fp.user_id
      WHERE u.id = $1
    `;
    
    const result = await pool.query(query, [userId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    res.json({
      success: true,
      user: {
        id: user.id,
        publicKey: user.public_key,
        userType: user.user_type,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        createdAt: user.created_at,
        lastLogin: user.last_login,
      },
    });
  } catch (error: any) {
    console.error('Error fetching current user info:', error);
    res.status(500).json({ error: 'Failed to fetch user info' });
  }
});

export const userRouter = router;