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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EntradaSalidaDetailsDialog } from "@/components/EntradaSalidaDetailsDialog";

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
  foto_odometro_url: string | null;
  foto_calca_url: string | null;
  foto_tablero_url: string | null;
  foto_cargador_url: string | null;
  foto_extintor_url: string | null;
  tiene_danos: boolean | null;
  descripcion_danos: string | null;
  equipos: {
    numero_equipo: string;
    descripcion: string;
  } | null;
}

interface ContratoInfo {
  cliente: string;
  numero_contrato: string;
  folio_contrato: string;
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
  const [contratoInfo, setContratoInfo] = useState<ContratoInfo | null>(null);
  const [fotoOdometro, setFotoOdometro] = useState<File | null>(null);
  const [fotoCalca, setFotoCalca] = useState<File | null>(null);
  const [fotoTablero, setFotoTablero] = useState<File | null>(null);
  const [fotoCargador, setFotoCargador] = useState<File | null>(null);
  const [fotoExtintor, setFotoExtintor] = useState<File | null>(null);
  const [tieneDanos, setTieneDanos] = useState(false);
  const [descripcionDanos, setDescripcionDanos] = useState("");
  const [selectedMovimientoId, setSelectedMovimientoId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroCliente, setFiltroCliente] = useState<string>("todos");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>("");
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const { toast } = useToast();
  const { user } = useAuth();
  const { isOnline } = useOffline();

  useEffect(() => {
    fetchMovimientos();
    fetchClientes();
    fetchAlmacenes();
  }, []);

  // Actualizar la hora cada segundo
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    filterMovimientos();
  }, [searchQuery, movimientos, filtroTipo, filtroCliente, filtroFechaDesde, filtroFechaHasta]);

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
          foto_odometro_url,
          foto_calca_url,
          foto_tablero_url,
          foto_cargador_url,
          foto_extintor_url,
          tiene_danos,
          descripcion_danos,
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

  const fetchUltimoContrato = async (numeroEquipo: string) => {
    if (!numeroEquipo.trim()) {
      setContratoInfo(null);
      return;
    }

    try {
      const { data: equipoData, error: equipoError } = await supabase
        .from('equipos')
        .select('id')
        .eq('numero_equipo', numeroEquipo.trim())
        .maybeSingle();

      if (equipoError || !equipoData) {
        setContratoInfo(null);
        return;
      }

      const { data: contratoData, error: contratoError } = await supabase
        .from('contratos')
        .select('cliente, numero_contrato, folio_contrato')
        .eq('equipo_id', equipoData.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (contratoError || !contratoData) {
        setContratoInfo(null);
        return;
      }

      setContratoInfo(contratoData);
      // Auto-rellenar el cliente si existe
      if (contratoData.cliente) {
        setCliente(contratoData.cliente);
      }
    } catch (error) {
      console.error('Error fetching último contrato:', error);
      setContratoInfo(null);
    }
  };

  // Efecto para buscar el último contrato cuando cambia el número de equipo
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchUltimoContrato(equipoId);
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [equipoId]);

  const filterMovimientos = () => {
    let filtered = [...movimientos];

    // Filtro de búsqueda de texto
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

    // Filtro por tipo
    if (filtroTipo !== "todos") {
      filtered = filtered.filter(m => m.tipo === filtroTipo);
    }

    // Filtro por cliente
    if (filtroCliente !== "todos") {
      filtered = filtered.filter(m => m.cliente === filtroCliente);
    }

    // Filtro por fecha desde
    if (filtroFechaDesde) {
      filtered = filtered.filter(m => {
        if (!m.fecha) return false;
        return new Date(m.fecha) >= new Date(filtroFechaDesde);
      });
    }

    // Filtro por fecha hasta
    if (filtroFechaHasta) {
      filtered = filtered.filter(m => {
        if (!m.fecha) return false;
        return new Date(m.fecha) <= new Date(filtroFechaHasta);
      });
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

      // Subir imágenes generales si hay
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

      // Subir fotos específicas
      const uploadSpecificPhoto = async (file: File | null, prefix: string): Promise<string | null> => {
        if (!file || !isOnline) return null;
        
        const fileName = `${prefix}-${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from('fotografias')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('fotografias')
          .getPublicUrl(fileName);

        return publicUrl;
      };

      const fotoOdometroUrl = await uploadSpecificPhoto(fotoOdometro, 'odometro');
      const fotoCalcaUrl = await uploadSpecificPhoto(fotoCalca, 'calca');
      const fotoTableroUrl = await uploadSpecificPhoto(fotoTablero, 'tablero');
      const fotoCargadorUrl = await uploadSpecificPhoto(fotoCargador, 'cargador');
      const fotoExtintorUrl = await uploadSpecificPhoto(fotoExtintor, 'extintor');

      const movimiento = {
        equipo_id: equipoData.id,
        created_by: user?.id,
        tipo,
        fecha: new Date().toISOString(),
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
        foto_odometro_url: fotoOdometroUrl,
        foto_calca_url: fotoCalcaUrl,
        foto_tablero_url: fotoTableroUrl,
        foto_cargador_url: fotoCargadorUrl,
        foto_extintor_url: fotoExtintorUrl,
        tiene_danos: tieneDanos,
        descripcion_danos: tieneDanos && descripcionDanos.trim() ? descripcionDanos.trim() : null,
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
      setFotoOdometro(null);
      setFotoCalca(null);
      setFotoTablero(null);
      setFotoCargador(null);
      setFotoExtintor(null);
      setTieneDanos(false);
      setDescripcionDanos("");
      setContratoInfo(null);
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
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-sm font-medium">
                  {format(currentDateTime, "dd/MMM/yyyy", { locale: es })}
                </div>
                <div className="text-lg font-bold tabular-nums">
                  {format(currentDateTime, "HH:mm:ss", { locale: es })}
                </div>
              </div>
              <Badge variant={isOnline ? "default" : "secondary"}>
                {isOnline ? "En línea" : "Modo offline"}
              </Badge>
            </div>
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

            {contratoInfo && (
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Último Contrato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cliente:</span>
                    <span className="font-medium">{contratoInfo.cliente}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Número de Contrato:</span>
                    <span className="font-medium">{contratoInfo.numero_contrato || contratoInfo.folio_contrato}</span>
                  </div>
                </CardContent>
              </Card>
            )}

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

            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="tieneDanos" className="text-base font-semibold">¿La unidad presenta daños?</Label>
                  <p className="text-sm text-muted-foreground">Indica si el equipo tiene daños en esta entrada/salida</p>
                </div>
                <Switch
                  id="tieneDanos"
                  checked={tieneDanos}
                  onCheckedChange={setTieneDanos}
                />
              </div>
              
              {tieneDanos && (
                <div className="space-y-2">
                  <Label htmlFor="descripcionDanos">Descripción de los daños</Label>
                  <Textarea
                    id="descripcionDanos"
                    placeholder="Describe los daños encontrados en la unidad..."
                    value={descripcionDanos}
                    onChange={(e) => setDescripcionDanos(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <Label className="text-base font-semibold">Fotos Específicas del Equipo</Label>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fotoOdometro">Foto Odómetro</Label>
                  <Input
                    id="fotoOdometro"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFotoOdometro(e.target.files?.[0] || null)}
                  />
                  {fotoOdometro && <p className="text-xs text-muted-foreground">{fotoOdometro.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fotoCalca">Foto de Calca</Label>
                  <Input
                    id="fotoCalca"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFotoCalca(e.target.files?.[0] || null)}
                  />
                  {fotoCalca && <p className="text-xs text-muted-foreground">{fotoCalca.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fotoTablero">Foto de Tablero</Label>
                  <Input
                    id="fotoTablero"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFotoTablero(e.target.files?.[0] || null)}
                  />
                  {fotoTablero && <p className="text-xs text-muted-foreground">{fotoTablero.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fotoCargador">Foto de Cargador</Label>
                  <Input
                    id="fotoCargador"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFotoCargador(e.target.files?.[0] || null)}
                  />
                  {fotoCargador && <p className="text-xs text-muted-foreground">{fotoCargador.name}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fotoExtintor">Foto de Extintor</Label>
                  <Input
                    id="fotoExtintor"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setFotoExtintor(e.target.files?.[0] || null)}
                  />
                  {fotoExtintor && <p className="text-xs text-muted-foreground">{fotoExtintor.name}</p>}
                </div>
              </div>
            </div>

            <MultipleFileUpload
              files={files}
              onFilesChange={setFiles}
              maxFiles={10}
              acceptImages={true}
              acceptDocuments={true}
              label="Archivos e Imágenes Adicionales (hasta 10)"
            />

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Registrando..." : "Registrar Movimiento"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="space-y-4">
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

            {/* Filtros Avanzados */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-4 border-t">
              <div className="space-y-2">
                <Label htmlFor="filtroTipo">Tipo</Label>
                <Select value={filtroTipo} onValueChange={setFiltroTipo}>
                  <SelectTrigger id="filtroTipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="entrada">Entrada</SelectItem>
                    <SelectItem value="salida">Salida</SelectItem>
                    <SelectItem value="traspaso">Traspaso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filtroCliente">Cliente</Label>
                <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                  <SelectTrigger id="filtroCliente">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {Array.from(new Set(movimientos.map(m => m.cliente).filter(Boolean))).map((cliente) => (
                      <SelectItem key={cliente} value={cliente!}>
                        {cliente}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="filtroFechaDesde">Desde</Label>
                <Input
                  id="filtroFechaDesde"
                  type="date"
                  value={filtroFechaDesde}
                  onChange={(e) => setFiltroFechaDesde(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="filtroFechaHasta">Hasta</Label>
                <Input
                  id="filtroFechaHasta"
                  type="date"
                  value={filtroFechaHasta}
                  onChange={(e) => setFiltroFechaHasta(e.target.value)}
                />
              </div>
            </div>

            {(filtroTipo !== "todos" || filtroCliente !== "todos" || filtroFechaDesde || filtroFechaHasta) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setFiltroTipo("todos");
                  setFiltroCliente("todos");
                  setFiltroFechaDesde("");
                  setFiltroFechaHasta("");
                }}
              >
                Limpiar Filtros
              </Button>
            )}
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
                    <TableHead className="text-right">Acciones</TableHead>
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
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedMovimientoId(movimiento.id);
                            setDetailsDialogOpen(true);
                          }}
                        >
                          Ver Detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EntradaSalidaDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        movimientoId={selectedMovimientoId}
      />
    </div>
  );
}
