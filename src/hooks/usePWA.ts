import { useState, useEffect, useCallback } from 'react';
import { pwaService } from '../services/pwaService';

export function usePWA() {
  const [installState, setInstallState] = useState({
    isInstallable: false,
    isInstalled: false,
    canShowPrompt: false
  });

  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Initial state
    setInstallState(pwaService.getInstallState());

    // Listen for PWA installable event
    const handleInstallable = () => {
      setInstallState(pwaService.getInstallState());
    };

    window.addEventListener('pwa-installable', handleInstallable);

    // Listen for app installed event
    const handleInstalled = () => {
      setInstallState(pwaService.getInstallState());
      setIsInstalling(false);
    };

    window.addEventListener('appinstalled', handleInstalled);

    return () => {
      window.removeEventListener('pwa-installable', handleInstallable);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const showInstallPrompt = useCallback(async () => {
    if (!installState.canShowPrompt || isInstalling) {
      return false;
    }

    setIsInstalling(true);
    
    try {
      const accepted = await pwaService.showInstallPrompt();
      
      if (!accepted) {
        setIsInstalling(false);
      }
      
      return accepted;
    } catch (error) {
      console.error('Error in install prompt:', error);
      setIsInstalling(false);
      return false;
    }
  }, [installState.canShowPrompt, isInstalling]);

  const requestPersistentStorage = useCallback(async () => {
    return await pwaService.requestPersistentStorage();
  }, []);

  const getStorageEstimate = useCallback(async () => {
    return await pwaService.getStorageEstimate();
  }, []);

  return {
    ...installState,
    isInstalling,
    showInstallPrompt,
    requestPersistentStorage,
    getStorageEstimate
  };
}