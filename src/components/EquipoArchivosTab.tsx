import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileIcon, ImageIcon, Trash2, ExternalLink, Upload } from "lucide-react";
import { MultipleFileUpload } from "./MultipleFileUpload";

interface EquipoArchivo {
  id: string;
  archivo_url: string;
  tipo_archivo: string;
  nombre_archivo: string | null;
  descripcion: string | null;
  created_at: string;
}

interface FileWithPreview {
  file: File;
  preview?: string;
  type: 'imagen' | 'documento' | 'video';
}

interface EquipoArchivosTabProps {
  equipoId: string;
}

export function EquipoArchivosTab({ equipoId }: EquipoArchivosTabProps) {
  const [archivos, setArchivos] = useState<EquipoArchivo[]>([]);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [descripcion, setDescripcion] = useState("");
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchArchivos();
  }, [equipoId]);

  const fetchArchivos = async () => {
    try {
      const { data, error } = await supabase
        .from('equipos_archivos')
        .select('*')
        .eq('equipo_id', equipoId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setArchivos(data || []);
    } catch (error) {
      console.error('Error fetching archivos:', error);
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Selecciona al menos un archivo",
      });
      return;
    }

    setUploading(true);

    try {
      for (const fileWithPreview of files) {
        const file = fileWithPreview.file;
        const fileName = `${Date.now()}-${file.name}`;
        const bucket = fileWithPreview.type === 'imagen' ? 'fotografias' : 'fotografias';
        
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from(bucket)
          .getPublicUrl(fileName);

        const { error: insertError } = await supabase
          .from('equipos_archivos')
          .insert({
            equipo_id: equipoId,
            archivo_url: publicUrl,
            tipo_archivo: fileWithPreview.type,
            nombre_archivo: file.name,
            descripcion: descripcion.trim() || null,
          });

        if (insertError) throw insertError;
      }

      toast({
        title: "Éxito",
        description: `Se subieron ${files.length} archivo(s) correctamente`,
      });

      setFiles([]);
      setDescripcion("");
      fetchArchivos();
    } catch (error) {
      console.error('Error uploading files:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron subir los archivos",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (archivoId: string) => {
    try {
      const { error } = await supabase
        .from('equipos_archivos')
        .delete()
        .eq('id', archivoId);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Archivo eliminado correctamente",
      });

      fetchArchivos();
    } catch (error) {
      console.error('Error deleting archivo:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el archivo",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <MultipleFileUpload
            files={files}
            onFilesChange={setFiles}
            maxFiles={10}
            acceptImages={true}
            acceptDocuments={true}
            label="Subir Archivos/Imágenes"
          />

          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción (opcional)</Label>
            <Textarea
              id="descripcion"
              placeholder="Descripción de los archivos..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <Button
            onClick={handleUpload}
            disabled={uploading || files.length === 0}
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            {uploading ? 'Subiendo...' : 'Subir Archivos'}
          </Button>
        </CardContent>
      </Card>

      <div>
        <h3 className="text-lg font-semibold mb-4">Archivos del Equipo ({archivos.length})</h3>
        {archivos.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">
            No hay archivos asociados a este equipo
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {archivos.map((archivo) => (
              <Card key={archivo.id} className="group relative overflow-hidden">
                <CardContent className="p-3">
                  {archivo.tipo_archivo === 'imagen' ? (
                    <div className="relative">
                      <img
                        src={archivo.archivo_url}
                        alt={archivo.nombre_archivo || 'Imagen'}
                        className="w-full h-32 object-cover rounded-md mb-2"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-32 bg-muted rounded-md mb-2">
                      <FileIcon className="h-12 w-12 text-muted-foreground mb-2" />
                    </div>
                  )}
                  <p className="text-xs truncate font-medium mb-1">
                    {archivo.nombre_archivo || 'Sin nombre'}
                  </p>
                  {archivo.descripcion && (
                    <p className="text-xs text-muted-foreground truncate mb-2">
                      {archivo.descripcion}
                    </p>
                  )}
                  <div className="flex gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => window.open(archivo.archivo_url, '_blank')}
                    >
                      <ExternalLink className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(archivo.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}