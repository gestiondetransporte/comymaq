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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

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
}

interface ContratoDetailsDialogProps {
  contrato: Contrato | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export function ContratoDetailsDialog({
  contrato,
  open,
  onOpenChange,
  onUpdate,
}: ContratoDetailsDialogProps) {
  const [formData, setFormData] = useState<Partial<Contrato>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (contrato) {
      setFormData(contrato);
    }
  }, [contrato]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contrato) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("contratos")
        .update({
          numero_contrato: formData.numero_contrato,
          cliente: formData.cliente,
          obra: formData.obra,
          suma: formData.suma,
          fecha_inicio: formData.fecha_inicio,
          fecha_vencimiento: formData.fecha_vencimiento,
          dias_contratado: formData.dias_contratado,
          status: formData.status,
          vendedor: formData.vendedor,
          comprador: formData.comprador,
          dentro_fuera: formData.dentro_fuera,
          horas_trabajo: formData.horas_trabajo,
          comentarios: formData.comentarios,
        })
        .eq("id", contrato.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Contrato actualizado correctamente",
      });
      onUpdate();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating contrato:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el contrato",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!contrato) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalles del Contrato</DialogTitle>
          <DialogDescription>
            Folio: {contrato.folio_contrato}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="folio_contrato">Folio Contrato</Label>
              <Input
                id="folio_contrato"
                value={formData.folio_contrato || ""}
                disabled
                className="bg-muted"
              />
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

            <div className="space-y-2">
              <Label htmlFor="cliente">Cliente *</Label>
              <Input
                id="cliente"
                required
                value={formData.cliente || ""}
                onChange={(e) =>
                  setFormData({ ...formData, cliente: e.target.value })
                }
              />
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

          <DialogFooter>
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
                  Guardando...
                </>
              ) : (
                "Guardar Cambios"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
