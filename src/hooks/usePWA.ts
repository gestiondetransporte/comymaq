import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export function usePWA() {
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setDeferredPrompt(null);
      toast({
        title: 'Aplicación instalada',
        description: 'La aplicación se ha instalado correctamente en tu dispositivo',
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Verificar si ya está instalada
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstallable(false);
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  const installPWA = async () => {
    if (!deferredPrompt) {
      toast({
        variant: 'destructive',
        title: 'No disponible',
        description: 'La instalación no está disponible en este momento',
      });
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      toast({
        title: 'Instalación iniciada',
        description: 'La aplicación se está instalando...',
      });
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return { isInstallable, installPWA };
}
