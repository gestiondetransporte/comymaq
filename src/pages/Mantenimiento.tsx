import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Wrench, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Mantenimiento {
  id: string;
  equipo_id: string;
  fecha: string;
  tipo_servicio: string;
  orden_servicio: string | null;
  tecnico: string | null;
  descripcion: string;
  proximo_servicio: string | null;
  equipos: {
    numero_equipo: string;
    descripcion: string;
    marca: string | null;
    modelo: string | null;
  } | null;
  isProgramado?: boolean;
  horas_contrato?: number;
}

export default function Mantenimiento() {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [filteredMantenimientos, setFilteredMantenimientos] = useState<Mantenimiento[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Form fields
  const [numeroEquipo, setNumeroEquipo] = useState("");
  const [tipoServicio, setTipoServicio] = useState<string>("preventivo");
  const [ordenServicio, setOrdenServicio] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [proximoServicio, setProximoServicio] = useState("");
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchMantenimientos();
  }, []);

  useEffect(() => {
    filterMantenimientos();
  }, [searchQuery, mantenimientos]);

  const fetchMantenimientos = async () => {
    try {
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

      // Obtener equipos con contratos activos que necesitan mantenimiento programado
      const { data: contratosActivos, error: contratosError } = await supabase
        .from('contratos')
        .select(`
          id,
          equipo_id,
          horas_trabajo,
          equipos (
            id,
            numero_equipo,
            descripcion,
            marca,
            modelo
          )
        `)
        .eq('status', 'activo')
        .gte('horas_trabajo', 300);

      if (contratosError) throw contratosError;

      // Crear registros virtuales de mantenimientos programados
      const mantenimientosProgramados: Mantenimiento[] = (contratosActivos || []).map(contrato => ({
        id: `programado-${contrato.equipo_id}`,
        equipo_id: contrato.equipo_id,
        fecha: new Date().toISOString().split('T')[0],
        tipo_servicio: 'programado',
        orden_servicio: null,
        tecnico: null,
        descripcion: `Mantenimiento preventivo requerido - ${contrato.horas_trabajo} horas acumuladas`,
        proximo_servicio: null,
        equipos: contrato.equipos ? {
          numero_equipo: contrato.equipos.numero_equipo,
          descripcion: contrato.equipos.descripcion,
          marca: contrato.equipos.marca,
          modelo: contrato.equipos.modelo,
        } : null,
        isProgramado: true,
        horas_contrato: contrato.horas_trabajo,
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

    if (!numeroEquipo.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes ingresar un número de equipo",
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
      // Buscar el equipo por número para obtener su UUID
      const { data: equipoData, error: equipoError } = await supabase
        .from('equipos')
        .select('id, numero_equipo')
        .eq('numero_equipo', numeroEquipo.trim())
        .maybeSingle();

      if (equipoError) throw equipoError;

      if (!equipoData) {
        toast({
          variant: "destructive",
          title: "Error",
          description: `No se encontró el equipo con número ${numeroEquipo}`,
        });
        setLoading(false);
        return;
      }

      const mantenimiento = {
        equipo_id: equipoData.id,
        usuario_id: user?.id,
        tipo_servicio: tipoServicio,
        orden_servicio: ordenServicio.trim() || null,
        tecnico: tecnico.trim() || null,
        descripcion: descripcion.trim(),
        fecha: new Date().toISOString().split('T')[0],
        proximo_servicio: proximoServicio || null,
      };

      const { error } = await supabase
        .from('mantenimientos')
        .insert(mantenimiento);

      if (error) throw error;

      toast({
        title: "Mantenimiento registrado",
        description: `Servicio ${tipoServicio} registrado para equipo ${numeroEquipo}`,
      });

      // Limpiar formulario
      setNumeroEquipo("");
      setOrdenServicio("");
      setTecnico("");
      setDescripcion("");
      setProximoServicio("");
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="numero_equipo">Número de Equipo *</Label>
                <Input
                  id="numero_equipo"
                  placeholder="Ej: 1, 2, 3..."
                  value={numeroEquipo}
                  onChange={(e) => setNumeroEquipo(e.target.value)}
                  required
                />
              </div>

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
                <Label htmlFor="proximo_servicio">Próximo Servicio</Label>
                <Input
                  id="proximo_servicio"
                  type="date"
                  value={proximoServicio}
                  onChange={(e) => setProximoServicio(e.target.value)}
                />
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
                    <TableHead>Orden</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Próximo Servicio</TableHead>
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
                      <TableCell>{mantenimiento.orden_servicio || 'N/A'}</TableCell>
                      <TableCell>{mantenimiento.tecnico || 'N/A'}</TableCell>
                      <TableCell className="max-w-xs truncate">{mantenimiento.descripcion}</TableCell>
                      <TableCell>{formatDate(mantenimiento.proximo_servicio)}</TableCell>
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
