// Web Worker for offline mode functionality
const CACHE_NAME = 'minigames-offline-cache';

// Store for offline data
let offlineStorage = {
  gameState: {},
  messages: [],
  lastSync: null
};

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, payload } = e.data;
  
  switch (type) {
    case 'CACHE_DATA':
      cacheData(payload);
      break;
    case 'GET_CACHED_DATA':
      getCachedData(payload.key);
      break;
    case 'SYNC_WHEN_ONLINE':
      syncWhenOnline();
      break;
    case 'UPDATE_OFFLINE_STATE':
      updateOfflineState(payload);
      break;
    default:
      console.log('Unknown message type:', type);
  }
};

function cacheData(data) {
  try {
    const { key, value } = data;
    offlineStorage[key] = value;
    offlineStorage.lastSync = new Date().toISOString();
    
    self.postMessage({
      type: 'CACHE_SUCCESS',
      payload: { key, timestamp: offlineStorage.lastSync }
    });
  } catch (error) {
    self.postMessage({
      type: 'CACHE_ERROR',
      payload: { error: error.message }
    });
  }
}

function getCachedData(key) {
  try {
    const data = offlineStorage[key];
    self.postMessage({
      type: 'CACHED_DATA',
      payload: { key, data, lastSync: offlineStorage.lastSync }
    });
  } catch (error) {
    self.postMessage({
      type: 'CACHE_ERROR',
      payload: { error: error.message }
    });
  }
}

function updateOfflineState(state) {
  offlineStorage.gameState = { ...offlineStorage.gameState, ...state };
  self.postMessage({
    type: 'OFFLINE_STATE_UPDATED',
    payload: { gameState: offlineStorage.gameState }
  });
}

function syncWhenOnline() {
  // Check if online and sync data
  if (navigator.onLine) {
    self.postMessage({
      type: 'SYNC_REQUEST',
      payload: { 
        gameState: offlineStorage.gameState,
        messages: offlineStorage.messages,
        lastSync: offlineStorage.lastSync
      }
    });
  }
}

// Periodic sync check
setInterval(() => {
  if (navigator.onLine && offlineStorage.lastSync) {
    const lastSyncTime = new Date(offlineStorage.lastSync);
    const now = new Date();
    const timeDiff = now.getTime() - lastSyncTime.getTime();
    
    // Sync every 30 seconds if online
    if (timeDiff > 30000) {
      syncWhenOnline();
    }
  }
}, 30000);

console.log('Web Worker initialized for offline mode');