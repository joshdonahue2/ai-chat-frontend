const CACHE_NAME = 'ai-memory-agent-cache-v6'; // Incremented version
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/manifest.json',
  '/icon-144.png',
  '/icon-192.png',
  '/icon-512.png'
];

// Install the service worker and cache static assets
self.addEventListener('install', event => {
  console.log('SW: Installing version v6');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('SW: Opened cache v6');
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

// Activate event to clean up old caches
self.addEventListener('activate', event => {
  console.log('SW: Activating version v6');
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
      console.log('SW: Claiming clients for version v6');
      return self.clients.claim();
    })
  );
});

// Fetch event handler
self.addEventListener('fetch', event => {
  const apiUrl = 'https://supabase.donahuenet.xyz';

  // Ignore non-GET requests and all API calls to Supabase
  if (event.request.method !== 'GET' || event.request.url.startsWith(apiUrl)) {
    // Let the browser handle these requests normally.
    return;
  }

  // For static assets, use a cache-first strategy.
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // If the asset is in the cache, return it.
        if (cachedResponse) {
          return cachedResponse;
        }

        // If the asset is not in the cache, fetch it from the network.
        return fetch(event.request).then(networkResponse => {
          // Cache the new asset and return it.
          return caches.open(CACHE_NAME).then(cache => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          });
        });
      })
  );
});