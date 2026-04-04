const express = require('express');
const router = express.Router();
const emailService = require('../services/email');
const { verifySession } = require('../db/auth');
const treeQueries = require('../db/queries/family-trees');
const userQueries = require('../db/queries/users');
const adminQueries = require('../db/queries/admin');

// Send announcement (admin only)
router.post('/send-announcement', verifySession, async (req, res) => {
    try {
        if (!['admin', 'superadmin'].includes(req.user.role)) {
            return res.status(403).json({ error: 'Admin access required' });
        }

        const { announcementId } = req.body;
        if (!announcementId) {
            return res.status(400).json({ error: 'Announcement ID required' });
        }

        const announcement = await adminQueries.getAnnouncementById(announcementId);
        if (!announcement) {
            return res.status(404).json({ error: 'Announcement not found' });
        }

        // Get recipients based on config
        const recipients = await getAnnouncementRecipients(announcement.recipients);

        const results = {
            totalRecipients: recipients.length,
            notifications: { success: 0, failure: 0 },
            emails: { success: 0, failure: 0 }
        };

        // Send emails if enabled
        if (announcement.options?.email) {
            for (const recipient of recipients) {
                try {
                    await emailService.sendAnnouncementEmail(recipient.email, {
                        subject: announcement.subject,
                        recipientName: recipient.display_name || recipient.email,
                        announcementTitle: announcement.title,
                        content: announcement.content
                    });
                    results.emails.success++;
                } catch (err) {
                    results.emails.failure++;
                }
            }
        }

        // Update announcement status
        await adminQueries.updateAnnouncement(announcementId, {
            status: 'published',
            sent_at: new Date(),
            sent_by: req.user.uid,
            stats: {
                sent: recipients.length,
                emailsSent: results.emails.success
            }
        });

        res.json({ success: true, results });
    } catch (error) {
        console.error('Error sending announcement:', error);
        res.status(500).json({ error: 'Failed to send announcement' });
    }
});

// Update notification preferences
router.put('/preferences', verifySession, async (req, res) => {
    try {
        const { pushEnabled, emailEnabled, announcementTypes, quietHoursStart, quietHoursEnd } = req.body;
        const updates = {};

        if (pushEnabled !== undefined) updates.notifications_enabled = pushEnabled;
        if (emailEnabled !== undefined) updates.email_notifications_enabled = emailEnabled;
        if (announcementTypes || quietHoursStart) {
            updates.notification_preferences = {
                ...(announcementTypes ? { announcementTypes } : {}),
                ...(quietHoursStart ? { quietHours: { start: quietHoursStart, end: quietHoursEnd } } : {})
            };
        }

        await userQueries.update(req.user.uid, updates);
        res.json({ success: true });
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// Send family update notifications
router.post('/family-update', verifySession, async (req, res) => {
    try {
        const { treeId, updateType, updateTitle, updateDescription, targetPersonId } = req.body;
        const userId = req.user.uid;

        if (!treeId || !updateType || !updateTitle) {
            return res.status(400).json({ error: 'Tree ID, update type, and title are required' });
        }

        const tree = await treeQueries.findById(treeId);
        if (!tree) {
            return res.status(404).json({ error: 'Family tree not found' });
        }

        const hasAccess = await treeQueries.hasAccess(treeId, userId);
        if (!hasAccess) {
            return res.status(403).json({ error: 'Access denied to this family tree' });
        }

        const actor = await userQueries.findById(userId);
        const actorName = actor?.display_name || actor?.email?.split('@')[0] || 'A family member';

        // Get all tree members except the actor
        const memberIds = await treeQueries.getMemberIds(treeId);
        const recipientIds = memberIds.filter(id => id !== userId);

        // Include tree owner if not already
        if (tree.owner_id !== userId && !recipientIds.includes(tree.owner_id)) {
            recipientIds.push(tree.owner_id);
        }

        const baseUrl = process.env.APP_URL || 'https://rasin.pyebwa.com';
        let viewUrl = `${baseUrl}/app/dashboard.html`;
        if (targetPersonId) {
            viewUrl = `${baseUrl}/app/member-profile.html?personId=${targetPersonId}`;
        }

        const emailsSent = [];
        const errors = [];

        for (const recipientId of recipientIds) {
            try {
                const recipient = await userQueries.findById(recipientId);
                if (!recipient?.email) continue;

                await emailService.sendFamilyUpdateEmail(recipient.email, {
                    recipientName: recipient.display_name || recipient.email.split('@')[0],
                    familyName: tree.name || 'Family',
                    updateType,
                    updateTitle,
                    updateDescription,
                    actorName,
                    updateTime: new Date().toLocaleDateString(),
                    viewUrl,
                    settingsUrl: `${baseUrl}/app/settings.html`,
                    unsubscribeUrl: `${baseUrl}/app/settings.html#notifications`
                });
                emailsSent.push(recipient.email);
            } catch (err) {
                console.error(`Failed to send email to ${recipientId}:`, err);
                errors.push({ recipientId, error: err.message });
            }
        }

        await adminQueries.logAction('family_update_notification', userId, {
            treeId, updateType, recipientCount: recipientIds.length, emailsSent: emailsSent.length
        }, req.ip);

        res.json({
            success: true,
            recipientCount: recipientIds.length,
            emailsSent: emailsSent.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Error sending family update notifications:', error);
        res.status(500).json({ error: 'Failed to send notifications' });
    }
});

// Send family announcement
router.post('/family-announcement', verifySession, async (req, res) => {
    try {
        const { treeId, subject, title, content, actionUrl, actionText } = req.body;
        const userId = req.user.uid;

        if (!treeId || !subject || !content) {
            return res.status(400).json({ error: 'Tree ID, subject, and content are required' });
        }

        const tree = await treeQueries.findById(treeId);
        if (!tree) {
            return res.status(404).json({ error: 'Family tree not found' });
        }

        if (tree.owner_id !== userId) {
            return res.status(403).json({ error: 'Only tree owner can send announcements' });
        }

        const sender = await userQueries.findById(userId);
        const senderName = sender?.display_name || sender?.email?.split('@')[0] || 'Family Admin';

        const memberIds = await treeQueries.getMemberIds(treeId);
        const emailsSent = [];
        const errors = [];

        for (const memberId of memberIds) {
            if (memberId === userId) continue;
            try {
                const member = await userQueries.findById(memberId);
                if (!member?.email) continue;

                await emailService.sendAnnouncementEmail(member.email, {
                    subject,
                    recipientName: member.display_name || member.email.split('@')[0],
                    familyName: tree.name || 'Family',
                    announcementTitle: title,
                    content,
                    actionUrl,
                    actionText,
                    senderName,
                    senderRole: 'Family Tree Owner',
                    unsubscribeUrl: `${process.env.APP_URL || 'https://rasin.pyebwa.com'}/app/settings.html#notifications`
                });
                emailsSent.push(member.email);
            } catch (err) {
                console.error(`Failed to send announcement to ${memberId}:`, err);
                errors.push({ userId: memberId, error: err.message });
            }
        }

        // Save announcement
        await adminQueries.createAnnouncement({
            tree_id: treeId,
            subject, title, content,
            author_id: userId,
            status: 'published'
        });

        await adminQueries.logAction('family_announcement_sent', userId, {
            treeId, subject, recipientCount: memberIds.length - 1, emailsSent: emailsSent.length
        }, req.ip);

        res.json({
            success: true,
            recipientCount: memberIds.length - 1,
            emailsSent: emailsSent.length,
            errors: errors.length > 0 ? errors : undefined
        });
    } catch (error) {
        console.error('Error sending family announcement:', error);
        res.status(500).json({ error: 'Failed to send announcement' });
    }
});

// Helper to get announcement recipients
async function getAnnouncementRecipients(recipientConfig) {
    if (!recipientConfig) return [];
    try {
        switch (recipientConfig.type) {
            case 'all':
                return userQueries.findAll();
            case 'active':
                return userQueries.findActiveUsers(30);
            case 'new':
                return userQueries.findNewUsers(7);
            case 'custom':
                return recipientConfig.userIds ? userQueries.findByIds(recipientConfig.userIds) : [];
            default:
                return [];
        }
    } catch (error) {
        console.error('Error getting recipients:', error);
        return [];
    }
}

// Push subscription management
const notificationService = require('../notification-service');

// Subscribe to push notifications
router.post('/subscribe', verifySession, async (req, res) => {
    try {
        const { subscription } = req.body;
        if (!subscription || !subscription.endpoint || !subscription.keys) {
            return res.status(400).json({ error: 'Valid push subscription required' });
        }

        await notificationService.subscribe(req.user.uid, subscription);
        res.json({ success: true, message: 'Push subscription saved' });
    } catch (error) {
        console.error('Push subscribe error:', error);
        res.status(500).json({ error: 'Failed to save subscription' });
    }
});

// Unsubscribe from push notifications
router.delete('/unsubscribe', verifySession, async (req, res) => {
    try {
        const { endpoint } = req.body;
        await notificationService.unsubscribe(req.user.uid, endpoint);
        res.json({ success: true, message: 'Push subscription removed' });
    } catch (error) {
        console.error('Push unsubscribe error:', error);
        res.status(500).json({ error: 'Failed to remove subscription' });
    }
});

// Get VAPID public key (no auth required - needed before login for subscription)
router.get('/vapid-key', (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
        return res.status(503).json({ error: 'Push notifications not configured' });
    }
    res.json({ publicKey: key });
});

module.exports = router;
