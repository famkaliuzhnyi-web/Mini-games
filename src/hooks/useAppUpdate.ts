import { useState, useEffect, useCallback } from 'react';
import { pwaService } from '../services/pwaService';

export type UpdateStatus = 'idle' | 'checking' | 'latest' | 'available';

export function useAppUpdate() {
  const [status, setStatus] = useState<UpdateStatus>(
    pwaService.hasUpdate() ? 'available' : 'idle'
  );

  useEffect(() => {
    const handleUpdate = () => setStatus('available');
    window.addEventListener('sw-update-available', handleUpdate);
    return () => window.removeEventListener('sw-update-available', handleUpdate);
  }, []);

  const checkForUpdate = useCallback(async () => {
    setStatus('checking');
    const found = await pwaService.checkForUpdate();
    setStatus(found ? 'available' : 'latest');
  }, []);

  const applyUpdate = useCallback(() => {
    pwaService.applyUpdate();
  }, []);

  return { status, checkForUpdate, applyUpdate };
}
