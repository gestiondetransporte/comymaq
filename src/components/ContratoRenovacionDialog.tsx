import React, { useState } from "react";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, RefreshCw } from "lucide-react";

interface ContratoRenovacionDialogProps {
  contrato: {
    id: string;
    folio_contrato: string;
    fecha_inicio: string | null;
    fecha_vencimiento: string | null;
    dias_contratado: number | null;
    suma: number | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenovacionComplete: () => void;
}

export function ContratoRenovacionDialog({
  contrato,
  open,
  onOpenChange,
  onRenovacionComplete,
}: ContratoRenovacionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fecha_inicio_nueva: "",
    dias_contratado_nuevo: contrato.dias_contratado || 30,
    fecha_vencimiento_nueva: "",
    suma_nueva: contrato.suma || 0,
    folio_factura: "",
    comentarios: "",
  });
  const { toast } = useToast();

  // Auto-calculate fecha_vencimiento based on fecha_inicio + dias_contratado
  React.useEffect(() => {
    if (formData.fecha_inicio_nueva && formData.dias_contratado_nuevo) {
      const startDate = new Date(formData.fecha_inicio_nueva);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + formData.dias_contratado_nuevo);
      const formattedEndDate = endDate.toISOString().split("T")[0];
      setFormData((prev) => ({ ...prev, fecha_vencimiento_nueva: formattedEndDate }));
    }
  }, [formData.fecha_inicio_nueva, formData.dias_contratado_nuevo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.fecha_inicio_nueva || !formData.fecha_vencimiento_nueva) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Las fechas de renovación son requeridas",
      });
      return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      // Create renovation record
      const { error: renovacionError } = await supabase
        .from("contratos_renovaciones")
        .insert({
          contrato_id: contrato.id,
          fecha_inicio_anterior: contrato.fecha_inicio,
          fecha_vencimiento_anterior: contrato.fecha_vencimiento,
          fecha_inicio_nueva: formData.fecha_inicio_nueva,
          fecha_vencimiento_nueva: formData.fecha_vencimiento_nueva,
          dias_contratado_nuevo: formData.dias_contratado_nuevo,
          suma_nueva: formData.suma_nueva || null,
          folio_factura: formData.folio_factura || null,
          comentarios: formData.comentarios || null,
          usuario_id: user?.id || null,
          usuario_email: user?.email || null,
        });

      if (renovacionError) throw renovacionError;

      // Cancel any pending recolecciones for this contract
      await supabase
        .from("recolecciones")
        .update({ status: "cancelada" })
        .eq("contrato_id", contrato.id)
        .in("status", ["pendiente", "en_proceso"]);

      // Update contract with new dates and status
      const { error: updateError } = await supabase
        .from("contratos")
        .update({
          fecha_inicio: formData.fecha_inicio_nueva,
          fecha_vencimiento: formData.fecha_vencimiento_nueva,
          dias_contratado: formData.dias_contratado_nuevo,
          suma: formData.suma_nueva || contrato.suma,
          status: "activo",
        })
        .eq("id", contrato.id);

      if (updateError) throw updateError;

      toast({
        title: "Éxito",
        description: "Contrato renovado correctamente",
      });

      onRenovacionComplete();
      onOpenChange(false);
    } catch (error) {
      console.error("Error renovating contrato:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo renovar el contrato",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5" />
            Renovar Contrato
          </DialogTitle>
          <DialogDescription>
            Folio: {contrato.folio_contrato}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
            <p><strong>Fechas anteriores:</strong></p>
            <p>Inicio: {contrato.fecha_inicio || "N/A"}</p>
            <p>Vencimiento: {contrato.fecha_vencimiento || "N/A"}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha_inicio_nueva">Nueva Fecha Inicio *</Label>
            <Input
              id="fecha_inicio_nueva"
              type="date"
              required
              value={formData.fecha_inicio_nueva}
              onChange={(e) =>
                setFormData({ ...formData, fecha_inicio_nueva: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dias_contratado_nuevo">Días Contratado</Label>
            <Input
              id="dias_contratado_nuevo"
              type="number"
              value={formData.dias_contratado_nuevo}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  dias_contratado_nuevo: parseInt(e.target.value) || 0,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="fecha_vencimiento_nueva">Nueva Fecha Vencimiento</Label>
            <Input
              id="fecha_vencimiento_nueva"
              type="date"
              value={formData.fecha_vencimiento_nueva}
              onChange={(e) =>
                setFormData({ ...formData, fecha_vencimiento_nueva: e.target.value })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="suma_nueva">Suma (MXN)</Label>
            <Input
              id="suma_nueva"
              type="number"
              step="0.01"
              value={formData.suma_nueva}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  suma_nueva: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="folio_factura">Folio de Factura</Label>
            <Input
              id="folio_factura"
              value={formData.folio_factura}
              onChange={(e) =>
                setFormData({ ...formData, folio_factura: e.target.value })
              }
              placeholder="Ej: FAC-2026-001"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="comentarios">Comentarios</Label>
            <Textarea
              id="comentarios"
              value={formData.comentarios}
              onChange={(e) =>
                setFormData({ ...formData, comentarios: e.target.value })
              }
              rows={2}
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
                  Renovando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Renovar Contrato
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
