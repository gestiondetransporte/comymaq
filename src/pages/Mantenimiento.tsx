import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
}

export default function Mantenimiento() {
  const [mantenimientos, setMantenimientos] = useState<Mantenimiento[]>([]);
  const [filteredMantenimientos, setFilteredMantenimientos] = useState<Mantenimiento[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchMantenimientos();
  }, []);

  useEffect(() => {
    filterMantenimientos();
  }, [searchQuery, mantenimientos]);

  const fetchMantenimientos = async () => {
    try {
      const { data, error } = await supabase
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

      if (error) throw error;

      setMantenimientos(data || []);
    } catch (error) {
      console.error('Error fetching mantenimientos:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los mantenimientos",
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

  const getTipoServicioBadge = (tipo: string) => {
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
        <p className="text-muted-foreground">Historial de mantenimiento y servicios de equipos</p>
      </div>

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
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando mantenimientos...</p>
          ) : filteredMantenimientos.length === 0 ? (
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
                    <TableRow key={mantenimiento.id}>
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
                      <TableCell>{getTipoServicioBadge(mantenimiento.tipo_servicio)}</TableCell>
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
