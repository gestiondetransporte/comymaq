import React, { useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Camera, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface QRScannerProps {
  onScan: (data: string) => void;
  onError?: (error: string) => void;
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleCameraClick = () => {
    // Trigger file input click which will open camera on mobile
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);

    try {
      // Create object URL for preview
      const imageUrl = URL.createObjectURL(file);
      setSelectedImage(imageUrl);

      // Decode QR from image
      const reader = new BrowserMultiFormatReader();
      const result = await reader.decodeFromImageUrl(imageUrl);

      if (result) {
        const qrText = result.getText();
        console.log('QR Code detected:', qrText);
        
        onScan(qrText);
        
        toast({
          title: 'QR Escaneado',
          description: 'Código QR detectado exitosamente',
        });

        // Clean up
        URL.revokeObjectURL(imageUrl);
        setSelectedImage(null);
        
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        throw new Error('No QR code found');
      }
    } catch (error) {
      console.error('Error scanning QR:', error);
      
      toast({
        variant: 'destructive',
        title: 'No se detectó QR',
        description: 'No se encontró un código QR en la imagen. Asegúrate de que el código QR esté visible y bien iluminado.',
      });
      
      onError?.('No se pudo detectar el código QR');
      
      // Clean up on error
      if (selectedImage) {
        URL.revokeObjectURL(selectedImage);
        setSelectedImage(null);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = () => {
    if (selectedImage) {
      URL.revokeObjectURL(selectedImage);
      setSelectedImage(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* Hidden file input that triggers camera on mobile */}
      <Input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />

      {!selectedImage ? (
        <Button
          type="button"
          variant="outline"
          onClick={handleCameraClick}
          disabled={isProcessing}
          className="gap-2 w-full h-12 md:h-10 md:w-auto"
        >
          <Camera className="h-5 w-5 md:h-4 md:w-4" />
          {isProcessing ? 'Procesando...' : 'Escanear QR'}
        </Button>
      ) : (
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>Imagen capturada</Label>
              <div className="relative rounded-lg overflow-hidden border">
                <img
                  src={selectedImage}
                  alt="Captured"
                  className="w-full h-auto"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleCancel}
                className="flex-1"
              >
                <X className="mr-2 h-4 w-4" />
                Cancelar
              </Button>
              <Button
                onClick={handleCameraClick}
                className="flex-1"
              >
                <Camera className="mr-2 h-4 w-4" />
                Tomar otra
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isProcessing && (
        <div className="text-center text-sm text-muted-foreground">
          Analizando código QR...
        </div>
      )}
    </div>
  );
}
