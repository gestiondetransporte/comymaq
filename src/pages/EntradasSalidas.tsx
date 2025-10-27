import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useOffline } from "@/hooks/useOffline";
import { savePendingSync } from "@/lib/offlineStorage";
import { supabase } from "@/integrations/supabase/client";
import { Search, ArrowRightLeft, Image as ImageIcon, FileIcon } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { MultipleFileUpload } from "@/components/MultipleFileUpload";

interface FileWithPreview {
  file: File;
  preview?: string;
  type: 'imagen' | 'documento';
}

interface EntradaSalida {
  id: string;
  equipo_id: string;
  tipo: string;
  fecha: string;
  cliente: string | null;
  obra: string | null;
  serie: string | null;
  modelo: string | null;
  chofer: string | null;
  transporte: string | null;
  comentarios: string | null;
  fotografia_url: string | null;
  fotografia_url_2: string | null;
  fotografia_url_3: string | null;
  equipos: {
    numero_equipo: string;
    descripcion: string;
  } | null;
}

export default function EntradasSalidas() {
  const [searchParams] = useSearchParams();
  const equipoIdParam = searchParams.get('equipo_id');
  const [equipoId, setEquipoId] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "salida" | "traspaso">("entrada");
  const [almacenOrigen, setAlmacenOrigen] = useState("");
  const [almacenDestino, setAlmacenDestino] = useState("");
  const [cliente, setCliente] = useState("");
  const [obra, setObra] = useState("");
  const [chofer, setChofer] = useState("");
  const [transporte, setTransporte] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);
  const [movimientos, setMovimientos] = useState<EntradaSalida[]>([]);
  const [filteredMovimientos, setFilteredMovimientos] = useState<EntradaSalida[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [clientes, setClientes] = useState<Array<{ id: string; nombre: string }>>([]);
  const [almacenes, setAlmacenes] = useState<Array<{ id: string; nombre: string }>>([]);
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOnline } = useOffline();

  useEffect(() => {
    fetchMovimientos();
    fetchClientes();
    fetchAlmacenes();
  }, []);

  useEffect(() => {
    filterMovimientos();
  }, [searchQuery, movimientos]);

  const fetchMovimientos = async () => {
    try {
      let query = supabase
        .from('entradas_salidas')
        .select(`
          id,
          equipo_id,
          tipo,
          fecha,
          cliente,
          obra,
          serie,
          modelo,
          chofer,
          transporte,
          comentarios,
          fotografia_url,
          fotografia_url_2,
          fotografia_url_3,
          equipos (
            numero_equipo,
            descripcion
          )
        `);

      // Si hay un filtro de equipo en la URL, aplicarlo
      if (equipoIdParam) {
        query = query.eq('equipo_id', equipoIdParam);
      }

      const { data, error } = await query
        .order('fecha', { ascending: false })
        .limit(100); // Limitar a últimos 100 registros

      if (error) throw error;

      setMovimientos(data || []);
    } catch (error) {
      console.error('Error fetching movimientos:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los movimientos",
      });
    }
  };

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) throw error;

      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  const fetchAlmacenes = async () => {
    try {
      const { data, error } = await supabase
        .from('almacenes')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) throw error;

      setAlmacenes(data || []);
    } catch (error) {
      console.error('Error fetching almacenes:', error);
    }
  };

  const filterMovimientos = () => {
    let filtered = [...movimientos];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.equipos?.numero_equipo?.toLowerCase().includes(query) ||
        m.equipos?.descripcion?.toLowerCase().includes(query) ||
        m.cliente?.toLowerCase().includes(query) ||
        m.obra?.toLowerCase().includes(query) ||
        m.tipo?.toLowerCase().includes(query)
      );
    }

    setFilteredMovimientos(filtered);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!equipoId.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes ingresar un número de equipo",
      });
      return;
    }

    if (tipo === "traspaso" && (!almacenOrigen || !almacenDestino)) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar almacén origen y destino para traspasos",
      });
      return;
    }

    setLoading(true);

    try {
      // Primero buscar el equipo por número para obtener su UUID
      const { data: equipoData, error: equipoError } = await supabase
        .from('equipos')
        .select('id, numero_equipo, serie, modelo, almacen_id')
        .eq('numero_equipo', equipoId.trim())
        .maybeSingle();

      if (equipoError) throw equipoError;

      if (!equipoData) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `No se encontró el equipo con número ${equipoId}`,
        });
        setLoading(false);
        return;
      }

      // Subir imágenes si hay
      const imageUrls: string[] = [];
      if (files.length > 0 && isOnline) {
        for (let i = 0; i < files.length; i++) {
          const fileWithPreview = files[i];
          const file = fileWithPreview.file;
          const fileName = `${Date.now()}-${i}-${file.name}`;
          const { error: uploadError, data } = await supabase.storage
            .from('fotografias')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('fotografias')
            .getPublicUrl(fileName);

          imageUrls.push(publicUrl);
        }
      }

      const movimiento = {
        equipo_id: equipoData.id,
        created_by: user?.id,
        tipo,
        fecha: new Date().toISOString().split('T')[0],
        cliente: cliente.trim() || null,
        obra: obra.trim() || null,
        chofer: chofer.trim() || null,
        transporte: transporte.trim() || null,
        serie: equipoData.serie,
        modelo: equipoData.modelo,
        comentarios: observaciones.trim() || null,
        fotografia_url: imageUrls[0] || null,
        fotografia_url_2: imageUrls[1] || null,
        fotografia_url_3: imageUrls[2] || null,
        almacen_origen_id: tipo === "traspaso" ? almacenOrigen : null,
        almacen_destino_id: tipo === "traspaso" ? almacenDestino : null,
      };

      if (isOnline) {
        // Si hay conexión, guardar directamente
        const { data: insertData, error } = await supabase
          .from('entradas_salidas')
          .insert(movimiento)
          .select()
          .single();

        if (error) throw error;

        // Si es traspaso, actualizar el almacen_id del equipo
        if (tipo === "traspaso") {
          const { error: updateError } = await supabase
            .from('equipos')
            .update({ almacen_id: almacenDestino })
            .eq('id', equipoData.id);

          if (updateError) throw updateError;
        }

        // Guardar archivos adicionales en la tabla de archivos
        if (files.length > 0 && insertData) {
          const archivos = files.map((fileWithPreview, index) => ({
            entrada_salida_id: insertData.id,
            archivo_url: imageUrls[index],
            tipo_archivo: fileWithPreview.type,
            nombre_archivo: fileWithPreview.file.name,
          }));

          const { error: archivosError } = await supabase
            .from('entradas_salidas_archivos')
            .insert(archivos);

          if (archivosError) console.error('Error saving archivos:', archivosError);
        }

        toast({
          title: "Movimiento registrado",
          description: tipo === "traspaso" 
            ? `Traspaso registrado exitosamente para equipo ${equipoId}`
            : `${tipo === "entrada" ? "Entrada" : "Salida"} registrada exitosamente para equipo ${equipoId}`,
        });
        
        fetchMovimientos();
      } else {
        // Si no hay conexión, guardar para sincronizar después
        await savePendingSync({
          type: 'insert',
          table: 'entradas_salidas',
          data: movimiento,
        });

        toast({
          title: "Guardado offline",
          description: "El movimiento se sincronizará cuando haya conexión",
        });
      }

      // Limpiar formulario
      setEquipoId("");
      setCliente("");
      setObra("");
      setChofer("");
      setTransporte("");
      setObservaciones("");
      setAlmacenOrigen("");
      setAlmacenDestino("");
      setFiles([]);
    } catch (error) {
      console.error('Error registrando movimiento:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el movimiento",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTipoBadge = (tipo: string) => {
    if (tipo === "entrada") return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Entrada</Badge>;
    if (tipo === "salida") return <Badge variant="destructive">Salida</Badge>;
    if (tipo === "traspaso") return <Badge variant="secondary" className="bg-blue-600 hover:bg-blue-700">Traspaso</Badge>;
    return <Badge variant="outline">{tipo}</Badge>;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MMM/yyyy HH:mm', { locale: es });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Entradas / Salidas de Equipo</h1>
        <p className="text-muted-foreground">Registro de movimientos de equipo</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registrar Movimiento</CardTitle>
              <CardDescription>
                Registra las entradas y salidas de equipo del almacén
              </CardDescription>
            </div>
            <Badge variant={isOnline ? "default" : "secondary"}>
              {isOnline ? "En línea" : "Modo offline"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="equipo">Número de Equipo</Label>
              <Input
                id="equipo"
                placeholder="Ej: 1, 2, 3..."
                value={equipoId}
                onChange={(e) => setEquipoId(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Movimiento</Label>
              <Select value={tipo} onValueChange={(value: "entrada" | "salida" | "traspaso") => setTipo(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                  <SelectItem value="traspaso">Traspaso entre Almacenes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {tipo === "traspaso" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="almacenOrigen">Almacén Origen</Label>
                  <Select value={almacenOrigen} onValueChange={setAlmacenOrigen}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar almacén origen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {almacenes.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="almacenDestino">Almacén Destino</Label>
                  <Select value={almacenDestino} onValueChange={setAlmacenDestino}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar almacén destino..." />
                    </SelectTrigger>
                    <SelectContent>
                      {almacenes.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente</Label>
              <Select value={cliente} onValueChange={setCliente}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c) => (
                    <SelectItem key={c.id} value={c.nombre}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="obra">Obra</Label>
              <Input
                id="obra"
                placeholder="Nombre de la obra..."
                value={obra}
                onChange={(e) => setObra(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chofer">Chofer</Label>
              <Input
                id="chofer"
                placeholder="Nombre del chofer..."
                value={chofer}
                onChange={(e) => setChofer(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transporte">Transporte</Label>
              <Input
                id="transporte"
                placeholder="Tipo o placas del transporte..."
                value={transporte}
                onChange={(e) => setTransporte(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Input
                id="observaciones"
                placeholder="Detalles adicionales..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>

            <MultipleFileUpload
              files={files}
              onFilesChange={setFiles}
              maxFiles={10}
              acceptImages={true}
              acceptDocuments={true}
              label="Archivos e Imágenes (hasta 10)"
            />

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Registrando..." : "Registrar Movimiento"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Historial de Movimientos</CardTitle>
              <CardDescription>
                {filteredMovimientos.length} de {movimientos.length} registros
              </CardDescription>
            </div>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por equipo, cliente, obra..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMovimientos.length === 0 ? (
            <div className="text-center py-8">
              <ArrowRightLeft className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No se encontraron movimientos con los filtros aplicados"
                  : "No hay movimientos registrados"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>N° Equipo</TableHead>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Chofer</TableHead>
                    <TableHead>Transporte</TableHead>
                    <TableHead>Imágenes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMovimientos.map((movimiento) => (
                    <TableRow key={movimiento.id}>
                      <TableCell>{formatDate(movimiento.fecha)}</TableCell>
                      <TableCell className="font-medium">
                        {movimiento.equipos?.numero_equipo || 'N/A'}
                      </TableCell>
                      <TableCell>{movimiento.equipos?.descripcion || 'N/A'}</TableCell>
                      <TableCell>{getTipoBadge(movimiento.tipo)}</TableCell>
                      <TableCell>{movimiento.cliente || 'N/A'}</TableCell>
                      <TableCell>{movimiento.obra || 'N/A'}</TableCell>
                      <TableCell>{movimiento.chofer || 'N/A'}</TableCell>
                      <TableCell>{movimiento.transporte || 'N/A'}</TableCell>
                      <TableCell>
                        {(movimiento.fotografia_url || movimiento.fotografia_url_2 || movimiento.fotografia_url_3) ? (
                          <div className="flex gap-1">
                            {movimiento.fotografia_url && (
                              <a href={movimiento.fotografia_url} target="_blank" rel="noopener noreferrer">
                                <ImageIcon className="h-4 w-4 text-primary hover:text-primary/80" />
                              </a>
                            )}
                            {movimiento.fotografia_url_2 && (
                              <a href={movimiento.fotografia_url_2} target="_blank" rel="noopener noreferrer">
                                <ImageIcon className="h-4 w-4 text-primary hover:text-primary/80" />
                              </a>
                            )}
                            {movimiento.fotografia_url_3 && (
                              <a href={movimiento.fotografia_url_3} target="_blank" rel="noopener noreferrer">
                                <ImageIcon className="h-4 w-4 text-primary hover:text-primary/80" />
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
