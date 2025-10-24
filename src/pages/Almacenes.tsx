import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Almacenes() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Almacenes</h1>
        <p className="text-muted-foreground">Gestión de almacenes y ubicaciones</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Administración de Almacenes</CardTitle>
          <CardDescription>
            Gestiona las ubicaciones y distribución del equipo
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
