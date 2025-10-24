import { useState } from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useOffline } from '@/hooks/useOffline';
import { syncPendingChanges, getPendingSyncs } from '@/lib/offlineStorage';
import { Badge } from '@/components/ui/badge';

export function SyncButton() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const { isOnline } = useOffline();
  const { toast } = useToast();

  const updatePendingCount = async () => {
    const pending = await getPendingSyncs();
    setPendingCount(pending.length);
  };

  // Update count on mount and when online status changes
  useState(() => {
    updatePendingCount();
  });

  const handleSync = async () => {
    if (!isOnline) {
      toast({
        variant: 'destructive',
        title: 'Sin conexión',
        description: 'No hay conexión a internet para sincronizar',
      });
      return;
    }

    setIsSyncing(true);
    try {
      const result = await syncPendingChanges();
      
      if (result.success > 0) {
        toast({
          title: 'Sincronización completa',
          description: `${result.success} cambios sincronizados exitosamente`,
        });
      }
      
      if (result.failed > 0) {
        toast({
          variant: 'destructive',
          title: 'Algunos cambios fallaron',
          description: `${result.failed} cambios no se pudieron sincronizar`,
        });
      }
      
      await updatePendingCount();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Error al sincronizar los cambios',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Badge variant={isOnline ? 'default' : 'secondary'} className="gap-1">
        {isOnline ? (
          <>
            <Wifi className="h-3 w-3" />
            En línea
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3" />
            Sin conexión
          </>
        )}
      </Badge>
      
      {pendingCount > 0 && (
        <Badge variant="outline">
          {pendingCount} pendientes
        </Badge>
      )}
      
      <Button
        variant="outline"
        size="sm"
        onClick={handleSync}
        disabled={!isOnline || isSyncing}
        className="gap-2"
      >
        <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
        Sincronizar
      </Button>
    </div>
  );
}
