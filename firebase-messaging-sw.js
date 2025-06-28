// Firebase Cloud Messaging Service Worker
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.22.1/firebase-messaging-compat.js');

// Initialize Firebase in the service worker
firebase.initializeApp({
    apiKey: "AIzaSyApTHhm_Ia0sz63YDw2mYXiXp_qED7NdOQ",
    authDomain: "rasin.pyebwa.com",
    projectId: "pyebwa-f5960",
    storageBucket: "pyebwa-f5960.firebasestorage.app",
    messagingSenderId: "1042887343749",
    appId: "1:1042887343749:web:c276bf69b6c0895111f3ec"
});

// Retrieve firebase messaging
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message:', payload);
    
    const notificationTitle = payload.notification.title || 'Pyebwa Announcement';
    const notificationOptions = {
        body: payload.notification.body || 'You have a new announcement',
        icon: '/app/images/pyebwa-logo.png',
        badge: '/app/images/badge-icon.png',
        tag: payload.data?.announcementId || 'announcement',
        data: payload.data,
        actions: [
            {
                action: 'view',
                title: 'View',
                icon: '/app/images/view-icon.png'
            },
            {
                action: 'dismiss',
                title: 'Dismiss',
                icon: '/app/images/dismiss-icon.png'
            }
        ],
        requireInteraction: payload.data?.priority === 'high'
    };

    // Show the notification
    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    console.log('[firebase-messaging-sw.js] Notification click received:', event);
    
    event.notification.close();
    
    let clickResponseUrl = '/app/';
    
    // Handle action clicks
    if (event.action === 'view' && event.notification.data?.announcementId) {
        clickResponseUrl = `/app/announcements/${event.notification.data.announcementId}`;
    } else if (event.action === 'dismiss') {
        // Just close the notification
        return;
    } else if (event.notification.data?.url) {
        // Use custom URL if provided
        clickResponseUrl = event.notification.data.url;
    }
    
    // Open or focus the app
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                // Check if app is already open
                for (let client of windowClients) {
                    if (client.url.includes('pyebwa.com') && 'focus' in client) {
                        // Navigate to the announcement
                        client.navigate(clickResponseUrl);
                        return client.focus();
                    }
                }
                // If app is not open, open it
                if (clients.openWindow) {
                    return clients.openWindow(clickResponseUrl);
                }
            })
    );
});

// Handle push event
self.addEventListener('push', (event) => {
    console.log('[firebase-messaging-sw.js] Push event received:', event);
    
    if (event.data) {
        try {
            const data = event.data.json();
            const title = data.notification?.title || 'Pyebwa Notification';
            const options = {
                body: data.notification?.body || 'You have a new notification',
                icon: '/app/images/pyebwa-logo.png',
                badge: '/app/images/badge-icon.png',
                data: data.data
            };
            
            event.waitUntil(
                self.registration.showNotification(title, options)
            );
        } catch (error) {
            console.error('Error processing push event:', error);
        }
    }
});