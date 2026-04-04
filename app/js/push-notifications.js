// Push Notifications Service - Web Push (VAPID)
(function() {
    'use strict';

    const PushNotificationService = {
        registration: null,
        subscription: null,
        initialized: false,
        vapidPublicKey: null,

        async init() {
            try {
                if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
                    console.log('[Push] Browser does not support push notifications');
                    return false;
                }

                // Fetch VAPID public key from server
                try {
                    const res = await fetch('/api/notifications/vapid-key');
                    if (res.ok) {
                        const data = await res.json();
                        this.vapidPublicKey = data.publicKey;
                    }
                } catch (e) {
                    console.warn('[Push] Could not fetch VAPID key:', e.message);
                    return false;
                }

                if (!this.vapidPublicKey) {
                    console.warn('[Push] VAPID key not available');
                    return false;
                }

                // Register service worker
                this.registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                console.log('[Push] Service Worker registered');

                // Check existing subscription
                this.subscription = await this.registration.pushManager.getSubscription();
                if (this.subscription) {
                    console.log('[Push] Existing subscription found');
                }

                this.initialized = true;
                return true;
            } catch (error) {
                console.error('[Push] Init error:', error);
                return false;
            }
        },

        async requestPermission() {
            try {
                const permission = await Notification.requestPermission();
                console.log('[Push] Permission:', permission);

                if (permission === 'granted') {
                    await this.subscribe();
                    this.updatePermissionUI(true);
                    return true;
                }

                this.updatePermissionUI(false);
                return false;
            } catch (error) {
                console.error('[Push] Permission error:', error);
                return false;
            }
        },

        async subscribe() {
            try {
                if (!this.registration || !this.vapidPublicKey) return null;

                // Convert VAPID key to Uint8Array
                const applicationServerKey = this.urlBase64ToUint8Array(this.vapidPublicKey);

                this.subscription = await this.registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey
                });

                console.log('[Push] Subscribed:', this.subscription.endpoint);

                // Send subscription to server
                await this.saveSubscriptionToServer(this.subscription);

                return this.subscription;
            } catch (error) {
                console.error('[Push] Subscribe error:', error);
                return null;
            }
        },

        async saveSubscriptionToServer(subscription) {
            try {
                const token = await this.getAuthToken();
                if (!token) return;

                const res = await fetch('/api/notifications/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer ' + token
                    },
                    body: JSON.stringify({ subscription: subscription.toJSON() })
                });

                if (!res.ok) throw new Error('Server rejected subscription');
                console.log('[Push] Subscription saved to server');
            } catch (error) {
                console.error('[Push] Save subscription error:', error);
            }
        },

        async disableNotifications() {
            try {
                if (this.subscription) {
                    // Remove from server
                    const token = await this.getAuthToken();
                    if (token) {
                        await fetch('/api/notifications/unsubscribe', {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': 'Bearer ' + token
                            },
                            body: JSON.stringify({ endpoint: this.subscription.endpoint })
                        });
                    }

                    // Unsubscribe locally
                    await this.subscription.unsubscribe();
                    this.subscription = null;
                }

                this.updatePermissionUI(false);
                console.log('[Push] Notifications disabled');
                return true;
            } catch (error) {
                console.error('[Push] Disable error:', error);
                return false;
            }
        },

        isEnabled() {
            return Notification.permission === 'granted' && this.subscription !== null;
        },

        // In-app notification display
        showInAppNotification(payload) {
            const notification = document.createElement('div');
            notification.className = 'in-app-notification';
            notification.innerHTML = `
                <div class="notification-content">
                    <div class="notification-icon">
                        <span class="material-icons">${this.getNotificationIcon(payload.data?.type)}</span>
                    </div>
                    <div class="notification-body">
                        <h4>${payload.title || 'Notification'}</h4>
                        <p>${payload.body || ''}</p>
                    </div>
                    <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
            `;

            if (!document.querySelector('#in-app-notification-styles')) {
                const styles = document.createElement('style');
                styles.id = 'in-app-notification-styles';
                styles.textContent = `
                    .in-app-notification { position: fixed; top: 20px; right: 20px; max-width: 400px; background: white; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 10000; animation: slideInRight 0.3s ease; overflow: hidden; }
                    .notification-content { display: flex; align-items: flex-start; padding: 16px; gap: 12px; }
                    .notification-icon { flex-shrink: 0; width: 40px; height: 40px; background: #00217D; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; }
                    .notification-body { flex: 1; }
                    .notification-body h4 { margin: 0 0 4px 0; font-size: 16px; font-weight: 600; }
                    .notification-body p { margin: 0; font-size: 14px; color: #666; }
                    .notification-close { background: none; border: none; cursor: pointer; color: #999; padding: 4px; }
                    @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                    @media (max-width: 480px) { .in-app-notification { left: 10px; right: 10px; max-width: none; } }
                `;
                document.head.appendChild(styles);
            }

            document.body.appendChild(notification);
            setTimeout(() => {
                if (notification.parentElement) notification.remove();
            }, 10000);
        },

        getNotificationIcon(type) {
            const icons = { announcement: 'campaign', update: 'update', maintenance: 'engineering', feature: 'new_releases', security: 'security', message: 'message', alert: 'warning' };
            return icons[type] || 'notifications';
        },

        updatePermissionUI(enabled) {
            document.querySelectorAll('.notification-status').forEach(el => {
                el.textContent = enabled ? 'Enabled' : 'Disabled';
                el.className = 'notification-status ' + (enabled ? 'enabled' : 'disabled');
            });
            document.querySelectorAll('.notification-toggle').forEach(toggle => { toggle.checked = enabled; });
        },

        async sendTestNotification() {
            try {
                new Notification('Test Notification', {
                    body: 'This is a test notification from Pyebwa',
                    icon: '/app/images/pyebwa-logo.png'
                });
                return true;
            } catch (error) {
                console.error('[Push] Test notification error:', error);
                return false;
            }
        },

        // Helper: get current auth token
        async getAuthToken() {
            const client = window.supabaseClient;
            if (!client) return null;
            const { data: { session } } = await client.auth.getSession();
            return session ? session.access_token : null;
        },

        // Helper: convert VAPID key
        urlBase64ToUint8Array(base64String) {
            const padding = '='.repeat((4 - base64String.length % 4) % 4);
            const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
            const rawData = window.atob(base64);
            const outputArray = new Uint8Array(rawData.length);
            for (let i = 0; i < rawData.length; ++i) {
                outputArray[i] = rawData.charCodeAt(i);
            }
            return outputArray;
        }
    };

    window.PushNotificationService = PushNotificationService;

    // Auto-initialize when authenticated
    if (window.PyebwaAPI) {
        PyebwaAPI.onAuthStateChanged((user) => {
            if (user && !PushNotificationService.initialized) {
                PushNotificationService.init();
            }
        });
    } else {
        window.addEventListener('apiClientReady', () => {
            PyebwaAPI.onAuthStateChanged((user) => {
                if (user && !PushNotificationService.initialized) {
                    PushNotificationService.init();
                }
            });
        });
    }
})();
