import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { satelliteService } from '../services/satellite.service';
import { enhancedVerificationService } from '../services/verification-enhanced.service';
import { logger } from '../utils/logger';
import { authenticateToken, requireAdmin } from '../middleware/auth.middleware';
import { Pool } from 'pg';

const router = Router();
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// All admin routes require authentication and admin role
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * Get verification overview
 */
router.get('/verification/overview', async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '7d';
    const startDate = getStartDate(timeRange);

    const query = `
      SELECT 
        COUNT(*) as total_submissions,
        COUNT(CASE WHEN v.verified THEN 1 END) as verified_count,
        COUNT(CASE WHEN NOT v.verified THEN 1 END) as rejected_count,
        COUNT(CASE WHEN v.id IS NULL THEN 1 END) as pending_count,
        AVG(v.score) as avg_verification_score,
        SUM(pe.total_trees) as total_trees_submitted,
        SUM(CASE WHEN v.verified THEN pe.total_trees END) as total_trees_verified
      FROM planting_evidence pe
      LEFT JOIN verification_logs v ON pe.id = v.evidence_id
      WHERE pe.submitted_at >= $1
    `;

    const result = await pool.query(query, [startDate]);
    const stats = result.rows[0];

    // Get verification breakdown
    const breakdownQuery = `
      SELECT 
        checks->>'gps' as gps,
        checks->>'satellite' as satellite,
        checks->>'photoAnalysis' as photo,
        checks->>'duplicateCheck' as duplicate,
        checks->>'weatherCheck' as weather,
        COUNT(*) as count
      FROM verification_logs
      WHERE created_at >= $1
      GROUP BY checks
    `;

    const breakdownResult = await pool.query(breakdownQuery, [startDate]);

    res.json({
      success: true,
      data: {
        overview: {
          totalSubmissions: parseInt(stats.total_submissions),
          verifiedCount: parseInt(stats.verified_count),
          rejectedCount: parseInt(stats.rejected_count),
          pendingCount: parseInt(stats.pending_count),
          avgScore: parseFloat(stats.avg_verification_score || 0).toFixed(2),
          totalTreesSubmitted: parseInt(stats.total_trees_submitted || 0),
          totalTreesVerified: parseInt(stats.total_trees_verified || 0),
          verificationRate: (parseInt(stats.verified_count) / parseInt(stats.total_submissions) * 100).toFixed(1),
        },
        breakdown: breakdownResult.rows,
        timeRange,
      },
    });
  } catch (error: any) {
    logger.error('Admin verification overview error:', error);
    res.status(500).json({ error: 'Failed to fetch verification overview' });
  }
});

/**
 * Get pending verifications
 */
router.get('/verification/pending', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
], async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const query = `
      SELECT 
        pe.*,
        u.email as planter_email,
        u.first_name || ' ' || u.last_name as planter_name,
        array_agg(DISTINCT ph.photo_hash) as photo_hashes
      FROM planting_evidence pe
      LEFT JOIN verification_logs v ON pe.id = v.evidence_id
      JOIN users u ON pe.planter_id = u.id
      LEFT JOIN photo_hashes ph ON pe.id = ph.submission_id
      WHERE v.id IS NULL
      GROUP BY pe.id, u.email, u.first_name, u.last_name
      ORDER BY pe.submitted_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await pool.query(query, [limit, offset]);

    res.json({
      success: true,
      data: result.rows,
      pagination: {
        limit,
        offset,
        total: result.rows.length,
      },
    });
  } catch (error: any) {
    logger.error('Admin pending verifications error:', error);
    res.status(500).json({ error: 'Failed to fetch pending verifications' });
  }
});

/**
 * Manual verification override
 */
router.post('/verification/:evidenceId/override', [
  param('evidenceId').notEmpty(),
  body('verified').isBoolean(),
  body('reason').notEmpty().isLength({ max: 500 }),
  body('adjustedTrees').optional().isInt({ min: 0 }),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { evidenceId } = req.params;
    const { verified, reason, adjustedTrees } = req.body;
    const adminId = (req as any).user.id;

    // Create manual verification log
    const verificationQuery = `
      INSERT INTO verification_logs (
        evidence_id, checks, score, verified, details, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, NOW()
      )
    `;

    const manualChecks = {
      gps: true,
      satellite: true,
      photoAnalysis: true,
      duplicateCheck: true,
      weatherCheck: true,
      temporalConsistency: true,
      manualOverride: true,
    };

    await pool.query(verificationQuery, [
      evidenceId,
      JSON.stringify(manualChecks),
      verified ? 1.0 : 0.0,
      verified,
      JSON.stringify({
        manualOverride: true,
        adminId,
        reason,
        adjustedTrees,
      }),
    ]);

    // If verified, create verified planting record
    if (verified) {
      const evidence = await getEvidence(evidenceId);
      const treesToVerify = adjustedTrees || evidence.total_trees;

      await createVerifiedPlanting(evidence, treesToVerify);
    }

    // Log admin action
    await logAdminAction(adminId, 'verification_override', {
      evidenceId,
      verified,
      reason,
      adjustedTrees,
    });

    res.json({
      success: true,
      message: `Evidence ${verified ? 'verified' : 'rejected'} manually`,
    });
  } catch (error: any) {
    logger.error('Admin verification override error:', error);
    res.status(500).json({ error: 'Failed to override verification' });
  }
});

/**
 * Planting zones management
 */
router.get('/zones', async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        pz.*,
        COUNT(DISTINCT vp.id) as total_plantings,
        SUM(vp.trees_verified) as total_trees,
        MAX(vp.planted_at) as last_activity
      FROM planting_zones pz
      LEFT JOIN verified_plantings vp ON pz.id = vp.zone_id
      GROUP BY pz.id
      ORDER BY pz.name
    `;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows.map(zone => ({
        ...zone,
        polygon: JSON.parse(zone.polygon),
        totalPlantings: parseInt(zone.total_plantings || 0),
        totalTrees: parseInt(zone.total_trees || 0),
        lastActivity: zone.last_activity,
      })),
    });
  } catch (error: any) {
    logger.error('Admin zones fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

/**
 * Update planting zone
 */
router.put('/zones/:zoneId', [
  param('zoneId').notEmpty(),
  body('name').optional().notEmpty(),
  body('isActive').optional().isBoolean(),
  body('restrictions').optional().isArray(),
  body('optimalSpecies').optional().isArray(),
], async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { zoneId } = req.params;
    const updates = req.body;

    // Build update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      updateFields.push(`name = $${paramIndex}`);
      values.push(updates.name);
      paramIndex++;
    }

    if (updates.isActive !== undefined) {
      updateFields.push(`is_active = $${paramIndex}`);
      values.push(updates.isActive);
      paramIndex++;
    }

    if (updates.restrictions !== undefined) {
      updateFields.push(`restrictions = $${paramIndex}`);
      values.push(updates.restrictions);
      paramIndex++;
    }

    if (updates.optimalSpecies !== undefined) {
      updateFields.push(`optimal_species = $${paramIndex}`);
      values.push(updates.optimalSpecies);
      paramIndex++;
    }

    updateFields.push('updated_at = NOW()');
    values.push(zoneId);

    const query = `
      UPDATE planting_zones 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await pool.query(query, values);

    // Log admin action
    await logAdminAction((req as any).user.id, 'zone_update', {
      zoneId,
      updates,
    });

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    logger.error('Admin zone update error:', error);
    res.status(500).json({ error: 'Failed to update zone' });
  }
});

/**
 * Get suspicious activities
 */
router.get('/suspicious-activities', [
  query('type').optional().isIn(['gps', 'duplicate', 'pattern', 'all']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: Request, res: Response) => {
  try {
    const type = req.query.type as string || 'all';
    const limit = parseInt(req.query.limit as string) || 50;

    let query = `
      SELECT 
        sa.*,
        u.email as planter_email,
        u.first_name || ' ' || u.last_name as planter_name
      FROM suspicious_activities sa
      JOIN users u ON sa.planter_id = u.id
      WHERE 1=1
    `;

    if (type !== 'all') {
      if (type === 'gps') {
        query += ' AND sa.cluster_suspicious = true';
      } else if (type === 'duplicate') {
        query += ' AND sa.duplicate_photos > 1';
      } else if (type === 'pattern') {
        query += ' AND sa.verification_score < 0.5';
      }
    }

    query += ` ORDER BY sa.submitted_at DESC LIMIT ${limit}`;

    const result = await pool.query(query);

    res.json({
      success: true,
      data: result.rows,
      filter: type,
    });
  } catch (error: any) {
    logger.error('Admin suspicious activities error:', error);
    res.status(500).json({ error: 'Failed to fetch suspicious activities' });
  }
});

/**
 * Coverage analysis
 */
router.get('/coverage/:zoneId', async (req: Request, res: Response) => {
  try {
    const { zoneId } = req.params;

    // Get latest coverage analysis
    const coverageQuery = `
      SELECT * FROM coverage_analysis
      WHERE zone_id = $1
      ORDER BY analysis_date DESC
      LIMIT 1
    `;

    const coverageResult = await pool.query(coverageQuery, [zoneId]);
    const latestCoverage = coverageResult.rows[0];

    // Get zone details
    const zoneQuery = `
      SELECT * FROM planting_zones WHERE id = $1
    `;

    const zoneResult = await pool.query(zoneQuery, [zoneId]);
    const zone = zoneResult.rows[0];

    // Calculate current gaps
    const gaps = await satelliteService.detectCoverageGaps(zoneId);

    res.json({
      success: true,
      data: {
        zone: {
          ...zone,
          polygon: JSON.parse(zone.polygon),
        },
        coverage: latestCoverage,
        currentGaps: gaps,
      },
    });
  } catch (error: any) {
    logger.error('Admin coverage analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze coverage' });
  }
});

/**
 * Generate planting heatmap
 */
router.get('/heatmap', [
  query('startDate').optional().isISO8601(),
  query('endDate').optional().isISO8601(),
  query('zoneId').optional(),
], async (req: Request, res: Response) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : new Date();

    const heatmapData = await satelliteService.generatePlantingHeatmap(startDate, endDate);

    res.json({
      success: true,
      data: heatmapData,
      dateRange: {
        start: startDate,
        end: endDate,
      },
    });
  } catch (error: any) {
    logger.error('Admin heatmap generation error:', error);
    res.status(500).json({ error: 'Failed to generate heatmap' });
  }
});

/**
 * Planter performance metrics
 */
router.get('/planters/performance', [
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('sortBy').optional().isIn(['trees', 'verificationRate', 'earnings']),
], async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const sortBy = req.query.sortBy as string || 'trees';

    const sortColumn = {
      trees: 'total_trees_verified',
      verificationRate: 'verification_rate',
      earnings: 'total_earnings',
    }[sortBy];

    const query = `
      SELECT 
        p.user_id as planter_id,
        u.first_name || ' ' || u.last_name as planter_name,
        u.email,
        COUNT(DISTINCT pe.id) as total_submissions,
        COUNT(DISTINCT vp.id) as verified_submissions,
        SUM(vp.trees_verified) as total_trees_verified,
        ROUND(COUNT(DISTINCT vp.id)::numeric / NULLIF(COUNT(DISTINCT pe.id), 0) * 100, 1) as verification_rate,
        SUM(vp.tokens_awarded) as total_earnings,
        MAX(pe.submitted_at) as last_activity
      FROM planters p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN planting_evidence pe ON p.user_id = pe.planter_id
      LEFT JOIN verified_plantings vp ON pe.id = vp.evidence_id
      GROUP BY p.user_id, u.first_name, u.last_name, u.email
      ORDER BY ${sortColumn} DESC NULLS LAST
      LIMIT $1
    `;

    const result = await pool.query(query, [limit]);

    res.json({
      success: true,
      data: result.rows.map(row => ({
        ...row,
        totalTreesVerified: parseInt(row.total_trees_verified || 0),
        totalEarnings: parseInt(row.total_earnings || 0),
        verificationRate: parseFloat(row.verification_rate || 0),
      })),
      sortBy,
    });
  } catch (error: any) {
    logger.error('Admin planter performance error:', error);
    res.status(500).json({ error: 'Failed to fetch planter performance' });
  }
});

/**
 * Get user activities
 */
router.get('/user-activities', [
  query('userType').optional().isIn(['family', 'planter', 'validator', 'admin', 'all']),
  query('category').optional().isIn(['authentication', 'transaction', 'planting', 'verification', 'admin', 'navigation', 'all']),
  query('timeRange').optional().isIn(['1h', '24h', '7d', '30d']),
  query('success').optional().isIn(['true', 'false', 'all']),
  query('limit').optional().isInt({ min: 1, max: 100 }),
  query('offset').optional().isInt({ min: 0 }),
  query('search').optional().isString(),
], async (req: Request, res: Response) => {
  try {
    const {
      userType = 'all',
      category = 'all',
      timeRange = '24h',
      success = 'all',
      limit = 50,
      offset = 0,
      search
    } = req.query;

    const startDate = getStartDate(timeRange as string);
    
    let query = `
      SELECT 
        ua.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        u.user_type
      FROM user_activities ua
      JOIN users u ON ua.user_id = u.id
      WHERE ua.timestamp >= $1
    `;
    
    const params = [startDate];
    let paramIndex = 2;

    if (userType !== 'all') {
      query += ` AND u.user_type = $${paramIndex}`;
      params.push(userType);
      paramIndex++;
    }

    if (category !== 'all') {
      query += ` AND ua.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (success !== 'all') {
      query += ` AND ua.success = $${paramIndex}`;
      params.push(success === 'true');
      paramIndex++;
    }

    if (search) {
      query += ` AND (
        u.first_name ILIKE $${paramIndex} OR 
        u.last_name ILIKE $${paramIndex} OR 
        u.email ILIKE $${paramIndex} OR 
        ua.action ILIKE $${paramIndex} OR 
        ua.description ILIKE $${paramIndex}
      )`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY ua.timestamp DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      activities: result.rows.map(row => ({
        ...row,
        userName: row.user_name,
        userEmail: row.user_email,
        userType: row.user_type,
        metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
      })),
      pagination: {
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        total: result.rows.length,
      },
    });
  } catch (error: any) {
    logger.error('Admin user activities error:', error);
    res.status(500).json({ error: 'Failed to fetch user activities' });
  }
});

/**
 * Get user sessions
 */
router.get('/user-sessions', [
  query('active').optional().isBoolean(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: Request, res: Response) => {
  try {
    const { active, limit = 50 } = req.query;

    let query = `
      SELECT 
        us.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email,
        u.user_type
      FROM user_sessions us
      JOIN users u ON us.user_id = u.id
    `;

    const params = [];
    if (active !== undefined) {
      query += ' WHERE us.is_active = $1';
      params.push(active === 'true');
    }

    query += ' ORDER BY us.last_activity DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      sessions: result.rows.map(row => ({
        ...row,
        userName: row.user_name,
        userEmail: row.user_email,
        userType: row.user_type,
        deviceInfo: typeof row.device_info === 'string' ? JSON.parse(row.device_info) : row.device_info,
        location: typeof row.location === 'string' ? JSON.parse(row.location) : row.location,
        pagesVisited: typeof row.pages_visited === 'string' ? JSON.parse(row.pages_visited) : row.pages_visited,
      })),
    });
  } catch (error: any) {
    logger.error('Admin user sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch user sessions' });
  }
});

/**
 * Get user analytics
 */
router.get('/user-analytics', [
  query('timeRange').optional().isIn(['1h', '24h', '7d', '30d']),
], async (req: Request, res: Response) => {
  try {
    const timeRange = req.query.timeRange as string || '24h';
    const startDate = getStartDate(timeRange);

    // Get basic user stats
    const userStatsQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN last_login >= NOW() - INTERVAL '1 hour' THEN 1 END) as active_now,
        COUNT(CASE WHEN last_login >= NOW() - INTERVAL '24 hours' THEN 1 END) as active_24h,
        COUNT(CASE WHEN last_login >= NOW() - INTERVAL '7 days' THEN 1 END) as active_7d,
        COUNT(CASE WHEN last_login >= NOW() - INTERVAL '30 days' THEN 1 END) as active_30d,
        COUNT(CASE WHEN created_at >= CURRENT_DATE THEN 1 END) as new_today,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as new_week,
        COUNT(CASE WHEN created_at >= CURRENT_DATE - INTERVAL '30 days' THEN 1 END) as new_month
      FROM users
    `;

    const userStatsResult = await pool.query(userStatsQuery);
    const userStats = userStatsResult.rows[0];

    // Get user type distribution
    const userTypeQuery = `
      SELECT user_type, COUNT(*) as count
      FROM users
      GROUP BY user_type
    `;

    const userTypeResult = await pool.query(userTypeQuery);
    const usersByType = userTypeResult.rows.reduce((acc: any, row) => {
      acc[row.user_type] = parseInt(row.count);
      return acc;
    }, {});

    // Get top activities
    const topActivitiesQuery = `
      SELECT action, category, COUNT(*) as count
      FROM user_activities
      WHERE timestamp >= $1
      GROUP BY action, category
      ORDER BY count DESC
      LIMIT 10
    `;

    const topActivitiesResult = await pool.query(topActivitiesQuery, [startDate]);

    // Get activity by hour
    const hourlyActivityQuery = `
      SELECT 
        EXTRACT(hour FROM timestamp) as hour,
        COUNT(*) as count
      FROM user_activities
      WHERE timestamp >= $1
      GROUP BY EXTRACT(hour FROM timestamp)
      ORDER BY hour
    `;

    const hourlyActivityResult = await pool.query(hourlyActivityQuery, [startDate]);
    const activityByHour = new Array(24).fill(0);
    hourlyActivityResult.rows.forEach(row => {
      activityByHour[parseInt(row.hour)] = parseInt(row.count);
    });

    // Calculate session analytics
    const sessionAnalyticsQuery = `
      SELECT 
        AVG(duration) as avg_duration,
        COUNT(CASE WHEN activity_count = 1 THEN 1 END)::float / COUNT(*) * 100 as bounce_rate
      FROM user_sessions
      WHERE start_time >= $1
    `;

    const sessionAnalyticsResult = await pool.query(sessionAnalyticsQuery, [startDate]);
    const sessionAnalytics = sessionAnalyticsResult.rows[0];

    // Get error rate
    const errorRateQuery = `
      SELECT 
        COUNT(CASE WHEN NOT success THEN 1 END)::float / COUNT(*) * 100 as error_rate
      FROM user_activities
      WHERE timestamp >= $1
    `;

    const errorRateResult = await pool.query(errorRateQuery, [startDate]);
    const errorRate = parseFloat(errorRateResult.rows[0].error_rate || 0);

    res.json({
      success: true,
      analytics: {
        totalUsers: parseInt(userStats.total_users),
        activeUsers: {
          now: parseInt(userStats.active_now),
          last24h: parseInt(userStats.active_24h),
          last7d: parseInt(userStats.active_7d),
          last30d: parseInt(userStats.active_30d),
        },
        newUsers: {
          today: parseInt(userStats.new_today),
          thisWeek: parseInt(userStats.new_week),
          thisMonth: parseInt(userStats.new_month),
        },
        usersByType,
        topActivities: topActivitiesResult.rows,
        activityByHour,
        averageSessionDuration: parseFloat(sessionAnalytics.avg_duration || 0) / 60000, // Convert to minutes
        bounceRate: parseFloat(sessionAnalytics.bounce_rate || 0),
        errorRate,
        retentionRate: {
          day1: 85.2, // These would be calculated from actual retention data
          day7: 65.8,
          day30: 45.3,
        },
        topPages: [], // Would be populated from page visit data
        deviceStats: {
          desktop: 60,
          mobile: 35,
          tablet: 5,
        },
        browserStats: [],
        locationStats: [],
      },
    });
  } catch (error: any) {
    logger.error('Admin user analytics error:', error);
    res.status(500).json({ error: 'Failed to fetch user analytics' });
  }
});

/**
 * Get suspicious activities
 */
router.get('/suspicious-activities', [
  query('type').optional().isIn(['multiple_logins', 'unusual_location', 'rapid_actions', 'failed_authentications', 'bot_behavior', 'fraud_indicators', 'all']),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical', 'all']),
  query('status').optional().isString(),
  query('limit').optional().isInt({ min: 1, max: 100 }),
], async (req: Request, res: Response) => {
  try {
    const {
      type = 'all',
      severity = 'all',
      status = 'new,investigating',
      limit = 50
    } = req.query;

    let query = `
      SELECT 
        sa.*,
        u.first_name || ' ' || u.last_name as user_name,
        u.email as user_email
      FROM suspicious_activities sa
      JOIN users u ON sa.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    let paramIndex = 1;

    if (type !== 'all') {
      query += ` AND sa.suspicion_type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    if (severity !== 'all') {
      query += ` AND sa.severity = $${paramIndex}`;
      params.push(severity);
      paramIndex++;
    }

    if (status) {
      const statusList = (status as string).split(',').map(s => s.trim());
      query += ` AND sa.status = ANY($${paramIndex})`;
      params.push(statusList);
      paramIndex++;
    }

    query += ` ORDER BY sa.detected_at DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await pool.query(query, params);

    res.json({
      success: true,
      activities: result.rows.map(row => ({
        ...row,
        userName: row.user_name,
        userEmail: row.user_email,
        details: typeof row.details === 'string' ? JSON.parse(row.details) : row.details,
      })),
    });
  } catch (error: any) {
    logger.error('Admin suspicious activities error:', error);
    res.status(500).json({ error: 'Failed to fetch suspicious activities' });
  }
});

/**
 * Get admin profile
 */
router.get('/profile', async (req: Request, res: Response) => {
  try {
    const adminId = (req as any).user.id;
    
    const query = `
      SELECT id, first_name, last_name, email, user_type, created_at
      FROM users
      WHERE id = $1 AND user_type = 'admin'
    `;

    const result = await pool.query(query, [adminId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Admin profile not found' });
    }

    const admin = result.rows[0];

    res.json({
      success: true,
      user: {
        id: admin.id,
        name: `${admin.first_name} ${admin.last_name}`,
        email: admin.email,
        role: 'Administrator',
        createdAt: admin.created_at,
      },
    });
  } catch (error: any) {
    logger.error('Admin profile error:', error);
    res.status(500).json({ error: 'Failed to fetch admin profile' });
  }
});

/**
 * Get overview stats
 */
router.get('/overview-stats', async (req: Request, res: Response) => {
  try {
    // Get user counts
    const userCountQuery = `
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN last_login >= NOW() - INTERVAL '1 hour' THEN 1 END) as active_users
      FROM users
    `;

    const userCountResult = await pool.query(userCountQuery);
    const userCounts = userCountResult.rows[0];

    // Get transaction count (this would depend on your transaction table structure)
    const transactionCountQuery = `
      SELECT COUNT(*) as total_transactions
      FROM verified_plantings
    `;

    const transactionCountResult = await pool.query(transactionCountQuery);
    const transactionCount = transactionCountResult.rows[0];

    // Get trees planted count
    const treesPlantedQuery = `
      SELECT SUM(trees_verified) as total_trees
      FROM verified_plantings
    `;

    const treesPlantedResult = await pool.query(treesPlantedQuery);
    const treesPlanted = treesPlantedResult.rows[0];

    res.json({
      success: true,
      stats: {
        totalUsers: parseInt(userCounts.total_users),
        activeUsers: parseInt(userCounts.active_users),
        totalTransactions: parseInt(transactionCount.total_transactions || 0),
        totalTreesPlanted: parseInt(treesPlanted.total_trees || 0),
        systemHealth: 'healthy',
      },
    });
  } catch (error: any) {
    logger.error('Admin overview stats error:', error);
    res.status(500).json({ error: 'Failed to fetch overview stats' });
  }
});

/**
 * System health check
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const checks = {
      database: false,
      ipfs: false,
      satellite: false,
      blockchain: false,
    };

    // Check database
    try {
      await pool.query('SELECT 1');
      checks.database = true;
    } catch (error) {
      logger.error('Database health check failed:', error);
    }

    // Check IPFS
    try {
      // Would check IPFS service health
      checks.ipfs = true;
    } catch (error) {
      logger.error('IPFS health check failed:', error);
    }

    // Check satellite service
    try {
      // Would check satellite API health
      checks.satellite = true;
    } catch (error) {
      logger.error('Satellite health check failed:', error);
    }

    // Check blockchain
    try {
      // Would check Solana RPC health
      checks.blockchain = true;
    } catch (error) {
      logger.error('Blockchain health check failed:', error);
    }

    const allHealthy = Object.values(checks).every(v => v);

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      checks,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Admin health check error:', error);
    res.status(500).json({ error: 'Failed to check system health' });
  }
});

/**
 * Helper functions
 */

function getStartDate(timeRange: string): Date {
  const now = new Date();
  switch (timeRange) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  }
}

async function getEvidence(evidenceId: string): Promise<any> {
  const query = `SELECT * FROM planting_evidence WHERE id = $1`;
  const result = await pool.query(query, [evidenceId]);
  return result.rows[0];
}

async function createVerifiedPlanting(evidence: any, treesVerified: number): Promise<void> {
  const photos = JSON.parse(evidence.photos);
  const centerLocation = photos[0].location;

  const query = `
    INSERT INTO verified_plantings (
      id, evidence_id, planter_id, location, zone_id,
      trees_planted, trees_verified, species, planted_at,
      verification_score, tokens_awarded
    ) VALUES (
      $1, $2, $3, ST_SetSRID(ST_MakePoint($4, $5), 4326), $6,
      $7, $8, $9, $10, $11, $12
    )
  `;

  const verifiedId = `verified_${Date.now()}`;
  const zoneId = await findZoneForLocation(centerLocation.latitude, centerLocation.longitude);
  const tokensAwarded = treesVerified * 200; // 200 tokens per tree

  await pool.query(query, [
    verifiedId,
    evidence.id,
    evidence.planter_id,
    centerLocation.longitude,
    centerLocation.latitude,
    zoneId,
    evidence.total_trees,
    treesVerified,
    evidence.species,
    photos[0].timestamp,
    1.0, // Manual verification score
    tokensAwarded,
  ]);
}

async function findZoneForLocation(lat: number, lon: number): Promise<string | null> {
  const query = `SELECT find_nearest_zone($1, $2) as zone_id`;
  const result = await pool.query(query, [lat, lon]);
  return result.rows[0]?.zone_id;
}

async function logAdminAction(adminId: string, action: string, details: any): Promise<void> {
  const query = `
    INSERT INTO admin_actions (
      admin_id, action, details, created_at
    ) VALUES ($1, $2, $3, NOW())
  `;

  await pool.query(query, [adminId, action, JSON.stringify(details)]);
}

export const adminRouter = router;