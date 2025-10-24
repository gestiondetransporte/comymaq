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
}

export default function Inventario() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [filteredEquipos, setFilteredEquipos] = useState<Equipo[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("TODOS");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchEquipos();
  }, []);

  useEffect(() => {
    filterEquipos();
  }, [searchQuery, equipos, typeFilter]);

  const fetchEquipos = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('equipos')
      .select('*')
      .order('numero_equipo', { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el inventario",
      });
      setLoading(false);
      return;
    }

    setEquipos(data || []);
    setLoading(false);
  };

  const filterEquipos = () => {
    let filtered = equipos;

    // Filter by type
    if (typeFilter !== "TODOS") {
      filtered = filtered.filter(e => e.tipo === typeFilter);
    }

    // Filter by search query
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

  const getTipoBadge = (tipo: string | null) => {
    if (tipo === 'ELECTRICA') return <Badge variant="default">ELÉCTRICA</Badge>;
    if (tipo === 'COMBUSTIÓN') return <Badge variant="secondary">COMBUSTIÓN</Badge>;
    return <Badge variant="outline">N/A</Badge>;
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
            Busca por número, descripción, marca, modelo o serie
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-col md:flex-row">
            <div className="flex-1">
              <Input
                placeholder="Buscar equipo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={typeFilter === "TODOS" ? "default" : "outline"}
                onClick={() => setTypeFilter("TODOS")}
              >
                Todos
              </Button>
              <Button
                variant={typeFilter === "ELECTRICA" ? "default" : "outline"}
                onClick={() => setTypeFilter("ELECTRICA")}
              >
                Eléctricos
              </Button>
              <Button
                variant={typeFilter === "COMBUSTIÓN" ? "default" : "outline"}
                onClick={() => setTypeFilter("COMBUSTIÓN")}
              >
                Combustión
              </Button>
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
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/equipo/${equipo.id}`)}
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
    </div>
  );
}
