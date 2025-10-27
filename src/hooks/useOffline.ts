import { useState, useEffect } from 'react';
import { syncPendingChanges } from '@/lib/offlineStorage';

export function useOffline() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      // Sincronizar automáticamente cuando vuelve la conexión
      try {
        await syncPendingChanges();
      } catch (error) {
        console.error('Error en sincronización automática:', error);
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return { isOnline, isOffline: !isOnline };
}
