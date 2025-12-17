import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { Upload, Loader2, FileSpreadsheet, X } from "lucide-react";

interface Props {
  onImportComplete?: () => void;
}

export function ExcelEquiposImport({ onImportComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleButtonClick = () => {
    if (file) {
      handleImport();
    } else {
      fileInputRef.current?.click();
    }
  };

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
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
      clearFile();
      onImportComplete?.();
    } catch (error) {
      console.error('Error importing:', error);
      toast.error('Error al importar el archivo');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileChange}
        disabled={importing}
        className="hidden"
      />
      
      {/* Show selected file */}
      {file && (
        <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
          <FileSpreadsheet className="h-5 w-5 text-green-600" />
          <span className="flex-1 text-sm truncate">{file.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFile}
            disabled={importing}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      {/* Main action button */}
      <Button
        onClick={handleButtonClick}
        disabled={importing}
        className="w-full"
        size="lg"
      >
        {importing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Importando...
          </>
        ) : file ? (
          <>
            <Upload className="mr-2 h-5 w-5" />
            Importar {file.name.substring(0, 20)}...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-5 w-5" />
            Importar Equipos desde Excel
          </>
        )}
      </Button>
    </div>
  );
}
