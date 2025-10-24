import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigate } from "react-router-dom";
import { 
  BarChart3, 
  Package, 
  TrendingUp, 
  DollarSign, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Wrench,
  AlertCircle
} from "lucide-react";
import { format, startOfMonth, endOfMonth, addMonths } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardStats {
  totalEquipos: number;
  equiposDisponibles: number;
  equiposRentados: number;
  entradasMes: number;
  salidasMes: number;
  contratosActivos: number;
  contratosVencer30Dias: number;
  montoContratosActivos: number;
  mantenimientosMes: number;
  clientesActivos: number;
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalEquipos: 0,
    equiposDisponibles: 0,
    equiposRentados: 0,
    entradasMes: 0,
    salidasMes: 0,
    contratosActivos: 0,
    contratosVencer30Dias: 0,
    montoContratosActivos: 0,
    mantenimientosMes: 0,
    clientesActivos: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isAdmin) {
      fetchDashboardStats();
    }
  }, [isAdmin]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Obtener equipos totales
      const { data: equipos, error: equiposError } = await supabase
        .from('equipos')
        .select('id');
      
      if (equiposError) throw equiposError;

      // Obtener contratos activos con sus equipos
      const { data: contratosActivos, error: contratosError } = await supabase
        .from('contratos')
        .select('equipo_id, suma, fecha_vencimiento')
        .eq('status', 'activo');

      if (contratosError) throw contratosError;

      // Calcular equipos rentados (con contrato activo)
      const equiposRentadosIds = new Set(contratosActivos?.map(c => c.equipo_id) || []);
      const equiposRentados = equiposRentadosIds.size;
      const equiposDisponibles = (equipos?.length || 0) - equiposRentados;

      // Calcular monto total de contratos activos
      const montoTotal = contratosActivos?.reduce((sum, c) => sum + (Number(c.suma) || 0), 0) || 0;

      // Calcular contratos a vencer en 30 días
      const hoy = new Date();
      const en30Dias = addMonths(hoy, 1);
      const contratosProxVencer = contratosActivos?.filter(c => {
        if (!c.fecha_vencimiento) return false;
        const fechaVenc = new Date(c.fecha_vencimiento);
        return fechaVenc >= hoy && fechaVenc <= en30Dias;
      }).length || 0;

      // Obtener movimientos del mes actual
      const inicioMes = format(startOfMonth(new Date()), 'yyyy-MM-dd');
      const finMes = format(endOfMonth(new Date()), 'yyyy-MM-dd');

      const { data: movimientos, error: movimientosError } = await supabase
        .from('entradas_salidas')
        .select('tipo')
        .gte('fecha', inicioMes)
        .lte('fecha', finMes);

      if (movimientosError) throw movimientosError;

      const entradasMes = movimientos?.filter(m => m.tipo === 'entrada').length || 0;
      const salidasMes = movimientos?.filter(m => m.tipo === 'salida').length || 0;

      // Obtener mantenimientos del mes
      const { data: mantenimientos, error: mantenimientosError } = await supabase
        .from('mantenimientos')
        .select('id')
        .gte('fecha', inicioMes)
        .lte('fecha', finMes);

      if (mantenimientosError) throw mantenimientosError;

      // Obtener clientes únicos con contratos activos
      const { data: clientesData, error: clientesError } = await supabase
        .from('contratos')
        .select('cliente')
        .eq('status', 'activo');

      if (clientesError) throw clientesError;

      const clientesUnicos = new Set(clientesData?.map(c => c.cliente) || []);

      setStats({
        totalEquipos: equipos?.length || 0,
        equiposDisponibles,
        equiposRentados,
        entradasMes,
        salidasMes,
        contratosActivos: contratosActivos?.length || 0,
        contratosVencer30Dias: contratosProxVencer,
        montoContratosActivos: montoTotal,
        mantenimientosMes: mantenimientos?.length || 0,
        clientesActivos: clientesUnicos.size,
      });
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  const statCards = [
    {
      title: "Total de Equipos",
      value: stats.totalEquipos,
      icon: Package,
      description: "Inventario total",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Equipos Disponibles",
      value: stats.equiposDisponibles,
      icon: Package,
      description: "Listos para rentar",
      color: "text-green-600",
      bgColor: "bg-green-50",
      badge: `${((stats.equiposDisponibles / stats.totalEquipos) * 100).toFixed(0)}%`,
    },
    {
      title: "Equipos Rentados",
      value: stats.equiposRentados,
      icon: TrendingUp,
      description: "En contratos activos",
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      badge: `${((stats.equiposRentados / stats.totalEquipos) * 100).toFixed(0)}%`,
    },
    {
      title: "Contratos Activos",
      value: stats.contratosActivos,
      icon: BarChart3,
      description: "Vigentes actualmente",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Monto Total Activo",
      value: `$${stats.montoContratosActivos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`,
      icon: DollarSign,
      description: "Suma de contratos activos",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50",
    },
    {
      title: "Contratos por Vencer",
      value: stats.contratosVencer30Dias,
      icon: AlertCircle,
      description: "Próximos 30 días",
      color: "text-red-600",
      bgColor: "bg-red-50",
      alert: stats.contratosVencer30Dias > 0,
    },
    {
      title: "Salidas del Mes",
      value: stats.salidasMes,
      icon: ArrowUpRight,
      description: format(new Date(), 'MMMM yyyy', { locale: es }),
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Entradas del Mes",
      value: stats.entradasMes,
      icon: ArrowDownRight,
      description: format(new Date(), 'MMMM yyyy', { locale: es }),
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Mantenimientos del Mes",
      value: stats.mantenimientosMes,
      icon: Wrench,
      description: format(new Date(), 'MMMM yyyy', { locale: es }),
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Clientes Activos",
      value: stats.clientesActivos,
      icon: Calendar,
      description: "Con contratos vigentes",
      color: "text-cyan-600",
      bgColor: "bg-cyan-50",
    },
  ];

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando estadísticas...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard Administrativo</h1>
          <p className="text-muted-foreground mt-1">
            Resumen general del sistema - {format(new Date(), "d 'de' MMMM, yyyy", { locale: es })}
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card key={index} className="hover:shadow-lg transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline justify-between">
                  <div className="text-2xl font-bold">{stat.value}</div>
                  {stat.badge && (
                    <Badge variant="secondary" className="ml-2">
                      {stat.badge}
                    </Badge>
                  )}
                  {stat.alert && (
                    <Badge variant="destructive" className="ml-2">
                      ¡Atención!
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Resumen de Ocupación</CardTitle>
            <CardDescription>Estado actual del inventario</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Equipos Rentados</span>
              <span className="text-2xl font-bold text-orange-600">
                {stats.equiposRentados}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-orange-600 h-2.5 rounded-full transition-all"
                style={{
                  width: `${(stats.equiposRentados / stats.totalEquipos) * 100}%`,
                }}
              ></div>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-medium">Equipos Disponibles</span>
              <span className="text-2xl font-bold text-green-600">
                {stats.equiposDisponibles}
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-green-600 h-2.5 rounded-full transition-all"
                style={{
                  width: `${(stats.equiposDisponibles / stats.totalEquipos) * 100}%`,
                }}
              ></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Movimientos del Mes</CardTitle>
            <CardDescription>
              {format(new Date(), 'MMMM yyyy', { locale: es })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <ArrowUpRight className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-blue-900">Salidas</p>
                  <p className="text-xs text-blue-600">Equipos enviados</p>
                </div>
              </div>
              <span className="text-3xl font-bold text-blue-600">
                {stats.salidasMes}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <ArrowDownRight className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-indigo-900">Entradas</p>
                  <p className="text-xs text-indigo-600">Equipos recibidos</p>
                </div>
              </div>
              <span className="text-3xl font-bold text-indigo-600">
                {stats.entradasMes}
              </span>
            </div>

            <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Wrench className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-amber-900">Mantenimientos</p>
                  <p className="text-xs text-amber-600">Servicios realizados</p>
                </div>
              </div>
              <span className="text-3xl font-bold text-amber-600">
                {stats.mantenimientosMes}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
