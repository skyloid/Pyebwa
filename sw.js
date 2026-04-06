// Service Worker for Pyebwa Family Tree
const CACHE_NAME = 'pyebwa-runtime-v9';
const CACHEABLE_DESTINATIONS = new Set(['style', 'script', 'image', 'font']);

// Install event
self.addEventListener('install', event => {
  self.skipWaiting();
});

// Fetch event — network-first strategy
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Ignore extension/internal browser requests and non-GET traffic.
  if (!['http:', 'https:'].includes(requestUrl.protocol) || event.request.method !== 'GET') {
    return;
  }

  if (requestUrl.pathname.endsWith('/version.json')) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        const shouldCache =
          response.ok &&
          ['basic', 'cors'].includes(response.type) &&
          CACHEABLE_DESTINATIONS.has(event.request.destination) &&
          requestUrl.searchParams.has('v');

        if (shouldCache) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // Fallback to cache when offline
        return caches.match(event.request);
      })
  );
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(clients.claim());
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('message', event => {
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
