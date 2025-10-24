import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useOffline } from '@/hooks/useOffline';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { getPendingSyncs, syncPendingChanges } from '@/lib/offlineStorage';
import { useToast } from '@/hooks/use-toast';
import { 
  Wifi, 
  WifiOff, 
  MapPin, 
  Bell, 
  Camera, 
  RefreshCw,
  Check,
  X
} from 'lucide-react';

export default function Configuracion() {
  const { isOnline, isOffline } = useOffline();
  const { hasPermission: hasGeoPermission, requestPermissions: requestGeoPermissions, getCurrentPosition } = useGeolocation();
  const { hasPermission: hasPushPermission, requestPermissions: requestPushPermissions, sendLocalNotification } = usePushNotifications();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadPendingCount();
  }, []);

  const loadPendingCount = async () => {
    const pending = await getPendingSyncs();
    setPendingCount(pending.length);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncPendingChanges();
      if (result.success > 0) {
        toast({
          title: "Sincronización exitosa",
          description: `Se sincronizaron ${result.success} cambios`
        });
        loadPendingCount();
      }
      if (result.failed > 0) {
        toast({
          title: "Error en sincronización",
          description: `${result.failed} cambios no se pudieron sincronizar`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo sincronizar los cambios",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const testLocation = async () => {
    const position = await getCurrentPosition();
    if (position) {
      toast({
        title: "Ubicación obtenida",
        description: `Lat: ${position.coords.latitude.toFixed(4)}, Lon: ${position.coords.longitude.toFixed(4)}`
      });
    }
  };

  const testNotification = async () => {
    await sendLocalNotification(
      'Prueba de notificación',
      'Esta es una notificación de prueba desde COMYMAQ'
    );
  };

  return (
    <Layout>
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Configuración</h1>
          <p className="text-muted-foreground">
            Gestiona los permisos y configuración de la aplicación
          </p>
        </div>

        {/* Estado de Conexión */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isOnline ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
              Estado de Conexión
            </CardTitle>
            <CardDescription>
              Estado actual de la conexión a internet y sincronización
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Estado:</span>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? 'Conectado' : 'Sin conexión'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Cambios pendientes:</span>
              <Badge variant={pendingCount > 0 ? "secondary" : "outline"}>
                {pendingCount}
              </Badge>
            </div>
            {pendingCount > 0 && isOnline && (
              <Button 
                onClick={handleSync} 
                disabled={isSyncing}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Permisos */}
        <div className="space-y-4">
          <h2 className="text-2xl font-semibold">Permisos de la Aplicación</h2>
          
          {/* Ubicación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Ubicación
              </CardTitle>
              <CardDescription>
                Permite a la app acceder a tu ubicación para funciones de geolocalización
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Estado del permiso:</span>
                <Badge variant={hasGeoPermission ? "default" : "secondary"}>
                  {hasGeoPermission ? (
                    <><Check className="h-3 w-3 mr-1" /> Concedido</>
                  ) : (
                    <><X className="h-3 w-3 mr-1" /> No concedido</>
                  )}
                </Badge>
              </div>
              <div className="flex gap-2">
                {!hasGeoPermission && (
                  <Button onClick={requestGeoPermissions} variant="outline" className="flex-1">
                    Solicitar permiso
                  </Button>
                )}
                {hasGeoPermission && (
                  <Button onClick={testLocation} variant="outline" className="flex-1">
                    Probar ubicación
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notificaciones Push */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notificaciones Push
              </CardTitle>
              <CardDescription>
                Recibe notificaciones sobre eventos importantes y recordatorios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Estado del permiso:</span>
                <Badge variant={hasPushPermission ? "default" : "secondary"}>
                  {hasPushPermission ? (
                    <><Check className="h-3 w-3 mr-1" /> Concedido</>
                  ) : (
                    <><X className="h-3 w-3 mr-1" /> No concedido</>
                  )}
                </Badge>
              </div>
              <div className="flex gap-2">
                {!hasPushPermission && (
                  <Button onClick={requestPushPermissions} variant="outline" className="flex-1">
                    Solicitar permiso
                  </Button>
                )}
                {hasPushPermission && (
                  <Button onClick={testNotification} variant="outline" className="flex-1">
                    Enviar notificación de prueba
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Cámara */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Cámara
              </CardTitle>
              <CardDescription>
                Configurado automáticamente para escaneo QR
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span>Estado:</span>
                <Badge variant="default">
                  <Check className="h-3 w-3 mr-1" /> Configurado
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Información adicional */}
        <Card className="mt-6 bg-muted/50">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              <strong>Nota:</strong> Los permisos de cámara, ubicación y notificaciones son necesarios solo en dispositivos móviles (Android/iOS). 
              En la web, algunas funcionalidades pueden tener limitaciones.
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
