import { useState, useEffect } from 'react';
import { PushNotifications, PushNotificationSchema, ActionPerformed } from '@capacitor/push-notifications';
import { useToast } from '@/hooks/use-toast';

export function usePushNotifications() {
  const [hasPermission, setHasPermission] = useState<boolean>(false);
  const [token, setToken] = useState<string | null>(null);
  const { toast } = useToast();

  const checkPermissions = async () => {
    try {
      const permission = await PushNotifications.checkPermissions();
      setHasPermission(permission.receive === 'granted');
      return permission.receive === 'granted';
    } catch (err) {
      console.error('Error checking push notification permissions:', err);
      return false;
    }
  };

  const requestPermissions = async () => {
    try {
      const permission = await PushNotifications.requestPermissions();
      const granted = permission.receive === 'granted';
      setHasPermission(granted);
      
      if (granted) {
        await PushNotifications.register();
        toast({
          title: "Notificaciones habilitadas",
          description: "Recibirás notificaciones de eventos importantes"
        });
      } else {
        toast({
          title: "Permiso denegado",
          description: "No se pueden enviar notificaciones sin permisos",
          variant: "destructive"
        });
      }
      
      return granted;
    } catch (err) {
      console.error('Error requesting push notification permissions:', err);
      toast({
        title: "Error",
        description: "No se pudieron solicitar los permisos de notificaciones",
        variant: "destructive"
      });
      return false;
    }
  };

  const sendLocalNotification = async (title: string, body: string) => {
    // Local notifications would require @capacitor/local-notifications
    // For now, just show a toast notification
    toast({
      title,
      description: body
    });
  };

  useEffect(() => {
    checkPermissions();

    // Listener para cuando se recibe el token de registro
    PushNotifications.addListener('registration', (token) => {
      console.log('Push registration success, token:', token.value);
      setToken(token.value);
    });

    // Listener para errores de registro
    PushNotifications.addListener('registrationError', (error) => {
      console.error('Error on registration:', error);
    });

    // Listener para cuando se recibe una notificación
    PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
      console.log('Push notification received:', notification);
      toast({
        title: notification.title || 'Notificación',
        description: notification.body || ''
      });
    });

    // Listener para cuando el usuario interactúa con la notificación
    PushNotifications.addListener('pushNotificationActionPerformed', (notification: ActionPerformed) => {
      console.log('Push notification action performed:', notification);
    });

    return () => {
      PushNotifications.removeAllListeners();
    };
  }, []);

  return {
    hasPermission,
    token,
    checkPermissions,
    requestPermissions,
    sendLocalNotification
  };
}
