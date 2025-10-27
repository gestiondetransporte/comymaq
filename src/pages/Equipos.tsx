import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Package, FileText, Wrench, TruckIcon, ArrowRightLeft, Plus, History } from "lucide-react";
import { EquipoDetailsDialog } from "@/components/EquipoDetailsDialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Equipo {
  id: string;
  numero_equipo: string;
  descripcion: string;
  modelo: string | null;
  marca: string | null;
  anio: number | null;
  serie: string | null;
  clase: string | null;
  categoria: string | null;
  tipo: string | null;
  estado: string | null;
  proveedor: string | null;
  precio_lista: number | null;
  precio_real_cliente: number | null;
  costo_proveedor_mxn: number | null;
  costo_proveedor_usd: number | null;
  ganancia: number | null;
  tipo_negocio: string | null;
  asegurado: string | null;
  ubicacion_actual: string | null;
  almacen_id: string | null;
  codigo_qr: string | null;
}

interface Contrato {
  id: string;
  folio_contrato: string;
  cliente: string;
  obra: string | null;
  vendedor: string | null;
  horas_trabajo: number;
  status: string;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
}

interface Mantenimiento {
  id: string;
  fecha: string;
  tipo_servicio: string;
  tecnico: string | null;
  descripcion: string;
  proximo_servicio_horas: number | null;
}

interface EntradaSalida {
  id: string;
  fecha: string;
  tipo: string;
  cliente: string | null;
  obra: string | null;
  chofer: string | null;
  transporte: string | null;
  comentarios: string | null;
}

export default function Equipos() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [contrato, setContrato] = useState<Contrato | null>(null);
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [entradasSalidas, setEntradasSalidas] = useState<EntradaSalida[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTab, setDialogTab] = useState<"detalles" | "movimiento" | "mantenimiento">("detalles");

  useEffect(() => {
    if (!id) return;
    fetchEquipo();
  }, [id]);

  const fetchEquipo = async () => {
    setLoading(true);

    // Fetch solo campos necesarios del equipo
    const { data: equipoData, error: equipoError } = await supabase
      .from('equipos')
      .select(`
        id,
        numero_equipo,
        descripcion,
        modelo,
        marca,
        anio,
        serie,
        clase,
        categoria,
        tipo,
        estado,
        proveedor,
        precio_lista,
        precio_real_cliente,
        costo_proveedor_mxn,
        costo_proveedor_usd,
        ganancia,
        tipo_negocio,
        asegurado,
        ubicacion_actual,
        almacen_id,
        codigo_qr
      `)
      .eq('id', id)
      .single();

    if (equipoError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar la información del equipo",
      });
      setLoading(false);
      return;
    }

    setEquipo(equipoData);

    // Fetch active contract
    const { data: contratoData } = await supabase
      .from('contratos')
      .select('*')
      .eq('equipo_id', id)
      .eq('status', 'activo')
      .maybeSingle();

    setContrato(contratoData);

    // Fetch solo últimos 20 mantenimientos
    const { data: mantenimientosData } = await supabase
      .from('mantenimientos')
      .select('id, fecha, tipo_servicio, tecnico, descripcion, proximo_servicio_horas')
      .eq('equipo_id', id)
      .order('fecha', { ascending: false })
      .limit(20);

    setMantenimientos(mantenimientosData || []);

    // Fetch solo últimas 5 entradas/salidas con campos mínimos
    const { data: entradasSalidasData } = await supabase
      .from('entradas_salidas')
      .select('id, fecha, tipo, cliente, obra, chofer, transporte, comentarios')
      .eq('equipo_id', id)
      .order('fecha', { ascending: false })
      .limit(5);

    setEntradasSalidas(entradasSalidasData || []);
    setLoading(false);
  };

  const handleOpenDialog = (tab: "detalles" | "movimiento" | "mantenimiento") => {
    setDialogTab(tab);
    setDialogOpen(true);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
  }

  if (!equipo) {
    return <div className="flex justify-center items-center min-h-screen">Equipo no encontrado</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Equipo #{equipo.numero_equipo}</h1>
          <p className="text-muted-foreground">{equipo.descripcion}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Detalles del Equipo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Número de Equipo</p>
                <p className="font-medium">{equipo.numero_equipo}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Serie</p>
                <p className="font-medium">{equipo.serie || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Marca</p>
                <p className="font-medium">{equipo.marca || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Modelo</p>
                <p className="font-medium">{equipo.modelo || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Año</p>
                <p className="font-medium">{equipo.anio || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Clase</p>
                <p className="font-medium">{equipo.clase || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Categoría</p>
                <p className="font-medium">{equipo.categoria || "N/A"}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Estado y Contrato Activo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contrato ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant="default">{contrato.status.toUpperCase()}</Badge>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Folio de Contrato</p>
                    <p className="font-medium">{contrato.folio_contrato}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{contrato.cliente}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Obra</p>
                    <p className="font-medium">{contrato.obra || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Vendedor</p>
                    <p className="font-medium">{contrato.vendedor || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Horas de Trabajo</p>
                    <p className="font-medium">{contrato.horas_trabajo} hrs</p>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No hay contrato activo</p>
                <Badge variant="secondary" className="mt-2">DISPONIBLE</Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Últimas Entradas/Salidas
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => navigate(`/entradas-salidas?equipo_id=${id}`)}
          >
            Ver Todas
          </Button>
        </CardHeader>
        <CardContent>
          {entradasSalidas.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Obra</TableHead>
                  <TableHead>Transporte</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entradasSalidas.map((es) => (
                  <TableRow key={es.id}>
                    <TableCell>{new Date(es.fecha).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge variant={es.tipo === 'entrada' ? 'default' : 'secondary'}>
                        {es.tipo.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell>{es.cliente || "N/A"}</TableCell>
                    <TableCell>{es.obra || "N/A"}</TableCell>
                    <TableCell>{es.transporte || "N/A"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              No hay registros de entradas o salidas
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="mantenimiento" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mantenimiento">
            <Wrench className="mr-2 h-4 w-4" />
            Mantenimiento
          </TabsTrigger>
          <TabsTrigger value="reparaciones">
            <Wrench className="mr-2 h-4 w-4" />
            Reparaciones
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mantenimiento" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenDialog("mantenimiento")}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Mantenimiento
            </Button>
          </div>
          {mantenimientos.filter(m => m.tipo_servicio === 'mantenimiento').length > 0 ? (
            mantenimientos
              .filter(m => m.tipo_servicio === 'mantenimiento')
              .map((m) => (
                <Card key={m.id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha</p>
                        <p className="font-medium">{new Date(m.fecha).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Técnico</p>
                        <p className="font-medium">{m.tecnico || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Descripción</p>
                        <p className="font-medium">{m.descripcion}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Próximo Servicio (Horas)</p>
                        <p className="font-medium">
                          {m.proximo_servicio_horas ? `${m.proximo_servicio_horas} hrs` : "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay registros de mantenimiento
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reparaciones" className="space-y-4">
          <div className="flex justify-end">
            <Button onClick={() => handleOpenDialog("mantenimiento")}>
              <Plus className="mr-2 h-4 w-4" />
              Registrar Reparación
            </Button>
          </div>
          {mantenimientos.filter(m => m.tipo_servicio === 'reparacion').length > 0 ? (
            mantenimientos
              .filter(m => m.tipo_servicio === 'reparacion')
              .map((m) => (
                <Card key={m.id}>
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Fecha</p>
                        <p className="font-medium">{new Date(m.fecha).toLocaleDateString()}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Técnico</p>
                        <p className="font-medium">{m.tecnico || "N/A"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Descripción</p>
                        <p className="font-medium">{m.descripcion}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Próximo Servicio (Horas)</p>
                        <p className="font-medium">
                          {m.proximo_servicio_horas ? `${m.proximo_servicio_horas} hrs` : "N/A"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No hay registros de reparaciones
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => handleOpenDialog("movimiento")}
        >
          <TruckIcon className="mr-2 h-4 w-4" />
          Movimiento de Almacén
        </Button>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => handleOpenDialog("movimiento")}
        >
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Entrada de Equipo
        </Button>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => handleOpenDialog("movimiento")}
        >
          <ArrowRightLeft className="mr-2 h-4 w-4" />
          Salida de Equipo
        </Button>
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => handleOpenDialog("movimiento")}
        >
          <TruckIcon className="mr-2 h-4 w-4" />
          Traspaso de Equipo
        </Button>
      </div>

      {equipo && (
        <EquipoDetailsDialog
          equipo={equipo}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onUpdate={fetchEquipo}
          initialTab={dialogTab}
        />
      )}
    </div>
  );
}
