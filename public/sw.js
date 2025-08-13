// Service Worker for Mini Games PWA
const CACHE_NAME = 'mini-games-v1';
const STATIC_CACHE_NAME = 'mini-games-static-v1';
const DYNAMIC_CACHE_NAME = 'mini-games-dynamic-v1';

// Files to cache for offline functionality
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  // Add other static assets as needed
];

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .catch(err => {
        console.log('Service Worker: Cache failed', err);
      })
  );
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker: Activating...');
  const currentCaches = [STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (!currentCaches.includes(cacheName)) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: All old caches cleaned up');
    })
  );
  self.clients.claim(); // Take control of all pages
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip external requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  // Special handling for navigation requests (HTML documents)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html')
        .then(response => {
          if (response) {
            return response;
          }
          return fetch('/index.html').catch(() => {
            // Fallback for offline navigation
            return new Response(
              '<!DOCTYPE html><html><head><title>Mini Games - Offline</title></head><body><h1>Mini Games</h1><p>Please check your internet connection and try again.</p></body></html>',
              { headers: { 'Content-Type': 'text/html' } }
            );
          });
        })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version if available
        if (response) {
          return response;
        }

        // Clone the request because it's a one-time use stream
        const fetchRequest = event.request.clone();

        return fetch(fetchRequest).then(response => {
          // Check if valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response because it's a one-time use stream
          const responseToCache = response.clone();

          // Cache dynamic content
          caches.open(DYNAMIC_CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Fallback for offline mode
          if (event.request.destination === 'document') {
            // For HTML requests, always return the index.html so React Router can handle it
            return caches.match('/index.html').then(response => {
              if (response) return response;
              // If index.html is not cached, try to get it from the network
              return fetch('/index.html').catch(() => {
                // Last resort - return a basic offline page
                return new Response(
                  '<!DOCTYPE html><html><head><title>Mini Games - Offline</title></head><body><h1>Mini Games</h1><p>Please check your internet connection and try again.</p></body></html>',
                  { headers: { 'Content-Type': 'text/html' } }
                );
              });
            });
          }
        });
      })
  );
});

// Background sync for when the app comes back online
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(
      // Perform any background sync operations here
      Promise.resolve()
    );
  }
});

// Push notification handling (for future use)
self.addEventListener('push', event => {
  if (event.data) {
    const data = event.data.json();
    console.log('Service Worker: Push notification received', data);
    
    const options = {
      body: data.body || 'You have a new game update!',
      icon: self.location.origin + '/icon-192x192.png',
      badge: self.location.origin + '/icon-96x96.png',
      tag: 'mini-games-notification',
      renotify: true,
      actions: [
        {
          action: 'open',
          title: 'Open Game'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ]
    };

    event.waitUntil(
      self.registration.showNotification(data.title || 'Mini Games', options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow(self.location.origin)
    );
  }
});

console.log('Service Worker: Loaded and ready');