// Service Worker Registration and Management
(function() {
    'use strict';
    
    const SWManager = {
        registration: null,
        updateAvailable: false,
        
        // Initialize service worker
        async init() {
            if (!('serviceWorker' in navigator)) {
                console.log('Service Worker not supported');
                return;
            }
            
            try {
                // Register service worker
                this.registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });
                
                console.log('Service Worker registered:', this.registration);
                
                // Setup event listeners
                this.setupEventListeners();
                
                // Check for updates
                this.checkForUpdates();
                
                // Handle offline/online status
                this.setupNetworkListeners();
                
            } catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        },
        
        // Setup event listeners
        setupEventListeners() {
            // Listen for service worker updates
            this.registration.addEventListener('updatefound', () => {
                const newWorker = this.registration.installing;
                
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New content available
                        this.updateAvailable = true;
                        this.showUpdateNotification();
                    }
                });
            });
            
            // Listen for messages from service worker
            navigator.serviceWorker.addEventListener('message', event => {
                this.handleSWMessage(event.data);
            });
            
            // Handle controller change
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                // Service worker updated, reload page
                window.location.reload();
            });
        },
        
        // Setup network status listeners
        setupNetworkListeners() {
            let isOffline = !navigator.onLine;
            
            // Show offline indicator
            if (isOffline) {
                this.showOfflineIndicator();
            }
            
            // Listen for online/offline events
            window.addEventListener('online', () => {
                console.log('Back online');
                this.hideOfflineIndicator();
                this.syncOfflineData();
            });
            
            window.addEventListener('offline', () => {
                console.log('Gone offline');
                this.showOfflineIndicator();
            });
        },
        
        // Show update notification
        showUpdateNotification() {
            const notification = document.createElement('div');
            notification.className = 'sw-update-notification';
            notification.innerHTML = `
                <div class="sw-update-content">
                    <span>A new version of Pyebwa is available!</span>
                    <button onclick="window.swManager.applyUpdate()">Update Now</button>
                    <button onclick="this.parentElement.parentElement.remove()">Later</button>
                </div>
            `;
            
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .sw-update-notification {
                    position: fixed;
                    bottom: 20px;
                    left: 50%;
                    transform: translateX(-50%);
                    background: #00217D;
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    z-index: 10000;
                    animation: slideUp 0.3s ease-out;
                }
                
                @keyframes slideUp {
                    from {
                        transform: translateX(-50%) translateY(100px);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(-50%) translateY(0);
                        opacity: 1;
                    }
                }
                
                .sw-update-content {
                    display: flex;
                    align-items: center;
                    gap: 15px;
                }
                
                .sw-update-notification button {
                    background: white;
                    color: #00217D;
                    border: none;
                    padding: 6px 15px;
                    border-radius: 4px;
                    cursor: pointer;
                    font-size: 14px;
                }
                
                .sw-update-notification button:hover {
                    background: #f0f0f0;
                }
            `;
            
            if (!document.querySelector('#sw-notification-styles')) {
                style.id = 'sw-notification-styles';
                document.head.appendChild(style);
            }
            
            document.body.appendChild(notification);
        },
        
        // Apply update
        applyUpdate() {
            if (!this.updateAvailable || !this.registration.waiting) return;
            
            // Tell waiting service worker to take control
            this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });
        },
        
        // Check for updates manually
        async checkForUpdates() {
            if (!this.registration) return;
            
            try {
                await this.registration.update();
            } catch (error) {
                console.error('Failed to check for updates:', error);
            }
        },
        
        // Show offline indicator
        showOfflineIndicator() {
            if (document.querySelector('.offline-indicator')) return;
            
            const indicator = document.createElement('div');
            indicator.className = 'offline-indicator';
            indicator.innerHTML = `
                <span class="offline-icon">📡</span>
                <span>Offline Mode</span>
            `;
            
            // Add styles
            const style = document.createElement('style');
            style.textContent = `
                .offline-indicator {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    background: #ef4444;
                    color: white;
                    padding: 10px 20px;
                    border-radius: 20px;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    font-size: 14px;
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
                    z-index: 10000;
                    animation: fadeIn 0.3s ease-out;
                }
                
                @keyframes fadeIn {
                    from { opacity: 0; transform: translateY(-10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .offline-icon {
                    animation: pulse 2s infinite;
                }
                
                @keyframes pulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.5; }
                }
            `;
            
            if (!document.querySelector('#offline-indicator-styles')) {
                style.id = 'offline-indicator-styles';
                document.head.appendChild(style);
            }
            
            document.body.appendChild(indicator);
        },
        
        // Hide offline indicator
        hideOfflineIndicator() {
            const indicator = document.querySelector('.offline-indicator');
            if (indicator) {
                indicator.style.animation = 'fadeOut 0.3s ease-out';
                setTimeout(() => indicator.remove(), 300);
            }
        },
        
        // Sync offline data when back online
        async syncOfflineData() {
            if ('sync' in self.registration) {
                try {
                    await self.registration.sync.register('sync-family-data');
                    console.log('Background sync registered');
                } catch (error) {
                    console.error('Background sync failed:', error);
                    // Fallback to manual sync
                    this.manualSync();
                }
            } else {
                // Fallback for browsers without background sync
                this.manualSync();
            }
        },
        
        // Manual sync fallback
        manualSync() {
            // This would sync any offline changes
            console.log('Manual sync triggered');
            // Implementation depends on your offline storage strategy
        },
        
        // Handle messages from service worker
        handleSWMessage(data) {
            switch (data.type) {
                case 'CACHE_UPDATED':
                    console.log('Cache updated:', data.payload);
                    break;
                case 'SYNC_COMPLETE':
                    console.log('Sync complete:', data.payload);
                    break;
                default:
                    console.log('SW message:', data);
            }
        },
        
        // Cache specific URLs
        async cacheUrls(urls) {
            if (!this.registration || !this.registration.active) return;
            
            const channel = new MessageChannel();
            
            return new Promise((resolve, reject) => {
                channel.port1.onmessage = event => {
                    if (event.data.cached) {
                        resolve();
                    } else {
                        reject(new Error('Failed to cache URLs'));
                    }
                };
                
                this.registration.active.postMessage({
                    type: 'CACHE_URLS',
                    urls: urls
                }, [channel.port2]);
            });
        },
        
        // Clear all caches
        async clearCache() {
            if (!this.registration || !this.registration.active) return;
            
            const channel = new MessageChannel();
            
            return new Promise((resolve, reject) => {
                channel.port1.onmessage = event => {
                    if (event.data.cleared) {
                        resolve();
                    } else {
                        reject(new Error('Failed to clear cache'));
                    }
                };
                
                this.registration.active.postMessage({
                    type: 'CLEAR_CACHE'
                }, [channel.port2]);
            });
        },
        
        // Get cache statistics
        async getCacheStats() {
            if (!('storage' in navigator && 'estimate' in navigator.storage)) {
                return null;
            }
            
            try {
                const estimate = await navigator.storage.estimate();
                return {
                    usage: this.formatBytes(estimate.usage),
                    quota: this.formatBytes(estimate.quota),
                    percentage: ((estimate.usage / estimate.quota) * 100).toFixed(2)
                };
            } catch (error) {
                console.error('Failed to get storage estimate:', error);
                return null;
            }
        },
        
        // Format bytes to human readable
        formatBytes(bytes) {
            if (bytes === 0) return '0 Bytes';
            const k = 1024;
            const sizes = ['Bytes', 'KB', 'MB', 'GB'];
            const i = Math.floor(Math.log(bytes) / Math.log(k));
            return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
        }
    };
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => SWManager.init());
    } else {
        SWManager.init();
    }
    
    // Export for external use
    window.swManager = SWManager;
})();