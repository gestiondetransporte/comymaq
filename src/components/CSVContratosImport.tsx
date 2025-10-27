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
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        row[header] = values[index] || null;
      });
      
      data.push(row);
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
      const contratos = rows.map(row => ({
        folio_contrato: row.folio_contrato || row.folio || '',
        numero_contrato: row.numero_contrato || null,
        cliente: row.cliente || '',
        obra: row.obra || null,
        suma: row.suma ? parseFloat(row.suma) : null,
        fecha_inicio: row.fecha_inicio || null,
        fecha_vencimiento: row.fecha_vencimiento || null,
        dias_contratado: row.dias_contratado ? parseInt(row.dias_contratado) : null,
        status: row.status || 'activo',
        vendedor: row.vendedor || null,
        comprador: row.comprador || null,
        dentro_fuera: row.dentro_fuera || null,
        horas_trabajo: row.horas_trabajo ? parseInt(row.horas_trabajo) : null,
        comentarios: row.comentarios || null,
        direccion: row.direccion || null,
      }));

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