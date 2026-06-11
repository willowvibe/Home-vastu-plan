// S-22: CACHE_NAME is injected by vite.config.ts as a per-deploy hash of
// index.html (see buildHash.ts). New deploys → new CACHE_NAME → activate
// handler prunes the old cache, clients fetch the new assets on next reload.
// Falls back to 'vastuplan-dev' for `npm run dev` and for environments that
// don't run Vite's define (e.g. a bare `tsc` build of the SW).
declare const __VASTUPLAN_CACHE_NAME__: string | undefined;
const CACHE_NAME: string =
  typeof __VASTUPLAN_CACHE_NAME__ !== 'undefined' ? __VASTUPLAN_CACHE_NAME__ : 'vastuplan-dev';
const ASSETS_TO_CACHE = ['/', '/index.html', '/favicon.svg', '/manifest.json'];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))
      );
    })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // For API requests, use network-first strategy
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('vastu') ||
    event.request.url.includes('gemini')
  ) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful responses
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // For static assets, use cache-first strategy
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        if (response && response.status === 200) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      });
    })
  );
});

// Push notification support (optional)
self.addEventListener('push', (event) => {
  const data = event.data?.json() || { title: 'VastuPlan', body: 'New update available' };
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icons/icon-192.png',
      tag: 'vastuplan-update',
    })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeHidden: true }).then((clients) => {
      if (clients.length > 0) {
        return clients[0].focus();
      }
      return self.clients.openWindow('/');
    })
  );
});
