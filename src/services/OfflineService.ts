export interface WorkerMessage {
  type: string;
  payload: any;
}

export class OfflineService {
  private worker: Worker | null = null;
  private listeners: { [key: string]: ((data: any) => void)[] } = {};

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    try {
      this.worker = new Worker('/worker.js');
      this.worker.onmessage = (event) => {
        const { type, payload } = event.data;
        this.emit(type.toLowerCase(), payload);
      };

      this.worker.onerror = (error) => {
        console.error('Web Worker error:', error);
        this.emit('error', { error });
      };

      console.log('Offline service worker initialized');
    } catch (error) {
      console.error('Failed to initialize web worker:', error);
    }
  }

  private postMessage(message: WorkerMessage): void {
    if (this.worker) {
      this.worker.postMessage(message);
    } else {
      console.warn('Worker not available, message not sent:', message);
    }
  }

  public cacheData(key: string, value: any): void {
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

  public updateOfflineState(gameState: any): void {
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

  public on(event: string, callback: (data: any) => void): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  public off(event: string, callback: (data: any) => void): void {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    }
  }

  private emit(event: string, data: any): void {
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
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}