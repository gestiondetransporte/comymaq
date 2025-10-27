import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Download, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface CSVContratosImportProps {
  onImportComplete: () => void;
}

export function CSVContratosImport({ onImportComplete }: CSVContratosImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 5) return []; // El archivo tiene headers en la línea 4

    // Buscar la línea de headers (contiene "CONTRATO,CLIENTE")
    let headerLineIndex = -1;
    for (let i = 0; i < Math.min(10, lines.length); i++) {
      if (lines[i].includes('CONTRATO') && lines[i].includes('CLIENTE')) {
        headerLineIndex = i;
        break;
      }
    }

    if (headerLineIndex === -1) return [];

    const headers = lines[headerLineIndex].split(',').map(h => h.trim());
    const data = [];

    // Procesar las filas de datos
    for (let i = headerLineIndex + 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      const values = line.split(',');
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] ? values[index].trim() : null;
      });
      
      // Solo agregar si tiene datos relevantes
      if (row['CONTRATO'] || row['CLIENTE']) {
        data.push(row);
      }
    }

    return data;
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selecciona un archivo CSV",
      });
      return;
    }

    setImporting(true);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "El archivo CSV está vacío o mal formateado",
        });
        setImporting(false);
        return;
      }

      // Transform CSV data to database format
      const contratos = rows.map(row => {
        // Convertir fecha de formato "lunes, 27 de octubre de 2025" a formato ISO
        const parseFecha = (fechaStr: string) => {
          if (!fechaStr) return null;
          
          // Si ya está en formato ISO o estándar, intentar parsear directamente
          const cleanDate = fechaStr.replace(/[^\d\-\/]/g, '').trim();
          if (cleanDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
            return cleanDate;
          }
          
          // Si tiene formato DD/MM/YY
          if (cleanDate.match(/^\d{2}\/\d{2}\/\d{2}$/)) {
            const [day, month, year] = cleanDate.split('/');
            return `20${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
          
          return null;
        };

        return {
          folio_contrato: row['CONTRATO'] || row.folio_contrato || '',
          numero_contrato: row['NUMERO DE EQUIPO'] || row.numero_contrato || null,
          cliente: row['CLIENTE'] || row.cliente || '',
          obra: row['OBRA'] || row.obra || null,
          suma: row['SUMA'] ? parseFloat(String(row['SUMA']).replace(/[^0-9.-]/g, '')) : null,
          fecha_inicio: parseFecha(row['FECHA INICIO DE PERIODO'] || row.fecha_inicio),
          fecha_vencimiento: parseFecha(row['FECHA DE VENCIMIENTO'] || row.fecha_vencimiento),
          dias_contratado: row['DIAS CONTRATADO'] ? parseInt(String(row['DIAS CONTRATADO'])) : null,
          status: 'activo',
          vendedor: row['VENDEDOR'] || row.vendedor || null,
          comprador: row['COMPRADOR'] || row.comprador || null,
          dentro_fuera: row['DENTRO O FUERA'] || row.dentro_fuera || null,
          horas_trabajo: row['HORAS'] ? parseInt(String(row['HORAS'])) : null,
          comentarios: row['COMENTARIOS'] || row.comentarios || null,
          direccion: row['OBRA'] || row.direccion || null,
        };
      }).filter(c => c.folio_contrato && c.cliente); // Solo contratos con folio y cliente

      // Usar upsert para insertar o actualizar contratos existentes
      const { error } = await supabase
        .from('contratos')
        .upsert(contratos, {
          onConflict: 'folio_contrato',
          ignoreDuplicates: false
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: `Se procesaron ${contratos.length} contratos correctamente (insertados o actualizados)`,
      });

      setFile(null);
      onImportComplete();
    } catch (error) {
      console.error('Error importing CSV:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo importar el archivo CSV",
      });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const template = `folio_contrato,numero_contrato,cliente,obra,suma,fecha_inicio,fecha_vencimiento,dias_contratado,status,vendedor,comprador,dentro_fuera,horas_trabajo,comentarios,direccion
CONT-001,001,Cliente Ejemplo,Obra Ejemplo,50000,2024-01-01,2024-12-31,365,activo,Juan Perez,Maria Lopez,dentro,100,Comentarios ejemplo,Direccion ejemplo`;
    
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'plantilla_contratos.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar Contratos desde CSV</CardTitle>
        <CardDescription>
          Sube un archivo CSV con la información de los contratos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            El archivo debe incluir las columnas: folio_contrato, cliente, fecha_inicio, fecha_vencimiento, suma, etc.
            Los contratos existentes con el mismo folio_contrato serán actualizados.
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <Label htmlFor="csv-file">Archivo CSV</Label>
          <Input
            id="csv-file"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={importing}
          />
          {file && (
            <p className="text-sm text-muted-foreground">
              Archivo seleccionado: {file.name}
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={!file || importing}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {importing ? 'Importando...' : 'Importar'}
          </Button>
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="gap-2"
          >
            <Download className="h-4 w-4" />
            Descargar Plantilla
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}