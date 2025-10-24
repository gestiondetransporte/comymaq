import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import QRScanner from "@/components/QRScanner";

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSearch = async (query?: string) => {
    const searchValue = query || searchQuery;
    if (!searchValue.trim()) return;

    setLoading(true);
    
    // Search by numero_equipo or codigo_qr
    const { data, error } = await supabase
      .from('equipos')
      .select('*')
      .or(`numero_equipo.eq.${searchValue.trim()},codigo_qr.eq.${searchValue.trim()}`)
      .maybeSingle();

    setLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al buscar el equipo",
      });
      return;
    }

    if (!data) {
      toast({
        variant: "destructive",
        title: "No encontrado",
        description: `No se encontró equipo con código: ${searchValue}`,
      });
      return;
    }

    navigate(`/equipo/${data.id}`);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSearch();
  };

  const handleQRScan = (data: string) => {
    setSearchQuery(data);
    handleSearch(data);
    toast({
      title: "QR Escaneado",
      description: `Buscando equipo: ${data}`,
    });
  };

  const handleQRError = (error: string) => {
    toast({
      variant: "destructive",
      title: "Error de escaneo",
      description: error,
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-primary">Buscador de Equipo</h1>
        <p className="text-muted-foreground text-lg">
          Ingresa el número de equipo para ver sus detalles
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Equipo</CardTitle>
          <CardDescription>
            Ingresa el número de equipo o escanea su código QR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="flex gap-4">
            <Input
              placeholder="Número de equipo o código QR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              <Search className="mr-2 h-4 w-4" />
              {loading ? "Buscando..." : "Buscar"}
            </Button>
            <QRScanner onScan={handleQRScan} onError={handleQRError} />
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/contratos')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📋 Contratos
            </CardTitle>
            <CardDescription>
              Gestiona contratos de renta de equipo
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/entradas-salidas')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🚚 Entradas / Salidas
            </CardTitle>
            <CardDescription>
              Registra movimientos de equipo
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/mantenimiento')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              🔧 Mantenimiento
            </CardTitle>
            <CardDescription>
              Historial de mantenimiento y reparaciones
            </CardDescription>
          </CardHeader>
        </Card>

        <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/almacenes')}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              📦 Almacenes
            </CardTitle>
            <CardDescription>
              Gestiona almacenes y ubicaciones
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
