import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import * as XLSX from 'xlsx';

interface Props {
  onImportComplete?: () => void;
}

export const ExcelContratosImport = ({ onImportComplete }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseDate = (dateValue: any): string | null => {
    if (!dateValue) return null;
    
    try {
      // Si es un número (formato Excel serial date)
      if (typeof dateValue === 'number') {
        const date = new Date((dateValue - 25569) * 86400 * 1000);
        return date.toISOString().split('T')[0];
      }
      
      // Si es string con formato específico
      if (typeof dateValue === 'string') {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Por favor selecciona un archivo Excel');
      return;
    }

    setImporting(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Leer la primera hoja
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][];

      console.log(`Procesando ${data.length} filas...`);

      // Obtener todos los equipos
      const { data: equipos, error: equiposError } = await supabase
        .from('equipos')
        .select('id, numero_equipo');
      
      if (equiposError) throw equiposError;

      const equipoMap = new Map(equipos?.map(e => [e.numero_equipo, e.id]) || []);

      let updated = 0;
      let created = 0;
      let errors = 0;

      // Empezar desde la fila 9 (después de los encabezados)
      for (let i = 9; i < data.length; i++) {
        const row = data[i];
        
        // Validar que la fila tenga datos
        if (!row || row.length < 15) continue;

        const numeroEquipo = row[0]?.toString().trim();
        const contrato = row[4]?.toString().trim();
        const cliente = row[5]?.toString().trim();
        const comprador = row[6]?.toString().trim();
        const obra = row[7]?.toString().trim();
        const horas = row[8] ? parseInt(row[8].toString()) : null;
        const vendedor = row[9]?.toString().trim();
        const suma = row[10] ? parseFloat(row[10].toString().replace(/[^0-9.-]+/g, '')) : null;
        const fechaInicio = parseDate(row[11]);
        const diasContratado = row[12] ? parseInt(row[12].toString()) : null;
        const fechaVencimiento = parseDate(row[14]);
        const dentroFuera = row[3]?.toString().trim();
        const comentarios = row[2]?.toString().trim();

        // Skip si no hay folio de contrato o es DISPONIBLE/TALLER
        if (!contrato || contrato === '1' || dentroFuera === 'DISPONIBLE' || dentroFuera === 'TALLER') {
          continue;
        }

        // Obtener equipo_id
        const equipoId = numeroEquipo ? equipoMap.get(numeroEquipo) : null;

        try {
          // Verificar si el contrato existe
          const { data: existing } = await supabase
            .from('contratos')
            .select('id')
            .eq('folio_contrato', contrato)
            .maybeSingle();

          const contratoData = {
            folio_contrato: contrato,
            numero_contrato: contrato,
            cliente: cliente || 'Sin cliente',
            comprador: comprador || null,
            obra: obra || null,
            horas_trabajo: horas,
            vendedor: vendedor || null,
            suma: suma,
            fecha_inicio: fechaInicio,
            dias_contratado: diasContratado,
            fecha_vencimiento: fechaVencimiento,
            dentro_fuera: dentroFuera === 'DENTRO' ? 'Dentro' : dentroFuera === 'FUERA' ? 'Fuera' : null,
            comentarios: comentarios || null,
            equipo_id: equipoId,
            status: dentroFuera === 'DENTRO' || dentroFuera === 'FUERA' ? 'activo' : 'activo'
          };

          if (existing) {
            // Actualizar
            const { error: updateError } = await supabase
              .from('contratos')
              .update(contratoData)
              .eq('id', existing.id);
            
            if (updateError) throw updateError;
            updated++;
          } else {
            // Crear nuevo
            const { error: insertError } = await supabase
              .from('contratos')
              .insert(contratoData);
            
            if (insertError) throw insertError;
            created++;
          }
        } catch (err) {
          console.error(`Error procesando contrato ${contrato}:`, err);
          errors++;
        }
      }

      toast.success(
        `Importación completada: ${created} contratos creados, ${updated} actualizados${errors > 0 ? `, ${errors} errores` : ''}`
      );

      setFile(null);
      if (onImportComplete) {
        onImportComplete();
      }
    } catch (error) {
      console.error('Error al importar:', error);
      toast.error('Error al importar el archivo Excel');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="p-6 mb-4">
      <h3 className="text-lg font-semibold mb-4">Importar Control de Rentas (Excel)</h3>
      
      <div className="space-y-4">
        <div>
          <Input
            type="file"
            accept=".xlsx,.xls"
            onChange={handleFileChange}
            className="mb-2"
          />
          <p className="text-sm text-muted-foreground">
            Sube el archivo Excel con la pestaña "Control de Rentas"
          </p>
        </div>

        <Button 
          onClick={handleImport} 
          disabled={!file || importing}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          {importing ? 'Importando...' : 'Importar desde Excel'}
        </Button>
      </div>
    </Card>
  );
};
