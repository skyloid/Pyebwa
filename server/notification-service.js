// Push Notification Service using Firebase Admin SDK
const admin = require('firebase-admin');

class NotificationService {
    constructor() {
        this.messaging = admin.messaging();
        this.db = admin.firestore();
        
        // Notification options defaults
        this.defaultOptions = {
            priority: 'high',
            timeToLive: 60 * 60 * 24 * 7, // 7 days
        };
    }
    
    // Send announcement push notification
    async sendAnnouncementNotification(announcement, recipients) {
        try {
            const results = {
                success: 0,
                failure: 0,
                errors: []
            };
            
            // Get FCM tokens for recipients
            const tokens = await this.getRecipientTokens(recipients);
            
            if (tokens.length === 0) {
                console.log('No FCM tokens found for recipients');
                return results;
            }
            
            // Prepare notification payload
            const notification = {
                title: announcement.title,
                body: this.truncateText(this.stripHtml(announcement.content), 150),
                icon: '/app/images/pyebwa-logo.png',
                badge: '/app/images/badge-icon.png'
            };
            
            // Prepare data payload
            const data = {
                type: 'announcement',
                announcementId: announcement.id || '',
                announcementType: announcement.type || 'general',
                priority: announcement.type === 'security' ? 'high' : 'normal',
                url: `/app/announcements/${announcement.id}`,
                timestamp: new Date().toISOString()
            };
            
            // Additional options based on announcement type
            const options = { ...this.defaultOptions };
            
            if (announcement.type === 'security' || announcement.type === 'maintenance') {
                options.priority = 'high';
                options.android = {
                    priority: 'high',
                    notification: {
                        sound: 'default',
                        channelId: 'important_notifications',
                        priority: 'max',
                        visibility: 'public'
                    }
                };
                options.apns = {
                    payload: {
                        aps: {
                            sound: 'default',
                            badge: 1,
                            contentAvailable: true,
                            category: 'IMPORTANT'
                        }
                    }
                };
            }
            
            // Send multicast message (up to 500 tokens at a time)
            const batchSize = 500;
            for (let i = 0; i < tokens.length; i += batchSize) {
                const tokenBatch = tokens.slice(i, i + batchSize);
                
                const message = {
                    notification: notification,
                    data: data,
                    tokens: tokenBatch,
                    ...options
                };
                
                try {
                    const response = await this.messaging.sendMulticast(message);
                    
                    results.success += response.successCount;
                    results.failure += response.failureCount;
                    
                    // Process failures
                    if (response.failureCount > 0) {
                        response.responses.forEach((resp, idx) => {
                            if (!resp.success) {
                                results.errors.push({
                                    token: tokenBatch[idx],
                                    error: resp.error?.message || 'Unknown error'
                                });
                                
                                // Handle invalid tokens
                                if (resp.error?.code === 'messaging/invalid-registration-token' ||
                                    resp.error?.code === 'messaging/registration-token-not-registered') {
                                    this.removeInvalidToken(tokenBatch[idx]);
                                }
                            }
                        });
                    }
                    
                } catch (error) {
                    console.error('Error sending notification batch:', error);
                    results.failure += tokenBatch.length;
                    results.errors.push({
                        batch: Math.floor(i / batchSize) + 1,
                        error: error.message
                    });
                }
            }
            
            // Log notification send
            await this.logNotificationSend(announcement, tokens.length, results);
            
            console.log(`Push notifications sent - Success: ${results.success}, Failure: ${results.failure}`);
            return results;
            
        } catch (error) {
            console.error('Error sending push notifications:', error);
            throw error;
        }
    }
    
    // Send direct notification to specific user
    async sendDirectNotification(userId, notification, data = {}) {
        try {
            // Get user's FCM tokens
            const userDoc = await this.db.collection('users').doc(userId).get();
            if (!userDoc.exists) {
                throw new Error('User not found');
            }
            
            const userData = userDoc.data();
            const tokens = userData.fcmTokens || [];
            
            if (tokens.length === 0) {
                console.log(`No FCM tokens found for user ${userId}`);
                return { success: false, reason: 'No FCM tokens' };
            }
            
            // Send to all user's tokens
            const message = {
                notification: {
                    title: notification.title,
                    body: notification.body,
                    icon: notification.icon || '/app/images/pyebwa-logo.png'
                },
                data: {
                    ...data,
                    userId: userId,
                    timestamp: new Date().toISOString()
                },
                tokens: tokens
            };
            
            const response = await this.messaging.sendMulticast(message);
            
            // Remove invalid tokens
            if (response.failureCount > 0) {
                const tokensToRemove = [];
                response.responses.forEach((resp, idx) => {
                    if (!resp.success && 
                        (resp.error?.code === 'messaging/invalid-registration-token' ||
                         resp.error?.code === 'messaging/registration-token-not-registered')) {
                        tokensToRemove.push(tokens[idx]);
                    }
                });
                
                if (tokensToRemove.length > 0) {
                    await this.removeUserTokens(userId, tokensToRemove);
                }
            }
            
            return {
                success: response.successCount > 0,
                successCount: response.successCount,
                failureCount: response.failureCount
            };
            
        } catch (error) {
            console.error('Error sending direct notification:', error);
            throw error;
        }
    }
    
    // Send topic notification
    async sendTopicNotification(topic, notification, data = {}) {
        try {
            const message = {
                notification: {
                    title: notification.title,
                    body: notification.body,
                    icon: notification.icon || '/app/images/pyebwa-logo.png'
                },
                data: {
                    ...data,
                    topic: topic,
                    timestamp: new Date().toISOString()
                },
                topic: topic,
                ...this.defaultOptions
            };
            
            const response = await this.messaging.send(message);
            console.log(`Topic notification sent to ${topic}:`, response);
            
            return { success: true, messageId: response };
            
        } catch (error) {
            console.error('Error sending topic notification:', error);
            throw error;
        }
    }
    
    // Subscribe tokens to topic
    async subscribeToTopic(tokens, topic) {
        try {
            if (!Array.isArray(tokens)) {
                tokens = [tokens];
            }
            
            const response = await this.messaging.subscribeToTopic(tokens, topic);
            
            console.log(`Subscribed ${response.successCount} tokens to topic ${topic}`);
            
            if (response.failureCount > 0) {
                console.log(`Failed to subscribe ${response.failureCount} tokens`);
                response.errors.forEach(error => {
                    console.error('Subscribe error:', error);
                });
            }
            
            return response;
            
        } catch (error) {
            console.error('Error subscribing to topic:', error);
            throw error;
        }
    }
    
    // Unsubscribe tokens from topic
    async unsubscribeFromTopic(tokens, topic) {
        try {
            if (!Array.isArray(tokens)) {
                tokens = [tokens];
            }
            
            const response = await this.messaging.unsubscribeFromTopic(tokens, topic);
            
            console.log(`Unsubscribed ${response.successCount} tokens from topic ${topic}`);
            
            return response;
            
        } catch (error) {
            console.error('Error unsubscribing from topic:', error);
            throw error;
        }
    }
    
    // Get recipient tokens
    async getRecipientTokens(recipients) {
        const tokens = [];
        const processedUsers = new Set();
        
        for (const recipient of recipients) {
            if (processedUsers.has(recipient.id)) continue;
            processedUsers.add(recipient.id);
            
            try {
                const userDoc = await this.db
                    .collection('users')
                    .doc(recipient.id)
                    .get();
                
                if (userDoc.exists) {
                    const userData = userDoc.data();
                    if (userData.fcmTokens && Array.isArray(userData.fcmTokens)) {
                        // Only add tokens if notifications are enabled
                        if (userData.notificationsEnabled !== false) {
                            tokens.push(...userData.fcmTokens);
                        }
                    }
                }
            } catch (error) {
                console.error(`Error getting tokens for user ${recipient.id}:`, error);
            }
        }
        
        // Remove duplicates
        return [...new Set(tokens)];
    }
    
    // Remove invalid token
    async removeInvalidToken(token) {
        try {
            // Find user with this token
            const usersSnapshot = await this.db
                .collection('users')
                .where('fcmTokens', 'array-contains', token)
                .get();
            
            const batch = this.db.batch();
            
            usersSnapshot.forEach(doc => {
                batch.update(doc.ref, {
                    fcmTokens: admin.firestore.FieldValue.arrayRemove(token)
                });
            });
            
            await batch.commit();
            console.log(`Removed invalid token: ${token}`);
            
        } catch (error) {
            console.error('Error removing invalid token:', error);
        }
    }
    
    // Remove user tokens
    async removeUserTokens(userId, tokens) {
        try {
            await this.db
                .collection('users')
                .doc(userId)
                .update({
                    fcmTokens: admin.firestore.FieldValue.arrayRemove(...tokens)
                });
                
            console.log(`Removed ${tokens.length} tokens from user ${userId}`);
            
        } catch (error) {
            console.error('Error removing user tokens:', error);
        }
    }
    
    // Log notification send
    async logNotificationSend(announcement, recipientCount, results) {
        try {
            await this.db.collection('notification_logs').add({
                type: 'announcement',
                announcementId: announcement.id,
                announcementTitle: announcement.title,
                recipientCount: recipientCount,
                successCount: results.success,
                failureCount: results.failure,
                errors: results.errors.slice(0, 10), // Limit error logs
                timestamp: admin.firestore.FieldValue.serverTimestamp()
            });
            
        } catch (error) {
            console.error('Error logging notification send:', error);
        }
    }
    
    // Get notification statistics
    async getNotificationStats(announcementId) {
        try {
            const logs = await this.db
                .collection('notification_logs')
                .where('announcementId', '==', announcementId)
                .get();
            
            let totalSent = 0;
            let totalSuccess = 0;
            let totalFailure = 0;
            
            logs.forEach(doc => {
                const data = doc.data();
                totalSent += data.recipientCount || 0;
                totalSuccess += data.successCount || 0;
                totalFailure += data.failureCount || 0;
            });
            
            return {
                totalSent,
                totalSuccess,
                totalFailure,
                successRate: totalSent > 0 ? (totalSuccess / totalSent * 100).toFixed(2) : 0
            };
            
        } catch (error) {
            console.error('Error getting notification stats:', error);
            return null;
        }
    }
    
    // Helper functions
    stripHtml(html) {
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }
    
    truncateText(text, length) {
        if (text.length <= length) return text;
        return text.substring(0, length).trim() + '...';
    }
}

// Export singleton instance
module.exports = new NotificationService();