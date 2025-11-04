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
import { Search, ClipboardCheck, CheckCircle2, AlertTriangle, Package } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Switch } from "@/components/ui/switch";

interface EquipoEnTaller {
  id: string;
  numero_equipo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  tipo: string | null;
  ubicacion_actual: string | null;
  estado: string | null;
  fecha_entrada: string | null;
}

interface Almacen {
  id: string;
  nombre: string;
}

export default function InspeccionTaller() {
  const [equiposEnTaller, setEquiposEnTaller] = useState<EquipoEnTaller[]>([]);
  const [filteredEquipos, setFilteredEquipos] = useState<EquipoEnTaller[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  
  // Dialog states
  const [selectedEquipo, setSelectedEquipo] = useState<EquipoEnTaller | null>(null);
  const [showInspeccionDialog, setShowInspeccionDialog] = useState(false);
  const [observacionesInspeccion, setObservacionesInspeccion] = useState("");
  const [tieneDanos, setTieneDanos] = useState(false);
  const [descripcionDanos, setDescripcionDanos] = useState("");
  const [almacenDestino, setAlmacenDestino] = useState("");
  const [tecnico, setTecnico] = useState("");
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchEquiposEnTaller();
    fetchAlmacenes();
  }, []);

  useEffect(() => {
    filterEquipos();
  }, [searchQuery, equiposEnTaller]);

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

  const fetchEquiposEnTaller = async () => {
    try {
      // Obtener equipos que están en inspección
      const { data: equiposData, error: equiposError } = await supabase
        .from('equipos')
        .select('id, numero_equipo, descripcion, marca, modelo, serie, tipo, ubicacion_actual, estado')
        .eq('estado', 'en_inspeccion')
        .order('numero_equipo', { ascending: true });

      if (equiposError) throw equiposError;

      // Para cada equipo, obtener la fecha de la última entrada
      const equiposConFecha = await Promise.all(
        (equiposData || []).map(async (equipo) => {
          const { data: entradaData } = await supabase
            .from('entradas_salidas')
            .select('fecha')
            .eq('equipo_id', equipo.id)
            .eq('tipo', 'entrada')
            .order('fecha', { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...equipo,
            fecha_entrada: entradaData?.fecha || null,
          };
        })
      );

      setEquiposEnTaller(equiposConFecha);
    } catch (error) {
      console.error('Error fetching equipos en taller:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los equipos en taller",
      });
    }
  };

  const filterEquipos = () => {
    let filtered = [...equiposEnTaller];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.numero_equipo?.toLowerCase().includes(query) ||
        e.descripcion?.toLowerCase().includes(query) ||
        e.marca?.toLowerCase().includes(query) ||
        e.modelo?.toLowerCase().includes(query) ||
        e.serie?.toLowerCase().includes(query)
      );
    }

    setFilteredEquipos(filtered);
  };

  const handleIniciarInspeccion = (equipo: EquipoEnTaller) => {
    setSelectedEquipo(equipo);
    setShowInspeccionDialog(true);
    setObservacionesInspeccion("");
    setTieneDanos(false);
    setDescripcionDanos("");
    setAlmacenDestino("");
    setTecnico("");
  };

  const handleLiberarEquipo = async () => {
    if (!selectedEquipo) return;
    
    if (!almacenDestino) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar un almacén de destino",
      });
      return;
    }

    if (!observacionesInspeccion.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes ingresar observaciones de la inspección",
      });
      return;
    }

    if (tieneDanos && !descripcionDanos.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes describir los daños encontrados",
      });
      return;
    }

    setLoading(true);
    try {
      // 1. Registrar el mantenimiento de inspección
      const descripcionCompleta = `INSPECCIÓN DE RECIBO - ${observacionesInspeccion}${
        tieneDanos ? `\n\n⚠️ DAÑOS ENCONTRADOS:\n${descripcionDanos}` : '\n\n✓ Sin daños encontrados'
      }`;

      const { error: mantenimientoError } = await supabase
        .from('mantenimientos')
        .insert({
          equipo_id: selectedEquipo.id,
          usuario_id: user?.id,
          tipo_servicio: 'revision',
          tecnico: tecnico.trim() || null,
          descripcion: descripcionCompleta,
          fecha: new Date().toISOString().split('T')[0],
        });

      if (mantenimientoError) throw mantenimientoError;

      // 2. Actualizar el equipo: estado a disponible y asignar almacén
      const almacenSeleccionado = almacenes.find(a => a.id === almacenDestino);
      const { error: equipoError } = await supabase
        .from('equipos')
        .update({ 
          estado: 'disponible',
          ubicacion_actual: `Almacén - ${almacenSeleccionado?.nombre || 'Sin especificar'}`,
          almacen_id: almacenDestino
        })
        .eq('id', selectedEquipo.id);

      if (equipoError) throw equipoError;

      toast({
        title: "Equipo liberado",
        description: `El equipo #${selectedEquipo.numero_equipo} ha sido inspeccionado y liberado a ${almacenSeleccionado?.nombre}`,
      });

      setShowInspeccionDialog(false);
      setSelectedEquipo(null);
      fetchEquiposEnTaller();
    } catch (error) {
      console.error('Error liberando equipo:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo liberar el equipo",
      });
    } finally {
      setLoading(false);
    }
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
        <h1 className="text-3xl font-bold">Inspección de Taller</h1>
        <p className="text-muted-foreground">Inspecciona y libera equipos recibidos</p>
      </div>

      {/* Stats Card */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-yellow-500/10">
              <ClipboardCheck className="h-6 w-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{equiposEnTaller.length}</p>
              <p className="text-sm text-muted-foreground">Equipos pendientes de inspección</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Equipos en Taller</CardTitle>
          <CardDescription>
            Equipos recibidos pendientes de inspección y liberación
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, descripción, marca, modelo o serie..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>
          </div>

          {filteredEquipos.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchQuery ? "No se encontraron equipos" : "No hay equipos pendientes de inspección"}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Equipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Marca/Modelo</TableHead>
                    <TableHead>Serie</TableHead>
                    <TableHead>Fecha Entrada</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipos.map((equipo) => (
                    <TableRow key={equipo.id}>
                      <TableCell className="font-medium">#{equipo.numero_equipo}</TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          <p className="font-medium">{equipo.descripcion}</p>
                          <p className="text-sm text-muted-foreground">{equipo.tipo || 'Sin tipo'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <p>{equipo.marca || 'N/A'}</p>
                          <p className="text-muted-foreground">{equipo.modelo || 'N/A'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{equipo.serie || 'N/A'}</TableCell>
                      <TableCell className="text-sm">{formatDate(equipo.fecha_entrada)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          En Inspección
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          onClick={() => handleIniciarInspeccion(equipo)}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Inspeccionar
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

      {/* Dialog de Inspección */}
      <Dialog open={showInspeccionDialog} onOpenChange={setShowInspeccionDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Inspección de Equipo</DialogTitle>
            <DialogDescription>
              Registra los resultados de la inspección y libera el equipo a almacén
            </DialogDescription>
          </DialogHeader>

          {selectedEquipo && (
            <div className="space-y-4">
              {/* Info del equipo */}
              <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                <p className="text-sm font-medium">Equipo a Inspeccionar</p>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">Número:</span>
                    <span className="ml-2 font-medium">#{selectedEquipo.numero_equipo}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="ml-2 font-medium">{selectedEquipo.tipo || 'N/A'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Descripción:</span>
                    <span className="ml-2 font-medium">{selectedEquipo.descripcion}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Marca:</span>
                    <span className="ml-2 font-medium">{selectedEquipo.marca || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Modelo:</span>
                    <span className="ml-2 font-medium">{selectedEquipo.modelo || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Formulario de inspección */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="tecnico">Técnico Responsable</Label>
                  <Input
                    id="tecnico"
                    placeholder="Nombre del técnico que realizó la inspección"
                    value={tecnico}
                    onChange={(e) => setTecnico(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observaciones">Observaciones de Inspección *</Label>
                  <Textarea
                    id="observaciones"
                    placeholder="Describe el estado general del equipo, componentes revisados, etc."
                    value={observacionesInspeccion}
                    onChange={(e) => setObservacionesInspeccion(e.target.value)}
                    rows={4}
                  />
                </div>

                <div className="flex items-center space-x-2 rounded-lg border p-4">
                  <Switch
                    id="tiene_danos"
                    checked={tieneDanos}
                    onCheckedChange={setTieneDanos}
                  />
                  <Label htmlFor="tiene_danos" className="cursor-pointer">
                    El equipo presenta daños
                  </Label>
                </div>

                {tieneDanos && (
                  <div className="space-y-2">
                    <Label htmlFor="descripcion_danos">Descripción de Daños *</Label>
                    <Textarea
                      id="descripcion_danos"
                      placeholder="Describe detalladamente los daños encontrados..."
                      value={descripcionDanos}
                      onChange={(e) => setDescripcionDanos(e.target.value)}
                      rows={3}
                      className="border-destructive focus-visible:ring-destructive"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="almacen_destino">Almacén de Destino *</Label>
                  <Select value={almacenDestino} onValueChange={setAlmacenDestino}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el almacén donde se ubicará el equipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {almacenes.map((almacen) => (
                        <SelectItem key={almacen.id} value={almacen.id}>
                          {almacen.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowInspeccionDialog(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleLiberarEquipo}
              disabled={loading}
            >
              {loading ? "Liberando..." : "Liberar Equipo a Inventario"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
