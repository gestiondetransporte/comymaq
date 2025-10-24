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
        const permission = await CapCamera.requestPermissions({ permissions: ['camera'] });
        return permission.camera === 'granted';
      } catch (error) {
        console.error('Error requesting camera permission:', error);
        return false;
      }
    }
    return true;
  };

  const scanWithNativeCamera = async () => {
    try {
      const hasPermission = await requestCameraPermission();
      
      if (!hasPermission) {
        toast({
          variant: 'destructive',
          title: 'Permiso denegado',
          description: 'Se necesita acceso a la cámara para escanear códigos QR',
        });
        return;
      }

      const image = await CapCamera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
      });

      if (image.webPath) {
        // Use ZXing to decode QR from the captured image
        const reader = new BrowserMultiFormatReader();
        const result = await reader.decodeFromImageUrl(image.webPath);
        
        if (result) {
          onScan(result.getText());
          setIsOpen(false);
          toast({
            title: 'QR Escaneado',
            description: 'Código QR detectado exitosamente',
          });
        }
      }
    } catch (error) {
      console.error('Error scanning with native camera:', error);
      onError?.('Error al escanear con la cámara nativa');
    }
  };

  const handleOpenScanner = async () => {
    if (isNative) {
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
        className="gap-2"
      >
        <Camera className="h-4 w-4" />
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
