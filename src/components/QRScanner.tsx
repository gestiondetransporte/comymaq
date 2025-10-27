import React, { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Camera as CapCamera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Camera, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (isOpen && !isNative && videoRef.current) {
      startScanning();
    }
    return () => {
      if (!isNative) {
        stopScanning();
      }
    };
  }, [isOpen]);

  const requestCameraPermission = async () => {
    if (isNative) {
      try {
        // Primero verificar el estado actual
        const status = await CapCamera.checkPermissions();
        console.log('Camera permission status:', status);
        
        if (status.camera === 'granted') {
          return true;
        }
        
        // Si no está granted, solicitar permiso
        const permission = await CapCamera.requestPermissions({ permissions: ['camera'] });
        console.log('Camera permission after request:', permission);
        
        return permission.camera === 'granted';
      } catch (error) {
        console.error('Error requesting camera permission:', error);
        toast({
          variant: 'destructive',
          title: 'Error de permisos',
          description: 'Hubo un error al solicitar permisos de cámara. Por favor, verifica la configuración de tu dispositivo.',
        });
        return false;
      }
    }
    return true;
  };

  const scanWithNativeCamera = async () => {
    try {
      console.log('Starting native camera scan...');
      
      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      console.log('Photo captured:', image);

      if (image.webPath) {
        // Use ZXing to decode QR from the captured image
        const reader = new BrowserMultiFormatReader();
        const result = await reader.decodeFromImageUrl(image.webPath);
        
        console.log('QR decode result:', result);
        
        if (result) {
          onScan(result.getText());
          toast({
            title: 'QR Escaneado',
            description: 'Código QR detectado exitosamente',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'No se detectó QR',
            description: 'No se encontró un código QR en la imagen. Inténtalo de nuevo.',
          });
        }
      }
    } catch (error: any) {
      console.error('Error scanning with native camera:', error);
      
      // Si el usuario canceló, no mostrar error
      if (error.message && error.message.includes('cancel')) {
        return;
      }
      
      toast({
        variant: 'destructive',
        title: 'Error al escanear',
        description: 'No se pudo escanear el código QR. Por favor, inténtalo de nuevo.',
      });
      onError?.('Error al escanear con la cámara nativa');
    }
  };

  const handleOpenScanner = async () => {
    if (isNative) {
      // Verificar permisos primero antes de abrir la cámara
      const hasPermission = await requestCameraPermission();
      
      if (!hasPermission) {
        toast({
          variant: 'destructive',
          title: 'Permiso requerido',
          description: 'Por favor, permite el acceso a la cámara en la configuración de tu dispositivo para escanear códigos QR',
        });
        return;
      }
      
      await scanWithNativeCamera();
    } else {
      setIsOpen(true);
    }
  };

  const startScanning = async () => {
    if (isNative) return;
    
    try {
      const hasPermission = await requestCameraPermission();
      if (!hasPermission) {
        onError?.("Permiso de cámara denegado");
        setIsOpen(false);
        return;
      }

      setIsScanning(true);
      readerRef.current = new BrowserMultiFormatReader();
      
      const videoInputDevices = await BrowserMultiFormatReader.listVideoInputDevices();
      
      if (videoInputDevices.length === 0) {
        onError?.("No se encontró ninguna cámara");
        setIsOpen(false);
        return;
      }

      // Prefer back camera on mobile devices
      const selectedDeviceId = videoInputDevices.find(device => 
        device.label.toLowerCase().includes('back') || 
        device.label.toLowerCase().includes('rear')
      )?.deviceId || videoInputDevices[0].deviceId;

      if (videoRef.current) {
        // Get the stream to store reference
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: selectedDeviceId }
        });
        streamRef.current = stream;
        videoRef.current.srcObject = stream;

        await readerRef.current.decodeFromVideoDevice(
          selectedDeviceId,
          videoRef.current,
          (result, error) => {
            if (result) {
              const text = result.getText();
              onScan(text);
              setIsOpen(false);
              stopScanning();
            }
            if (error && error.name !== 'NotFoundException') {
              console.error('QR Scan error:', error);
            }
          }
        );
      }
    } catch (err) {
      console.error('Error starting scanner:', err);
      onError?.("Error al iniciar la cámara. Verifica los permisos.");
      setIsOpen(false);
    }
  };

  const stopScanning = () => {
    // Stop all video tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    // Clear video element
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    readerRef.current = null;
    setIsScanning(false);
  };

  const handleClose = () => {
    stopScanning();
    setIsOpen(false);
  };

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={handleOpenScanner}
        className="gap-2 w-full h-12 md:h-10 md:w-auto"
      >
        <Camera className="h-5 w-5 md:h-4 md:w-4" />
        Escanear QR
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Escanear Código QR</DialogTitle>
            <DialogDescription>
              Apunta la cámara hacia el código QR del equipo
            </DialogDescription>
          </DialogHeader>
          <div className="relative">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full rounded-lg bg-black"
              style={{ maxHeight: '400px' }}
            />
            {isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-primary rounded-lg"></div>
              </div>
            )}
          </div>
          <Button variant="outline" onClick={handleClose} className="w-full">
            <X className="mr-2 h-4 w-4" />
            Cancelar
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
