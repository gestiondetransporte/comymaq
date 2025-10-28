import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, FileText, Eye, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, differenceInDays, isPast, isWithinInterval, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { ContratoDetailsDialog } from "@/components/ContratoDetailsDialog";
import { CSVContratosImport } from "@/components/CSVContratosImport";
import { CSVEquipoContratoImport } from "@/components/CSVEquipoContratoImport";
import { ExcelContratosImport } from "@/components/ExcelContratosImport";

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
  comprador: string | null;
  dentro_fuera: string | null;
  horas_trabajo: number | null;
  comentarios: string | null;
  equipo_id: string | null;
  ubicacion_gps: string | null;
  direccion: string | null;
  equipos?: {
    numero_equipo: string;
    descripcion: string;
  } | null;
}

export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [filteredContratos, setFilteredContratos] = useState<Contrato[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [loading, setLoading] = useState(true);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
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
        .select(`
          *,
          equipos:equipo_id (
            numero_equipo,
            descripcion
          )
        `)
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

  const calculateContratoStatus = (contrato: Contrato): string => {
    if (!contrato.fecha_vencimiento) return contrato.status || 'activo';
    
    const now = new Date();
    const fechaVencimiento = new Date(contrato.fecha_vencimiento);
    const diasParaVencer = differenceInDays(fechaVencimiento, now);
    
    // Si el contrato está explícitamente cancelado, respetar ese estado
    if (contrato.status === 'cancelado') return 'cancelado';
    
    // Si ya venció
    if (isPast(fechaVencimiento) && diasParaVencer < 0) {
      return 'vencido';
    }
    
    // Si está por vencer (7 días o menos)
    if (diasParaVencer >= 0 && diasParaVencer <= 7) {
      return 'por vencer';
    }
    
    // Si está activo
    return 'activo';
  };

  const calculateDiasTranscurridos = (fechaInicio: string | null): number => {
    if (!fechaInicio) return 0;
    const inicio = new Date(fechaInicio);
    const now = new Date();
    return differenceInDays(now, inicio);
  };

  const calculateDiasRestantes = (fechaVencimiento: string | null): number => {
    if (!fechaVencimiento) return 0;
    const vencimiento = new Date(fechaVencimiento);
    const now = new Date();
    return Math.max(0, differenceInDays(vencimiento, now));
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

    // Filtrar por status calculado
    if (statusFilter !== "todos") {
      filtered = filtered.filter(contrato => {
        const statusCalculado = calculateContratoStatus(contrato);
        return statusCalculado === statusFilter;
      });
    }

    setFilteredContratos(filtered);
  };

  const getStatusBadge = (contrato: Contrato) => {
    const statusCalculado = calculateContratoStatus(contrato);
    
    switch (statusCalculado) {
      case 'activo':
        return <Badge variant="default" className="bg-green-600 hover:bg-green-700">Activo</Badge>;
      case 'por vencer':
        return <Badge variant="default" className="bg-yellow-600 hover:bg-yellow-700">Por Vencer</Badge>;
      case 'vencido':
        return <Badge variant="destructive">Vencido</Badge>;
      case 'cancelado':
        return <Badge variant="outline" className="bg-gray-600 hover:bg-gray-700 text-white">Cancelado</Badge>;
      default:
        return <Badge variant="outline">{statusCalculado || 'N/A'}</Badge>;
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

  const handleCreateContrato = () => {
    setSelectedContrato(null);
    setIsCreating(true);
    setDialogOpen(true);
  };

  const handleOpenDialog = (contrato: Contrato) => {
    setSelectedContrato(contrato);
    setIsCreating(false);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Contratos</h1>
        <p className="text-muted-foreground">Gestión de contratos de renta de equipo</p>
      </div>

          <ExcelContratosImport onImportComplete={fetchContratos} />
          <CSVEquipoContratoImport onImportComplete={fetchContratos} />
          <CSVContratosImport onImportComplete={fetchContratos} />

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
              <Button onClick={handleCreateContrato} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Contrato
              </Button>
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
                  <SelectItem value="por vencer">Por Vencer</SelectItem>
                  <SelectItem value="vencido">Vencidos</SelectItem>
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
                    <TableHead>Equipo</TableHead>
                    <TableHead>Obra</TableHead>
                    <TableHead>Suma</TableHead>
                    <TableHead>Fecha Inicio</TableHead>
                    <TableHead>Vencimiento</TableHead>
                    <TableHead>Días Transcurridos</TableHead>
                    <TableHead>Días Restantes</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContratos.map((contrato) => {
                    const diasTranscurridos = calculateDiasTranscurridos(contrato.fecha_inicio);
                    const diasRestantes = calculateDiasRestantes(contrato.fecha_vencimiento);
                    
                    return (
                      <TableRow key={contrato.id}>
                        <TableCell className="font-medium">{contrato.folio_contrato}</TableCell>
                        <TableCell>{contrato.cliente}</TableCell>
                        <TableCell>
                          {contrato.equipos ? (
                            <div className="text-sm">
                              <div className="font-medium">{contrato.equipos.numero_equipo}</div>
                              <div className="text-muted-foreground">{contrato.equipos.descripcion}</div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Sin asignar</span>
                          )}
                        </TableCell>
                        <TableCell>{contrato.obra || 'N/A'}</TableCell>
                        <TableCell>{formatCurrency(contrato.suma)}</TableCell>
                        <TableCell>{formatDate(contrato.fecha_inicio)}</TableCell>
                        <TableCell>{formatDate(contrato.fecha_vencimiento)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{diasTranscurridos} días</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={diasRestantes <= 7 && diasRestantes > 0 ? "default" : "outline"}
                            className={diasRestantes <= 7 && diasRestantes > 0 ? "bg-yellow-600 hover:bg-yellow-700" : ""}
                          >
                            {diasRestantes} días
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(contrato)}</TableCell>
                        <TableCell>{contrato.vendedor || 'N/A'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenDialog(contrato)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver Detalles
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ContratoDetailsDialog
        contrato={selectedContrato}
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setIsCreating(false);
            setSelectedContrato(null);
          }
        }}
        onUpdate={fetchContratos}
        isCreating={isCreating}
      />
    </div>
  );
}
