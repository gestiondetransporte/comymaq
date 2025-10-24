import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Mantenimiento() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mantenimiento</h1>
        <p className="text-muted-foreground">Historial de mantenimiento y reparaciones</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Gestión de Mantenimiento</CardTitle>
          <CardDescription>
            Registra y consulta el mantenimiento y reparaciones del equipo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center py-8 text-muted-foreground">
            Esta funcionalidad estará disponible próximamente
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
