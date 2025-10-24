import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useOffline } from "@/hooks/useOffline";
import { savePendingSync } from "@/lib/offlineStorage";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

export default function EntradasSalidas() {
  const [equipoId, setEquipoId] = useState("");
  const [tipo, setTipo] = useState<"entrada" | "salida">("entrada");
  const [observaciones, setObservaciones] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { isOnline } = useOffline();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!equipoId.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes ingresar un número de equipo",
      });
      return;
    }

    setLoading(true);

    const movimiento = {
      equipo_id: equipoId,
      tipo,
      fecha: new Date().toISOString(),
      observaciones: observaciones.trim() || null,
    };

    try {
      if (isOnline) {
        // Si hay conexión, guardar directamente
        const { error } = await supabase
          .from('entradas_salidas')
          .insert(movimiento);

        if (error) throw error;

        toast({
          title: "Movimiento registrado",
          description: `${tipo === "entrada" ? "Entrada" : "Salida"} registrada exitosamente`,
        });
      } else {
        // Si no hay conexión, guardar para sincronizar después
        await savePendingSync({
          type: 'insert',
          table: 'entradas_salidas',
          data: movimiento,
        });

        toast({
          title: "Guardado offline",
          description: "El movimiento se sincronizará cuando haya conexión",
        });
      }

      // Limpiar formulario
      setEquipoId("");
      setObservaciones("");
    } catch (error) {
      console.error('Error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el movimiento",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Entradas / Salidas de Equipo</h1>
        <p className="text-muted-foreground">Registro de movimientos de equipo</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registrar Movimiento</CardTitle>
              <CardDescription>
                Registra las entradas y salidas de equipo del almacén
              </CardDescription>
            </div>
            <Badge variant={isOnline ? "default" : "secondary"}>
              {isOnline ? "En línea" : "Modo offline"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="equipo">Número de Equipo</Label>
              <Input
                id="equipo"
                placeholder="Ej: 1, 2, 3..."
                value={equipoId}
                onChange={(e) => setEquipoId(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Movimiento</Label>
              <Select value={tipo} onValueChange={(value: "entrada" | "salida") => setTipo(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">Entrada</SelectItem>
                  <SelectItem value="salida">Salida</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Input
                id="observaciones"
                placeholder="Detalles adicionales..."
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Registrando..." : "Registrar Movimiento"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
