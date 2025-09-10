const CACHE_NAME = 'ai-memory-agent-cache-v8'; // Incremented version
const urlsToCache = [
  '/',
  '/index.html',
  '/css/style.css',
  '/manifest.json',
  '/icon-144.png',
  '/icon-192.png',
  '/icon-512.png',
  '/js/app.js'
];

// Install and cache assets
self.addEventListener('install', event => {
  console.log('SW: Installing version v8 (Diagnostic)');
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
  console.log('SW: Activating version v8 (Diagnostic)');
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
      console.log('SW: Claiming clients for version v8');
      return self.clients.claim();
    })
  );
});

// Fetch handler - DO NOTHING
self.addEventListener('fetch', event => {
    // This diagnostic version of the SW does not intercept any fetch events.
    // All requests will be handled by the browser as if there were no service worker fetch listener.
    return;
});