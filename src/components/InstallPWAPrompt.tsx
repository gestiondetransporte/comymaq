import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePWA } from '@/hooks/usePWA';
import { useState } from 'react';

export function InstallPWAPrompt() {
  const { isInstallable, installPWA } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || dismissed) return null;

  return (
    <Card className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96 shadow-lg border-primary/20">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Download className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">
              Instalar COMYMAQ
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Instala la aplicación para trabajar sin conexión y acceder más rápido
            </p>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                onClick={installPWA}
                className="flex-1"
              >
                Instalar
              </Button>
              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
