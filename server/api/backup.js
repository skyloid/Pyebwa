const express = require('express');
const admin = require('firebase-admin');
const BackupService = require('../backup-service');
const path = require('path');

const router = express.Router();
const backupService = new BackupService();

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

// Create backup
router.post('/create', verifyAdminAuth, async (req, res) => {
    try {
        const { collections, format } = req.body;

        if (!collections || !Array.isArray(collections) || collections.length === 0) {
            return res.status(400).json({ error: 'Collections array is required' });
        }

        const validCollections = ['users', 'familyTrees', 'persons', 'stories', 'events', 'content', 'admin_logs', 'announcements'];
        const invalidCollections = collections.filter(c => !validCollections.includes(c));
        
        if (invalidCollections.length > 0) {
            return res.status(400).json({ error: `Invalid collections: ${invalidCollections.join(', ')}` });
        }

        // Log the backup creation
        await admin.firestore().collection('admin_logs').add({
            timestamp: admin.firestore.Timestamp.now(),
            adminId: req.user.uid,
            adminEmail: req.user.email,
            action: 'backup_create',
            details: {
                collections,
                format: format || 'json'
            },
            ipAddress: req.ip || req.connection.remoteAddress
        });

        const result = await backupService.createBackup(collections, format);
        res.json(result);
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// Get backup history
router.get('/history', verifyAdminAuth, async (req, res) => {
    try {
        const history = await backupService.getBackupHistory();
        res.json(history);
    } catch (error) {
        console.error('Error getting backup history:', error);
        res.status(500).json({ error: 'Failed to get backup history' });
    }
});

// Download backup
router.get('/download/:backupId', verifyAdminAuth, async (req, res) => {
    try {
        const { backupId } = req.params;
        const filePath = await backupService.downloadBackup(backupId);

        // Log the download
        await admin.firestore().collection('admin_logs').add({
            timestamp: admin.firestore.Timestamp.now(),
            adminId: req.user.uid,
            adminEmail: req.user.email,
            action: 'backup_download',
            details: { backupId },
            ipAddress: req.ip || req.connection.remoteAddress
        });

        const fileName = path.basename(filePath);
        res.download(filePath, fileName);
    } catch (error) {
        console.error('Error downloading backup:', error);
        res.status(500).json({ error: 'Failed to download backup' });
    }
});

// Delete backup
router.delete('/delete/:backupId', verifyAdminAuth, async (req, res) => {
    try {
        const { backupId } = req.params;

        // Only superadmins can delete backups
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Only superadmins can delete backups' });
        }

        const result = await backupService.deleteBackup(backupId);

        // Log the deletion
        await admin.firestore().collection('admin_logs').add({
            timestamp: admin.firestore.Timestamp.now(),
            adminId: req.user.uid,
            adminEmail: req.user.email,
            action: 'backup_delete',
            details: { backupId },
            ipAddress: req.ip || req.connection.remoteAddress
        });

        res.json(result);
    } catch (error) {
        console.error('Error deleting backup:', error);
        res.status(500).json({ error: 'Failed to delete backup' });
    }
});

// Get schedule configuration
router.get('/schedule', verifyAdminAuth, async (req, res) => {
    try {
        const config = await backupService.getScheduleConfig();
        res.json(config);
    } catch (error) {
        console.error('Error getting schedule config:', error);
        res.status(500).json({ error: 'Failed to get schedule configuration' });
    }
});

// Save schedule configuration
router.post('/schedule', verifyAdminAuth, async (req, res) => {
    try {
        const { frequency, time, day, date, retention } = req.body;

        if (!frequency || !['disabled', 'daily', 'weekly', 'monthly'].includes(frequency)) {
            return res.status(400).json({ error: 'Invalid frequency' });
        }

        const config = { frequency, time, day, date, retention };
        const result = await backupService.saveScheduleConfig(config);

        // Log the schedule change
        await admin.firestore().collection('admin_logs').add({
            timestamp: admin.firestore.Timestamp.now(),
            adminId: req.user.uid,
            adminEmail: req.user.email,
            action: 'backup_schedule_update',
            details: config,
            ipAddress: req.ip || req.connection.remoteAddress
        });

        res.json(result);
    } catch (error) {
        console.error('Error saving schedule config:', error);
        res.status(500).json({ error: 'Failed to save schedule configuration' });
    }
});

// Cleanup old backups
router.post('/cleanup', verifyAdminAuth, async (req, res) => {
    try {
        const { retentionDays } = req.body;

        // Only superadmins can trigger cleanup
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Only superadmins can trigger cleanup' });
        }

        const result = await backupService.cleanupOldBackups(retentionDays || 30);

        // Log the cleanup
        await admin.firestore().collection('admin_logs').add({
            timestamp: admin.firestore.Timestamp.now(),
            adminId: req.user.uid,
            adminEmail: req.user.email,
            action: 'backup_cleanup',
            details: { retentionDays: retentionDays || 30, deleted: result.deleted },
            ipAddress: req.ip || req.connection.remoteAddress
        });

        res.json(result);
    } catch (error) {
        console.error('Error cleaning up backups:', error);
        res.status(500).json({ error: 'Failed to cleanup old backups' });
    }
});

module.exports = router;