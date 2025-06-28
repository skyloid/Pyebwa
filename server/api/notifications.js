// Notification API Endpoints
const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');
const notificationService = require('../notification-service');
const emailService = require('../services/email');

// Middleware to verify Firebase ID token
const verifyToken = async (req, res, next) => {
    const idToken = req.headers.authorization?.split('Bearer ')[1];
    
    if (!idToken) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        req.user = decodedToken;
        
        // Check if user is admin
        const userDoc = await admin.firestore()
            .collection('users')
            .doc(decodedToken.uid)
            .get();
            
        if (userDoc.exists) {
            const userData = userDoc.data();
            req.isAdmin = userData.isAdmin === true || 
                          ['superadmin', 'admin'].includes(userData.role);
        }
        
        next();
    } catch (error) {
        console.error('Token verification error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Send announcement (admin only)
router.post('/send-announcement', verifyToken, async (req, res) => {
    try {
        // Check admin permission
        if (!req.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const { announcementId } = req.body;
        
        if (!announcementId) {
            return res.status(400).json({ error: 'Announcement ID required' });
        }
        
        // Get announcement
        const announcementDoc = await admin.firestore()
            .collection('announcements')
            .doc(announcementId)
            .get();
            
        if (!announcementDoc.exists) {
            return res.status(404).json({ error: 'Announcement not found' });
        }
        
        const announcement = {
            id: announcementDoc.id,
            ...announcementDoc.data()
        };
        
        // Get target recipients
        const recipients = await getAnnouncementRecipients(announcement.recipients);
        
        const results = {
            totalRecipients: recipients.length,
            notifications: { success: 0, failure: 0 },
            emails: { success: 0, failure: 0 }
        };
        
        // Send push notifications if enabled
        if (announcement.options?.pushNotification) {
            const notificationResults = await notificationService
                .sendAnnouncementNotification(announcement, recipients);
            results.notifications = notificationResults;
        }
        
        // Send emails if enabled
        if (announcement.options?.email) {
            const emailResults = await emailService
                .sendAnnouncementEmail(announcement, recipients);
            results.emails = emailResults;
        }
        
        // Update announcement status
        await admin.firestore()
            .collection('announcements')
            .doc(announcementId)
            .update({
                status: 'published',
                sentAt: admin.firestore.FieldValue.serverTimestamp(),
                sentBy: req.user.uid,
                'stats.sent': recipients.length,
                'stats.notificationsSent': results.notifications.success,
                'stats.emailsSent': results.emails.totalSuccess || 0
            });
        
        res.json({
            success: true,
            results: results
        });
        
    } catch (error) {
        console.error('Error sending announcement:', error);
        res.status(500).json({ error: 'Failed to send announcement' });
    }
});

// Subscribe to push notifications
router.post('/subscribe', verifyToken, async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            return res.status(400).json({ error: 'FCM token required' });
        }
        
        // Save token to user document
        await admin.firestore()
            .collection('users')
            .doc(req.user.uid)
            .update({
                fcmTokens: admin.firestore.FieldValue.arrayUnion(token),
                lastTokenUpdate: admin.firestore.FieldValue.serverTimestamp(),
                notificationsEnabled: true
            });
        
        // Subscribe to user-specific topic
        await notificationService.subscribeToTopic(token, `user-${req.user.uid}`);
        
        // Subscribe to general announcements topic
        await notificationService.subscribeToTopic(token, 'all-users');
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error subscribing to notifications:', error);
        res.status(500).json({ error: 'Failed to subscribe' });
    }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', verifyToken, async (req, res) => {
    try {
        const { token } = req.body;
        
        if (!token) {
            // Remove all tokens
            await admin.firestore()
                .collection('users')
                .doc(req.user.uid)
                .update({
                    fcmTokens: [],
                    notificationsEnabled: false
                });
        } else {
            // Remove specific token
            await admin.firestore()
                .collection('users')
                .doc(req.user.uid)
                .update({
                    fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
                });
                
            // Unsubscribe from topics
            await notificationService.unsubscribeFromTopic(token, `user-${req.user.uid}`);
            await notificationService.unsubscribeFromTopic(token, 'all-users');
        }
        
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error unsubscribing from notifications:', error);
        res.status(500).json({ error: 'Failed to unsubscribe' });
    }
});

// Update notification preferences
router.put('/preferences', verifyToken, async (req, res) => {
    try {
        const { 
            pushEnabled, 
            emailEnabled, 
            announcementTypes,
            quietHoursStart,
            quietHoursEnd 
        } = req.body;
        
        const updates = {};
        
        if (pushEnabled !== undefined) {
            updates.notificationsEnabled = pushEnabled;
        }
        
        if (emailEnabled !== undefined) {
            updates.emailNotificationsEnabled = emailEnabled;
        }
        
        if (announcementTypes) {
            updates.notificationPreferences = {
                announcementTypes: announcementTypes
            };
        }
        
        if (quietHoursStart && quietHoursEnd) {
            updates['notificationPreferences.quietHours'] = {
                start: quietHoursStart,
                end: quietHoursEnd
            };
        }
        
        await admin.firestore()
            .collection('users')
            .doc(req.user.uid)
            .update(updates);
            
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ error: 'Failed to update preferences' });
    }
});

// Get notification statistics (admin only)
router.get('/stats/:announcementId', verifyToken, async (req, res) => {
    try {
        if (!req.isAdmin) {
            return res.status(403).json({ error: 'Admin access required' });
        }
        
        const { announcementId } = req.params;
        
        const [notificationStats, emailStats] = await Promise.all([
            notificationService.getNotificationStats(announcementId),
            emailService.getEmailStats(announcementId)
        ]);
        
        res.json({
            notifications: notificationStats,
            emails: emailStats
        });
        
    } catch (error) {
        console.error('Error getting notification stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// Send test notification
router.post('/test', verifyToken, async (req, res) => {
    try {
        const result = await notificationService.sendDirectNotification(
            req.user.uid,
            {
                title: 'Test Notification',
                body: 'This is a test notification from Pyebwa'
            },
            {
                type: 'test',
                timestamp: new Date().toISOString()
            }
        );
        
        res.json(result);
        
    } catch (error) {
        console.error('Error sending test notification:', error);
        res.status(500).json({ error: 'Failed to send test notification' });
    }
});

// Helper function to get announcement recipients
async function getAnnouncementRecipients(recipientConfig) {
    const recipients = [];
    
    try {
        let query = admin.firestore().collection('users');
        
        switch (recipientConfig.type) {
            case 'all':
                // Get all users
                const allSnapshot = await query.get();
                allSnapshot.forEach(doc => {
                    recipients.push({ id: doc.id, ...doc.data() });
                });
                break;
                
            case 'active':
                // Get active users (last 30 days)
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                const activeSnapshot = await query
                    .where('lastActive', '>=', thirtyDaysAgo)
                    .get();
                activeSnapshot.forEach(doc => {
                    recipients.push({ id: doc.id, ...doc.data() });
                });
                break;
                
            case 'new':
                // Get new users (last 7 days)
                const sevenDaysAgo = new Date();
                sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
                const newSnapshot = await query
                    .where('createdAt', '>=', sevenDaysAgo)
                    .get();
                newSnapshot.forEach(doc => {
                    recipients.push({ id: doc.id, ...doc.data() });
                });
                break;
                
            case 'custom':
                // Get specific users
                if (recipientConfig.userIds && recipientConfig.userIds.length > 0) {
                    for (const userId of recipientConfig.userIds) {
                        const userDoc = await admin.firestore()
                            .collection('users')
                            .doc(userId)
                            .get();
                        if (userDoc.exists) {
                            recipients.push({ id: userDoc.id, ...userDoc.data() });
                        }
                    }
                }
                break;
        }
        
        // Filter out users who have disabled notifications if needed
        return recipients.filter(user => {
            // Check push notification preference
            if (recipientConfig.respectPreferences) {
                return user.notificationsEnabled !== false;
            }
            return true;
        });
        
    } catch (error) {
        console.error('Error getting recipients:', error);
        return recipients;
    }
}

// Send family update notifications
router.post('/family-update', verifyToken, async (req, res) => {
    try {
        const { treeId, updateType, updateTitle, updateDescription, targetPersonId } = req.body;
        const userId = req.user.uid;
        
        if (!treeId || !updateType || !updateTitle) {
            return res.status(400).json({ error: 'Tree ID, update type, and title are required' });
        }
        
        // Verify user has access to this tree
        const treeDoc = await admin.firestore().collection('familyTrees').doc(treeId).get();
        if (!treeDoc.exists) {
            return res.status(404).json({ error: 'Family tree not found' });
        }
        
        const treeData = treeDoc.data();
        if (treeData.createdBy !== userId && !treeData.collaborators?.includes(userId)) {
            return res.status(403).json({ error: 'Access denied to this family tree' });
        }
        
        // Get actor information
        const actorDoc = await admin.firestore().collection('users').doc(userId).get();
        const actorData = actorDoc.data();
        const actorName = actorData?.displayName || actorData?.email?.split('@')[0] || 'A family member';
        
        // Get collaborators
        const recipients = new Set();
        
        // Add tree owner
        if (treeData.createdBy !== userId) {
            recipients.add(treeData.createdBy);
        }
        
        // Add collaborators
        if (treeData.collaborators) {
            treeData.collaborators.forEach(collaboratorId => {
                if (collaboratorId !== userId) {
                    recipients.add(collaboratorId);
                }
            });
        }
        
        // Prepare email data
        const baseUrl = process.env.APP_URL || 'https://rasin.pyebwa.com';
        let viewUrl = `${baseUrl}/app/dashboard.html`;
        
        if (targetPersonId) {
            viewUrl = `${baseUrl}/app/member-profile.html?personId=${targetPersonId}`;
        }
        
        const emailsSent = [];
        const errors = [];
        
        // Send emails to all recipients
        for (const recipientId of recipients) {
            try {
                // Get recipient data
                const recipientDoc = await admin.firestore().collection('users').doc(recipientId).get();
                if (!recipientDoc.exists) continue;
                
                const recipientData = recipientDoc.data();
                const recipientEmail = recipientData.email;
                
                if (!recipientEmail) continue;
                
                const recipientName = recipientData.displayName || recipientEmail.split('@')[0];
                
                // Send email
                await emailService.sendFamilyUpdateEmail(recipientEmail, {
                    recipientName: recipientName,
                    familyName: treeData.name || 'Family',
                    updateType: updateType,
                    updateTitle: updateTitle,
                    updateDescription: updateDescription,
                    actorName: actorName,
                    updateTime: new Date().toLocaleDateString(),
                    viewUrl: viewUrl,
                    settingsUrl: `${baseUrl}/app/settings.html`,
                    unsubscribeUrl: `${baseUrl}/app/settings.html#notifications`
                });
                
                emailsSent.push(recipientEmail);
                
            } catch (error) {
                console.error(`Failed to send email to recipient ${recipientId}:`, error);
                errors.push({ recipientId, error: error.message });
            }
        }
        
        // Log the notification
        await admin.firestore().collection('admin_logs').add({
            action: 'family_update_notification',
            userId: userId,
            treeId: treeId,
            updateType: updateType,
            recipientCount: recipients.size,
            emailsSent: emailsSent.length,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({
            success: true,
            recipientCount: recipients.size,
            emailsSent: emailsSent.length,
            errors: errors.length > 0 ? errors : undefined
        });
        
    } catch (error) {
        console.error('Error sending family update notifications:', error);
        res.status(500).json({ error: 'Failed to send notifications' });
    }
});

// Send announcement to family tree members
router.post('/family-announcement', verifyToken, async (req, res) => {
    try {
        const { treeId, subject, title, content, actionUrl, actionText } = req.body;
        const userId = req.user.uid;
        
        if (!treeId || !subject || !content) {
            return res.status(400).json({ error: 'Tree ID, subject, and content are required' });
        }
        
        // Verify user has access to this tree and is admin
        const treeDoc = await admin.firestore().collection('familyTrees').doc(treeId).get();
        if (!treeDoc.exists) {
            return res.status(404).json({ error: 'Family tree not found' });
        }
        
        const treeData = treeDoc.data();
        if (treeData.createdBy !== userId) {
            return res.status(403).json({ error: 'Only tree owner can send announcements' });
        }
        
        // Get sender information
        const senderDoc = await admin.firestore().collection('users').doc(userId).get();
        const senderData = senderDoc.data();
        const senderName = senderData?.displayName || senderData?.email?.split('@')[0] || 'Family Admin';
        
        // Get all users who have access to this tree
        const usersSnapshot = await admin.firestore().collection('users')
            .where('familyTrees', 'array-contains', treeId)
            .get();
        
        const emailsSent = [];
        const errors = [];
        
        // Send announcement to all family members
        for (const userDoc of usersSnapshot.docs) {
            try {
                const userData = userDoc.data();
                const userEmail = userData.email;
                
                if (!userEmail || userDoc.id === userId) continue; // Skip sender
                
                const recipientName = userData.displayName || userEmail.split('@')[0];
                
                // Send email
                await emailService.sendAnnouncementEmail(userEmail, {
                    subject: subject,
                    recipientName: recipientName,
                    familyName: treeData.name || 'Family',
                    announcementTitle: title,
                    content: content,
                    actionUrl: actionUrl,
                    actionText: actionText,
                    senderName: senderName,
                    senderRole: 'Family Tree Owner',
                    unsubscribeUrl: `${process.env.APP_URL || 'https://rasin.pyebwa.com'}/app/settings.html#notifications`
                });
                
                emailsSent.push(userEmail);
                
            } catch (error) {
                console.error(`Failed to send announcement to user ${userDoc.id}:`, error);
                errors.push({ userId: userDoc.id, error: error.message });
            }
        }
        
        // Save announcement to database
        await admin.firestore().collection('announcements').add({
            treeId: treeId,
            subject: subject,
            title: title,
            content: content,
            actionUrl: actionUrl,
            actionText: actionText,
            sentBy: userId,
            sentAt: admin.firestore.FieldValue.serverTimestamp(),
            recipientCount: usersSnapshot.size - 1, // Exclude sender
            emailsSent: emailsSent.length
        });
        
        // Log the activity
        await admin.firestore().collection('admin_logs').add({
            action: 'family_announcement_sent',
            userId: userId,
            treeId: treeId,
            subject: subject,
            recipientCount: usersSnapshot.size - 1,
            emailsSent: emailsSent.length,
            timestamp: admin.firestore.FieldValue.serverTimestamp()
        });
        
        res.json({
            success: true,
            recipientCount: usersSnapshot.size - 1,
            emailsSent: emailsSent.length,
            errors: errors.length > 0 ? errors : undefined
        });
        
    } catch (error) {
        console.error('Error sending family announcement:', error);
        res.status(500).json({ error: 'Failed to send announcement' });
    }
});

module.exports = router;