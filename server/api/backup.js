const express = require('express');
const BackupService = require('../backup-service');
const path = require('path');
const { verifySession, requireSuperAdmin } = require('../db/auth');
const adminQueries = require('../db/queries/admin');

const router = express.Router();
const backupService = new BackupService();

// Create backup
router.post('/create', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const { collections, format } = req.body;

        if (!collections || !Array.isArray(collections) || collections.length === 0) {
            return res.status(400).json({ error: 'Collections array is required' });
        }

        const validCollections = ['users', 'family_trees', 'persons', 'invites', 'content', 'admin_logs', 'announcements'];
        const invalidCollections = collections.filter(c => !validCollections.includes(c));
        if (invalidCollections.length > 0) {
            return res.status(400).json({ error: `Invalid collections: ${invalidCollections.join(', ')}` });
        }

        await adminQueries.logAction('backup_create', req.user.uid, {
            collections,
            format: format || 'json'
        }, req.ip);

        const result = await backupService.createBackup(collections, format);
        res.json(result);
    } catch (error) {
        console.error('Error creating backup:', error);
        res.status(500).json({ error: 'Failed to create backup' });
    }
});

// Get backup history
router.get('/history', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const history = await backupService.getBackupHistory();
        res.json(history);
    } catch (error) {
        console.error('Error getting backup history:', error);
        res.status(500).json({ error: 'Failed to get backup history' });
    }
});

// Download backup
router.get('/download/:backupId', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const { backupId } = req.params;
        const filePath = await backupService.downloadBackup(backupId);

        await adminQueries.logAction('backup_download', req.user.uid, { backupId }, req.ip);

        const fileName = path.basename(filePath);
        res.download(filePath, fileName);
    } catch (error) {
        console.error('Error downloading backup:', error);
        res.status(500).json({ error: 'Failed to download backup' });
    }
});

// Delete backup
router.delete('/delete/:backupId', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const { backupId } = req.params;
        const result = await backupService.deleteBackup(backupId);

        await adminQueries.logAction('backup_delete', req.user.uid, { backupId }, req.ip);

        res.json(result);
    } catch (error) {
        console.error('Error deleting backup:', error);
        res.status(500).json({ error: 'Failed to delete backup' });
    }
});

// Get schedule configuration
router.get('/schedule', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const config = await backupService.getScheduleConfig();
        res.json(config);
    } catch (error) {
        console.error('Error getting schedule config:', error);
        res.status(500).json({ error: 'Failed to get schedule configuration' });
    }
});

// Save schedule configuration
router.post('/schedule', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const { frequency, time, day, date, retention } = req.body;
        if (!frequency || !['disabled', 'daily', 'weekly', 'monthly'].includes(frequency)) {
            return res.status(400).json({ error: 'Invalid frequency' });
        }

        const config = { frequency, time, day, date, retention };
        const result = await backupService.saveScheduleConfig(config);

        await adminQueries.logAction('backup_schedule_update', req.user.uid, config, req.ip);

        res.json(result);
    } catch (error) {
        console.error('Error saving schedule config:', error);
        res.status(500).json({ error: 'Failed to save schedule configuration' });
    }
});

// Cleanup old backups
router.post('/cleanup', verifySession, requireSuperAdmin, async (req, res) => {
    try {
        const { retentionDays } = req.body;
        const result = await backupService.cleanupOldBackups(retentionDays || 30);

        await adminQueries.logAction('backup_cleanup', req.user.uid, {
            retentionDays: retentionDays || 30,
            deleted: result.deleted
        }, req.ip);

        res.json(result);
    } catch (error) {
        console.error('Error cleaning up backups:', error);
        res.status(500).json({ error: 'Failed to cleanup old backups' });
    }
});

module.exports = router;
