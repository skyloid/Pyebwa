const express = require('express');
const admin = require('firebase-admin');
const SystemService = require('../system-service');

const router = express.Router();
const systemService = new SystemService();

// Middleware to verify admin authentication
async function verifyAdminAuth(req, res, next) {
    try {
        const token = req.headers.authorization?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ error: 'No authorization token provided' });
        }

        const decodedToken = await admin.auth().verifyIdToken(token);
        const user = await admin.firestore().collection('users').doc(decodedToken.uid).get();
        
        if (!user.exists) {
            return res.status(403).json({ error: 'User not found' });
        }

        const userData = user.data();
        if (!userData.role || !['superadmin', 'admin', 'moderator'].includes(userData.role)) {
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        req.user = { uid: decodedToken.uid, ...userData };
        next();
    } catch (error) {
        console.error('Auth verification error:', error);
        res.status(401).json({ error: 'Invalid authorization token' });
    }
}

// Middleware to record API call metrics
function recordMetrics(req, res, next) {
    const startTime = Date.now();
    
    res.on('finish', () => {
        const responseTime = Date.now() - startTime;
        systemService.recordAPICall(responseTime);
        
        // Record errors
        if (res.statusCode >= 400) {
            systemService.recordError();
        }
    });
    
    next();
}

// Apply metrics recording to all routes
router.use(recordMetrics);

// Get system status
router.get('/status', verifyAdminAuth, async (req, res) => {
    try {
        const status = await systemService.getSystemStatus();
        res.json(status);
    } catch (error) {
        console.error('Error getting system status:', error);
        res.status(500).json({ error: 'Failed to get system status' });
    }
});

// Get performance metrics
router.get('/metrics', verifyAdminAuth, async (req, res) => {
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
router.get('/logs', verifyAdminAuth, async (req, res) => {
    try {
        const logs = await systemService.getSystemLogs();
        res.json(logs);
    } catch (error) {
        console.error('Error getting system logs:', error);
        res.status(500).json({ error: 'Failed to get system logs' });
    }
});

// Clear system logs
router.delete('/logs', verifyAdminAuth, async (req, res) => {
    try {
        // Only superadmins can clear logs
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Only superadmins can clear logs' });
        }

        const result = await systemService.clearSystemLogs();

        // Log the action
        await admin.firestore().collection('admin_logs').add({
            timestamp: admin.firestore.Timestamp.now(),
            adminId: req.user.uid,
            adminEmail: req.user.email,
            action: 'system_logs_cleared',
            details: { cleared: result.cleared },
            ipAddress: req.ip || req.connection.remoteAddress
        });

        res.json(result);
    } catch (error) {
        console.error('Error clearing system logs:', error);
        res.status(500).json({ error: 'Failed to clear system logs' });
    }
});

// Get configuration
router.get('/config', verifyAdminAuth, async (req, res) => {
    try {
        const config = await systemService.getConfiguration();
        res.json(config);
    } catch (error) {
        console.error('Error getting configuration:', error);
        res.status(500).json({ error: 'Failed to get configuration' });
    }
});

// Save configuration
router.post('/config', verifyAdminAuth, async (req, res) => {
    try {
        // Only superadmins can modify configuration
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Only superadmins can modify configuration' });
        }

        const result = await systemService.saveConfiguration(req.body);

        // Log the configuration change
        await admin.firestore().collection('admin_logs').add({
            timestamp: admin.firestore.Timestamp.now(),
            adminId: req.user.uid,
            adminEmail: req.user.email,
            action: 'system_config_updated',
            details: {
                features: Object.keys(req.body.features || {}),
                env: Object.keys(req.body.env || {})
            },
            ipAddress: req.ip || req.connection.remoteAddress
        });

        res.json(result);
    } catch (error) {
        console.error('Error saving configuration:', error);
        res.status(500).json({ error: 'Failed to save configuration' });
    }
});

// Maintenance mode endpoints
router.post('/maintenance', verifyAdminAuth, async (req, res) => {
    try {
        // Only admins and superadmins can toggle maintenance mode
        if (!['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Only admins and superadmins can toggle maintenance mode' });
        }

        const { enabled, message, duration, allowAdmins } = req.body;
        
        const result = await systemService.setMaintenanceMode(enabled, {
            message,
            duration,
            allowAdmins,
            adminId: req.user.uid
        });

        // Log the maintenance mode change
        await admin.firestore().collection('admin_logs').add({
            timestamp: admin.firestore.Timestamp.now(),
            adminId: req.user.uid,
            adminEmail: req.user.email,
            action: enabled ? 'maintenance_mode_enabled' : 'maintenance_mode_disabled',
            details: { message, duration, allowAdmins },
            ipAddress: req.ip || req.connection.remoteAddress
        });

        res.json(result);
    } catch (error) {
        console.error('Error setting maintenance mode:', error);
        res.status(500).json({ error: 'Failed to set maintenance mode' });
    }
});

// Health check endpoint (public)
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

// Server restart endpoint (superadmin only)
router.post('/restart', verifyAdminAuth, async (req, res) => {
    try {
        // Only superadmins can restart the server
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Only superadmins can restart the server' });
        }

        // Log the restart action
        await admin.firestore().collection('admin_logs').add({
            timestamp: admin.firestore.Timestamp.now(),
            adminId: req.user.uid,
            adminEmail: req.user.email,
            action: 'server_restart_requested',
            details: {},
            ipAddress: req.ip || req.connection.remoteAddress
        });

        res.json({ success: true, message: 'Server restart requested' });

        // Restart the server after sending response
        setTimeout(() => {
            process.exit(0); // PM2 will restart the process
        }, 1000);
    } catch (error) {
        console.error('Error restarting server:', error);
        res.status(500).json({ error: 'Failed to restart server' });
    }
});

// Export system information for debugging
router.get('/info', verifyAdminAuth, async (req, res) => {
    try {
        const info = {
            node: {
                version: process.version,
                platform: process.platform,
                arch: process.arch,
                uptime: process.uptime(),
                memoryUsage: process.memoryUsage(),
                cwd: process.cwd()
            },
            os: {
                type: require('os').type(),
                release: require('os').release(),
                hostname: require('os').hostname(),
                cpus: require('os').cpus().length,
                totalMemory: require('os').totalmem(),
                freeMemory: require('os').freemem(),
                loadAverage: require('os').loadavg()
            },
            environment: {
                NODE_ENV: process.env.NODE_ENV,
                PORT: process.env.PORT,
                hasFirebaseProject: !!process.env.FIREBASE_PROJECT_ID,
                hasSendGridKey: !!process.env.SENDGRID_API_KEY,
                hasFCMKey: !!process.env.FCM_SERVER_KEY,
                hasVapidKey: !!process.env.VAPID_KEY
            }
        };

        res.json(info);
    } catch (error) {
        console.error('Error getting system info:', error);
        res.status(500).json({ error: 'Failed to get system information' });
    }
});

module.exports = router;