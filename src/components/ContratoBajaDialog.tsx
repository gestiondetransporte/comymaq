import React, { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface ContratoBajaDialogProps {
  contrato: {
    id: string;
    folio_contrato: string;
    equipo_id: string | null;
  };
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBajaComplete: () => void;
}

export function ContratoBajaDialog({
  contrato,
  open,
  onOpenChange,
  onBajaComplete,
}: ContratoBajaDialogProps) {
  const [loading, setLoading] = useState(false);
  const [motivoBaja, setMotivoBaja] = useState("");
  const { toast } = useToast();

  const handleBaja = async () => {
    if (!motivoBaja.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "El motivo de la baja es requerido",
      });
      return;
    }

    setLoading(true);

    try {
      // Update contract status to cancelled with motive
      const { error: updateError } = await supabase
        .from("contratos")
        .update({
          status: "cancelado",
          motivo_baja: motivoBaja,
          fecha_baja: new Date().toISOString(),
        })
        .eq("id", contrato.id);

      if (updateError) throw updateError;

      // Set equipment back to available if it had one assigned
      if (contrato.equipo_id) {
        await supabase
          .from("equipos")
          .update({ estado: "disponible" })
          .eq("id", contrato.equipo_id);
      }

      toast({
        title: "Éxito",
        description: "Contrato dado de baja correctamente",
      });

      onBajaComplete();
      onOpenChange(false);
      setMotivoBaja("");
    } catch (error) {
      console.error("Error giving baja to contrato:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo dar de baja el contrato",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Dar de Baja Contrato</AlertDialogTitle>
          <AlertDialogDescription>
            Esta acción cancelará el contrato "{contrato.folio_contrato}" y liberará el equipo asociado. 
            Por favor, indica el motivo de la baja.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 py-4">
          <Label htmlFor="motivo_baja">Motivo de la Baja *</Label>
          <Textarea
            id="motivo_baja"
            value={motivoBaja}
            onChange={(e) => setMotivoBaja(e.target.value)}
            rows={3}
            placeholder="Describe el motivo por el cual se da de baja el contrato..."
          />
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleBaja}
            disabled={loading || !motivoBaja.trim()}
            className="bg-destructive hover:bg-destructive/90"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Dar de Baja
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
