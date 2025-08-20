// PWA Service for handling installation and service worker
import { getAbsolutePath } from '../utils/basePath'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export class PWAService {
  private deferredPrompt: BeforeInstallPromptEvent | null = null;
  private isInstallable = false;
  private isInstalled = false;

  constructor() {
    this.init();
    
    // Add debugging utilities to window object for development
    if (typeof window !== 'undefined') {
      (window as unknown as { pwaDebug: unknown }).pwaDebug = {
        forceClearCache: () => this.forceClearCache(),
        forceRefresh: () => this.forceRefresh(),
        getStorageEstimate: () => this.getStorageEstimate(),
        getInstallState: () => this.getInstallState()
      };
    }
  }

  private async init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        // Add cache busting parameter to force service worker updates
        const swPath = getAbsolutePath('/sw.js') + '?v=' + Date.now()
        const registration = await navigator.serviceWorker.register(swPath, {
          scope: getAbsolutePath('/'),
          updateViaCache: 'none', // Don't cache the service worker file itself
        });
        
        console.log('Service Worker registered successfully:', registration);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          console.log('Service Worker update found');
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('New service worker available, refresh to use it');
                // Notify user about the update and offer to refresh
                window.dispatchEvent(new CustomEvent('sw-update-available'));
                
                // Show update notification
                this.showUpdateNotification();
              }
            });
          }
        });

        // Check for updates periodically (every 5 minutes when active)
        setInterval(() => {
          if (document.visibilityState === 'visible') {
            registration.update();
          }
        }, 5 * 60 * 1000);

        // Listen for messages from service worker
        navigator.serviceWorker.addEventListener('message', (event) => {
          const { type, payload } = event.data;
          if (type === 'SW_UPDATED') {
            console.log('Service Worker updated, cache version:', payload.cacheVersion);
            // Optionally reload the page to use the new version
            if (payload.deletedCaches > 0) {
              this.showUpdateNotification();
            }
          }
        });

      } catch (error) {
        console.error('Service Worker registration failed:', error);
      }
    }

    // Listen for beforeinstallprompt event
    window.addEventListener('beforeinstallprompt', (e) => {
      console.log('PWA install prompt triggered');
      // Prevent the default prompt
      e.preventDefault();
      // Store the event for later use
      this.deferredPrompt = e;
      this.isInstallable = true;
      this.notifyInstallable();
    });

    // Listen for app installed event
    window.addEventListener('appinstalled', () => {
      console.log('PWA was installed successfully');
      this.isInstalled = true;
      this.deferredPrompt = null;
      this.isInstallable = false;
    });

    // Check if app is already installed
    this.checkIfInstalled();
  }

  private checkIfInstalled() {
    // Check if running in standalone mode (installed PWA)
    if (window.matchMedia('(display-mode: standalone)').matches) {
      this.isInstalled = true;
    }

    // Check if running in iOS Safari installed mode
    if ((window.navigator as never as { standalone?: boolean }).standalone === true) {
      this.isInstalled = true;
    }
  }

  private notifyInstallable() {
    // Dispatch custom event to notify components that app is installable
    window.dispatchEvent(new CustomEvent('pwa-installable'));
  }

  private showUpdateNotification() {
    // Show a simple notification to users about the update
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('Mini Games Update Available', {
        body: 'A new version is available. Refresh the page to get the latest features!',
        icon: '/icon-192x192.png',
        tag: 'app-update'
      });
    } else {
      // Fallback to console and custom event for components to handle
      console.log('App update available - refresh recommended');
    }
  }

  public async showInstallPrompt(): Promise<boolean> {
    if (!this.deferredPrompt) {
      return false;
    }

    try {
      // Show the install prompt
      this.deferredPrompt.prompt();

      // Wait for the user's response
      const { outcome } = await this.deferredPrompt.userChoice;
      
      console.log(`User response to install prompt: ${outcome}`);
      
      // Clear the deferredPrompt so it can only be used once
      this.deferredPrompt = null;
      this.isInstallable = false;

      return outcome === 'accepted';
    } catch (error) {
      console.error('Error showing install prompt:', error);
      return false;
    }
  }

  public getInstallState() {
    return {
      isInstallable: this.isInstallable,
      isInstalled: this.isInstalled,
      canShowPrompt: !!this.deferredPrompt
    };
  }

  public async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const granted = await navigator.storage.persist();
        console.log(`Persistent storage ${granted ? 'granted' : 'denied'}`);
        return granted;
      } catch (error) {
        console.error('Error requesting persistent storage:', error);
        return false;
      }
    }
    return false;
  }

  public async getStorageEstimate() {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        console.log('Storage estimate:', estimate);
        return estimate;
      } catch (error) {
        console.error('Error getting storage estimate:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Force clear all caches and reload the page
   * Useful for developers and users experiencing caching issues
   */
  public async forceClearCache(): Promise<boolean> {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map(cacheName => {
            console.log('Clearing cache:', cacheName);
            return caches.delete(cacheName);
          })
        );
      }

      // Clear localStorage (but preserve essential data)
      const essentialKeys = ['minigames_player_'];
      Object.keys(localStorage).forEach(key => {
        if (!essentialKeys.some(essential => key.startsWith(essential))) {
          localStorage.removeItem(key);
        }
      });

      // Unregister service worker
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(
          registrations.map(registration => {
            console.log('Unregistering service worker');
            return registration.unregister();
          })
        );
      }

      console.log('All caches cleared successfully');
      return true;
    } catch (error) {
      console.error('Error clearing caches:', error);
      return false;
    }
  }

  /**
   * Quick refresh that forces service worker update
   */
  public async forceRefresh(): Promise<void> {
    // Skip waiting for any new service worker
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
    }
    
    // Reload with cache bypass
    window.location.reload();
  }
}

// Export singleton instance
export const pwaService = new PWAService();