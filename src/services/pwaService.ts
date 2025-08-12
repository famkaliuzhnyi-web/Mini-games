// PWA Service for handling installation and service worker

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
  }

  private async init() {
    // Register service worker
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
        });
        
        console.log('Service Worker registered successfully:', registration);

        // Handle service worker updates
        registration.addEventListener('updatefound', () => {
          console.log('Service Worker update found');
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
}

// Export singleton instance
export const pwaService = new PWAService();