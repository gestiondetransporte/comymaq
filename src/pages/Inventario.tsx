import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Search, Eye, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EquipoDetailsDialog } from "@/components/EquipoDetailsDialog";

interface Almacen {
  id: string;
  nombre: string;
  ubicacion: string | null;
}

interface Equipo {
  id: string;
  numero_equipo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  tipo: string | null;
  estado: string | null;
  categoria: string | null;
  clase: string | null;
  almacen_id: string | null;
  tipo_negocio: string | null;
  almacenes?: Almacen | null;
  contrato_activo?: {
    id: string;
    folio_contrato: string;
    cliente: string;
    status: string;
  } | null;
  enMantenimiento?: boolean;
}

export default function Inventario() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [filteredEquipos, setFilteredEquipos] = useState<Equipo[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [tiposNegocio, setTiposNegocio] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("TODOS");
  const [disponibilidadFilter, setDisponibilidadFilter] = useState<string>("TODOS");
  const [almacenFilter, setAlmacenFilter] = useState<string>("TODOS");
  const [tipoNegocioFilter, setTipoNegocioFilter] = useState<string>("TODOS");
  const [selectedEquipo, setSelectedEquipo] = useState<Equipo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<"detalles" | "movimiento" | "mantenimiento" | "archivos" | "qr">("detalles");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchEquipos();
    fetchAlmacenes();
  }, []);

  useEffect(() => {
    filterEquipos();
  }, [searchQuery, equipos, typeFilter, disponibilidadFilter, almacenFilter, tipoNegocioFilter]);

  // Verificar si hay un equipo_id en la URL (desde el QR scanner)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const equipoIdParam = params.get('equipo_id');
    
    if (equipoIdParam && equipos.length > 0) {
      const equipo = equipos.find(e => e.id === equipoIdParam);
      if (equipo) {
        setSelectedEquipo(equipo);
        setInitialTab("detalles");
        setDialogOpen(true);
        
        // Limpiar el parámetro de la URL
        window.history.replaceState({}, '', '/inventario');
      }
    }
  }, [equipos]);

  const fetchAlmacenes = async () => {
    try {
      const { data, error } = await supabase
        .from('almacenes')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setAlmacenes(data || []);
    } catch (error) {
      console.error('Error fetching almacenes:', error);
    }
  };

  const fetchEquipos = async () => {
    setLoading(true);
    
    // Fetch solo campos necesarios (no SELECT *)
    const { data: equiposData, error: equiposError } = await supabase
      .from('equipos')
      .select(`
        id,
        numero_equipo,
        descripcion,
        marca,
        modelo,
        serie,
        tipo,
        estado,
        categoria,
        clase,
        almacen_id,
        tipo_negocio,
        almacenes (
          id,
          nombre,
          ubicacion
        )
      `)
      .order('numero_equipo', { ascending: true })
      .limit(500); // Límite de registros

    if (equiposError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el inventario",
      });
      setLoading(false);
      return;
    }

    // Fetch solo contratos activos necesarios
    const { data: contratosData } = await supabase
      .from('contratos')
      .select('id, equipo_id, folio_contrato, cliente, status')
      .eq('status', 'activo')
      .limit(500);

    // Fetch solo equipos con mantenimiento reciente (últimos 7 días)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 7);
    const { data: mantenimientos } = await supabase
      .from('mantenimientos')
      .select('equipo_id')
      .gte('fecha', fechaLimite.toISOString().split('T')[0])
      .limit(500);

    // Create a map of equipo_id to contrato
    const contratosMap = new Map(
      contratosData?.map(c => [c.equipo_id, c]) || []
    );

    // Create set of equipos en mantenimiento
    const equiposEnMantenimiento = new Set(
      mantenimientos?.map(m => m.equipo_id) || []
    );

    // Merge data
    const equiposWithContratos = equiposData.map(equipo => ({
      ...equipo,
      contrato_activo: contratosMap.get(equipo.id) || null,
      enMantenimiento: equiposEnMantenimiento.has(equipo.id),
    }));

    setEquipos(equiposWithContratos);
    
    // Extract unique tipos de negocio
    const uniqueTiposNegocio = Array.from(
      new Set(
        equiposWithContratos
          .map(e => e.tipo_negocio)
          .filter(tipo => tipo !== null && tipo !== '')
      )
    ).sort();
    setTiposNegocio(uniqueTiposNegocio);
    
    setLoading(false);
  };

  const filterEquipos = () => {
    let filtered = equipos;

    // Filter by type
    if (typeFilter !== "TODOS") {
      filtered = filtered.filter(e => e.tipo === typeFilter);
    }

    // Filter by disponibilidad
    if (disponibilidadFilter === "DISPONIBLE") {
      filtered = filtered.filter(e => !e.contrato_activo);
    } else if (disponibilidadFilter === "RENTADO") {
      filtered = filtered.filter(e => e.contrato_activo);
    }

    // Filter by almacén
    if (almacenFilter !== "TODOS") {
      if (almacenFilter === "TALLER") {
        filtered = filtered.filter(e => e.enMantenimiento);
      } else {
        filtered = filtered.filter(e => e.almacen_id === almacenFilter);
      }
    }

    // Filter by tipo de negocio
    if (tipoNegocioFilter !== "TODOS") {
      filtered = filtered.filter(e => e.tipo_negocio === tipoNegocioFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.numero_equipo?.toLowerCase().includes(query) ||
        e.descripcion?.toLowerCase().includes(query) ||
        e.marca?.toLowerCase().includes(query) ||
        e.modelo?.toLowerCase().includes(query) ||
        e.serie?.toLowerCase().includes(query) ||
        e.contrato_activo?.cliente?.toLowerCase().includes(query)
      );
    }

    setFilteredEquipos(filtered);
  };

  const getTipoBadge = (tipo: string | null) => {
    if (tipo === 'ELECTRICA') return <Badge variant="default">ELÉCTRICA</Badge>;
    if (tipo === 'COMBUSTIÓN') return <Badge variant="secondary">COMBUSTIÓN</Badge>;
    return <Badge variant="outline">N/A</Badge>;
  };

  const getDisponibilidadBadge = (contrato: any) => {
    if (contrato) {
      return <Badge variant="destructive">RENTADO</Badge>;
    }
    return <Badge variant="default" className="bg-green-600 hover:bg-green-700">DISPONIBLE</Badge>;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Cargando inventario...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventario de Equipos</h1>
        <p className="text-muted-foreground">
          Total de equipos: {filteredEquipos.length} de {equipos.length}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
          <CardDescription>
            Busca por número, descripción, marca, modelo, serie o cliente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-col">
            <div className="flex-1">
              <Input
                placeholder="Buscar equipo o cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <div className="flex gap-2">
                <Button
                  variant={typeFilter === "TODOS" ? "default" : "outline"}
                  onClick={() => setTypeFilter("TODOS")}
                  size="sm"
                >
                  Todos
                </Button>
                <Button
                  variant={typeFilter === "ELECTRICA" ? "default" : "outline"}
                  onClick={() => setTypeFilter("ELECTRICA")}
                  size="sm"
                >
                  Eléctricos
                </Button>
                <Button
                  variant={typeFilter === "COMBUSTIÓN" ? "default" : "outline"}
                  onClick={() => setTypeFilter("COMBUSTIÓN")}
                  size="sm"
                >
                  Combustión
                </Button>
              </div>
              <div className="flex gap-2 ml-auto">
                <Button
                  variant={disponibilidadFilter === "TODOS" ? "default" : "outline"}
                  onClick={() => setDisponibilidadFilter("TODOS")}
                  size="sm"
                >
                  Todos
                </Button>
                <Button
                  variant={disponibilidadFilter === "DISPONIBLE" ? "default" : "outline"}
                  onClick={() => setDisponibilidadFilter("DISPONIBLE")}
                  size="sm"
                  className="bg-green-600 hover:bg-green-700"
                >
                  Disponibles
                </Button>
                <Button
                  variant={disponibilidadFilter === "RENTADO" ? "default" : "outline"}
                  onClick={() => setDisponibilidadFilter("RENTADO")}
                  size="sm"
                >
                  Rentados
                </Button>
              </div>
            </div>
            <div className="mt-4">
              <Label className="mb-2 block text-sm font-medium">Filtrar por Almacén</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={almacenFilter === "TODOS" ? "default" : "outline"}
                  onClick={() => setAlmacenFilter("TODOS")}
                  size="sm"
                >
                  Todos
                </Button>
                <Button
                  variant={almacenFilter === "TALLER" ? "default" : "outline"}
                  onClick={() => setAlmacenFilter("TALLER")}
                  size="sm"
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  Taller
                </Button>
                {almacenes.map((almacen) => (
                  <Button
                    key={almacen.id}
                    variant={almacenFilter === almacen.id ? "default" : "outline"}
                    onClick={() => setAlmacenFilter(almacen.id)}
                    size="sm"
                  >
                    {almacen.nombre}
                  </Button>
                ))}
              </div>
            </div>
            <div className="mt-4">
              <Label className="mb-2 block text-sm font-medium">Filtrar por Tipo de Negocio</Label>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={tipoNegocioFilter === "TODOS" ? "default" : "outline"}
                  onClick={() => setTipoNegocioFilter("TODOS")}
                  size="sm"
                >
                  Todos
                </Button>
                {tiposNegocio.map((tipo) => (
                  <Button
                    key={tipo}
                    variant={tipoNegocioFilter === tipo ? "default" : "outline"}
                    onClick={() => setTipoNegocioFilter(tipo)}
                    size="sm"
                  >
                    {tipo}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>N° Equipo</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Marca</TableHead>
                  <TableHead>Modelo</TableHead>
                  <TableHead>Serie</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Almacén</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No se encontraron equipos
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEquipos.map((equipo) => (
                    <TableRow key={equipo.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{equipo.numero_equipo}</TableCell>
                      <TableCell>{equipo.descripcion}</TableCell>
                      <TableCell>{equipo.marca || "N/A"}</TableCell>
                      <TableCell>{equipo.modelo || "N/A"}</TableCell>
                      <TableCell className="font-mono text-sm">{equipo.serie || "N/A"}</TableCell>
                      <TableCell>{getTipoBadge(equipo.tipo)}</TableCell>
                      <TableCell>
                        {equipo.enMantenimiento ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            Taller
                          </Badge>
                        ) : equipo.almacenes ? (
                          <Badge variant="outline">{equipo.almacenes.nombre}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Sin asignar</span>
                        )}
                      </TableCell>
                      <TableCell>{getDisponibilidadBadge(equipo.contrato_activo)}</TableCell>
                      <TableCell>
                        {equipo.contrato_activo ? (
                          <div className="text-sm">
                            <p className="font-medium">{equipo.contrato_activo.cliente}</p>
                            <p className="text-muted-foreground text-xs">
                              {equipo.contrato_activo.folio_contrato}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEquipo(equipo as any);
                              setInitialTab("detalles");
                              setDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalles
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEquipo(equipo as any);
                              setInitialTab("qr");
                              setDialogOpen(true);
                            }}
                            title="Ver código QR"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EquipoDetailsDialog
        equipo={selectedEquipo as any}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={fetchEquipos}
        initialTab={initialTab}
      />
    </div>
  );
}
