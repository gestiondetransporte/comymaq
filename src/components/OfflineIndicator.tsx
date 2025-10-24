import { useOffline } from '@/hooks/useOffline';
import { WifiOff, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function OfflineIndicator() {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <Alert className="fixed bottom-4 left-4 right-4 z-50 bg-destructive/90 text-destructive-foreground border-destructive">
      <WifiOff className="h-4 w-4" />
      <AlertDescription className="ml-2">
        Sin conexión a internet. Los cambios se sincronizarán automáticamente cuando vuelvas a conectarte.
      </AlertDescription>
    </Alert>
  );
}
