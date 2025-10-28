import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';

interface Props {
  onImportComplete?: () => void;
}

export const CSVEquipoContratoImport = ({ onImportComplete }: Props) => {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const parseCSV = (text: string) => {
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const assignments: Array<{ numeroEquipo: string; contrato: string }> = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip headers and month labels
      if (line.startsWith('Número de Equipo') || 
          line.startsWith('N.E.') || 
          line === '') {
        continue;
      }

      const parts = line.split(',');
      if (parts.length >= 2) {
        const numeroEquipo = parts[0].trim();
        const contrato = parts[1].trim();
        
        // Skip empty contracts or invalid ones
        if (contrato && 
            contrato !== 'S/FACTURA' && 
            contrato !== '0' && 
            contrato !== ' ' &&
            numeroEquipo !== '') {
          assignments.push({ numeroEquipo, contrato });
        }
      }
    }
    
    return assignments;
  };

  const handleImport = async () => {
    if (!file) {
      toast.error('Por favor selecciona un archivo CSV');
      return;
    }

    setImporting(true);
    
    try {
      const text = await file.text();
      const assignments = parseCSV(text);
      
      console.log(`Procesando ${assignments.length} asignaciones...`);

      // Get all equipos
      const { data: equipos, error: equiposError } = await supabase
        .from('equipos')
        .select('id, numero_equipo');
      
      if (equiposError) throw equiposError;

      // Create a map for quick lookup
      const equipoMap = new Map(equipos?.map(e => [e.numero_equipo, e.id]) || []);

      // Group assignments by contract to handle multiple equipos per contract
      const contratoMap = new Map<string, string[]>();
      
      for (const assignment of assignments) {
        const contratos = assignment.contrato.split('-');
        const equipoId = equipoMap.get(assignment.numeroEquipo);
        
        if (equipoId) {
          for (const contratoNum of contratos) {
            const contratoKey = contratoNum.trim();
            if (!contratoMap.has(contratoKey)) {
              contratoMap.set(contratoKey, []);
            }
            contratoMap.get(contratoKey)!.push(equipoId);
          }
        }
      }

      console.log(`Encontrados ${contratoMap.size} contratos únicos`);

      // Process each contract
      let created = 0;
      let updated = 0;
      let errors = 0;

      for (const [numeroContrato, equipoIds] of contratoMap) {
        try {
          // Check if contract exists
          const { data: existing } = await supabase
            .from('contratos')
            .select('id')
            .eq('numero_contrato', numeroContrato)
            .maybeSingle();

          // Use the first equipo for the contract
          // (Note: One contract can only have one equipo_id in the current schema)
          const equipoId = equipoIds[0];

          if (existing) {
            // Update existing contract
            const { error: updateError } = await supabase
              .from('contratos')
              .update({ equipo_id: equipoId })
              .eq('id', existing.id);
            
            if (updateError) throw updateError;
            updated++;
          } else {
            // Create new contract
            const { error: insertError } = await supabase
              .from('contratos')
              .insert({
                numero_contrato: numeroContrato,
                folio_contrato: numeroContrato, // Using numero as folio for now
                cliente: 'Por definir',
                equipo_id: equipoId,
                status: 'activo'
              });
            
            if (insertError) throw insertError;
            created++;
          }
        } catch (err) {
          console.error(`Error procesando contrato ${numeroContrato}:`, err);
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
      toast.error('Error al importar el archivo CSV');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="p-6 mb-4">
      <h3 className="text-lg font-semibold mb-4">Importar Asignaciones Equipo-Contrato</h3>
      
      <div className="space-y-4">
        <div>
          <Input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            className="mb-2"
          />
          <p className="text-sm text-muted-foreground">
            Formato esperado: Número de Equipo, Contrato
          </p>
        </div>

        <Button 
          onClick={handleImport} 
          disabled={!file || importing}
          className="w-full"
        >
          <Upload className="mr-2 h-4 w-4" />
          {importing ? 'Importando...' : 'Importar Asignaciones'}
        </Button>
      </div>
    </Card>
  );
};
