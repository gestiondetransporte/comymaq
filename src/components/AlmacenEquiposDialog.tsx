import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { Package, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface AlmacenEquiposDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  almacenId: string | null;
  almacenNombre: string | null;
}

interface Equipo {
  id: string;
  numero_equipo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  estado: string | null;
  categoria: string | null;
  ubicacion_actual: string | null;
}

export function AlmacenEquiposDialog({
  open,
  onOpenChange,
  almacenId,
  almacenNombre,
}: AlmacenEquiposDialogProps) {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [filteredEquipos, setFilteredEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (open && almacenId) {
      fetchEquipos();
    }
  }, [open, almacenId]);

  useEffect(() => {
    filterEquipos();
  }, [searchQuery, equipos]);

  const fetchEquipos = async () => {
    if (!almacenId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('*')
        .eq('almacen_id', almacenId)
        .order('numero_equipo', { ascending: true });

      if (error) throw error;
      setEquipos(data || []);
    } catch (error) {
      console.error('Error fetching equipos:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEquipos = () => {
    if (!searchQuery.trim()) {
      setFilteredEquipos(equipos);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = equipos.filter(e =>
      e.numero_equipo?.toLowerCase().includes(query) ||
      e.descripcion?.toLowerCase().includes(query) ||
      e.marca?.toLowerCase().includes(query) ||
      e.modelo?.toLowerCase().includes(query) ||
      e.serie?.toLowerCase().includes(query) ||
      e.estado?.toLowerCase().includes(query)
    );
    setFilteredEquipos(filtered);
  };

  const getEstadoBadge = (estado: string | null) => {
    if (!estado) return <Badge variant="outline">Sin estado</Badge>;
    
    const estadoLower = estado.toLowerCase();
    if (estadoLower.includes("disponible")) {
      return <Badge variant="default" className="bg-green-600">Disponible</Badge>;
    }
    if (estadoLower.includes("rentado") || estadoLower.includes("en uso")) {
      return <Badge variant="secondary" className="bg-blue-600">Rentado</Badge>;
    }
    if (estadoLower.includes("mantenimiento") || estadoLower.includes("taller")) {
      return <Badge variant="secondary" className="bg-orange-600">Mantenimiento</Badge>;
    }
    return <Badge variant="outline">{estado}</Badge>;
  };

  const handleVerEquipo = (equipoId: string) => {
    onOpenChange(false);
    navigate(`/equipos?id=${equipoId}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Equipos en {almacenNombre}
          </DialogTitle>
          <DialogDescription>
            {loading ? "Cargando..." : `${filteredEquipos.length} de ${equipos.length} equipos`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número, descripción, marca, modelo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Cargando equipos...</div>
          ) : filteredEquipos.length === 0 ? (
            <div className="text-center py-8">
              <Package className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No se encontraron equipos con los filtros aplicados"
                  : "No hay equipos en este almacén"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>N° Equipo</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Serie</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Categoría</TableHead>
                    <TableHead>Ubicación Actual</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipos.map((equipo) => (
                    <TableRow key={equipo.id}>
                      <TableCell className="font-medium">{equipo.numero_equipo}</TableCell>
                      <TableCell>{equipo.descripcion}</TableCell>
                      <TableCell>{equipo.marca || 'N/A'}</TableCell>
                      <TableCell>{equipo.modelo || 'N/A'}</TableCell>
                      <TableCell>{equipo.serie || 'N/A'}</TableCell>
                      <TableCell>{getEstadoBadge(equipo.estado)}</TableCell>
                      <TableCell>{equipo.categoria || 'N/A'}</TableCell>
                      <TableCell>{equipo.ubicacion_actual || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleVerEquipo(equipo.id)}
                        >
                          Ver Detalle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
