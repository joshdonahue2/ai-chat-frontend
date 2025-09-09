const CACHE_NAME = 'ai-memory-agent-cache-v4'; // Incremented version
const urlsToCache = [
  '/css/style.css',
  '/manifest.json',
  '/icon-144.png',
  '/icon-192.png',
  '/icon-512.png'
  // Removed '/js/app.js' from cache so it always loads fresh
];

// Install the service worker and cache static assets
self.addEventListener('install', event => {
  console.log('SW: Installing version v4');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Opened cache v4');
        return cache.addAll(urlsToCache);
      })
  );
  // Force the new service worker to take control immediately
  self.skipWaiting();
});

// Activate event to clean up old caches
self.addEventListener('activate', event => {
  console.log('SW: Activating version v4');
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all pages immediately
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', event => {
  // Never cache JavaScript files - always fetch from network
  if (event.request.url.includes('/js/') || event.request.url.includes('.js')) {
    console.log('SW: Bypassing cache for JS file:', event.request.url);
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          console.log('SW: Network failed for JS file, no fallback');
          return new Response('// Network error loading JS file', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {'Content-Type': 'application/javascript'}
          });
        })
    );
    return;
  }

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

  // Use a cache-first strategy for other requests (CSS, images, etc.)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // If the request is in the cache, return it
        if (response) {
          console.log('SW: Serving from cache:', event.request.url);
          return response;
        }

        // If the request is not in the cache, fetch it from the network
        console.log('SW: Fetching from network:', event.request.url);
        return fetch(event.request).then(
          networkResponse => {
            // Don't cache JavaScript files, non-GET requests, or error responses
            if (event.request.method === 'GET' && !event.request.url.includes('.js') && networkResponse.ok) {
              return caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, networkResponse.clone());
                return networkResponse;
              });
            }
            return networkResponse;
          }
        );
      })
  );
});