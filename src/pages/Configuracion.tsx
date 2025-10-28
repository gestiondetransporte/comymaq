import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useOffline } from '@/hooks/useOffline';
import { useGeolocation } from '@/hooks/useGeolocation';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { getPendingSyncs, syncPendingChanges } from '@/lib/offlineStorage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { 
  Wifi, 
  WifiOff, 
  MapPin, 
  Bell, 
  Camera, 
  RefreshCw,
  Check,
  X,
  Lock
} from 'lucide-react';

const passwordSchema = z.string()
  .min(12, "La contraseña debe tener al menos 12 caracteres")
  .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
  .regex(/[a-z]/, "Debe contener al menos una minúscula")
  .regex(/[0-9]/, "Debe contener al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial (!@#$%^&*)");

export default function Configuracion() {
  const { isOnline, isOffline } = useOffline();
  const { hasPermission: hasGeoPermission, isNative: isGeoNative, requestPermissions: requestGeoPermissions, getCurrentPosition } = useGeolocation();
  const { hasPermission: hasPushPermission, isNative: isPushNative, requestPermissions: requestPushPermissions, sendLocalNotification } = usePushNotifications();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
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

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Las contraseñas nuevas no coinciden",
      });
      return;
    }

    // Validar fortaleza de la contraseña
    try {
      passwordSchema.parse(newPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Contraseña inválida",
          description: error.errors[0].message,
        });
        return;
      }
    }

    setIsChangingPassword(true);

    try {
      // Primero verificar la contraseña actual re-autenticando
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("Usuario no encontrado");
      }

      // Intentar iniciar sesión con la contraseña actual para verificarla
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "La contraseña actual es incorrecta",
        });
        setIsChangingPassword(false);
        return;
      }

      // Actualizar la contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente",
      });

      // Limpiar formulario
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al cambiar contraseña",
        description: error.message || "No se pudo actualizar la contraseña",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
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

        {/* Cambiar Contraseña */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Cambiar Contraseña
            </CardTitle>
            <CardDescription>
              Actualiza tu contraseña para mantener tu cuenta segura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Contraseña Actual</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Ingresa tu contraseña actual"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={12}
                  placeholder="Ingresa tu nueva contraseña"
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 12 caracteres con mayúsculas, minúsculas, números y caracteres especiales
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={12}
                  placeholder="Confirma tu nueva contraseña"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full"
              >
                {isChangingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
              </Button>
            </form>
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
                {!isGeoNative && " (funcionalidad limitada en navegador web)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Plataforma:</span>
                <Badge variant="outline">
                  {isGeoNative ? 'Nativa (Android/iOS)' : 'Web'}
                </Badge>
              </div>
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
                {!isPushNative && " (solo disponible en Android/iOS)"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Plataforma:</span>
                <Badge variant="outline">
                  {isPushNative ? 'Nativa (Android/iOS)' : 'Web'}
                </Badge>
              </div>
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
              {!isPushNative && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm text-muted-foreground">
                    Las notificaciones push solo funcionan en dispositivos móviles nativos (Android/iOS).
                    Para probarlas, exporta el proyecto a GitHub y compílalo como app nativa.
                  </p>
                </div>
              )}
              <div className="flex gap-2">
                {!hasPushPermission && (
                  <Button 
                    onClick={requestPushPermissions} 
                    variant="outline" 
                    className="flex-1"
                    disabled={!isPushNative}
                  >
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

      </div>
  );
}
