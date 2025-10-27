import React, { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface EquipoQRCodeProps {
  numeroEquipo: string;
  descripcion: string;
  equipoId: string;
}

export function EquipoQRCode({ numeroEquipo, descripcion, equipoId }: EquipoQRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const { toast } = useToast();

  useEffect(() => {
    generateQRCode();
  }, [numeroEquipo, equipoId]);

  const generateQRCode = async () => {
    if (!canvasRef.current) return;

    try {
      // Generar QR con información del equipo
      const qrData = JSON.stringify({
        numero_equipo: numeroEquipo,
        equipo_id: equipoId,
      });

      // Generar QR en el canvas
      await QRCode.toCanvas(canvasRef.current, qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Guardar como data URL para el PDF
      const dataUrl = canvasRef.current.toDataURL('image/png');
      setQrDataUrl(dataUrl);
    } catch (error) {
      console.error('Error generating QR code:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el código QR",
      });
    }
  };

  const downloadQRAsPDF = () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Configuración de la página
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      // Título
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Código QR - Equipo', pageWidth / 2, 20, { align: 'center' });

      // Información del equipo
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`N° de Equipo: ${numeroEquipo}`, pageWidth / 2, 35, { align: 'center' });
      
      if (descripcion) {
        pdf.setFontSize(12);
        pdf.setTextColor(100, 100, 100);
        const descText = descripcion.length > 50 
          ? descripcion.substring(0, 50) + '...' 
          : descripcion;
        pdf.text(descText, pageWidth / 2, 45, { align: 'center' });
      }

      // QR Code
      const qrSize = 80; // 80mm
      const qrX = (pageWidth - qrSize) / 2;
      const qrY = 60;
      
      if (qrDataUrl) {
        pdf.addImage(qrDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      }

      // Pie de página
      pdf.setFontSize(10);
      pdf.setTextColor(150, 150, 150);
      pdf.text('Escanea este código QR para ver los detalles del equipo', pageWidth / 2, qrY + qrSize + 15, { align: 'center' });

      // Descargar
      pdf.save(`QR-Equipo-${numeroEquipo}.pdf`);

      toast({
        title: "PDF Generado",
        description: `Código QR del equipo ${numeroEquipo} descargado exitosamente`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el PDF",
      });
    }
  };

  const downloadQRAsPNG = () => {
    try {
      if (!canvasRef.current) return;

      // Crear un enlace temporal para descargar
      const link = document.createElement('a');
      link.download = `QR-Equipo-${numeroEquipo}.png`;
      link.href = canvasRef.current.toDataURL('image/png');
      link.click();

      toast({
        title: "Imagen Descargada",
        description: `Código QR del equipo ${numeroEquipo} descargado como imagen`,
      });
    } catch (error) {
      console.error('Error downloading PNG:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo descargar la imagen",
      });
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            Código QR del Equipo
          </CardTitle>
          <CardDescription>
            Escanea este código para acceder rápidamente a la información del equipo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col items-center space-y-4">
            {/* Canvas para el QR */}
            <div className="bg-white p-4 rounded-lg border-2 border-border">
              <canvas ref={canvasRef} />
            </div>

            {/* Información del equipo */}
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold">Equipo #{numeroEquipo}</p>
              {descripcion && (
                <p className="text-sm text-muted-foreground">{descripcion}</p>
              )}
            </div>

            {/* Botones de descarga */}
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <Button
                onClick={downloadQRAsPDF}
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar PDF para Imprimir
              </Button>
              <Button
                onClick={downloadQRAsPNG}
                variant="outline"
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar Imagen PNG
              </Button>
            </div>
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-xs text-muted-foreground text-center">
              💡 <strong>Consejo:</strong> Imprime este código QR y pégalo en el equipo físico.
              Podrás escanearlo con tu teléfono para acceder rápidamente a toda su información.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
