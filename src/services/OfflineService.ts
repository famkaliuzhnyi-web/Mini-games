export interface WorkerMessage {
  type: string;
  payload: unknown;
}

export class OfflineService {
  private serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
  private listeners: { [key: string]: ((data: unknown) => void)[] } = {};
  private clientId: string | null = null;

  constructor() {
    this.initServiceWorker();
  }

  private async initServiceWorker(): Promise<void> {
    try {
      if (!('serviceWorker' in navigator)) {
        console.warn('Service Worker not supported in this browser');
        return;
      }

      // Get or wait for service worker registration
      this.serviceWorkerRegistration = await navigator.serviceWorker.ready;
      
      // Generate a unique client ID for this instance
      this.clientId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        const { type, payload } = event.data;
        this.emit(type.toLowerCase(), payload);
      });

      console.log('Offline service initialized with Service Worker');
    } catch (error) {
      console.error('Failed to initialize service worker for offline service:', error);
    }
  }

  private postMessage(message: WorkerMessage): void {
    if (this.serviceWorkerRegistration?.active) {
      this.serviceWorkerRegistration.active.postMessage({
        ...message,
        clientId: this.clientId
      });
    } else {
      console.warn('Service Worker not available, message not sent:', message);
    }
  }

  public cacheData(key: string, value: unknown): void {
    this.postMessage({
      type: 'CACHE_DATA',
      payload: { key, value }
    });
  }

  public getCachedData(key: string): void {
    this.postMessage({
      type: 'GET_CACHED_DATA',
      payload: { key }
    });
  }

  public updateOfflineState(gameState: unknown): void {
    this.postMessage({
      type: 'UPDATE_OFFLINE_STATE',
      payload: gameState
    });
  }

  public syncWhenOnline(): void {
    this.postMessage({
      type: 'SYNC_WHEN_ONLINE',
      payload: {}
    });
  }

  public on<T = unknown>(event: string, callback: (data: T) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback as (data: unknown) => void);
  }

  public off<T = unknown>(event: string, callback: (data: T) => void): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== (callback as (data: unknown) => void));
    }
  }

  private emit(event: string, data: unknown): void {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in ${event} listener:`, error);
        }
      });
    }
  }

  public terminate(): void {
    // Service workers cannot be terminated from client code
    // They're managed by the browser
    console.log('Service worker lifecycle is managed by the browser');
    this.listeners = {};
    this.clientId = null;
  }
}