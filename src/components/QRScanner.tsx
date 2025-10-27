import React, { useRef, useState, useEffect } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, X, Video } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      setHasPermission(true);
      return stream;
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setHasPermission(false);
      
      toast({
        variant: 'destructive',
        title: 'Permiso denegado',
        description: 'Por favor, permite el acceso a la cámara para escanear códigos QR.',
      });
      
      onError?.('Permiso de cámara denegado');
      return null;
    }
  };

  const startScanning = async () => {
    try {
      setIsScanning(true);
      
      const stream = await requestCameraPermission();
      if (!stream) {
        setIsScanning(false);
        return;
      }

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }

      const codeReader = new BrowserMultiFormatReader();
      codeReaderRef.current = codeReader;

      codeReader.decodeFromVideoDevice(
        undefined,
        videoRef.current!,
        (result, error) => {
          if (result) {
            const qrText = result.getText();
            console.log('QR Code detected:', qrText);
            
            onScan(qrText);
            
            toast({
              title: 'QR Escaneado',
              description: 'Código QR detectado exitosamente',
            });

            stopScanning();
          }
          
          if (error && !(error.name === 'NotFoundException')) {
            console.error('QR scanning error:', error);
          }
        }
      );
    } catch (error) {
      console.error('Error starting scanner:', error);
      
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo iniciar el escáner. Verifica los permisos de la cámara.',
      });
      
      onError?.('Error al iniciar el escáner');
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    codeReaderRef.current = null;
    setIsScanning(false);
  };

  return (
    <div className="space-y-4">
      {!isScanning ? (
        <Button
          type="button"
          variant="outline"
          onClick={startScanning}
          className="gap-2 w-full h-12 md:h-10 md:w-auto"
        >
          <Camera className="h-5 w-5 md:h-4 md:w-4" />
          Escanear QR en Tiempo Real
        </Button>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Escaneando código QR...</p>
                <Video className="h-4 w-4 text-primary animate-pulse" />
              </div>
              <div className="relative rounded-lg overflow-hidden border bg-black">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-auto min-h-[300px] object-cover"
                />
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute inset-[20%] border-2 border-primary/50 rounded-lg">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-primary rounded-tl-lg"></div>
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-primary rounded-tr-lg"></div>
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-primary rounded-bl-lg"></div>
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-primary rounded-br-lg"></div>
                  </div>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Coloca el código QR dentro del marco para escanearlo
              </p>
            </div>
            <Button
              variant="outline"
              onClick={stopScanning}
              className="w-full"
            >
              <X className="mr-2 h-4 w-4" />
              Cancelar
            </Button>
          </CardContent>
        </Card>
      )}

      {hasPermission === false && (
        <div className="text-center text-sm text-destructive">
          No se pudo acceder a la cámara. Verifica los permisos en tu navegador.
        </div>
      )}
    </div>
  );
}
