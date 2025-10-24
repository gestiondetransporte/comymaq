import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Contrato {
  id: string;
  folio_contrato: string;
  numero_contrato: string | null;
  cliente: string;
  obra: string | null;
  suma: number | null;
  fecha_inicio: string | null;
  fecha_vencimiento: string | null;
  dias_contratado: number | null;
  status: string | null;
  vendedor: string | null;
  horas_trabajo: number | null;
  dentro_fuera: string | null;
  equipo_id: string | null;
}

export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [filteredContratos, setFilteredContratos] = useState<Contrato[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchContratos();
  }, []);

  useEffect(() => {
    filterContratos();
  }, [searchQuery, statusFilter, contratos]);

  const fetchContratos = async () => {
    try {
      const { data, error } = await supabase
        .from('contratos')
        .select('*')
        .order('fecha_inicio', { ascending: false });

      if (error) throw error;

      setContratos(data || []);
    } catch (error) {
      console.error('Error fetching contratos:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los contratos",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterContratos = () => {
    let filtered = [...contratos];

    // Filtrar por búsqueda
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contrato =>
        contrato.folio_contrato?.toLowerCase().includes(query) ||
        contrato.numero_contrato?.toLowerCase().includes(query) ||
        contrato.cliente?.toLowerCase().includes(query) ||
        contrato.obra?.toLowerCase().includes(query)
      );
    }

    // Filtrar por status
    if (statusFilter !== "todos") {
      filtered = filtered.filter(contrato => contrato.status === statusFilter);
    }

    setFilteredContratos(filtered);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'activo':
        return <Badge variant="default">Activo</Badge>;
      case 'finalizado':
        return <Badge variant="secondary">Finalizado</Badge>;
      case 'cancelado':
        return <Badge variant="destructive">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{status || 'N/A'}</Badge>;
    }
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A';
    try {
      return format(new Date(date), 'dd/MMM/yyyy', { locale: es });
    } catch {
      return 'N/A';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contratos</h1>
        <p className="text-muted-foreground">Gestión de contratos de renta de equipo</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Vista de Contratos</CardTitle>
              <CardDescription>
                {filteredContratos.length} de {contratos.length} contratos
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por folio, cliente, obra..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="activo">Activos</SelectItem>
                  <SelectItem value="finalizado">Finalizados</SelectItem>
                  <SelectItem value="cancelado">Cancelados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-8 text-muted-foreground">Cargando contratos...</p>
          ) : filteredContratos.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {searchQuery || statusFilter !== "todos" 
                  ? "No se encontraron contratos con los filtros aplicados" 
                  : "No hay contratos registrados"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Suma</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Días</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vendedor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContratos.map((contrato) => (
                    <TableRow key={contrato.id}>
                      <TableCell className="font-medium">{contrato.folio_contrato}</TableCell>
                      <TableCell>{contrato.cliente}</TableCell>
                      <TableCell>{contrato.obra || 'N/A'}</TableCell>
                      <TableCell>{formatCurrency(contrato.suma)}</TableCell>
                      <TableCell>{formatDate(contrato.fecha_inicio)}</TableCell>
                      <TableCell>{formatDate(contrato.fecha_vencimiento)}</TableCell>
                      <TableCell>{contrato.dias_contratado || 'N/A'}</TableCell>
                      <TableCell>{getStatusBadge(contrato.status)}</TableCell>
                      <TableCell>{contrato.vendedor || 'N/A'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
