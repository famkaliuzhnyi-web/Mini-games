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
            return caches.match('/index.html');
          }
        });
      })
  );
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
      icon: '/icon-192x192.png',
      badge: '/icon-96x96.png',
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
      clients.openWindow('/')
    );
  }
});

console.log('Service Worker: Loaded and ready');