// Service Worker for Pyebwa App - Offline Support & Caching
const CACHE_NAME = 'pyebwa-v1';
const DYNAMIC_CACHE = 'pyebwa-dynamic-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/app/',
    '/app/index.html',
    '/app/css/app-modern.css',
    '/app/css/tree-modern.css',
    '/app/css/dark-mode-complete.css',
    '/app/js/app.js',
    '/app/js/firebase-config.js',
    '/app/js/translations.js',
    '/app/js/tree.js',
    '/app/js/members.js',
    '/app/js/stories.js',
    '/app/js/auth-enhanced.js',
    '/app/js/performance-monitor.js',
    '/app/js/firebase-optimized.js',
    '/app/js/lazy-load.js',
    '/app/locales/en.json',
    '/app/locales/fr.json',
    '/app/locales/ht.json',
    '/app/favicon.ico',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons'
];

// Cache strategies
const CACHE_STRATEGIES = {
    // Network first, fallback to cache
    networkFirst: [
        '/api/',
        'firestore.googleapis.com',
        'firebase'
    ],
    
    // Cache first, fallback to network
    cacheFirst: [
        '/app/css/',
        '/app/js/',
        '/app/images/',
        '/app/locales/',
        'fonts.googleapis.com',
        'fonts.gstatic.com'
    ],
    
    // Cache only
    cacheOnly: [
        '/app/offline.html'
    ]
};

// Install event - cache static assets
self.addEventListener('install', event => {
    console.log('[SW] Installing service worker...');
    
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Static assets cached');
                return self.skipWaiting();
            })
            .catch(error => {
                console.error('[SW] Failed to cache static assets:', error);
            })
    );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    console.log('[SW] Activating service worker...');
    
    event.waitUntil(
        caches.keys()
            .then(cacheNames => {
                return Promise.all(
                    cacheNames
                        .filter(name => name.startsWith('pyebwa-') && name !== CACHE_NAME && name !== DYNAMIC_CACHE)
                        .map(name => {
                            console.log('[SW] Deleting old cache:', name);
                            return caches.delete(name);
                        })
                );
            })
            .then(() => {
                console.log('[SW] Old caches cleaned up');
                return self.clients.claim();
            })
    );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') return;
    
    // Skip chrome extension requests
    if (url.protocol === 'chrome-extension:') return;
    
    // Determine caching strategy
    const strategy = getCacheStrategy(url);
    
    switch (strategy) {
        case 'networkFirst':
            event.respondWith(networkFirst(request));
            break;
        case 'cacheFirst':
            event.respondWith(cacheFirst(request));
            break;
        case 'cacheOnly':
            event.respondWith(cacheOnly(request));
            break;
        default:
            event.respondWith(networkFirst(request));
    }
});

// Determine cache strategy for a URL
function getCacheStrategy(url) {
    const urlString = url.href;
    
    for (const [strategy, patterns] of Object.entries(CACHE_STRATEGIES)) {
        if (patterns.some(pattern => urlString.includes(pattern))) {
            return strategy;
        }
    }
    
    return 'networkFirst';
}

// Network first strategy
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.log('[SW] Network request failed, falling back to cache:', error);
        
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/app/offline.html');
        }
        
        throw error;
    }
}

// Cache first strategy
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    try {
        const networkResponse = await fetch(request);
        
        // Cache successful responses
        if (networkResponse && networkResponse.status === 200) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        console.error('[SW] Failed to fetch:', error);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            return caches.match('/app/offline.html');
        }
        
        throw error;
    }
}

// Cache only strategy
async function cacheOnly(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Return 404 response
    return new Response('Not found in cache', {
        status: 404,
        statusText: 'Not Found'
    });
}

// Handle messages from clients
self.addEventListener('message', event => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'CLEAR_CACHE') {
        event.waitUntil(
            caches.keys()
                .then(cacheNames => {
                    return Promise.all(
                        cacheNames.map(cacheName => caches.delete(cacheName))
                    );
                })
                .then(() => {
                    return event.ports[0].postMessage({ cleared: true });
                })
        );
    }
    
    if (event.data && event.data.type === 'CACHE_URLS') {
        event.waitUntil(
            caches.open(DYNAMIC_CACHE)
                .then(cache => {
                    return cache.addAll(event.data.urls);
                })
                .then(() => {
                    return event.ports[0].postMessage({ cached: true });
                })
        );
    }
});

// Background sync for offline actions
self.addEventListener('sync', event => {
    if (event.tag === 'sync-family-data') {
        event.waitUntil(syncFamilyData());
    }
});

// Sync family data when back online
async function syncFamilyData() {
    console.log('[SW] Syncing family data...');
    
    // Get pending operations from IndexedDB
    // This would be implemented with your offline queue
    
    try {
        // Send pending operations to server
        // await sendPendingOperations();
        
        console.log('[SW] Family data synced successfully');
    } catch (error) {
        console.error('[SW] Failed to sync family data:', error);
        throw error;
    }
}

// Push notifications (for future use)
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'New update from Pyebwa',
        icon: '/app/images/icon-192.png',
        badge: '/app/images/badge-72.png',
        vibrate: [200, 100, 200],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };
    
    event.waitUntil(
        self.registration.showNotification('Pyebwa Family Tree', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    
    event.waitUntil(
        clients.openWindow('/app/')
    );
});