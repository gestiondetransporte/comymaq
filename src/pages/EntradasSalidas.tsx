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
import { Search, ArrowRightLeft, Trash2 } from "lucide-react";
import { formatMty } from "@/lib/timezone";

import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { EntradaSalidaDetailsDialog } from "@/components/EntradaSalidaDetailsDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";



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
  lleva_extintor: boolean | null;
  odometro: number | null;
  tiene_danos: boolean | null;
  descripcion_danos: string | null;
  equipos: {
    numero_equipo: string;
    descripcion: string;
    ubicacion_actual: string | null;
    almacenes: { nombre: string } | null;
  } | null;
}

interface ContratoInfo {
  cliente: string;
  numero_contrato: string;
  folio_contrato: string;
  obra: string | null;
  vendedor: string | null;
  direccion: string | null;
  municipio: string | null;
  estado_ubicacion: string | null;
  status: string | null;
  comentarios: string | null;
}


interface EquipoInfo {
  id: string;
  numero_equipo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  estado: string | null;
  ubicacion_actual: string | null;
  almacen_nombre: string | null;
}

interface MantenimientoInfo {
  fecha: string;
  tipo_servicio: string;
  descripcion: string;
  tecnico: string | null;
}

interface RecoleccionInfo {
  fecha_programada: string;
  status: string;
  chofer: string | null;
  transporte: string | null;
  cliente: string | null;
  direccion: string | null;
  comentarios: string | null;
}


interface UltimoOdometro {
  odometro: number;
  fecha: string;
  tipo: string;
}

interface UltimaEntradaSalida {
  fecha: string;
  tipo: string;
  odometro: number | null;
  chofer: string | null;
  transporte: string | null;
  cliente: string | null;
  obra: string | null;
}


export default function EntradasSalidas() {
  const [searchParams] = useSearchParams();
  const equipoIdParam = searchParams.get('equipo_id');
  const [equipoId, setEquipoId] = useState("");
  const [tipo, setTipo] = useState<string>("entrada_equipo");
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
  const [choferes, setChoferes] = useState<Array<{ id: string; nombre: string }>>([]);
  const [bajaConfirmOpen, setBajaConfirmOpen] = useState(false);
  const [contratoInfo, setContratoInfo] = useState<ContratoInfo | null>(null);
  const [equipoInfo, setEquipoInfo] = useState<EquipoInfo | null>(null);
  const [ultimoMantenimiento, setUltimoMantenimiento] = useState<MantenimientoInfo | null>(null);
  const [recoleccionInfo, setRecoleccionInfo] = useState<RecoleccionInfo | null>(null);
  const [ultimoOdometro, setUltimoOdometro] = useState<UltimoOdometro | null>(null);
  const [ultimaEntradaSalida, setUltimaEntradaSalida] = useState<UltimaEntradaSalida | null>(null);

  const [loadingInfo, setLoadingInfo] = useState(false);
  const [llevaExtintor, setLlevaExtintor] = useState<boolean>(false);
  const [odometro, setOdometro] = useState<string>("");
  const [tieneDanos, setTieneDanos] = useState(false);
  const [descripcionDanos, setDescripcionDanos] = useState("");
  const [selectedMovimientoId, setSelectedMovimientoId] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroCliente, setFiltroCliente] = useState<string>("todos");
  const [filtroFechaDesde, setFiltroFechaDesde] = useState<string>("");
  const [filtroFechaHasta, setFiltroFechaHasta] = useState<string>("");
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [movimientoToDelete, setMovimientoToDelete] = useState<string | null>(null);
  const { toast } = useToast();
  const { user, isAdmin } = useAuth();
  const { isOnline } = useOffline();

  useEffect(() => {
    fetchMovimientos();
    fetchClientes();
    fetchAlmacenes();
    fetchChoferes();
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
          lleva_extintor,
          odometro,
          tiene_danos,
          descripcion_danos,
          equipos (
            numero_equipo,
            descripcion,
            ubicacion_actual,
            almacenes ( nombre )
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

  const fetchChoferes = async () => {
    try {
      const { data, error } = await supabase
        .from('personal')
        .select('id, nombre')
        .ilike('puesto', '%chofer%')
        .eq('activo', true)
        .order('nombre', { ascending: true });

      if (error) throw error;
      setChoferes(data || []);
    } catch (error) {
      console.error('Error fetching choferes:', error);
    }
  };

  const fetchEquipoInfo = async (numeroEquipo: string) => {
    if (!numeroEquipo.trim()) {
      setContratoInfo(null);
      setEquipoInfo(null);
      setUltimoMantenimiento(null);
      setRecoleccionInfo(null);
      setUltimoOdometro(null);
      setUltimaEntradaSalida(null);
      setCliente("");
      setObra("");
      setChofer("");
      setTransporte("");
      return;

    }

    setLoadingInfo(true);
    try {
      // 1. Equipo + almacén (excluir bajas; si hay duplicados toma el activo)
      const { data: equiposMatch } = await supabase
        .from('equipos')
        .select(`
          id, numero_equipo, descripcion, marca, modelo, serie, estado, ubicacion_actual,
          almacenes ( nombre )
        `)
        .eq('numero_equipo', numeroEquipo.trim())
        .not('estado', 'in', '("BAJA","baja")')
        .limit(1);
      const equipoData = equiposMatch && equiposMatch.length > 0 ? equiposMatch[0] : null;

      if (!equipoData) {
        setEquipoInfo(null);
        setContratoInfo(null);
        setUltimoMantenimiento(null);
        setRecoleccionInfo(null);
        setUltimoOdometro(null);
        setUltimaEntradaSalida(null);
        setLoadingInfo(false);
        return;
      }


      setEquipoInfo({
        id: equipoData.id,
        numero_equipo: equipoData.numero_equipo,
        descripcion: equipoData.descripcion,
        marca: equipoData.marca,
        modelo: equipoData.modelo,
        serie: equipoData.serie,
        estado: equipoData.estado,
        ubicacion_actual: equipoData.ubicacion_actual,
        almacen_nombre: (equipoData.almacenes as any)?.nombre ?? null,
      });

      // 2. Contrato activo o más reciente (en paralelo con los demás)
      const [contratoRes, mantRes, recolRes, odoRes, ultEsRes] = await Promise.all([
        supabase
          .from('contratos')
          .select('cliente, numero_contrato, folio_contrato, obra, vendedor, direccion, municipio, estado_ubicacion, status, comentarios')
          .eq('equipo_id', equipoData.id)
          .order('status', { ascending: true }) // 'activo' viene antes alfabéticamente que otros comunes
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('mantenimientos')
          .select('fecha, tipo_servicio, descripcion, tecnico')
          .eq('equipo_id', equipoData.id)
          .order('fecha', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('recolecciones')
          .select('fecha_programada, status, chofer, transporte, cliente, direccion, comentarios')
          .eq('equipo_id', equipoData.id)
          .in('status', ['pendiente', 'programada', 'en_proceso'])
          .order('fecha_programada', { ascending: true })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('entradas_salidas')
          .select('odometro, fecha, tipo')
          .eq('equipo_id', equipoData.id)
          .not('odometro', 'is', null)
          .order('fecha', { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from('entradas_salidas')
          .select('fecha, tipo, odometro, chofer, transporte, cliente, obra')
          .eq('equipo_id', equipoData.id)
          .order('fecha', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

      const contratoData = contratoRes.data;
      setContratoInfo(contratoData ?? null);
      setUltimoMantenimiento(mantRes.data ?? null);
      setRecoleccionInfo(recolRes.data ?? null);
      setUltimoOdometro(odoRes.data ?? null);
      setUltimaEntradaSalida(ultEsRes.data ?? null);

      // El auto-rellenado se hace en otro useEffect que reacciona al tipo seleccionado.


    } catch (error) {
      console.error('Error fetching equipo info:', error);
    } finally {
      setLoadingInfo(false);
    }
  };

  // Efecto para buscar info completa cuando cambia el número de equipo
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchEquipoInfo(equipoId);
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [equipoId]);

  // Clasificación del tipo de movimiento para auto-rellenar desde la fuente correcta
  const isEntradaTipo = (t: string) =>
    t === "entrada_equipo" || t === "regreso_renta";
  const isSalidaTipo = (t: string) =>
    t === "salida_renta" ||
    t === "salida_venta" ||
    t === "salida_taller_externo" ||
    t === "regreso_proveedor";

  // Auto-rellenar cliente/obra/chofer/transporte/observaciones según tipo:
  // Entradas → desde la recolección programada
  // Salidas → desde el contrato activo
  useEffect(() => {
    if (!equipoInfo) return;

    if (isEntradaTipo(tipo) && recoleccionInfo) {
      setCliente(recoleccionInfo.cliente || "");
      setChofer(recoleccionInfo.chofer || "");
      setTransporte(recoleccionInfo.transporte || "");
      setObra(recoleccionInfo.direccion || "");
      setObservaciones(recoleccionInfo.comentarios || "");
    } else if (isSalidaTipo(tipo) && contratoInfo) {
      setCliente(contratoInfo.cliente || "");
      setObra(contratoInfo.obra || "");
      setChofer("");
      setTransporte("");
      setObservaciones(contratoInfo.comentarios || "");
    }
  }, [tipo, equipoInfo, contratoInfo, recoleccionInfo]);



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

    if (tipo === "regreso_proveedor") {
      setBajaConfirmOpen(true);
      return;
    }

    await executeMovimiento();
  };

  const executeMovimiento = async () => {
    setLoading(true);

    try {
      // Primero buscar el equipo por número para obtener su UUID (excluir bajas)
      const { data: equiposBuscar, error: equipoError } = await supabase
        .from('equipos')
        .select('id, numero_equipo, serie, modelo, almacen_id, estado')
        .eq('numero_equipo', equipoId.trim())
        .not('estado', 'in', '("BAJA","baja")')
        .limit(1);
      const equipoData = equiposBuscar && equiposBuscar.length > 0 ? equiposBuscar[0] : null;

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

      // Mapear tipo del formulario al valor válido en la BD (CHECK constraint: entrada, salida, traspaso)
      const tipoDbMap: Record<string, string> = {
        'entrada_equipo': 'entrada',
        'regreso_renta': 'entrada',
        'salida_renta': 'salida',
        'salida_venta': 'salida',
        'salida_taller_externo': 'salida',
        'regreso_proveedor': 'salida',
        'traspaso': 'traspaso',
      };

      const movimiento = {
        equipo_id: equipoData.id,
        created_by: user?.id,
        tipo: tipoDbMap[tipo] || 'entrada',
        fecha: new Date().toISOString(),
        cliente: cliente.trim() || null,
        obra: obra.trim() || null,
        chofer: chofer.trim() || null,
        transporte: transporte.trim() || null,
        serie: equipoData.serie,
        modelo: equipoData.modelo,
        comentarios: observaciones.trim() ? `[${tipo}] ${observaciones.trim()}` : `[${tipo}]`,
        fotografia_url: null,
        fotografia_url_2: null,
        fotografia_url_3: null,
        foto_odometro_url: null,
        foto_calca_url: null,
        foto_tablero_url: null,
        foto_cargador_url: null,
        foto_extintor_url: null,
        lleva_extintor: llevaExtintor,
        odometro: odometro.trim() ? parseFloat(odometro) : null,
        tiene_danos: tieneDanos,
        descripcion_danos: tieneDanos && descripcionDanos.trim() ? descripcionDanos.trim() : null,
        almacen_origen_id: tipo === "traspaso" ? almacenOrigen : null,
        almacen_destino_id: tipo === "traspaso" ? almacenDestino : null,
      };

      if (isOnline) {
        // Si hay conexión, guardar directamente
        const { error } = await supabase
          .from('entradas_salidas')
          .insert(movimiento)
          .select()
          .single();

        if (error) throw error;

        // Update equipment status based on movement type
        const statusMap: Record<string, { estado: string; ubicacion?: string }> = {
          'entrada_equipo': { estado: 'taller', ubicacion: 'Taller - Pendiente de Inspección' },
          'regreso_renta': { estado: 'taller', ubicacion: 'Taller - Pendiente de Inspección' },
          'salida_renta': { estado: 'dentro' },
          'salida_venta': { estado: 'baja' },
          'salida_taller_externo': { estado: 'taller_externo' },
          'regreso_proveedor': { estado: 'baja', ubicacion: 'Regresado a Proveedor' },
        };

        const statusUpdate = statusMap[tipo];
        if (statusUpdate) {
          const updateData: Record<string, string> = { estado: statusUpdate.estado };
          if (statusUpdate.ubicacion) {
            updateData.ubicacion_actual = statusUpdate.ubicacion;
          }
          const { error: updateError } = await supabase
            .from('equipos')
            .update(updateData)
            .eq('id', equipoData.id);

          if (updateError) throw updateError;
        }

        // Si es traspaso, actualizar el almacen_id del equipo
        if (tipo === "traspaso") {
          const { error: updateError } = await supabase
            .from('equipos')
            .update({ almacen_id: almacenDestino })
            .eq('id', equipoData.id);

          if (updateError) throw updateError;
        }

        const tipoLabels: Record<string, string> = {
          'entrada_equipo': 'Entrada de Equipo',
          'regreso_renta': 'Regreso de Renta',
          'salida_renta': 'Salida a Renta',
          'salida_venta': 'Salida Venta',
          'salida_taller_externo': 'Salida a Taller Externo',
          'regreso_proveedor': 'Regreso a Proveedor',
          'traspaso': 'Traspaso',
        };

        toast({
          title: "Movimiento registrado",
          description: `${tipoLabels[tipo] || tipo} registrada exitosamente para equipo ${equipoId}`,
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
      setLlevaExtintor(false);
      setOdometro("");
      setTieneDanos(false);
      setDescripcionDanos("");
      setContratoInfo(null);
      setEquipoInfo(null);
      setUltimoMantenimiento(null);
      setRecoleccionInfo(null);
      setUltimoOdometro(null);
    } catch (error: any) {
      console.error('Error registrando movimiento:', error);
      const errorMsg = error?.message || error?.error_description || 'Error desconocido';
      toast({
        variant: "destructive",
        title: "Error",
        description: `No se pudo registrar el movimiento: ${errorMsg}`,
      });
    } finally {
      setLoading(false);
    }
  };


  const getTipoBadge = (tipo: string) => {
    const badges: Record<string, { label: string; className: string; variant?: string }> = {
      'entrada_equipo': { label: 'Entrada de Equipo', className: 'bg-green-600 hover:bg-green-700' },
      'regreso_renta': { label: 'Regreso de Renta', className: 'bg-green-600 hover:bg-green-700' },
      'entrada': { label: 'Entrada', className: 'bg-green-600 hover:bg-green-700' },
      'salida_renta': { label: 'Salida a Renta', className: 'bg-orange-600 hover:bg-orange-700' },
      'salida_venta': { label: 'Salida Venta', className: 'bg-red-600 hover:bg-red-700' },
      'salida_taller_externo': { label: 'Taller Externo', className: 'bg-purple-600 hover:bg-purple-700' },
      'regreso_proveedor': { label: 'Regreso a Proveedor', className: 'bg-rose-700 hover:bg-rose-800' },

      'salida': { label: 'Salida', className: '' },
      'traspaso': { label: 'Traspaso', className: 'bg-blue-600 hover:bg-blue-700' },
    };
    const badge = badges[tipo];
    if (badge) {
      if (tipo === 'salida') return <Badge variant="destructive">{badge.label}</Badge>;
      return <Badge variant="default" className={badge.className}>{badge.label}</Badge>;
    }
    return <Badge variant="outline">{tipo}</Badge>;
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    try {
      return formatMty(date, 'dd/MMM/yyyy HH:mm');
    } catch {
      return 'N/A';
    }
  };

  const handleDeleteMovimiento = async () => {
    if (!movimientoToDelete) return;

    try {
      const { error } = await supabase
        .from('entradas_salidas')
        .delete()
        .eq('id', movimientoToDelete);

      if (error) throw error;

      toast({
        title: "Registro eliminado",
        description: "El movimiento ha sido eliminado exitosamente",
      });

      fetchMovimientos();
    } catch (error) {
      console.error('Error deleting movimiento:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el movimiento",
      });
    } finally {
      setDeleteDialogOpen(false);
      setMovimientoToDelete(null);
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
                  {formatMty(currentDateTime, "dd/MMM/yyyy")}
                </div>
                <div className="text-lg font-bold tabular-nums">
                  {formatMty(currentDateTime, "HH:mm:ss")}

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

            {loadingInfo && equipoId.trim() && (
              <p className="text-sm text-muted-foreground">Buscando información del equipo...</p>
            )}

            {equipoInfo && (
              <Card className="bg-muted/50 border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2 flex-wrap">
                    🛠️ Información del Equipo
                    <Badge variant="outline" className="text-xs">
                      #{equipoInfo.numero_equipo}
                    </Badge>
                    {equipoInfo.estado && (
                      <Badge variant="secondary" className="text-xs capitalize">
                        {equipoInfo.estado}
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                    <div className="flex justify-between"><span className="text-muted-foreground">Descripción:</span><span className="font-medium text-right">{equipoInfo.descripcion}</span></div>
                    {equipoInfo.marca && <div className="flex justify-between"><span className="text-muted-foreground">Marca:</span><span className="font-medium text-right">{equipoInfo.marca}</span></div>}
                    {equipoInfo.modelo && <div className="flex justify-between"><span className="text-muted-foreground">Modelo:</span><span className="font-medium text-right">{equipoInfo.modelo}</span></div>}
                    {equipoInfo.serie && <div className="flex justify-between"><span className="text-muted-foreground">Serie:</span><span className="font-medium text-right">{equipoInfo.serie}</span></div>}
                    {equipoInfo.almacen_nombre && <div className="flex justify-between"><span className="text-muted-foreground">Almacén:</span><span className="font-medium text-right">{equipoInfo.almacen_nombre}</span></div>}
                    {equipoInfo.ubicacion_actual && <div className="flex justify-between"><span className="text-muted-foreground">Ubicación actual:</span><span className="font-medium text-right">{equipoInfo.ubicacion_actual}</span></div>}
                    {ultimoOdometro && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Último odómetro:</span>
                        <span className="font-medium text-right">
                          {ultimoOdometro.odometro} ({formatDate(ultimoOdometro.fecha)})
                        </span>
                      </div>
                    )}
                  </div>

                  {ultimoMantenimiento && (
                    <div className="pt-2 border-t">
                      <p className="font-semibold text-xs mb-1">🔧 Último Mantenimiento</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                        <div className="flex justify-between"><span className="text-muted-foreground">Fecha:</span><span className="font-medium text-right">{formatDate(ultimoMantenimiento.fecha)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Tipo:</span><span className="font-medium text-right">{ultimoMantenimiento.tipo_servicio}</span></div>
                        {ultimoMantenimiento.tecnico && <div className="flex justify-between"><span className="text-muted-foreground">Técnico:</span><span className="font-medium text-right">{ultimoMantenimiento.tecnico}</span></div>}
                        {ultimoMantenimiento.descripcion && <div className="md:col-span-2 text-muted-foreground italic">"{ultimoMantenimiento.descripcion}"</div>}
                      </div>
                    </div>
                  )}

                  {ultimaEntradaSalida && (

                    <div className="pt-2 border-t">
                      <p className="font-semibold text-xs mb-1">🔁 Última Entrada/Salida</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                        <div className="flex justify-between"><span className="text-muted-foreground">Fecha:</span><span className="font-medium text-right">{formatDate(ultimaEntradaSalida.fecha)}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Tipo:</span><span className="font-medium text-right capitalize">{ultimaEntradaSalida.tipo}</span></div>
                        {ultimaEntradaSalida.odometro != null && <div className="flex justify-between"><span className="text-muted-foreground">Odómetro:</span><span className="font-medium text-right">{ultimaEntradaSalida.odometro}</span></div>}
                        {ultimaEntradaSalida.cliente && <div className="flex justify-between"><span className="text-muted-foreground">Cliente:</span><span className="font-medium text-right">{ultimaEntradaSalida.cliente}</span></div>}
                        {ultimaEntradaSalida.chofer && <div className="flex justify-between"><span className="text-muted-foreground">Chofer:</span><span className="font-medium text-right">{ultimaEntradaSalida.chofer}</span></div>}
                        {ultimaEntradaSalida.transporte && <div className="flex justify-between"><span className="text-muted-foreground">Transporte:</span><span className="font-medium text-right">{ultimaEntradaSalida.transporte}</span></div>}
                      </div>
                    </div>
                  )}



                  {contratoInfo && (
                    <div className="pt-2 border-t">
                      <p className="font-semibold text-xs mb-1 flex items-center gap-2">
                        📋 Contrato {contratoInfo.status === 'activo' ? 'Activo' : `(${contratoInfo.status ?? 'histórico'})`}
                        {contratoInfo.status === 'activo' && <Badge variant="default" className="bg-green-600 text-xs">Activo</Badge>}
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                        <div className="flex justify-between"><span className="text-muted-foreground">Folio:</span><span className="font-medium text-right">{contratoInfo.folio_contrato}</span></div>
                        <div className="flex justify-between"><span className="text-muted-foreground">Cliente:</span><span className="font-medium text-right">{contratoInfo.cliente}</span></div>
                        {contratoInfo.obra && <div className="flex justify-between"><span className="text-muted-foreground">Obra:</span><span className="font-medium text-right">{contratoInfo.obra}</span></div>}
                        {contratoInfo.direccion && <div className="flex justify-between"><span className="text-muted-foreground">Dirección:</span><span className="font-medium text-right">{contratoInfo.direccion}</span></div>}
                        {contratoInfo.municipio && <div className="flex justify-between"><span className="text-muted-foreground">Municipio:</span><span className="font-medium text-right">{contratoInfo.municipio}</span></div>}
                        {contratoInfo.vendedor && <div className="flex justify-between"><span className="text-muted-foreground">Vendedor:</span><span className="font-medium text-right">{contratoInfo.vendedor}</span></div>}
                      </div>
                    </div>
                  )}

                  {recoleccionInfo && (
                    <div className="pt-2 border-t">
                      <p className="font-semibold text-xs mb-1 flex items-center gap-2">
                        🚚 Recolección programada
                        <Badge variant="outline" className="text-xs capitalize">{recoleccionInfo.status}</Badge>
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-1">
                        <div className="flex justify-between"><span className="text-muted-foreground">Fecha:</span><span className="font-medium text-right">{formatDate(recoleccionInfo.fecha_programada)}</span></div>
                        {recoleccionInfo.chofer && <div className="flex justify-between"><span className="text-muted-foreground">Chofer:</span><span className="font-medium text-right">{recoleccionInfo.chofer}</span></div>}
                        {recoleccionInfo.transporte && <div className="flex justify-between"><span className="text-muted-foreground">Transporte:</span><span className="font-medium text-right">{recoleccionInfo.transporte}</span></div>}
                        {recoleccionInfo.direccion && <div className="flex justify-between"><span className="text-muted-foreground">Dirección:</span><span className="font-medium text-right">{recoleccionInfo.direccion}</span></div>}
                      </div>
                    </div>
                  )}

                  <p className="text-xs text-muted-foreground italic pt-1">
                    ℹ️ Cliente, obra, chofer y transporte se han pre-llenado automáticamente. Puedes editarlos en "Datos del movimiento" si es necesario.
                  </p>
                </CardContent>
              </Card>
            )}

            {equipoId.trim() && !loadingInfo && !equipoInfo && (
              <p className="text-sm text-destructive">⚠️ No se encontró el equipo con número {equipoId}</p>
            )}

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Movimiento</Label>
              <Select value={tipo} onValueChange={(value: string) => setTipo(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada_equipo">Entrada de Equipo</SelectItem>
                  <SelectItem value="regreso_renta">Regreso de Renta</SelectItem>
                  <SelectItem value="salida_renta">Salida a Renta</SelectItem>
                  <SelectItem value="salida_venta">Salida Venta</SelectItem>
                  <SelectItem value="salida_taller_externo">Salida a Taller Externo</SelectItem>
                  <SelectItem value="regreso_proveedor">Regreso a Proveedor</SelectItem>

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

            <div className="border rounded-lg bg-muted/30">
              <div className="p-4 font-semibold text-sm">
                Datos del movimiento (cliente, obra, chofer, transporte)
              </div>
              <div className="p-4 pt-0 space-y-4">
                <p className="text-xs text-muted-foreground">
                  Estos datos se pre-llenan automáticamente desde el contrato y la recolección del equipo. Edítalos solo si es necesario.
                </p>

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
                  <Select value={chofer} onValueChange={setChofer}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar chofer..." />
                    </SelectTrigger>
                    <SelectContent>
                      {choferes.map((c) => (
                        <SelectItem key={c.id} value={c.nombre}>{c.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              </div>
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

            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="llevaExtintor" className="text-base font-semibold">¿Lleva extintor?</Label>
                  <p className="text-sm text-muted-foreground">Indica si el equipo lleva extintor</p>
                </div>
                <Switch
                  id="llevaExtintor"
                  checked={llevaExtintor}
                  onCheckedChange={setLlevaExtintor}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="odometro">Odómetro</Label>
                <Input
                  id="odometro"
                  type="number"
                  placeholder="Lectura del odómetro..."
                  value={odometro}
                  onChange={(e) => setOdometro(e.target.value)}
                />
              </div>
            </div>




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
                    <SelectItem value="entrada_equipo">Entrada de Equipo</SelectItem>
                    <SelectItem value="regreso_renta">Regreso de Renta</SelectItem>
                    <SelectItem value="entrada">Entrada (legacy)</SelectItem>
                    <SelectItem value="salida_renta">Salida a Renta</SelectItem>
                    <SelectItem value="salida_venta">Salida Venta</SelectItem>
                    <SelectItem value="salida_taller_externo">Taller Externo</SelectItem>
                    <SelectItem value="regreso_proveedor">Regreso a Proveedor</SelectItem>

                    <SelectItem value="salida">Salida (legacy)</SelectItem>
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
                    <TableHead>Almacén</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead>Chofer</TableHead>
                    <TableHead>Transporte</TableHead>
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
                      <TableCell>{movimiento.equipos?.almacenes?.nombre || 'N/A'}</TableCell>
                      <TableCell>{movimiento.equipos?.ubicacion_actual || 'N/A'}</TableCell>
                      <TableCell>{movimiento.chofer || 'N/A'}</TableCell>
                      <TableCell>{movimiento.transporte || 'N/A'}</TableCell>


                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
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
                          {isAdmin && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => {
                                setMovimientoToDelete(movimiento.id);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
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

      {/* Diálogo de confirmación de eliminación */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará permanentemente el registro de entrada/salida.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteMovimiento}>
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo de confirmación: Regreso a Proveedor (baja de equipo) */}
      <AlertDialog open={bajaConfirmOpen} onOpenChange={setBajaConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Dar de baja este equipo?</AlertDialogTitle>
            <AlertDialogDescription>
              Estás registrando un <strong>Regreso a Proveedor</strong> para el equipo{" "}
              <strong>#{equipoId}</strong>. Al confirmar, el equipo se marcará como{" "}
              <strong>BAJA</strong> y dejará de estar disponible en el inventario.
              Esta acción puede revertirse manualmente por un administrador.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setBajaConfirmOpen(false);
                await executeMovimiento();
              }}
            >
              Confirmar y dar de baja
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
