import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Wrench, Loader2, CheckCircle2, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format, startOfMonth } from "date-fns";
import { es } from "date-fns/locale";

interface Equipo {
  id: string;
  numero_equipo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  tipo: string | null;
}

interface Mantenimiento {
  id: string;
  equipo_id: string;
  fecha: string;
  tipo_servicio: string;
  orden_servicio: string | null;
  tecnico: string | null;
  descripcion: string;
  proximo_servicio_horas: number | null;
  equipos: {
    numero_equipo: string;
    descripcion: string;
    marca: string | null;
    modelo: string | null;
  } | null;
  isProgramado?: boolean;
  horas_contrato?: number;
  obra?: string | null;
  ubicacion_obra?: string | null;
}

export default function Mantenimiento() {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [filteredMantenimientos, setFilteredMantenimientos] = useState<Mantenimiento[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  
  // Form fields
  const [equipoSeleccionadoId, setEquipoSeleccionadoId] = useState("");
  const [tipoServicio, setTipoServicio] = useState<string>("preventivo");
  const [ordenServicio, setOrdenServicio] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [proximoServicioHoras, setProximoServicioHoras] = useState<number | "">("");
  
  // Dialog states
  const [selectedProgramado, setSelectedProgramado] = useState<Mantenimiento | null>(null);
  const [showProgramadoDialog, setShowProgramadoDialog] = useState(false);
  const [showUbicacionDialog, setShowUbicacionDialog] = useState(false);
  const [selectedUbicacion, setSelectedUbicacion] = useState<{obra: string, ubicacion: string} | null>(null);
  const [proximoServicioManual, setProximoServicioManual] = useState<number>(0);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchMantenimientos();
    fetchEquipos();
  }, []);

  useEffect(() => {
    filterMantenimientos();
  }, [searchQuery, mantenimientos]);

  const fetchEquipos = async () => {
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('id, numero_equipo, descripcion, marca, modelo, serie, tipo')
        .order('numero_equipo', { ascending: true });

      if (error) throw error;
      setEquipos(data || []);
    } catch (error) {
      console.error('Error fetching equipos:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los equipos",
      });
    }
  };

  const fetchMantenimientos = async () => {
    try {
      const inicioMes = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      
      // Obtener mantenimientos registrados
      const { data: mantenimientosData, error: mantenimientosError } = await supabase
        .from('mantenimientos')
        .select(`
          *,
          equipos (
            numero_equipo,
            descripcion,
            marca,
            modelo
          )
        `)
        .order('fecha', { ascending: false });

      if (mantenimientosError) throw mantenimientosError;

      // Obtener IDs de equipos que ya tuvieron mantenimiento preventivo este mes
      const equiposConMantenimientoReciente = new Set(
        (mantenimientosData || [])
          .filter(m => 
            m.tipo_servicio === 'preventivo' && 
            m.fecha >= inicioMes
          )
          .map(m => m.equipo_id)
      );

      // Obtener equipos con contratos activos que necesitan mantenimiento programado
      const { data: contratosActivos, error: contratosError } = await supabase
        .from('contratos')
        .select(`
          id,
          equipo_id,
          horas_trabajo,
          obra,
          equipos (
            id,
            numero_equipo,
            descripcion,
            marca,
            modelo,
            ubicacion_actual
          )
        `)
        .eq('status', 'activo')
        .gte('horas_trabajo', 300);

      if (contratosError) throw contratosError;

      // Crear registros virtuales de mantenimientos programados
      // Excluir equipos que ya tuvieron mantenimiento preventivo este mes
      const mantenimientosProgramados: Mantenimiento[] = (contratosActivos || [])
        .filter(contrato => !equiposConMantenimientoReciente.has(contrato.equipo_id))
        .map(contrato => ({
          id: `programado-${contrato.equipo_id}`,
          equipo_id: contrato.equipo_id,
          fecha: new Date().toISOString().split('T')[0],
          tipo_servicio: 'programado',
          orden_servicio: null,
          tecnico: null,
          descripcion: `Mantenimiento preventivo requerido - ${contrato.horas_trabajo} horas acumuladas`,
          proximo_servicio_horas: null,
          equipos: contrato.equipos ? {
            numero_equipo: contrato.equipos.numero_equipo,
            descripcion: contrato.equipos.descripcion,
            marca: contrato.equipos.marca,
            modelo: contrato.equipos.modelo,
          } : null,
          isProgramado: true,
          horas_contrato: contrato.horas_trabajo,
          obra: contrato.obra,
          ubicacion_obra: contrato.equipos?.ubicacion_actual,
        }));

      // Combinar mantenimientos reales con programados
      const todosMantenimientos = [...mantenimientosProgramados, ...(mantenimientosData || [])];
      setMantenimientos(todosMantenimientos);
    } catch (error) {
      console.error('Error fetching mantenimientos:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los mantenimientos",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!equipoSeleccionadoId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar un equipo",
      });
      return;
    }

    if (!descripcion.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "La descripción del servicio es obligatoria",
      });
      return;
    }

    setLoading(true);

    try {
      const equipoSeleccionado = equipos.find(e => e.id === equipoSeleccionadoId);
      
      const mantenimiento = {
        equipo_id: equipoSeleccionadoId,
        usuario_id: user?.id,
        tipo_servicio: tipoServicio,
        orden_servicio: ordenServicio.trim() || null,
        tecnico: tecnico.trim() || null,
        descripcion: descripcion.trim(),
        fecha: new Date().toISOString().split('T')[0],
        proximo_servicio_horas: proximoServicioHoras || null,
      };

      const { error } = await supabase
        .from('mantenimientos')
        .insert(mantenimiento);

      if (error) throw error;

      toast({
        title: "Mantenimiento registrado",
        description: `Servicio ${tipoServicio} registrado para equipo ${equipoSeleccionado?.numero_equipo}`,
      });

      // Limpiar formulario
      setEquipoSeleccionadoId("");
      setOrdenServicio("");
      setTecnico("");
      setDescripcion("");
      setProximoServicioHoras("");
      setTipoServicio("preventivo");

      // Recargar lista
      fetchMantenimientos();
    } catch (error) {
      console.error('Error registrando mantenimiento:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el mantenimiento",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterMantenimientos = () => {
    let filtered = [...mantenimientos];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(m =>
        m.equipos?.numero_equipo?.toLowerCase().includes(query) ||
        m.equipos?.descripcion?.toLowerCase().includes(query) ||
        m.tipo_servicio?.toLowerCase().includes(query) ||
        m.tecnico?.toLowerCase().includes(query) ||
        m.orden_servicio?.toLowerCase().includes(query)
      );
    }

    setFilteredMantenimientos(filtered);
  };

  const getTipoServicioBadge = (tipo: string, isProgramado?: boolean, horas?: number) => {
    if (isProgramado) {
      return (
        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
          Programado ({horas}h)
        </Badge>
      );
    }
    
    switch (tipo.toLowerCase()) {
      case 'preventivo':
        return <Badge variant="default">Preventivo</Badge>;
      case 'correctivo':
        return <Badge variant="destructive">Correctivo</Badge>;
      case 'revision':
        return <Badge variant="secondary">Revisión</Badge>;
      case 'reparacion':
        return <Badge variant="outline">Reparación</Badge>;
      default:
        return <Badge variant="outline">{tipo}</Badge>;
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MMM/yyyy', { locale: es });
    } catch {
      return 'N/A';
    }
  };

  const formatHoras = (horas: number | null) => {
    if (!horas) return 'N/A';
    return `${horas} hrs`;
  };

  const handleMarcarRealizado = async () => {
    if (!selectedProgramado) return;
    
    if (!proximoServicioManual || proximoServicioManual <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes ingresar las horas para el próximo servicio",
      });
      return;
    }
    
    setLoading(true);
    try {
      const { error } = await supabase
        .from('mantenimientos')
        .insert({
          equipo_id: selectedProgramado.equipo_id,
          usuario_id: user?.id,
          tipo_servicio: 'preventivo',
          orden_servicio: null,
          tecnico: null,
          descripcion: `Mantenimiento preventivo realizado - ${selectedProgramado.horas_contrato} horas`,
          fecha: new Date().toISOString().split('T')[0],
          proximo_servicio_horas: proximoServicioManual,
        });

      if (error) throw error;

      toast({
        title: "Mantenimiento registrado",
        description: "El mantenimiento programado se marcó como realizado",
      });

      setShowProgramadoDialog(false);
      setSelectedProgramado(null);
      setProximoServicioManual(0);
      fetchMantenimientos();
    } catch (error) {
      console.error('Error registrando mantenimiento:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo marcar como realizado",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVerUbicacion = (obra: string | null, ubicacion: string | null) => {
    if (obra && ubicacion) {
      setSelectedUbicacion({ obra, ubicacion });
      setShowUbicacionDialog(true);
    } else {
      toast({
        variant: "destructive",
        title: "Sin ubicación",
        description: "No hay información de ubicación disponible para esta obra",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mantenimiento</h1>
        <p className="text-muted-foreground">Registra y consulta el mantenimiento y reparaciones del equipo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Registrar Mantenimiento o Reparación</CardTitle>
          <CardDescription>
            Registra servicios preventivos, correctivos y reparaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="equipo">Equipo *</Label>
                <Select value={equipoSeleccionadoId} onValueChange={setEquipoSeleccionadoId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un equipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {equipos.map((equipo) => (
                      <SelectItem key={equipo.id} value={equipo.id}>
                        #{equipo.numero_equipo} - {equipo.descripcion}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {equipoSeleccionadoId && (() => {
                const equipoSeleccionado = equipos.find(e => e.id === equipoSeleccionadoId);
                return equipoSeleccionado ? (
                  <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                    <p className="text-sm font-medium">Información del Equipo</p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Número:</span>
                        <span className="ml-2 font-medium">#{equipoSeleccionado.numero_equipo}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Tipo:</span>
                        <span className="ml-2 font-medium">{equipoSeleccionado.tipo || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Marca:</span>
                        <span className="ml-2 font-medium">{equipoSeleccionado.marca || 'N/A'}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Modelo:</span>
                        <span className="ml-2 font-medium">{equipoSeleccionado.modelo || 'N/A'}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-muted-foreground">Serie:</span>
                        <span className="ml-2 font-medium">{equipoSeleccionado.serie || 'N/A'}</span>
                      </div>
                    </div>
                  </div>
                ) : null;
              })()}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div className="space-y-2">
                <Label htmlFor="tipo_servicio">Tipo de Servicio *</Label>
                <Select value={tipoServicio} onValueChange={setTipoServicio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preventivo">Preventivo</SelectItem>
                    <SelectItem value="correctivo">Correctivo</SelectItem>
                    <SelectItem value="revision">Revisión</SelectItem>
                    <SelectItem value="reparacion">Reparación</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="orden_servicio">Orden de Servicio</Label>
                <Input
                  id="orden_servicio"
                  placeholder="Número de orden"
                  value={ordenServicio}
                  onChange={(e) => setOrdenServicio(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tecnico">Técnico</Label>
                <Input
                  id="tecnico"
                  placeholder="Nombre del técnico"
                  value={tecnico}
                  onChange={(e) => setTecnico(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="proximo_servicio_horas">Próximo Servicio (Horas)</Label>
                <Input
                  id="proximo_servicio_horas"
                  type="number"
                  placeholder="300, 400, 500..."
                  value={proximoServicioHoras}
                  onChange={(e) => setProximoServicioHoras(e.target.value ? parseInt(e.target.value) : "")}
                  min="0"
                  step="100"
                />
                <p className="text-xs text-muted-foreground">
                  Ingresa las horas de operación para programar el próximo mantenimiento
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción del Servicio *</Label>
              <Textarea
                id="descripcion"
                placeholder="Describe el servicio realizado, piezas reemplazadas, hallazgos..."
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                required
                rows={4}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <Wrench className="mr-2 h-4 w-4" />
                  Registrar Mantenimiento
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Historial de Mantenimientos</CardTitle>
              <CardDescription>
                {filteredMantenimientos.length} de {mantenimientos.length} registros
              </CardDescription>
            </div>
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por equipo, técnico, tipo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredMantenimientos.length === 0 ? (
            <div className="text-center py-8">
              <Wrench className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No se encontraron mantenimientos con los filtros aplicados"
                  : "No hay mantenimientos registrados"}
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
                    <TableHead>Tipo Servicio</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Orden</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Próximo Servicio (Horas)</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredMantenimientos.map((mantenimiento) => (
                    <TableRow key={mantenimiento.id} className={mantenimiento.isProgramado ? "bg-yellow-500/5" : ""}>
                      <TableCell>{formatDate(mantenimiento.fecha)}</TableCell>
                      <TableCell className="font-medium">
                        {mantenimiento.equipos?.numero_equipo || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p className="font-medium">{mantenimiento.equipos?.descripcion || 'N/A'}</p>
                          <p className="text-muted-foreground text-xs">
                            {mantenimiento.equipos?.marca} {mantenimiento.equipos?.modelo}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getTipoServicioBadge(mantenimiento.tipo_servicio, mantenimiento.isProgramado, mantenimiento.horas_contrato)}
                      </TableCell>
                      <TableCell>
                        {mantenimiento.obra ? (
                          <Button
                            variant="link"
                            className="h-auto p-0 text-blue-600 hover:text-blue-800"
                            onClick={() => handleVerUbicacion(mantenimiento.obra, mantenimiento.ubicacion_obra)}
                          >
                            <MapPin className="h-3 w-3 mr-1" />
                            {mantenimiento.obra}
                          </Button>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>{mantenimiento.orden_servicio || 'N/A'}</TableCell>
                      <TableCell>{mantenimiento.tecnico || 'N/A'}</TableCell>
                      <TableCell className="max-w-xs truncate">{mantenimiento.descripcion}</TableCell>
                      <TableCell>{formatHoras(mantenimiento.proximo_servicio_horas)}</TableCell>
                      <TableCell>
                        {mantenimiento.isProgramado && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProgramado(mantenimiento);
                              setProximoServicioManual((mantenimiento.horas_contrato || 0) + 300);
                              setShowProgramadoDialog(true);
                            }}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Realizado
                          </Button>
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

      {/* Dialog para marcar como realizado */}
      <Dialog open={showProgramadoDialog} onOpenChange={setShowProgramadoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Marcar Mantenimiento como Realizado</DialogTitle>
            <DialogDescription>
              ¿Deseas registrar este mantenimiento preventivo como realizado?
            </DialogDescription>
          </DialogHeader>
          
          {selectedProgramado && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Equipo</p>
                  <p className="text-sm font-bold">
                    #{selectedProgramado.equipos?.numero_equipo} - {selectedProgramado.equipos?.descripcion}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Horas Acumuladas</p>
                  <p className="text-sm font-bold">{selectedProgramado.horas_contrato} hrs</p>
                </div>
                {selectedProgramado.obra && (
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-muted-foreground">Obra</p>
                    <p className="text-sm font-bold">{selectedProgramado.obra}</p>
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="proximo_servicio_manual">Próximo Servicio (Horas) *</Label>
                <Input
                  id="proximo_servicio_manual"
                  type="number"
                  placeholder="300, 400, 500..."
                  value={proximoServicioManual}
                  onChange={(e) => setProximoServicioManual(e.target.value ? parseInt(e.target.value) : 0)}
                  min="0"
                  step="100"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Ingresa las horas de operación para programar el próximo mantenimiento
                </p>
              </div>
              
              <div className="rounded-lg bg-blue-50 p-4">
                <p className="text-sm text-blue-900">
                  Se registrará un mantenimiento preventivo para hoy y se programará el próximo servicio a las{' '}
                  <span className="font-bold">{proximoServicioManual} horas</span>.
                </p>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowProgramadoDialog(false);
                setSelectedProgramado(null);
                setProximoServicioManual(0);
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button onClick={handleMarcarRealizado} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Marcar como Realizado
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para ubicación de obra */}
      <Dialog open={showUbicacionDialog} onOpenChange={setShowUbicacionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-blue-600" />
              Ubicación de la Obra
            </DialogTitle>
          </DialogHeader>
          
          {selectedUbicacion && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Obra</p>
                <p className="text-lg font-bold">{selectedUbicacion.obra}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Dirección / Ubicación</p>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="text-sm">{selectedUbicacion.ubicacion}</p>
                </div>
              </div>
              
              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const encodedAddress = encodeURIComponent(selectedUbicacion.ubicacion);
                    window.open(`https://www.google.com/maps/search/?api=1&query=${encodedAddress}`, '_blank');
                  }}
                >
                  <MapPin className="mr-2 h-4 w-4" />
                  Abrir en Google Maps
                </Button>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setShowUbicacionDialog(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
