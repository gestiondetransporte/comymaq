import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EntradasSalidas() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Entradas / Salidas de Equipo</h1>
        <p className="text-muted-foreground">Registro de movimientos de equipo</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Entradas y Salidas</CardTitle>
          <CardDescription>
            Registra las entradas y salidas de equipo del almacén
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
