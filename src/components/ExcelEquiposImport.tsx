import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Upload, Loader2 } from "lucide-react";

interface Props {
  onImportComplete?: () => void;
}

export function ExcelEquiposImport({ onImportComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const mapEstado = (valor: string): string => {
    const v = valor?.toUpperCase()?.trim();
    if (v === 'DENTRO') return 'rentado';
    if (v === 'DISPONIBLE') return 'disponible';
    if (v === 'TALLER') return 'en_taller';
    return 'disponible';
  };

  const handleImport = async () => {
    if (!file) return;

    setImporting(true);
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];

      // Skip header rows (first 2 rows based on the Excel structure)
      const dataRows = jsonData.slice(2);
      
      let imported = 0;
      let errors = 0;

      for (const row of dataRows) {
        if (!row[2]) continue; // Skip if no numero_equipo

        const equipoData = {
          numero_equipo: String(row[2] || ''),
          tipo_negocio: String(row[3] || ''),
          asegurado: String(row[4] || ''),
          proveedor: String(row[5] || ''),
          tipo: String(row[6] || ''),
          descripcion: String(row[8] || 'Sin descripción'),
          marca: String(row[9] || ''),
          modelo: String(row[10] || ''),
          serie: String(row[11] || ''),
          categoria: String(row[12] || ''),
          clase: String(row[13] || ''),
          anio: row[14] ? parseInt(String(row[14])) : null,
          estado: mapEstado(String(row[1] || '')),
        };

        // Check if equipment exists
        const { data: existing } = await supabase
          .from('equipos')
          .select('id')
          .eq('numero_equipo', equipoData.numero_equipo)
          .maybeSingle();

        if (existing) {
          // Update existing
          const { error } = await supabase
            .from('equipos')
            .update(equipoData)
            .eq('id', existing.id);
          
          if (error) {
            console.error('Error updating:', error);
            errors++;
          } else {
            imported++;
          }
        } else {
          // Insert new
          const { error } = await supabase
            .from('equipos')
            .insert(equipoData);
          
          if (error) {
            console.error('Error inserting:', error);
            errors++;
          } else {
            imported++;
          }
        }
      }

      toast.success(`Importación completada: ${imported} equipos importados${errors > 0 ? `, ${errors} errores` : ''}`);
      setFile(null);
      
      // Reset file input
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      onImportComplete?.();
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Error al importar el archivo');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          Importar Equipos desde Excel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Input
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFileChange}
          disabled={importing}
        />
        <Button
          onClick={handleImport}
          disabled={!file || importing}
          className="w-full"
        >
          {importing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importando...
            </>
          ) : (
            'Importar Equipos'
          )}
        </Button>
        <p className="text-sm text-muted-foreground">
          El archivo debe contener las columnas: N.E., Estado, Número de Equipo, Tipo de Negocio, 
          Asegurado, Proveedor, Tipo, Descripción, Marca, Modelo, Serie, Categoría, Clase, Año
        </p>
      </CardContent>
    </Card>
  );
}
