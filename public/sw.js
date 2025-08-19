// Service Worker for Mini Games PWA
const CACHE_NAME = 'mini-games-v1';
const STATIC_CACHE_NAME = 'mini-games-static-v1';
const DYNAMIC_CACHE_NAME = 'mini-games-dynamic-v1';
const GAME_DATA_DB_NAME = 'mini-games-data';
const GAME_DATA_STORE_NAME = 'gameData';

// In-memory storage for game data (fallback)
let gameDataStorage = {
  gameState: {},
  messages: [],
  lastSync: null,
  pendingActions: []
};

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
      const deletePromises = cacheNames.map(cacheName => {
        // Delete any cache that doesn't match current cache names
        // This includes old versioned caches and any orphaned caches
        if (!currentCaches.includes(cacheName)) {
          console.log('Service Worker: Deleting old cache', cacheName);
          return caches.delete(cacheName);
        }
      }).filter(Boolean); // Remove undefined entries
      
      return Promise.all(deletePromises);
    }).then((results) => {
      const deletedCount = results.filter(result => result === true).length;
      console.log(`Service Worker: Cleaned up ${deletedCount} old cache(s)`);
      
      // Force all clients to reload to use the new service worker
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            payload: { 
              cacheVersion: STATIC_CACHE_NAME.split('-v')[1],
              deletedCaches: deletedCount
            }
          });
        });
      });
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

  // Determine if request is for critical assets that should use network-first
  const isCriticalAsset = (url) => {
    return url.includes('.html') || 
           url.includes('.js') || 
           url.includes('.css') || 
           url.includes('manifest.json');
  };

  // Use network-first strategy for critical assets, cache-first for others
  if (isCriticalAsset(event.request.url)) {
    // Network-first strategy for critical assets
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // If network request successful, update cache and return response
          if (response && response.status === 200 && response.type === 'basic') {
            const responseToCache = response.clone();
            caches.open(DYNAMIC_CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
          }
          return response;
        })
        .catch(() => {
          // Network failed, try cache
          return caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback for offline mode
            if (event.request.destination === 'document') {
              return caches.match('/index.html').then(response => {
                if (response) return response;
                return new Response(
                  '<!DOCTYPE html><html><head><title>Mini Games - Offline</title></head><body><h1>Mini Games</h1><p>Please check your internet connection and try again.</p></body></html>',
                  { headers: { 'Content-Type': 'text/html' } }
                );
              });
            }
            throw new Error('Network failed and no cache available');
          });
        })
    );
  } else {
    // Cache-first strategy for non-critical assets (images, fonts, etc.)
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
  }
});

// IndexedDB helper functions
function openGameDataDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(GAME_DATA_DB_NAME, 1);
    
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(GAME_DATA_STORE_NAME)) {
        const store = db.createObjectStore(GAME_DATA_STORE_NAME, { keyPath: 'key' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

async function storeGameData(key, data) {
  try {
    const db = await openGameDataDB();
    const transaction = db.transaction([GAME_DATA_STORE_NAME], 'readwrite');
    const store = transaction.objectStore(GAME_DATA_STORE_NAME);
    
    await store.put({
      key: key,
      data: data,
      timestamp: new Date().toISOString()
    });
    
    console.log('Service Worker: Game data stored', key);
    return true;
  } catch (error) {
    console.error('Service Worker: Failed to store game data', error);
    // Fallback to in-memory storage
    gameDataStorage[key] = data;
    gameDataStorage.lastSync = new Date().toISOString();
    return false;
  }
}

async function getGameData(key) {
  try {
    const db = await openGameDataDB();
    const transaction = db.transaction([GAME_DATA_STORE_NAME], 'readonly');
    const store = transaction.objectStore(GAME_DATA_STORE_NAME);
    const request = store.get(key);
    
    return new Promise((resolve, reject) => {
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result.data);
        } else {
          resolve(null);
        }
      };
    });
  } catch (error) {
    console.error('Service Worker: Failed to get game data', error);
    // Fallback to in-memory storage
    return gameDataStorage[key] || null;
  }
}

// Handle messages from the main thread (replaces Web Worker functionality)
self.addEventListener('message', event => {
  const { type, payload, clientId } = event.data;
  
  console.log('Service Worker: Received message', type);
  
  switch (type) {
    case 'CACHE_DATA':
      handleCacheData(payload, clientId);
      break;
    case 'GET_CACHED_DATA':
      handleGetCachedData(payload, clientId);
      break;
    case 'UPDATE_OFFLINE_STATE':
      handleUpdateOfflineState(payload, clientId);
      break;
    case 'SYNC_WHEN_ONLINE':
      handleSyncWhenOnline(clientId);
      break;
    case 'SKIP_WAITING':
      // Force service worker to skip waiting and activate immediately
      console.log('Service Worker: Skipping waiting...');
      self.skipWaiting();
      break;
    default:
      console.log('Service Worker: Unknown message type:', type);
  }
});

async function handleCacheData(data, clientId) {
  try {
    const { key, value } = data;
    await storeGameData(key, value);
    
    // Notify client of success
    notifyClient(clientId, {
      type: 'CACHE_SUCCESS',
      payload: { 
        key, 
        timestamp: new Date().toISOString() 
      }
    });
  } catch (error) {
    notifyClient(clientId, {
      type: 'CACHE_ERROR',
      payload: { error: error.message }
    });
  }
}

async function handleGetCachedData(data, clientId) {
  try {
    const { key } = data;
    const cachedData = await getGameData(key);
    
    notifyClient(clientId, {
      type: 'CACHED_DATA',
      payload: { 
        key, 
        data: cachedData, 
        lastSync: gameDataStorage.lastSync 
      }
    });
  } catch (error) {
    notifyClient(clientId, {
      type: 'CACHE_ERROR',
      payload: { error: error.message }
    });
  }
}

async function handleUpdateOfflineState(state, clientId) {
  try {
    const currentState = await getGameData('gameState') || {};
    const updatedState = { ...currentState, ...state };
    await storeGameData('gameState', updatedState);
    
    notifyClient(clientId, {
      type: 'OFFLINE_STATE_UPDATED',
      payload: { gameState: updatedState }
    });
  } catch (error) {
    console.error('Service Worker: Failed to update offline state', error);
  }
}

async function handleSyncWhenOnline(clientId) {
  try {
    const gameState = await getGameData('gameState');
    const messages = await getGameData('messages');
    const pendingActions = await getGameData('pendingActions');
    
    notifyClient(clientId, {
      type: 'SYNC_REQUEST',
      payload: {
        gameState: gameState || {},
        messages: messages || [],
        pendingActions: pendingActions || [],
        lastSync: gameDataStorage.lastSync
      }
    });
  } catch (error) {
    console.error('Service Worker: Failed to sync data', error);
  }
}

function notifyClient(clientId, message) {
  if (clientId) {
    self.clients.get(clientId).then(client => {
      if (client) {
        client.postMessage(message);
      }
    });
  } else {
    // Broadcast to all clients
    self.clients.matchAll().then(clients => {
      clients.forEach(client => client.postMessage(message));
    });
  }
}

// Background sync for when the app comes back online
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Background sync triggered');
    event.waitUntil(syncGameData());
  }
});

async function syncGameData() {
  try {
    // Get all pending data that needs to be synced
    const gameState = await getGameData('gameState');
    const messages = await getGameData('messages');
    const pendingActions = await getGameData('pendingActions');
    
    // Notify all clients about sync request
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_REQUEST',
        payload: {
          gameState: gameState || {},
          messages: messages || [],
          pendingActions: pendingActions || [],
          lastSync: gameDataStorage.lastSync
        }
      });
    });
  } catch (error) {
    console.error('Service Worker: Failed to sync game data', error);
  }
}

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