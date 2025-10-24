import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { Search, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { EquipoDetailsDialog } from "@/components/EquipoDetailsDialog";

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
  contrato_activo?: {
    id: string;
    folio_contrato: string;
    cliente: string;
    status: string;
  } | null;
}

export default function Inventario() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [filteredEquipos, setFilteredEquipos] = useState<Equipo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("TODOS");
  const [disponibilidadFilter, setDisponibilidadFilter] = useState<string>("TODOS");
  const [selectedEquipo, setSelectedEquipo] = useState<Equipo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchEquipos();
  }, []);

  useEffect(() => {
    filterEquipos();
  }, [searchQuery, equipos, typeFilter, disponibilidadFilter]);

  const fetchEquipos = async () => {
    setLoading(true);
    
    // Fetch equipos
    const { data: equiposData, error: equiposError } = await supabase
      .from('equipos')
      .select('*')
      .order('numero_equipo', { ascending: true });

    if (equiposError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el inventario",
      });
      setLoading(false);
      return;
    }

    // Fetch all active contracts
    const { data: contratosData } = await supabase
      .from('contratos')
      .select('id, equipo_id, folio_contrato, cliente, status')
      .eq('status', 'activo');

    // Create a map of equipo_id to contrato
    const contratosMap = new Map(
      contratosData?.map(c => [c.equipo_id, c]) || []
    );

    // Merge data
    const equiposWithContratos = equiposData.map(equipo => ({
      ...equipo,
      contrato_activo: contratosMap.get(equipo.id) || null
    }));

    setEquipos(equiposWithContratos);
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
                  <TableHead>Estado</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEquipo(equipo as any);
                            setDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Ver detalles
                        </Button>
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
      />
    </div>
  );
}
