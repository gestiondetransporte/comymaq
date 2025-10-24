import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, LayoutDashboard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import QRScanner from "@/components/QRScanner";

export default function Index() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, isVendedor } = useAuth();
  
  const canAccessSales = isAdmin || isVendedor;

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
    <div className="max-w-4xl mx-auto space-y-8 px-4">
      <div className="text-center space-y-4 pt-4 relative">
        {isAdmin && (
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-4 md:top-0"
            onClick={() => navigate("/dashboard")}
            title="Ver Dashboard"
          >
            <LayoutDashboard className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-3xl md:text-4xl font-bold text-primary">Buscador de Equipo</h1>
        <p className="text-muted-foreground text-base md:text-lg">
          Ingresa el número de equipo para ver sus detalles
        </p>
      </div>

      <Card className="border-2 md:border">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl md:text-2xl">Buscar Equipo</CardTitle>
          <CardDescription className="text-sm md:text-base">
            Ingresa el número de equipo o escanea su código QR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
            <Input
              placeholder="Número de equipo o código QR..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-12 md:h-10 text-base md:text-sm"
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={loading} className="flex-1 h-12 md:h-10">
                <Search className="mr-2 h-5 w-5 md:h-4 md:w-4" />
                {loading ? "Buscando..." : "Buscar"}
              </Button>
              <div className="flex-1">
                <QRScanner onScan={handleQRScan} onError={handleQRError} />
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {canAccessSales && (
          <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => navigate('/clientes')}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                👥 Clientes
              </CardTitle>
              <CardDescription>
                Gestiona información de clientes
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {canAccessSales && (
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
        )}

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

        {canAccessSales && (
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
        )}
      </div>
    </div>
  );
}
