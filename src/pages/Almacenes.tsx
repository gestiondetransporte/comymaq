import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Warehouse } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Almacen {
  id: string;
  nombre: string;
  ubicacion: string | null;
  created_at: string;
}

export default function Almacenes() {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedAlmacen, setSelectedAlmacen] = useState<Almacen | null>(null);
  const [nombre, setNombre] = useState("");
  const [ubicacion, setUbicacion] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchAlmacenes();
  }, []);

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
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los almacenes",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (almacen?: Almacen) => {
    if (almacen) {
      setSelectedAlmacen(almacen);
      setNombre(almacen.nombre);
      setUbicacion(almacen.ubicacion || "");
    } else {
      setSelectedAlmacen(null);
      setNombre("");
      setUbicacion("");
    }
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!nombre.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El nombre es obligatorio",
      });
      return;
    }

    try {
      if (selectedAlmacen) {
        const { error } = await supabase
          .from('almacenes')
          .update({
            nombre: nombre.trim(),
            ubicacion: ubicacion.trim() || null,
          })
          .eq('id', selectedAlmacen.id);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Almacén actualizado correctamente",
        });
      } else {
        const { error } = await supabase
          .from('almacenes')
          .insert({
            nombre: nombre.trim(),
            ubicacion: ubicacion.trim() || null,
          });

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Almacén creado correctamente",
        });
      }

      fetchAlmacenes();
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving almacen:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo guardar el almacén",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedAlmacen) return;

    try {
      const { error } = await supabase
        .from('almacenes')
        .delete()
        .eq('id', selectedAlmacen.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Almacén eliminado correctamente",
      });

      fetchAlmacenes();
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error('Error deleting almacen:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el almacén",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Almacenes</h1>
        <p className="text-muted-foreground">Gestión de almacenes y ubicaciones</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Administración de Almacenes</CardTitle>
              <CardDescription>
                {almacenes.length} almacenes registrados
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Almacén
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando almacenes...</p>
          ) : almacenes.length === 0 ? (
            <div className="text-center py-8">
              <Warehouse className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No hay almacenes registrados</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Ubicación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {almacenes.map((almacen) => (
                    <TableRow key={almacen.id}>
                      <TableCell className="font-medium">{almacen.nombre}</TableCell>
                      <TableCell>{almacen.ubicacion || 'N/A'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(almacen)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedAlmacen(almacen);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedAlmacen ? 'Editar Almacén' : 'Nuevo Almacén'}
            </DialogTitle>
            <DialogDescription>
              {selectedAlmacen ? 'Modifica los datos del almacén' : 'Ingresa los datos del nuevo almacén'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre *</Label>
              <Input
                id="nombre"
                placeholder="Ej: Almacén Central"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ubicacion">Ubicación</Label>
              <Input
                id="ubicacion"
                placeholder="Ej: Zona Norte, Bodega 1"
                value={ubicacion}
                onChange={(e) => setUbicacion(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                {selectedAlmacen ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el almacén "{selectedAlmacen?.nombre}".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
