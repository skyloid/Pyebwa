// Push Notification Service Worker (Web Push / VAPID)
// Service worker entry point for web push notifications

// Handle push events
self.addEventListener('push', (event) => {
    if (!event.data) return;

    try {
        const data = event.data.json();
        const title = data.title || 'Pyebwa Notification';
        const options = {
            body: data.body || 'You have a new notification',
            icon: data.icon || '/app/images/pyebwa-logo.png',
            badge: '/app/images/badge-icon.png',
            tag: data.data?.announcementId || 'notification',
            data: data.data || {},
            actions: [
                { action: 'view', title: 'View' },
                { action: 'dismiss', title: 'Dismiss' }
            ],
            requireInteraction: data.data?.priority === 'high'
        };

        event.waitUntil(
            self.registration.showNotification(title, options)
        );
    } catch (error) {
        console.error('[SW] Error processing push event:', error);
    }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'dismiss') return;

    let url = '/app/';
    if (event.action === 'view' && event.notification.data?.announcementId) {
        url = '/app/';
    } else if (event.notification.data?.url) {
        url = event.notification.data.url;
    }

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((windowClients) => {
                for (const client of windowClients) {
                    if (client.url.includes('pyebwa.com') && 'focus' in client) {
                        client.navigate(url);
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});
