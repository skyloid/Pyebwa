// Push Notifications Service
(function() {
    'use strict';
    
    const PushNotificationService = {
        messaging: null,
        currentToken: null,
        initialized: false,
        
        // Initialize push notifications
        async init() {
            try {
                // Check if notifications are supported
                if (!('Notification' in window)) {
                    console.log('This browser does not support notifications');
                    return false;
                }
                
                // Check if Firebase is initialized
                if (!window.firebase || !window.firebase.messaging) {
                    console.error('Firebase messaging not initialized');
                    return false;
                }
                
                // Get messaging instance
                this.messaging = firebase.messaging();
                
                // Register service worker
                await this.registerServiceWorker();
                
                // Setup message handlers
                this.setupMessageHandlers();
                
                // Check current permission status
                const permission = Notification.permission;
                console.log('Current notification permission:', permission);
                
                if (permission === 'granted') {
                    // Get token if already granted
                    await this.getToken();
                }
                
                this.initialized = true;
                return true;
                
            } catch (error) {
                console.error('Error initializing push notifications:', error);
                return false;
            }
        },
        
        // Register service worker
        async registerServiceWorker() {
            try {
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
                    console.log('Service Worker registered:', registration);
                    
                    // Use the service worker registration for messaging
                    this.messaging.useServiceWorker(registration);
                    
                    return registration;
                }
            } catch (error) {
                console.error('Service Worker registration failed:', error);
                throw error;
            }
        },
        
        // Request notification permission
        async requestPermission() {
            try {
                const permission = await Notification.requestPermission();
                console.log('Notification permission:', permission);
                
                if (permission === 'granted') {
                    // Get FCM token
                    const token = await this.getToken();
                    if (token) {
                        // Save token to user profile
                        await this.saveTokenToUser(token);
                        
                        // Update UI
                        this.updatePermissionUI(true);
                        
                        return true;
                    }
                } else {
                    console.log('Notification permission denied');
                    this.updatePermissionUI(false);
                    return false;
                }
                
            } catch (error) {
                console.error('Error requesting permission:', error);
                return false;
            }
        },
        
        // Get FCM token
        async getToken() {
            try {
                const token = await this.messaging.getToken({
                    vapidKey: 'YOUR_VAPID_KEY_HERE' // You need to generate this in Firebase Console
                });
                
                if (token) {
                    console.log('FCM Token:', token);
                    this.currentToken = token;
                    
                    // Monitor token refresh
                    this.monitorTokenRefresh();
                    
                    return token;
                } else {
                    console.log('No registration token available');
                    return null;
                }
                
            } catch (error) {
                console.error('Error getting token:', error);
                return null;
            }
        },
        
        // Monitor token refresh
        monitorTokenRefresh() {
            this.messaging.onTokenRefresh(async () => {
                try {
                    const refreshedToken = await this.messaging.getToken();
                    console.log('Token refreshed:', refreshedToken);
                    
                    // Update token in user profile
                    await this.saveTokenToUser(refreshedToken);
                    
                    this.currentToken = refreshedToken;
                    
                } catch (error) {
                    console.error('Unable to refresh token:', error);
                }
            });
        },
        
        // Setup message handlers
        setupMessageHandlers() {
            // Handle foreground messages
            this.messaging.onMessage((payload) => {
                console.log('Message received in foreground:', payload);
                
                // Show in-app notification
                this.showInAppNotification(payload);
                
                // Trigger custom event
                window.dispatchEvent(new CustomEvent('pushNotificationReceived', {
                    detail: payload
                }));
            });
        },
        
        // Save token to user profile
        async saveTokenToUser(token) {
            try {
                const user = firebase.auth().currentUser;
                if (!user) {
                    console.log('No user signed in');
                    return;
                }
                
                // Save token to user document
                await firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .update({
                        fcmTokens: firebase.firestore.FieldValue.arrayUnion(token),
                        lastTokenUpdate: firebase.firestore.FieldValue.serverTimestamp(),
                        notificationsEnabled: true
                    });
                
                console.log('Token saved to user profile');
                
            } catch (error) {
                console.error('Error saving token:', error);
            }
        },
        
        // Remove token from user profile
        async removeTokenFromUser(token) {
            try {
                const user = firebase.auth().currentUser;
                if (!user) return;
                
                await firebase.firestore()
                    .collection('users')
                    .doc(user.uid)
                    .update({
                        fcmTokens: firebase.firestore.FieldValue.arrayRemove(token || this.currentToken),
                        notificationsEnabled: false
                    });
                
                console.log('Token removed from user profile');
                
            } catch (error) {
                console.error('Error removing token:', error);
            }
        },
        
        // Show in-app notification
        showInAppNotification(payload) {
            // Create notification element
            const notification = document.createElement('div');
            notification.className = 'in-app-notification';
            notification.innerHTML = `
                <div class="notification-content">
                    <div class="notification-icon">
                        <span class="material-icons">${this.getNotificationIcon(payload.data?.type)}</span>
                    </div>
                    <div class="notification-body">
                        <h4>${payload.notification?.title || 'Notification'}</h4>
                        <p>${payload.notification?.body || ''}</p>
                    </div>
                    <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                ${payload.data?.announcementId ? `
                    <div class="notification-actions">
                        <button class="btn btn-sm btn-primary" onclick="PushNotificationService.viewAnnouncement('${payload.data.announcementId}')">
                            View Announcement
                        </button>
                    </div>
                ` : ''}
            `;
            
            // Add styles if not already added
            if (!document.querySelector('#in-app-notification-styles')) {
                const styles = document.createElement('style');
                styles.id = 'in-app-notification-styles';
                styles.textContent = `
                    .in-app-notification {
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        max-width: 400px;
                        background: white;
                        border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        z-index: 10000;
                        animation: slideInRight 0.3s ease;
                        overflow: hidden;
                    }
                    .notification-content {
                        display: flex;
                        align-items: flex-start;
                        padding: 16px;
                        gap: 12px;
                    }
                    .notification-icon {
                        flex-shrink: 0;
                        width: 40px;
                        height: 40px;
                        background: #00217D;
                        color: white;
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                    }
                    .notification-body {
                        flex: 1;
                    }
                    .notification-body h4 {
                        margin: 0 0 4px 0;
                        font-size: 16px;
                        font-weight: 600;
                    }
                    .notification-body p {
                        margin: 0;
                        font-size: 14px;
                        color: #666;
                    }
                    .notification-close {
                        background: none;
                        border: none;
                        cursor: pointer;
                        color: #999;
                        padding: 4px;
                    }
                    .notification-actions {
                        padding: 12px 16px;
                        background: #f8f9fa;
                        border-top: 1px solid #e9ecef;
                    }
                    @keyframes slideInRight {
                        from { transform: translateX(100%); opacity: 0; }
                        to { transform: translateX(0); opacity: 1; }
                    }
                    @media (max-width: 480px) {
                        .in-app-notification {
                            left: 10px;
                            right: 10px;
                            max-width: none;
                        }
                    }
                `;
                document.head.appendChild(styles);
            }
            
            // Add to page
            document.body.appendChild(notification);
            
            // Auto remove after 10 seconds
            setTimeout(() => {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }, 10000);
        },
        
        // Get notification icon based on type
        getNotificationIcon(type) {
            const icons = {
                announcement: 'campaign',
                update: 'update',
                maintenance: 'engineering',
                feature: 'new_releases',
                security: 'security',
                message: 'message',
                alert: 'warning'
            };
            return icons[type] || 'notifications';
        },
        
        // View announcement
        viewAnnouncement(announcementId) {
            // Navigate to announcement view
            window.location.href = `/app/announcements/${announcementId}`;
        },
        
        // Update permission UI
        updatePermissionUI(enabled) {
            // Update any UI elements that show notification status
            const statusElements = document.querySelectorAll('.notification-status');
            statusElements.forEach(el => {
                el.textContent = enabled ? 'Enabled' : 'Disabled';
                el.className = `notification-status ${enabled ? 'enabled' : 'disabled'}`;
            });
            
            // Update toggle switches
            const toggles = document.querySelectorAll('.notification-toggle');
            toggles.forEach(toggle => {
                toggle.checked = enabled;
            });
        },
        
        // Disable notifications
        async disableNotifications() {
            try {
                // Delete token
                if (this.currentToken) {
                    await this.messaging.deleteToken(this.currentToken);
                    await this.removeTokenFromUser(this.currentToken);
                    this.currentToken = null;
                }
                
                // Update UI
                this.updatePermissionUI(false);
                
                console.log('Notifications disabled');
                return true;
                
            } catch (error) {
                console.error('Error disabling notifications:', error);
                return false;
            }
        },
        
        // Check if notifications are enabled
        isEnabled() {
            return Notification.permission === 'granted' && this.currentToken !== null;
        },
        
        // Subscribe to topic
        async subscribeToTopic(topic) {
            try {
                if (!this.currentToken) {
                    console.log('No token available');
                    return false;
                }
                
                // This would typically call a server endpoint to subscribe the token to a topic
                const response = await fetch('/api/notifications/subscribe', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        token: this.currentToken,
                        topic: topic
                    })
                });
                
                if (response.ok) {
                    console.log(`Subscribed to topic: ${topic}`);
                    return true;
                }
                
                return false;
                
            } catch (error) {
                console.error('Error subscribing to topic:', error);
                return false;
            }
        },
        
        // Send test notification
        async sendTestNotification() {
            try {
                const notification = new Notification('Test Notification', {
                    body: 'This is a test notification from Pyebwa',
                    icon: '/app/images/pyebwa-logo.png',
                    badge: '/app/images/badge-icon.png',
                    tag: 'test',
                    requireInteraction: false
                });
                
                notification.onclick = () => {
                    console.log('Test notification clicked');
                    window.focus();
                    notification.close();
                };
                
                return true;
                
            } catch (error) {
                console.error('Error sending test notification:', error);
                return false;
            }
        }
    };
    
    // Export for use
    window.PushNotificationService = PushNotificationService;
    
    // Auto-initialize when user is authenticated
    firebase.auth().onAuthStateChanged((user) => {
        if (user && !PushNotificationService.initialized) {
            PushNotificationService.init();
        }
    });
})();