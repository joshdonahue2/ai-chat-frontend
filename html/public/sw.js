const CACHE_NAME = 'ai-memory-agent-cache-v9'; // Incremented version
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/manifest.json',
  '/icon-144.png',
  '/icon-192.png',
  '/icon-512.png',
  '/js/bundle.js'
];
const apiUrl = 'https://supabase.donahuenet.xyz';

// Install and cache assets
self.addEventListener('install', event => {
  console.log('SW: Installing version v9 (Production)');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(urlsToCache);
    }).then(() => {
      self.skipWaiting();
    })
  );
});

// Activate and clean up old caches
self.addEventListener('activate', event => {
  console.log('SW: Activating version v9 (Production)');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('SW: Claiming clients for version v9');
      return self.clients.claim();
    })
  );
});

// Fetch handler
self.addEventListener('fetch', event => {
  // Ignore non-GET requests and all API calls to Supabase
  if (event.request.method !== 'GET' || event.request.url.startsWith(apiUrl)) {
    return; // Let the browser handle it
  }

  // Strategy: Network falling back to cache for HTML navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .catch(() => {
          // If network fails, try the cache
          return caches.match(event.request).then(response => {
            return response || caches.match('/index.html');
          });
        })
    );
    return;
  }
  
  // Strategy: Stale-while-revalidate for all other assets (CSS, JS, images)
  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Fetch from network in the background to update the cache
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });

        // Return cached response immediately if available, otherwise wait for fetch
        return cachedResponse || fetchPromise;
      })
  );
});