import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { 
  Search, 
  History, 
  Filter, 
  RefreshCw,
  ArrowRightLeft,
  Truck,
  Wrench,
  FileText,
  Calendar,
  User
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LogEntry {
  id: string;
  equipo_id: string;
  numero_equipo: string;
  tipo_movimiento: string;
  descripcion: string | null;
  estado_anterior: string | null;
  estado_nuevo: string | null;
  ubicacion_anterior: string | null;
  ubicacion_nueva: string | null;
  cliente: string | null;
  contrato_folio: string | null;
  usuario_email: string | null;
  datos_extra: unknown;
  created_at: string;
}

const TIPOS_MOVIMIENTO = [
  { value: 'salida', label: 'Salida', icon: Truck, color: 'bg-orange-500' },
  { value: 'entrada', label: 'Entrada', icon: Truck, color: 'bg-blue-500' },
  { value: 'renta', label: 'Renta', icon: FileText, color: 'bg-green-500' },
  { value: 'disponible', label: 'Disponible', icon: ArrowRightLeft, color: 'bg-emerald-500' },
  { value: 'apartado', label: 'Apartado', icon: ArrowRightLeft, color: 'bg-yellow-500' },
  { value: 'renovacion', label: 'Renovación', icon: RefreshCw, color: 'bg-purple-500' },
  { value: 'recoleccion', label: 'Recolección', icon: Truck, color: 'bg-indigo-500' },
  { value: 'taller', label: 'Taller', icon: Wrench, color: 'bg-red-500' },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: Wrench, color: 'bg-amber-500' },
  { value: 'cambio_estado', label: 'Cambio Estado', icon: ArrowRightLeft, color: 'bg-slate-500' },
  { value: 'cotizacion', label: 'Cotización', icon: FileText, color: 'bg-cyan-500' },
  { value: 'contrato', label: 'Contrato', icon: FileText, color: 'bg-teal-500' },
];

export default function EquiposLog() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [tipoFilter, setTipoFilter] = useState<string>('all');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  
  const { toast } = useToast();
  const { isAdmin, isVendedor } = useAuth();

  useEffect(() => {
    fetchLogs();
  }, [tipoFilter, fechaDesde, fechaHasta]);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('equipos_log')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (tipoFilter && tipoFilter !== 'all') {
        query = query.eq('tipo_movimiento', tipoFilter);
      }

      if (fechaDesde) {
        query = query.gte('created_at', fechaDesde);
      }

      if (fechaHasta) {
        query = query.lte('created_at', fechaHasta + 'T23:59:59');
      }

      const { data, error } = await query;

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar el historial'
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.numero_equipo?.toLowerCase().includes(query) ||
      log.descripcion?.toLowerCase().includes(query) ||
      log.cliente?.toLowerCase().includes(query) ||
      log.contrato_folio?.toLowerCase().includes(query) ||
      log.usuario_email?.toLowerCase().includes(query)
    );
  });

  const getTipoConfig = (tipo: string) => {
    return TIPOS_MOVIMIENTO.find(t => t.value === tipo) || { 
      label: tipo, 
      icon: ArrowRightLeft, 
      color: 'bg-gray-500' 
    };
  };

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd MMM yyyy, HH:mm", { locale: es });
    } catch {
      return dateString;
    }
  };

  if (!isAdmin && !isVendedor) {
    return <Navigate to="/" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <History className="h-8 w-8" />
            Historial de Equipos
          </h1>
          <p className="text-muted-foreground">
            Registro de todos los movimientos y cambios de estado de los equipos
          </p>
        </div>
        <Button onClick={fetchLogs} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Buscar</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Equipo, cliente, folio..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tipo de Movimiento</Label>
              <Select value={tipoFilter} onValueChange={setTipoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {TIPOS_MOVIMIENTO.map(tipo => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Desde</Label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Hasta</Label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filteredLogs.length}</div>
            <p className="text-xs text-muted-foreground">Registros encontrados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {filteredLogs.filter(l => l.tipo_movimiento === 'renta').length}
            </div>
            <p className="text-xs text-muted-foreground">Rentas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {filteredLogs.filter(l => l.tipo_movimiento === 'salida').length}
            </div>
            <p className="text-xs text-muted-foreground">Salidas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {filteredLogs.filter(l => l.tipo_movimiento === 'entrada').length}
            </div>
            <p className="text-xs text-muted-foreground">Entradas</p>
          </CardContent>
        </Card>
      </div>

      {/* Log Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-40">Fecha/Hora</TableHead>
                  <TableHead className="w-28">Equipo</TableHead>
                  <TableHead className="w-32">Tipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="w-40">Cliente</TableHead>
                  <TableHead className="w-36">Estado</TableHead>
                  <TableHead className="w-36">Usuario</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2" />
                      Cargando historial...
                    </TableCell>
                  </TableRow>
                ) : filteredLogs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No se encontraron registros
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLogs.map((log) => {
                    const tipoConfig = getTipoConfig(log.tipo_movimiento);
                    const IconComponent = tipoConfig.icon;
                    
                    return (
                      <TableRow key={log.id}>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                            {formatDateTime(log.created_at)}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          {log.numero_equipo}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${tipoConfig.color} text-white`}>
                            <IconComponent className="h-3 w-3 mr-1" />
                            {tipoConfig.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {log.descripcion || '-'}
                          {log.contrato_folio && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({log.contrato_folio})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.cliente || '-'}
                        </TableCell>
                        <TableCell>
                          {log.estado_anterior || log.estado_nuevo ? (
                            <div className="flex items-center gap-1 text-xs">
                              {log.estado_anterior && (
                                <Badge variant="outline" className="text-xs">
                                  {log.estado_anterior}
                                </Badge>
                              )}
                              {log.estado_anterior && log.estado_nuevo && (
                                <span className="text-muted-foreground">→</span>
                              )}
                              {log.estado_nuevo && (
                                <Badge variant="secondary" className="text-xs">
                                  {log.estado_nuevo}
                                </Badge>
                              )}
                            </div>
                          ) : '-'}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="truncate max-w-24">
                              {log.usuario_email?.split('@')[0] || '-'}
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
