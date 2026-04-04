const webpush = require('web-push');
const { query } = require('./db/pool');

class NotificationService {
    constructor() {
        const publicKey = process.env.VAPID_PUBLIC_KEY;
        const privateKey = process.env.VAPID_PRIVATE_KEY;
        const email = process.env.VAPID_EMAIL || 'mailto:noreply@pyebwa.com';

        if (publicKey && privateKey) {
            webpush.setVapidDetails(email, publicKey, privateKey);
            this.enabled = true;
            console.log('[NotificationService] Web Push initialized with VAPID keys');
        } else {
            this.enabled = false;
            console.warn('[NotificationService] VAPID keys not configured - push notifications disabled');
        }
    }

    // Save a push subscription for a user
    async subscribe(userId, subscription) {
        const { endpoint, keys } = subscription;
        await query(
            `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth_key)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, endpoint) DO UPDATE SET
                p256dh = EXCLUDED.p256dh,
                auth_key = EXCLUDED.auth_key,
                created_at = NOW()`,
            [userId, endpoint, keys.p256dh, keys.auth]
        );
    }

    // Remove a push subscription
    async unsubscribe(userId, endpoint) {
        if (endpoint) {
            await query(
                'DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2',
                [userId, endpoint]
            );
        } else {
            await query('DELETE FROM push_subscriptions WHERE user_id = $1', [userId]);
        }
    }

    // Send push to a single user
    async sendDirectNotification(userId, notification, data = {}) {
        if (!this.enabled) {
            return { success: false, reason: 'Push notifications not configured' };
        }

        const result = await query(
            'SELECT endpoint, p256dh, auth_key FROM push_subscriptions WHERE user_id = $1',
            [userId]
        );

        if (result.rows.length === 0) {
            return { success: false, reason: 'No push subscription found' };
        }

        const payload = JSON.stringify({
            title: notification.title,
            body: notification.body,
            icon: notification.icon || '/app/images/pyebwa-logo.png',
            badge: '/app/images/badge-icon.png',
            data
        });

        let success = 0;
        let failure = 0;

        for (const row of result.rows) {
            const subscription = {
                endpoint: row.endpoint,
                keys: { p256dh: row.p256dh, auth: row.auth_key }
            };

            try {
                await webpush.sendNotification(subscription, payload);
                success++;
            } catch (error) {
                failure++;
                // Remove stale subscriptions (410 Gone or 404)
                if (error.statusCode === 410 || error.statusCode === 404) {
                    await query(
                        'DELETE FROM push_subscriptions WHERE endpoint = $1',
                        [row.endpoint]
                    );
                }
            }
        }

        return { success: success > 0, sent: success, failed: failure };
    }

    // Send push to multiple users (announcement)
    async sendAnnouncementNotification(announcement, recipients) {
        if (!this.enabled) {
            console.log(`[NotificationService] Push skipped (not configured): ${announcement.title}`);
            const results = { success: 0, failure: 0, errors: [] };
            await this.logNotificationSend(announcement, recipients.length, results);
            return results;
        }

        const notification = {
            title: announcement.title || 'Pyebwa Announcement',
            body: this.truncateText(this.stripHtml(announcement.content || ''), 200),
            icon: '/app/images/pyebwa-logo.png'
        };

        const data = {
            announcementId: announcement.id,
            type: 'announcement',
            url: '/app/'
        };

        let success = 0;
        let failure = 0;

        for (const userId of recipients) {
            const result = await this.sendDirectNotification(userId, notification, data);
            if (result.success) success += (result.sent || 1);
            else failure++;
        }

        const results = { success, failure, errors: [] };
        await this.logNotificationSend(announcement, recipients.length, results);
        return results;
    }

    async logNotificationSend(announcement, recipientCount, results) {
        try {
            await query(
                'INSERT INTO admin_logs (action, details) VALUES ($1, $2)',
                ['notification_send', JSON.stringify({
                    type: 'announcement',
                    announcementId: announcement.id,
                    announcementTitle: announcement.title,
                    recipientCount,
                    successCount: results.success,
                    failureCount: results.failure,
                    timestamp: new Date().toISOString()
                })]
            );
        } catch (error) {
            console.error('Error logging notification send:', error);
        }
    }

    async getNotificationStats(announcementId) {
        try {
            const result = await query(
                `SELECT details FROM admin_logs
                 WHERE action = 'notification_send' AND details->>'announcementId' = $1`,
                [announcementId]
            );

            let totalSent = 0, totalSuccess = 0, totalFailure = 0;
            for (const row of result.rows) {
                const data = row.details;
                totalSent += data.recipientCount || 0;
                totalSuccess += data.successCount || 0;
                totalFailure += data.failureCount || 0;
            }

            return {
                totalSent, totalSuccess, totalFailure,
                successRate: totalSent > 0 ? (totalSuccess / totalSent * 100).toFixed(2) : 0
            };
        } catch (error) {
            console.error('Error getting notification stats:', error);
            return null;
        }
    }

    stripHtml(html) {
        return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    }

    truncateText(text, length) {
        if (text.length <= length) return text;
        return text.substring(0, length).trim() + '...';
    }
}

module.exports = new NotificationService();
