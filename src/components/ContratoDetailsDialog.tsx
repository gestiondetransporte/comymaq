import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useGeolocation } from "@/hooks/useGeolocation";
import { Loader2, MapPin, Trash2, Plus, UserPlus } from "lucide-react";

interface Cliente {
  id: string;
  nombre: string;
  persona_contacto: string | null;
  telefono: string | null;
  correo_electronico: string | null;
  tipo: string | null;
}

interface Contrato {
  id: string;
  folio_contrato: string;
  numero_contrato: string | null;
  cliente: string;
  obra: string | null;
  suma: number | null;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  dias_contratado: number | null;
  status: string | null;
  vendedor: string | null;
  comprador: string | null;
  dentro_fuera: string | null;
  horas_trabajo: number | null;
  comentarios: string | null;
  equipo_id: string | null;
  ubicacion_gps: string | null;
  direccion: string | null;
}

interface ContratoDetailsDialogProps {
  contrato: Contrato | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  isCreating?: boolean;
}

export function ContratoDetailsDialog({
  contrato,
  open,
  onOpenChange,
  onUpdate,
  isCreating = false,
}: ContratoDetailsDialogProps) {
  const [formData, setFormData] = useState<Partial<Contrato>>({});
  const [loading, setLoading] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [equipos, setEquipos] = useState<Array<{ id: string; numero_equipo: string; descripcion: string; estado: string | null }>>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>("");
  const [showNewClienteForm, setShowNewClienteForm] = useState(false);
  const [newCliente, setNewCliente] = useState({ nombre: "", telefono: "", correo_electronico: "" });
  const { toast } = useToast();
  const { getCurrentPosition } = useGeolocation();

  useEffect(() => {
    if (open) {
      fetchEquipos();
      fetchClientes();
    }
    if (contrato) {
      setFormData(contrato);
      // Find cliente by name
      const matchingCliente = clientes.find(c => c.nombre === contrato.cliente);
      if (matchingCliente) {
        setSelectedClienteId(matchingCliente.id);
      }
    } else if (isCreating) {
      // Generate automatic folio
      generateFolio();
      setFormData({
        cliente: '',
        status: 'activo',
      });
      setSelectedClienteId("");
    }
  }, [contrato, isCreating, open]);

  const generateFolio = async () => {
    try {
      const { data, error } = await supabase.rpc('generate_contrato_folio');
      if (!error && data) {
        setFormData(prev => ({ ...prev, folio_contrato: data }));
      }
    } catch (error) {
      console.error('Error generating folio:', error);
      // Fallback folio
      const fallbackFolio = `CTR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;
      setFormData(prev => ({ ...prev, folio_contrato: fallbackFolio }));
    }
  };

  const fetchEquipos = async () => {
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('id, numero_equipo, descripcion, estado')
        .order('numero_equipo');
      
      if (error) throw error;
      setEquipos(data || []);
    } catch (error) {
      console.error('Error fetching equipos:', error);
    }
  };

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre, persona_contacto, telefono, correo_electronico, tipo')
        .order('nombre');
      
      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  const handleClienteChange = (clienteId: string) => {
    setSelectedClienteId(clienteId);
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setFormData(prev => ({ ...prev, cliente: cliente.nombre }));
    }
  };

  const handleCreateCliente = async () => {
    if (!newCliente.nombre.trim()) {
      toast({ variant: "destructive", title: "Error", description: "El nombre del cliente es requerido" });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nombre: newCliente.nombre,
          telefono: newCliente.telefono || null,
          correo_electronico: newCliente.correo_electronico || null,
          tipo: 'cliente',
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Éxito", description: "Cliente creado correctamente" });
      
      // Refresh clientes and select the new one
      await fetchClientes();
      setSelectedClienteId(data.id);
      setFormData(prev => ({ ...prev, cliente: data.nombre }));
      setShowNewClienteForm(false);
      setNewCliente({ nombre: "", telefono: "", correo_electronico: "" });
    } catch (error) {
      console.error('Error creating cliente:', error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el cliente" });
    }
  };

  // Auto-calculate fecha_vencimiento based on fecha_inicio + dias_contratado
  useEffect(() => {
    if (formData.fecha_inicio && formData.dias_contratado) {
      const startDate = new Date(formData.fecha_inicio);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + formData.dias_contratado);
      
      const formattedEndDate = endDate.toISOString().split('T')[0];
      setFormData(prev => ({ ...prev, fecha_vencimiento: formattedEndDate }));
    }
  }, [formData.fecha_inicio, formData.dias_contratado]);

  const handleGetLocation = async () => {
    setLoadingLocation(true);
    try {
      const position = await getCurrentPosition();
      if (position) {
        const ubicacionGps = `${position.coords.latitude}, ${position.coords.longitude}`;
        setFormData(prev => ({ ...prev, ubicacion_gps: ubicacionGps }));
        toast({
          title: "Ubicación capturada",
          description: "La ubicación GPS se ha guardado correctamente",
        });
      } else {
        toast({
          variant: "destructive",
          title: "Error de ubicación",
          description: "No se pudo obtener la ubicación. Verifica que los permisos de ubicación estén habilitados en tu navegador.",
        });
      }
    } catch (error) {
      console.error('Error getting location:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo obtener la ubicación. Asegúrate de dar permisos de ubicación al navegador.",
      });
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.cliente) {
      toast({ variant: "destructive", title: "Error", description: "Selecciona un cliente" });
      return;
    }

    setLoading(true);

    try {
      if (isCreating) {
        const { error } = await supabase
          .from("contratos")
          .insert({
            folio_contrato: formData.folio_contrato,
            numero_contrato: formData.numero_contrato || null,
            cliente: formData.cliente,
            obra: formData.obra || null,
            suma: formData.suma || null,
            fecha_inicio: formData.fecha_inicio || null,
            fecha_vencimiento: formData.fecha_vencimiento || null,
            dias_contratado: formData.dias_contratado || null,
            status: formData.status || 'activo',
            vendedor: formData.vendedor || null,
            comprador: formData.comprador || null,
            dentro_fuera: formData.dentro_fuera || null,
            horas_trabajo: formData.horas_trabajo || null,
            comentarios: formData.comentarios || null,
            equipo_id: formData.equipo_id || null,
            ubicacion_gps: formData.ubicacion_gps || null,
            direccion: formData.direccion || null,
          });

        if (error) throw error;

        // Update equipment status to 'rentado' if assigned
        if (formData.equipo_id) {
          await supabase
            .from('equipos')
            .update({ estado: 'rentado' })
            .eq('id', formData.equipo_id);
        }

        toast({
          title: "Éxito",
          description: "Contrato creado correctamente",
        });
      } else {
        if (!contrato) return;
        
        const { error } = await supabase
          .from("contratos")
          .update({
            numero_contrato: formData.numero_contrato || null,
            cliente: formData.cliente,
            obra: formData.obra || null,
            suma: formData.suma || null,
            fecha_inicio: formData.fecha_inicio || null,
            fecha_vencimiento: formData.fecha_vencimiento || null,
            dias_contratado: formData.dias_contratado || null,
            status: formData.status || 'activo',
            vendedor: formData.vendedor || null,
            comprador: formData.comprador || null,
            dentro_fuera: formData.dentro_fuera || null,
            horas_trabajo: formData.horas_trabajo || null,
            comentarios: formData.comentarios || null,
            equipo_id: formData.equipo_id || null,
            ubicacion_gps: formData.ubicacion_gps || null,
            direccion: formData.direccion || null,
          })
          .eq("id", contrato.id);

        if (error) throw error;

        toast({
          title: "Éxito",
          description: "Contrato actualizado correctamente",
        });
      }

      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error(`Error ${isCreating ? 'creating' : 'updating'} contrato:`, error);
      toast({
        variant: "destructive",
        title: "Error",
        description: `No se pudo ${isCreating ? 'crear' : 'actualizar'} el contrato`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!contrato) return;
    
    setLoading(true);
    try {
      // First, unlink any cotizaciones that reference this contrato
      await supabase
        .from("cotizaciones")
        .update({ contrato_id: null })
        .eq("contrato_id", contrato.id);

      const { error } = await supabase
        .from("contratos")
        .delete()
        .eq("id", contrato.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Contrato eliminado correctamente",
      });

      onUpdate();
      onOpenChange(false);
      setDeleteDialogOpen(false);
    } catch (error) {
      console.error("Error deleting contrato:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el contrato",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter available equipos (only show available ones for new contracts)
  const availableEquipos = isCreating 
    ? equipos.filter(e => e.estado === 'disponible' || e.estado === null)
    : equipos;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreating ? 'Crear Nuevo Contrato' : 'Detalles del Contrato'}</DialogTitle>
          <DialogDescription>
            {isCreating ? 'Completa la información del nuevo contrato' : `Folio: ${contrato?.folio_contrato}`}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="folio_contrato">Folio Contrato *</Label>
              <Input
                id="folio_contrato"
                required
                value={formData.folio_contrato || ""}
                onChange={(e) =>
                  setFormData({ ...formData, folio_contrato: e.target.value })
                }
                disabled={true}
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">Generado automáticamente</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="numero_contrato">Número Contrato</Label>
              <Input
                id="numero_contrato"
                value={formData.numero_contrato || ""}
                onChange={(e) =>
                  setFormData({ ...formData, numero_contrato: e.target.value })
                }
              />
            </div>

            {/* Cliente Selection */}
            <div className="space-y-2 md:col-span-2">
              <div className="flex items-center justify-between">
                <Label>Cliente *</Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setShowNewClienteForm(!showNewClienteForm)}
                >
                  <UserPlus className="h-4 w-4 mr-1" />
                  {showNewClienteForm ? 'Cancelar' : 'Nuevo Cliente'}
                </Button>
              </div>
              
              {showNewClienteForm ? (
                <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
                  <Input
                    placeholder="Nombre del cliente *"
                    value={newCliente.nombre}
                    onChange={(e) => setNewCliente({ ...newCliente, nombre: e.target.value })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      placeholder="Teléfono"
                      value={newCliente.telefono}
                      onChange={(e) => setNewCliente({ ...newCliente, telefono: e.target.value })}
                    />
                    <Input
                      placeholder="Correo electrónico"
                      type="email"
                      value={newCliente.correo_electronico}
                      onChange={(e) => setNewCliente({ ...newCliente, correo_electronico: e.target.value })}
                    />
                  </div>
                  <Button type="button" onClick={handleCreateCliente} className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    Crear Cliente
                  </Button>
                </div>
              ) : (
                <Select value={selectedClienteId} onValueChange={handleClienteChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nombre} {cliente.tipo === 'prospecto' && '(Prospecto)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="obra">Obra</Label>
              <Input
                id="obra"
                value={formData.obra || ""}
                onChange={(e) =>
                  setFormData({ ...formData, obra: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="suma">Suma (MXN)</Label>
              <Input
                id="suma"
                type="number"
                step="0.01"
                value={formData.suma || ""}
                onChange={(e) =>
                  setFormData({ ...formData, suma: parseFloat(e.target.value) || null })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_inicio">Fecha Inicio</Label>
              <Input
                id="fecha_inicio"
                type="date"
                value={formData.fecha_inicio || ""}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_inicio: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="fecha_vencimiento">Fecha Vencimiento</Label>
              <Input
                id="fecha_vencimiento"
                type="date"
                value={formData.fecha_vencimiento || ""}
                onChange={(e) =>
                  setFormData({ ...formData, fecha_vencimiento: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dias_contratado">Días Contratado</Label>
              <Input
                id="dias_contratado"
                type="number"
                value={formData.dias_contratado || ""}
                onChange={(e) =>
                  setFormData({ ...formData, dias_contratado: parseInt(e.target.value) || null })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status || "activo"}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="finalizado">Finalizado</SelectItem>
                  <SelectItem value="cancelado">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="vendedor">Vendedor</Label>
              <Input
                id="vendedor"
                value={formData.vendedor || ""}
                onChange={(e) =>
                  setFormData({ ...formData, vendedor: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comprador">Comprador</Label>
              <Input
                id="comprador"
                value={formData.comprador || ""}
                onChange={(e) =>
                  setFormData({ ...formData, comprador: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dentro_fuera">Dentro/Fuera</Label>
              <Select
                value={formData.dentro_fuera || ""}
                onValueChange={(value) =>
                  setFormData({ ...formData, dentro_fuera: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dentro">Dentro</SelectItem>
                  <SelectItem value="Fuera">Fuera</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="horas_trabajo">Horas de Trabajo</Label>
              <Input
                id="horas_trabajo"
                type="number"
                value={formData.horas_trabajo || ""}
                onChange={(e) =>
                  setFormData({ ...formData, horas_trabajo: parseInt(e.target.value) || null })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="equipo_id">Equipo Asignado</Label>
              <Select
                value={formData.equipo_id || "none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, equipo_id: value === "none" ? null : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar equipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin asignar</SelectItem>
                  {availableEquipos.map((equipo) => (
                    <SelectItem key={equipo.id} value={equipo.id}>
                      {equipo.numero_equipo} - {equipo.descripcion}
                      {equipo.estado && ` (${equipo.estado})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isCreating && (
                <p className="text-xs text-muted-foreground">Solo se muestran equipos disponibles</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ubicacion_gps">Ubicación GPS</Label>
            <div className="flex gap-2">
              <Input
                id="ubicacion_gps"
                value={formData.ubicacion_gps || ""}
                onChange={(e) =>
                  setFormData({ ...formData, ubicacion_gps: e.target.value })
                }
                placeholder="Latitud, Longitud"
                disabled={loadingLocation}
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleGetLocation}
                disabled={loadingLocation}
              >
                {loadingLocation ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MapPin className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="direccion">Dirección</Label>
            <Textarea
              id="direccion"
              value={formData.direccion || ""}
              onChange={(e) =>
                setFormData({ ...formData, direccion: e.target.value })
              }
              rows={2}
              placeholder="Ingresa la dirección manualmente"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentarios">Comentarios</Label>
            <Textarea
              id="comentarios"
              value={formData.comentarios || ""}
              onChange={(e) =>
                setFormData({ ...formData, comentarios: e.target.value })
              }
              rows={3}
            />
          </div>

          <DialogFooter className="flex justify-between gap-2">
            <div className="flex gap-2 flex-1">
              {!isCreating && contrato && (
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="destructive" className="gap-2">
                      <Trash2 className="h-4 w-4" />
                      Eliminar
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Esta acción no se puede deshacer. Se eliminará permanentemente el contrato "{formData.folio_contrato}".
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleDelete} 
                        disabled={loading}
                        className="bg-destructive hover:bg-destructive/90"
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Eliminar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isCreating ? 'Creando...' : 'Guardando...'}
                  </>
                ) : (
                  isCreating ? 'Crear Contrato' : 'Guardar Cambios'
                )}
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
