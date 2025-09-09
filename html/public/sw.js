const CACHE_NAME = 'ai-memory-agent-cache-v5'; // Incremented version
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
  console.log('SW: Installing version v5');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Opened cache v5');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event to clean up old caches
self.addEventListener('activate', event => {
  console.log('SW: Activating version v5');
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
      return self.clients.claim();
    })
  );
});

// Fetch event handler
self.addEventListener('fetch', event => {
  // Ignore non-GET requests (e.g., POST, PUT, DELETE)
  if (event.request.method !== 'GET') {
    console.log(`SW: Bypassing ${event.request.method} request: ${event.request.url}`);
    // Let the browser handle the request normally
    return;
  }

  // For GET requests, use a network-falling-back-to-cache strategy
  event.respondWith(
    // Try to fetch from the network first
    fetch(event.request)
      .then(networkResponse => {
        // If the network request is successful, cache it and return it
        return caches.open(CACHE_NAME).then(cache => {
          // Only cache successful (ok) responses and not JS files
          if (networkResponse.ok && !event.request.url.includes('.js')) {
            console.log(`SW: Caching successful response for: ${event.request.url}`);
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });
      })
      .catch(() => {
        // If the network request fails, try to get it from the cache
        console.log(`SW: Network failed. Trying cache for: ${event.request.url}`);
        return caches.match(event.request).then(cachedResponse => {
          // Return the cached response if it exists
          return cachedResponse;
        });
      })
  );
});