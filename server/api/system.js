const express = require('express');
const SystemService = require('../system-service');
const { verifySession, requireSuperAdmin } = require('../db/auth');
const adminQueries = require('../db/queries/admin');

const router = express.Router();
const systemService = new SystemService();

// Middleware to record API call metrics
function recordMetrics(req, res, next) {
    const startTime = Date.now();
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        systemService.recordAPICall(responseTime);
        if (res.statusCode >= 400) {
            systemService.recordError();
        }
    });
    next();
}

router.use(recordMetrics);

// Get system status
router.get('/status', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const status = await systemService.getSystemStatus();
        res.json(status);
    } catch (error) {
        console.error('Error getting system status:', error);
        res.status(500).json({ error: 'Failed to get system status' });
    }
});

// Get performance metrics
router.get('/metrics', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const { range } = req.query;
        const metrics = await systemService.getMetrics(range);
        res.json(metrics);
    } catch (error) {
        console.error('Error getting metrics:', error);
        res.status(500).json({ error: 'Failed to get metrics' });
    }
});

// Get system logs
router.get('/logs', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const logs = await systemService.getSystemLogs();
        res.json(logs);
    } catch (error) {
        console.error('Error getting system logs:', error);
        res.status(500).json({ error: 'Failed to get system logs' });
    }
});

// Clear system logs
router.delete('/logs', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const result = await systemService.clearSystemLogs();

        await adminQueries.logAction('system_logs_cleared', req.user.uid, {
            cleared: result.cleared
        }, req.ip);

        res.json(result);
    } catch (error) {
        console.error('Error clearing system logs:', error);
        res.status(500).json({ error: 'Failed to clear system logs' });
    }
});

// Get configuration
router.get('/config', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const config = await systemService.getConfiguration();
        res.json(config);
    } catch (error) {
        console.error('Error getting configuration:', error);
        res.status(500).json({ error: 'Failed to get configuration' });
    }
});

// Save configuration
router.post('/config', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const result = await systemService.saveConfiguration(req.body);

        await adminQueries.logAction('system_config_updated', req.user.uid, {
            features: Object.keys(req.body.features || {}),
            env: Object.keys(req.body.env || {})
        }, req.ip);

        res.json(result);
    } catch (error) {
        console.error('Error saving configuration:', error);
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});

// Maintenance mode
router.post('/maintenance', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const { enabled, message, duration, allowAdmins } = req.body;
        const result = await systemService.setMaintenanceMode(enabled, {
            message, duration, allowAdmins, adminId: req.user.uid
        });

        await adminQueries.logAction(
            enabled ? 'maintenance_mode_enabled' : 'maintenance_mode_disabled',
            req.user.uid,
            { message, duration, allowAdmins },
            req.ip
        );

        res.json(result);
    } catch (error) {
        console.error('Error setting maintenance mode:', error);
        res.status(500).json({ error: 'Failed to set maintenance mode' });
    }
});

// Health check (public)
router.get('/health', async (req, res) => {
    try {
        const health = await systemService.getHealthCheck();
        res.json(health);
    } catch (error) {
        console.error('Error getting health check:', error);
        res.status(500).json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message
        });
    }
});

// Server restart
router.post('/restart', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        await adminQueries.logAction('server_restart_requested', req.user.uid, {}, req.ip);

        res.json({ success: true, message: 'Server restart requested' });
        setTimeout(() => process.exit(0), 1000);
    } catch (error) {
        console.error('Error restarting server:', error);
        res.status(500).json({ error: 'Failed to restart server' });
    }
});

// System info
router.get('/info', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const info = {
            node: {
                version: process.version,
                platform: process.platform,
                arch: process.arch,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage()
            },
            os: {
                type: require('os').type(),
                cpus: require('os').cpus().length,
                totalMemory: require('os').totalmem(),
                freeMemory: require('os').freemem(),
                loadAverage: require('os').loadavg()
            },
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                hasDatabase: !!process.env.DATABASE_URL || !!process.env.PG_HOST,
                hasSendGridKey: !!process.env.SENDGRID_API_KEY
            }
        };
        res.json(info);
    } catch (error) {
        console.error('Error getting system info:', error);
        res.status(500).json({ error: 'Failed to get system information' });
    }
});

module.exports = router;
