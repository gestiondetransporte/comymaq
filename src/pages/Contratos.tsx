import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Contratos() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contratos</h1>
        <p className="text-muted-foreground">Gestión de contratos de renta de equipo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Vista de Contratos</CardTitle>
          <CardDescription>
            Aquí podrás ver y gestionar todos los contratos activos
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
