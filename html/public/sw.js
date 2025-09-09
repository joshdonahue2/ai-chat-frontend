const CACHE_NAME = 'ai-memory-agent-cache-v2';
const urlsToCache = [
  '/css/style.css',
  '/js/app.js',
  '/manifest.json',
  '/icon-144.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Install the service worker and cache static assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate event to clean up old caches
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  // Use a network-first strategy for navigation requests (e.g., loading the page)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If the network fails, try to serve the main page from the cache
          return caches.match('/index.html');
        })
    );
    return;
  }

  // Use a cache-first strategy for other requests (assets)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If the request is in the cache, return it
        if (response) {
          return response;
        }

        // If the request is not in the cache, fetch it from the network
        return fetch(event.request).then(
          networkResponse => {
            // Optional: Add the new resource to the cache
            return caches.open(CACHE_NAME).then(cache => {
              // Be careful not to cache error responses
              if (networkResponse.ok) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            });
          }
        );
      })
  );
});
