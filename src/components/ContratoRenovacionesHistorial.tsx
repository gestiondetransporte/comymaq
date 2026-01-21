import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { RefreshCw, Calendar, DollarSign, FileText, User } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface Renovacion {
  id: string;
  fecha_renovacion: string;
  fecha_inicio_anterior: string | null;
  fecha_vencimiento_anterior: string | null;
  fecha_inicio_nueva: string;
  fecha_vencimiento_nueva: string;
  dias_contratado_nuevo: number | null;
  suma_nueva: number | null;
  folio_factura: string | null;
  comentarios: string | null;
  usuario_email: string | null;
  created_at: string;
}

interface ContratoRenovacionesHistorialProps {
  contratoId: string;
}

export function ContratoRenovacionesHistorial({
  contratoId,
}: ContratoRenovacionesHistorialProps) {
  const [renovaciones, setRenovaciones] = useState<Renovacion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchRenovaciones();
  }, [contratoId]);

  const fetchRenovaciones = async () => {
    try {
      const { data, error } = await supabase
        .from("contratos_renovaciones")
        .select("*")
        .eq("contrato_id", contratoId)
        .order("fecha_renovacion", { ascending: false });

      if (error) throw error;
      setRenovaciones(data || []);
    } catch (error) {
      console.error("Error fetching renovaciones:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MMM/yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return "N/A";
    return new Intl.NumberFormat("es-MX", {
      style: "currency",
      currency: "MXN",
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (renovaciones.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <RefreshCw className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No hay renovaciones registradas</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {renovaciones.map((renovacion, index) => (
        <div
          key={renovacion.id}
          className="p-4 border rounded-lg bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-start justify-between mb-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Renovación #{renovaciones.length - index}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatDate(renovacion.fecha_renovacion)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground text-xs mb-1">Fechas Anteriores</p>
              <p className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {formatDate(renovacion.fecha_inicio_anterior)} - {formatDate(renovacion.fecha_vencimiento_anterior)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs mb-1">Fechas Nuevas</p>
              <p className="flex items-center gap-1 font-medium">
                <Calendar className="h-3 w-3" />
                {formatDate(renovacion.fecha_inicio_nueva)} - {formatDate(renovacion.fecha_vencimiento_nueva)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 mt-3 text-sm">
            {renovacion.dias_contratado_nuevo && (
              <span className="text-muted-foreground">
                {renovacion.dias_contratado_nuevo} días
              </span>
            )}
            {renovacion.suma_nueva && (
              <span className="flex items-center gap-1">
                <DollarSign className="h-3 w-3" />
                {formatCurrency(renovacion.suma_nueva)}
              </span>
            )}
            {renovacion.folio_factura && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {renovacion.folio_factura}
              </span>
            )}
          </div>

          {renovacion.comentarios && (
            <p className="text-sm text-muted-foreground mt-2 italic">
              "{renovacion.comentarios}"
            </p>
          )}

          {renovacion.usuario_email && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <User className="h-3 w-3" />
              {renovacion.usuario_email}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
