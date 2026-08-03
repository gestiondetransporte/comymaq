import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, FileText, Eye, Plus, Trash2, MessageSquare, Mail, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMty, nowMty, diffDaysMty } from "@/lib/timezone";
import { ContratoDetailsDialog } from "@/components/ContratoDetailsDialog";
import { ExcelContratosImport } from "@/components/ExcelContratosImport";
import * as XLSX from "xlsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

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
  municipio: string | null;
  estado_ubicacion: string | null;
  folio_factura: string | null;
  motivo_baja: string | null;
  fecha_baja?: string | null;
  contrato_firmado?: boolean | null;
  fecha_firma?: string | null;
  contrato_firmado_url?: string | null;
  orden_compra?: boolean | null;
  orden_compra_numero?: string | null;
  orden_compra_url?: string | null;
  notas_validacion?: string | null;
  equipos?: {
    numero_equipo: string;
    descripcion: string;
  } | null;
}

interface ClienteContacto {
  nombre: string;
  telefono: string | null;
  celular: string | null;
  correo_electronico: string | null;
  persona_contacto: string | null;
}

const normalizarTelefono = (tel: string | null | undefined) => {
  if (!tel) return null;
  const digits = tel.replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `52${digits}`;
  return digits;
};

export default function Contratos() {
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [contactos, setContactos] = useState<Record<string, ClienteContacto>>({});
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [tab, setTab] = useState<string>("activos");
  const [loading, setLoading] = useState(true);
  const [selectedContrato, setSelectedContrato] = useState<Contrato | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const handleDeleteContrato = async (contrato: Contrato) => {
    try {
      const { error } = await supabase.from("contratos").delete().eq("id", contrato.id);
      if (error) throw error;
      toast({ title: "Contrato eliminado", description: `${contrato.numero_contrato || contrato.folio_contrato} fue eliminado.` });
      fetchContratos();
    } catch (error) {
      console.error(error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo eliminar el contrato" });
    }
  };

  useEffect(() => {
    fetchContratos();
    fetchContactos();
  }, []);

  const fetchContactos = async () => {
    const { data } = await supabase
      .from("clientes")
      .select("nombre, telefono, celular, correo_electronico, persona_contacto");
    const map: Record<string, ClienteContacto> = {};
    (data || []).forEach((c: any) => {
      if (c.nombre) map[c.nombre.trim().toLowerCase()] = c;
    });
    setContactos(map);
  };

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
    if (contrato.motivo_baja || contrato.fecha_baja) return 'baja';
    if (contrato.status === 'cancelado') return 'cancelado';
    if (!contrato.fecha_vencimiento) return contrato.status || 'activo';

    const diasParaVencer = diffDaysMty(contrato.fecha_vencimiento, nowMty());

    if (diasParaVencer < 0) return 'vencido';
    if (diasParaVencer >= 0 && diasParaVencer <= 7) return 'por vencer';
    return 'activo';
  };

  const calculateDiasTranscurridos = (fechaInicio: string | null): number => {
    if (!fechaInicio) return 0;
    return diffDaysMty(nowMty(), fechaInicio);
  };

  const calculateDiasRestantes = (fechaVencimiento: string | null): number => {
    if (!fechaVencimiento) return 0;
    return diffDaysMty(fechaVencimiento, nowMty());
  };

  const getContacto = (cliente: string) => contactos[(cliente || "").trim().toLowerCase()];

  const docPendiente = (c: Contrato) => {
    const st = calculateContratoStatus(c);
    if (st === 'baja' || st === 'cancelado') return false;
    return !c.contrato_firmado || !c.orden_compra;
  };

  const enTab = (contrato: Contrato) => {
    const st = calculateContratoStatus(contrato);
    switch (tab) {
      case "activos":
        return st === 'activo' || st === 'por vencer';
      case "vencidos":
        return st === 'vencido';
      case "nofirmados":
        return docPendiente(contrato);
      case "inactivos":
        return st === 'cancelado';
      case "baja":
        return st === 'baja';
      default:
        return true;
    }
  };

  const filteredContratos = useMemo(() => {
    let filtered = contratos.filter(enTab);

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(contrato =>
        contrato.folio_contrato?.toLowerCase().includes(query) ||
        contrato.numero_contrato?.toLowerCase().includes(query) ||
        contrato.cliente?.toLowerCase().includes(query) ||
        contrato.obra?.toLowerCase().includes(query) ||
        contrato.vendedor?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== "todos") {
      filtered = filtered.filter(contrato => calculateContratoStatus(contrato) === statusFilter);
    }

    return filtered;
  }, [contratos, searchQuery, statusFilter, tab]);

  const conteos = useMemo(() => {
    const acc = { activos: 0, vencidos: 0, inactivos: 0, baja: 0, nofirmados: 0, todos: contratos.length };
    contratos.forEach((c) => {
      const st = calculateContratoStatus(c);
      if (st === 'activo' || st === 'por vencer') acc.activos++;
      else if (st === 'vencido') acc.vencidos++;
      else if (st === 'cancelado') acc.inactivos++;
      else if (st === 'baja') acc.baja++;
      if (docPendiente(c)) acc.nofirmados++;
    });
    return acc;
  }, [contratos]);

  const getStatusBadge = (contrato: Contrato) => {
    const statusCalculado = calculateContratoStatus(contrato);

    switch (statusCalculado) {
      case 'activo':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Activo</Badge>;
      case 'por vencer':
        return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">Por Vencer</Badge>;
      case 'vencido':
        return <Badge variant="destructive">Vencido</Badge>;
      case 'cancelado':
        return <Badge variant="outline">Cancelado</Badge>;
      case 'baja':
        return <Badge variant="outline" className="border-destructive text-destructive">Baja</Badge>;
      default:
        return <Badge variant="outline">{statusCalculado || 'N/A'}</Badge>;
    }
  };

  const diasBadge = (dias: number, contrato: Contrato) => {
    const st = calculateContratoStatus(contrato);
    if (st === 'baja' || st === 'cancelado') return <Badge variant="outline">—</Badge>;
    if (dias < 0) return <Badge variant="destructive">{Math.abs(dias)} días vencido</Badge>;
    if (dias <= 5) return <Badge className="bg-destructive/90 hover:bg-destructive text-destructive-foreground">{dias} días</Badge>;
    if (dias <= 10) return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">{dias} días</Badge>;
    return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">{dias} días</Badge>;
  };

  const formatCurrency = (amount: number | null) => {
    if (!amount) return 'N/A';
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN'
    }).format(amount);
  };

  const formatDate = (date: string | null) => formatMty(date, 'dd/MMM/yyyy');

  const mensajeSeguimiento = (contrato: Contrato) => {
    const dias = calculateDiasRestantes(contrato.fecha_vencimiento);
    const equipo = contrato.equipos ? `${contrato.equipos.numero_equipo} - ${contrato.equipos.descripcion}` : 'el equipo rentado';
    const venc = formatDate(contrato.fecha_vencimiento);
    if (dias < 0) {
      return `Hola ${contrato.comprador || contrato.cliente}, le escribimos de COMYMAQ. Su contrato ${contrato.numero_contrato || contrato.folio_contrato} de ${equipo} venció el ${venc}. ¿Desea renovar la renta o programamos la recolección del equipo?`;
    }
    return `Hola ${contrato.comprador || contrato.cliente}, le escribimos de COMYMAQ. Su contrato ${contrato.numero_contrato || contrato.folio_contrato} de ${equipo} vence el ${venc} (${dias} días). ¿Desea renovar la renta o programamos la recolección del equipo?`;
  };

  const contactarWhatsApp = (contrato: Contrato) => {
    const c = getContacto(contrato.cliente);
    const tel = normalizarTelefono(c?.celular) || normalizarTelefono(c?.telefono);
    const texto = encodeURIComponent(mensajeSeguimiento(contrato));
    if (!tel) {
      window.open(`https://wa.me/?text=${texto}`, "_blank");
      toast({ title: "Sin teléfono registrado", description: `Agrega un teléfono a ${contrato.cliente} en Clientes para envío directo.` });
      return;
    }
    window.open(`https://wa.me/${tel}?text=${texto}`, "_blank");
  };

  const contactarCorreo = (contrato: Contrato) => {
    const c = getContacto(contrato.cliente);
    const asunto = encodeURIComponent(`Seguimiento contrato ${contrato.numero_contrato || contrato.folio_contrato} - COMYMAQ`);
    const cuerpo = encodeURIComponent(mensajeSeguimiento(contrato));
    if (!c?.correo_electronico) {
      toast({ variant: "destructive", title: "Sin correo registrado", description: `Agrega un correo a ${contrato.cliente} en Clientes.` });
      return;
    }
    window.location.href = `mailto:${c.correo_electronico}?subject=${asunto}&body=${cuerpo}`;
  };

  const exportarExcel = () => {
    const rows = filteredContratos.map((c) => ({
      "Número Contrato": c.numero_contrato || c.folio_contrato,
      "Folio": c.folio_contrato,
      "Cliente": c.cliente,
      "Contacto": getContacto(c.cliente)?.persona_contacto || c.comprador || "",
      "Teléfono": getContacto(c.cliente)?.celular || getContacto(c.cliente)?.telefono || "",
      "Correo": getContacto(c.cliente)?.correo_electronico || "",
      "Equipo": c.equipos?.numero_equipo || "",
      "Descripción Equipo": c.equipos?.descripcion || "",
      "Obra": c.obra || "",
      "Suma": c.suma || 0,
      "Fecha Inicio": formatDate(c.fecha_inicio),
      "Vencimiento": formatDate(c.fecha_vencimiento),
      "Días Transcurridos": calculateDiasTranscurridos(c.fecha_inicio),
      "Días Restantes": calculateDiasRestantes(c.fecha_vencimiento),
      "Estado": calculateContratoStatus(c),
      "Vendedor": c.vendedor || "",
      "Folio Factura": c.folio_factura || "",
      "Motivo Baja": c.motivo_baja || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Control");
    XLSX.writeFile(wb, `Control_Contratos_${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast({ title: "Exportación lista", description: `${rows.length} registros exportados a Excel.` });
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
        <h1 className="text-3xl font-bold">Control</h1>
        <p className="text-muted-foreground">Histórico universal y control de renta de equipo</p>
      </div>

      <ExcelContratosImport onImportComplete={fetchContratos} />

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <CardTitle>Vista de Control</CardTitle>
              <CardDescription>
                {filteredContratos.length} de {contratos.length} registros
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row flex-wrap gap-2">
              <Button onClick={handleCreateContrato} className="gap-2">
                <Plus className="h-4 w-4" />
                Nuevo Contrato
              </Button>
              <Button variant="outline" onClick={exportarExcel} className="gap-2">
                <Download className="h-4 w-4" />
                Exportar Excel
              </Button>
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por folio, cliente, obra, vendedor..."
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
                  <SelectItem value="baja">Baja</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Tabs value={tab} onValueChange={setTab} className="mt-4">
            <TabsList className="flex flex-wrap h-auto">
              <TabsTrigger value="activos">Activos ({conteos.activos})</TabsTrigger>
              <TabsTrigger value="vencidos">Vencidos ({conteos.vencidos})</TabsTrigger>
              <TabsTrigger value="inactivos">Inactivos ({conteos.inactivos})</TabsTrigger>
              <TabsTrigger value="baja">Baja ({conteos.baja})</TabsTrigger>
              <TabsTrigger value="todos">Histórico ({conteos.todos})</TabsTrigger>
            </TabsList>
          </Tabs>
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
                  : "No hay contratos en esta vista"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número Contrato</TableHead>
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
                    <TableHead>Contacto</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredContratos.map((contrato) => {
                    const diasTranscurridos = calculateDiasTranscurridos(contrato.fecha_inicio);
                    const diasRestantes = calculateDiasRestantes(contrato.fecha_vencimiento);

                    return (
                      <TableRow key={contrato.id}>
                        <TableCell className="font-medium">{contrato.numero_contrato || contrato.folio_contrato}</TableCell>
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
                        <TableCell>{diasBadge(diasRestantes, contrato)}</TableCell>
                        <TableCell>{getStatusBadge(contrato)}</TableCell>
                        <TableCell>{contrato.vendedor || 'N/A'}</TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Enviar WhatsApp de seguimiento"
                              onClick={() => contactarWhatsApp(contrato)}
                            >
                              <MessageSquare className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Enviar correo de seguimiento"
                              onClick={() => contactarCorreo(contrato)}
                            >
                              <Mail className="h-4 w-4 text-primary" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(contrato)}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver Detalles
                            </Button>
                            {isAdmin && (
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>¿Eliminar contrato?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      Esta acción no se puede deshacer. Se eliminará permanentemente el contrato {contrato.numero_contrato || contrato.folio_contrato}.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                    <AlertDialogAction
                                      onClick={() => handleDeleteContrato(contrato)}
                                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                    >
                                      Eliminar
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            )}
                          </div>
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
