import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { Search, Eye, QrCode, Plus, Upload, FileDown, Loader2, SlidersHorizontal, X, ArrowUp, ArrowDown, ArrowUpDown, Package, Wrench, AlertCircle } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge as BadgeUI } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { EquipoDetailsDialog } from "@/components/EquipoDetailsDialog";
import { AgregarEquipoDialog } from "@/components/AgregarEquipoDialog";
import { ExcelEquiposImport } from "@/components/ExcelEquiposImport";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";
interface Almacen {
  id: string;
  nombre: string;
  ubicacion: string | null;
}

interface Equipo {
  id: string;
  folio: number;
  numero_equipo: string;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  serie: string | null;
  tipo: string | null;
  estado: string | null;
  categoria: string | null;
  clase: string | null;
  anio: number | null;
  proveedor: string | null;
  precio_lista: number | null;
  precio_real_cliente: number | null;
  costo_proveedor_mxn: number | null;
  costo_proveedor_usd: number | null;
  ganancia: number | null;
  almacen_id: string | null;
  tipo_negocio: string | null;
  asegurado: string | null;
  ubicacion_actual: string | null;
  codigo_qr: string | null;
  almacenes?: Almacen | null;
  contrato_activo?: {
    id: string;
    folio_contrato: string;
    cliente: string;
    status: string;
  } | null;
  enMantenimiento?: boolean;
}

export default function Inventario() {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [filteredEquipos, setFilteredEquipos] = useState<Equipo[]>([]);
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [tiposNegocio, setTiposNegocio] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [disponibilidadFilter, setDisponibilidadFilter] = useState<string[]>([]);
  const [almacenFilter, setAlmacenFilter] = useState<string[]>([]);
  const [tipoNegocioFilter, setTipoNegocioFilter] = useState<string[]>([]);
  const [estadoFilter, setEstadoFilter] = useState<string[]>([]);
  const [marcaFilter, setMarcaFilter] = useState<string[]>([]);
  const [modeloFilter, setModeloFilter] = useState<string[]>([]);
  const [descripcionFilter, setDescripcionFilter] = useState<string[]>([]);
  const [ubicacionFilter, setUbicacionFilter] = useState<string[]>([]);
  const [selectedEquipo, setSelectedEquipo] = useState<Equipo | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [initialTab, setInitialTab] = useState<"detalles" | "movimiento" | "mantenimiento" | "archivos" | "qr">("detalles");
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [sortKey, setSortKey] = useState<string | null>("folio");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const getSortValue = (e: Equipo, key: string): string | number => {
    switch (key) {
      case "folio": return e.folio ?? 0;
      case "numero_equipo": return (e.numero_equipo || "").toLowerCase();
      case "descripcion": return (e.descripcion || "").toLowerCase();
      case "marca": return (e.marca || "").toLowerCase();
      case "modelo": return (e.modelo || "").toLowerCase();
      case "serie": return (e.serie || "").toLowerCase();
      case "tipo": return (e.tipo || "").toLowerCase();
      case "almacen": return (e.almacenes?.nombre || (e.enMantenimiento ? "Taller" : "")).toLowerCase();
      case "estado": return (e.estado || "").toLowerCase();
      case "cliente": return (e.contrato_activo?.cliente || "").toLowerCase();
      default: return "";
    }
  };

  const sortedEquipos = React.useMemo(() => {
    if (!sortKey) return filteredEquipos;
    const arr = [...filteredEquipos];
    arr.sort((a, b) => {
      const va = getSortValue(a, sortKey);
      const vb = getSortValue(b, sortKey);
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filteredEquipos, sortKey, sortDir]);

  const SortableHead = ({ k, children, className }: { k: string; children: React.ReactNode; className?: string }) => {
    const active = sortKey === k;
    return (
      <TableHead className={className}>
        <button
          type="button"
          onClick={() => toggleSort(k)}
          className="inline-flex items-center gap-1 hover:text-foreground transition-colors select-none"
        >
          <span>{children}</span>
          {active ? (
            sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </button>
      </TableHead>
    );
  };

  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchEquipos();
    fetchAlmacenes();
  }, []);

  useEffect(() => {
    filterEquipos();
  }, [searchQuery, equipos, typeFilter, disponibilidadFilter, almacenFilter, tipoNegocioFilter, estadoFilter, marcaFilter, modeloFilter, descripcionFilter, ubicacionFilter]);

  // Verificar si hay un equipo_id en la URL (desde el QR scanner)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const equipoIdParam = params.get('equipo_id');
    
    if (equipoIdParam && equipos.length > 0) {
      const equipo = equipos.find(e => e.id === equipoIdParam);
      if (equipo) {
        setSelectedEquipo(equipo);
        setInitialTab("detalles");
        setDialogOpen(true);
        
        // Limpiar el parámetro de la URL
        window.history.replaceState({}, '', '/inventario');
      }
    }
  }, [equipos]);

  const fetchAlmacenes = async () => {
    try {
      const { data, error } = await supabase
        .from('almacenes')
        .select('*')
        .order('nombre', { ascending: true });

      if (error) throw error;
      setAlmacenes(data || []);
    } catch (error) {
      console.error('Error fetching almacenes:', error);
    }
  };

  const fetchEquipos = async () => {
    setLoading(true);
    
    // Fetch solo campos necesarios (no SELECT *)
    const { data: equiposData, error: equiposError } = await supabase
      .from('equipos')
      .select(`
        id,
        folio,
        numero_equipo,
        descripcion,
        marca,
        modelo,
        serie,
        tipo,
        estado,
        categoria,
        clase,
        anio,
        proveedor,
        precio_lista,
        precio_real_cliente,
        costo_proveedor_mxn,
        costo_proveedor_usd,
        ganancia,
        almacen_id,
        tipo_negocio,
        asegurado,
        ubicacion_actual,
        codigo_qr,
        almacenes (
          id,
          nombre,
          ubicacion
        )
      `)
      .order('folio', { ascending: true })
      .limit(500); // Límite de registros

    if (equiposError) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el inventario",
      });
      setLoading(false);
      return;
    }

    // Fetch solo contratos activos necesarios
    const { data: contratosData } = await supabase
      .from('contratos')
      .select('id, equipo_id, folio_contrato, cliente, status')
      .eq('status', 'activo')
      .limit(500);

    // Fetch solo equipos con mantenimiento reciente (últimos 7 días)
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - 7);
    const { data: mantenimientos } = await supabase
      .from('mantenimientos')
      .select('equipo_id')
      .gte('fecha', fechaLimite.toISOString().split('T')[0])
      .limit(500);

    // Create a map of equipo_id to contrato
    const contratosMap = new Map(
      contratosData?.map(c => [c.equipo_id, c]) || []
    );

    // Create set of equipos en mantenimiento
    const equiposEnMantenimiento = new Set(
      mantenimientos?.map(m => m.equipo_id) || []
    );

    // Merge data
    const equiposWithContratos = equiposData.map(equipo => ({
      ...equipo,
      contrato_activo: contratosMap.get(equipo.id) || null,
      enMantenimiento: equiposEnMantenimiento.has(equipo.id),
    }));

    setEquipos(equiposWithContratos);
    
    // Extract unique tipos de negocio
    const uniqueTiposNegocio = Array.from(
      new Set(
        equiposWithContratos
          .map(e => e.tipo_negocio)
          .filter(tipo => tipo !== null && tipo !== '')
      )
    ).sort();
    setTiposNegocio(uniqueTiposNegocio);
    
    setLoading(false);
  };

  const filterEquipos = () => {
    // Excluir equipos dados de baja del inventario principal
    let filtered = equipos.filter(e => (e.estado || '').toUpperCase() !== 'BAJA');

    // Filter by type
    if (typeFilter.length > 0) {
      filtered = filtered.filter(e => e.tipo && typeFilter.includes(e.tipo));
    }

    // Filter by disponibilidad
    if (disponibilidadFilter.length > 0) {
      filtered = filtered.filter(e => {
        const isDisp = !e.contrato_activo;
        if (disponibilidadFilter.includes("DISPONIBLE") && isDisp) return true;
        if (disponibilidadFilter.includes("RENTADO") && !isDisp) return true;
        return false;
      });
    }

    // Filter by almacén (admite múltiples + valor especial "TALLER")
    if (almacenFilter.length > 0) {
      filtered = filtered.filter(e => {
        if (almacenFilter.includes("TALLER") && e.enMantenimiento) return true;
        if (e.almacen_id && almacenFilter.includes(e.almacen_id)) return true;
        return false;
      });
    }

    // Filter by tipo de negocio
    if (tipoNegocioFilter.length > 0) {
      filtered = filtered.filter(e => e.tipo_negocio && tipoNegocioFilter.includes(e.tipo_negocio));
    }

    // Filter by estado (catálogo)
    if (estadoFilter.length > 0) {
      filtered = filtered.filter(
        e => estadoFilter.includes((e.estado || '').toUpperCase().replace(/_/g, ' '))
      );
    }

    // Filter by marca
    if (marcaFilter.length > 0) {
      filtered = filtered.filter(e => marcaFilter.includes((e.marca || '').trim()));
    }

    // Filter by modelo
    if (modeloFilter.length > 0) {
      filtered = filtered.filter(e => modeloFilter.includes((e.modelo || '').trim()));
    }

    // Filter by descripción
    if (descripcionFilter.length > 0) {
      filtered = filtered.filter(e => descripcionFilter.includes((e.descripcion || '').trim()));
    }

    // Filter by ubicación actual
    if (ubicacionFilter.length > 0) {
      filtered = filtered.filter(e => {
        const ub = (e.ubicacion_actual || '').split('COMPROMETIDO:')[0].trim();
        return ubicacionFilter.includes(ub || 'Sin ubicación');
      });
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.numero_equipo?.toLowerCase().includes(query) ||
        e.descripcion?.toLowerCase().includes(query) ||
        e.marca?.toLowerCase().includes(query) ||
        e.modelo?.toLowerCase().includes(query) ||
        e.serie?.toLowerCase().includes(query) ||
        e.contrato_activo?.cliente?.toLowerCase().includes(query)
      );
    }

    setFilteredEquipos(filtered);
  };

  const getTipoBadge = (tipo: string | null) => {
    if (tipo === 'ELECTRICA') return <Badge variant="default">ELÉCTRICA</Badge>;
    if (tipo === 'COMBUSTIÓN') return <Badge variant="secondary">COMBUSTIÓN</Badge>;
    return <Badge variant="outline">N/A</Badge>;
  };

  const getDisponibilidadBadge = (equipo: Equipo | null) => {
    if (!equipo) return <Badge variant="outline">N/A</Badge>;
    const estado = equipo.estado?.toUpperCase()?.replace(/_/g, ' ') || '';
    if (estado) {
      switch (estado) {
        case 'TALLER':
        case 'EN TALLER':
          return <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">TALLER</Badge>;
        case 'CHECKLIST OK':
          return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">CHECKLIST OK</Badge>;
        case 'CHECKLIST NO OK':
          return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">CHECKLIST NO OK</Badge>;
        case 'TALLER EXTERNO':
          return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">TALLER EXTERNO</Badge>;
        case 'CONTRATADO':
          return <Badge variant="secondary" className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">CONTRATADO</Badge>;
        case 'COMPROMETIDO':
          return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">COMPROMETIDO</Badge>;
        case 'DENTRO':
        case 'RENTADO':
        case 'EN RENTA':
          return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">DENTRO</Badge>;
        case 'DISPONIBLE':
        case 'LIBRE':
          return <Badge variant="default" className="bg-green-600 hover:bg-green-700">DISPONIBLE</Badge>;
        case 'BAJA':
          return <Badge variant="destructive">BAJA</Badge>;
        default:
          return <Badge variant="outline">{equipo.estado?.toUpperCase()}</Badge>;
      }
    }
    // Fallback: contract-based logic
    if (equipo.contrato_activo) {
      return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">RENTADO</Badge>;
    }
    return <Badge variant="default" className="bg-green-600 hover:bg-green-700">DISPONIBLE</Badge>;
  };

  const generarReportePDF = async () => {
    try {
      setGeneratingPDF(true);

      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Logo en esquina superior izquierda
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
        logoImg.src = '/comymaq-cotizacion-logo.png';
      });
      let titleX = 14;
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        const logoMaxWidth = 35;
        const logoMaxHeight = 18;
        const aspectRatio = logoImg.naturalWidth / logoImg.naturalHeight;
        let logoWidth = logoMaxWidth;
        let logoHeight = logoWidth / aspectRatio;
        if (logoHeight > logoMaxHeight) {
          logoHeight = logoMaxHeight;
          logoWidth = logoHeight * aspectRatio;
        }
        doc.addImage(logoImg, 'PNG', 10, 8, logoWidth, logoHeight);
        titleX = 10 + logoWidth + 6;
      }

      // Encabezado
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("Reporte de Inventario de Equipos", titleX, 15);

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      const fechaGen = new Date().toLocaleString("es-MX", {
        dateStyle: "long",
        timeStyle: "short",
      });
      doc.text(`Generado: ${fechaGen}`, titleX, 21);
      doc.text(`Total registros: ${filteredEquipos.length}`, pageWidth - 14, 21, { align: "right" });

      // Resumen de filtros
      const filtros: string[] = [];
      const tipoLabels: Record<string, string> = { ELECTRICA: "Eléctricos", "COMBUSTIÓN": "Combustión" };
      const dispLabels: Record<string, string> = { DISPONIBLE: "Disponibles", RENTADO: "Rentados" };
      if (typeFilter.length > 0) filtros.push(`Tipo: ${typeFilter.map(v => tipoLabels[v] || v).join(", ")}`);
      if (disponibilidadFilter.length > 0) filtros.push(`Disponibilidad: ${disponibilidadFilter.map(v => dispLabels[v] || v).join(", ")}`);
      if (estadoFilter.length > 0) filtros.push(`Estado: ${estadoFilter.join(", ")}`);
      if (almacenFilter.length > 0) {
        const labels = almacenFilter.map(v =>
          v === "TALLER" ? "Taller" : almacenes.find((a) => a.id === v)?.nombre || v
        );
        filtros.push(`Almacén: ${labels.join(", ")}`);
      }
      if (tipoNegocioFilter.length > 0) filtros.push(`Negocio: ${tipoNegocioFilter.join(", ")}`);
      if (marcaFilter.length > 0) filtros.push(`Marca: ${marcaFilter.join(", ")}`);
      if (modeloFilter.length > 0) filtros.push(`Modelo: ${modeloFilter.join(", ")}`);
      if (descripcionFilter.length > 0) filtros.push(`Descripción: ${descripcionFilter.join(", ")}`);
      if (ubicacionFilter.length > 0) filtros.push(`Ubicación actual: ${ubicacionFilter.join(", ")}`);
      if (searchQuery.trim()) filtros.push(`Búsqueda: "${searchQuery.trim()}"`);

      const filtrosTexto = filtros.length ? `Filtros: ${filtros.join("  |  ")}` : "Filtros: Ninguno (todos los equipos activos)";
      doc.setFontSize(9);
      doc.setTextColor(80);
      doc.text(filtrosTexto, 14, 27);
      doc.setTextColor(0);

      // Tabla
      const body = filteredEquipos.map((e) => [
        e.numero_equipo || "",
        e.descripcion || "",
        e.modelo || "",
        e.serie || "",
        e.almacenes?.nombre || "",
        e.ubicacion_actual || "",
        (e.estado || "").toUpperCase().replace(/_/g, " "),
      ]);

      autoTable(doc, {
        head: [["N° Económico", "Descripción", "Modelo", "Serie", "Almacén", "Bodega", "Estado"]],
        body,
        startY: 32,
        margin: { left: 10, right: 10, bottom: 15 },
        styles: { fontSize: 8, cellPadding: 2, overflow: "linebreak" },
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: "bold" },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        columnStyles: {
          0: { cellWidth: 28 },
          1: { cellWidth: 80 },
          2: { cellWidth: 30 },
          3: { cellWidth: 35 },
          4: { cellWidth: 35 },
          5: { cellWidth: 30 },
          6: { cellWidth: 35 },
        },
        didDrawPage: (data) => {
          const pageCount = doc.getNumberOfPages();
          const current = data.pageNumber;
          doc.setFontSize(8);
          doc.setTextColor(120);
          doc.text(
            `Página ${current} de ${pageCount}`,
            pageWidth - 14,
            pageHeight - 8,
            { align: "right" }
          );
          doc.text("Reporte de Inventario", 14, pageHeight - 8);
          doc.setTextColor(0);
        },
      });

      const fecha = new Date().toISOString().split("T")[0];
      doc.save(`inventario-${fecha}.pdf`);

      toast({
        title: "Reporte generado",
        description: "El PDF se ha descargado correctamente",
      });
    } catch (err) {
      console.error("Error generando PDF:", err);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo generar el reporte PDF",
      });
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p>Cargando inventario...</p>
      </div>
    );
  }

  const equiposBaja = equipos.filter(e => (e.estado || '').toUpperCase() === 'BAJA');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Inventario de Equipos</h1>
          <p className="text-sm text-muted-foreground">
            Total de equipos: {filteredEquipos.length} de {equipos.length}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={generarReportePDF}
            disabled={generatingPDF || filteredEquipos.length === 0}
            className="flex-1 sm:flex-none"
          >
            {generatingPDF ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileDown className="h-4 w-4 mr-2" />
            )}
            <span className="truncate">Generar Reporte</span>
          </Button>
          <Button onClick={() => setAddDialogOpen(true)} size="sm" className="flex-1 sm:flex-none">
            <Plus className="h-4 w-4 mr-2" />
            <span className="truncate">Agregar Equipo</span>
          </Button>
        </div>
      </div>

      {/* Summary indicators */}
      {(() => {
        const activos = equipos.filter((e) => (e.estado || "").toLowerCase() !== "baja");
        const enTaller = activos.filter((e) => {
          const es = (e.estado || "").toLowerCase();
          return e.enMantenimiento || es.includes("taller") || es.includes("mantenimiento");
        });
        const enTallerIds = new Set(enTaller.map((e) => e.id));
        const comprometidos = activos.filter((e) => !enTallerIds.has(e.id) && !!e.contrato_activo);
        const comprometidosIds = new Set(comprometidos.map((e) => e.id));
        const disponibles = activos.filter((e) => !enTallerIds.has(e.id) && !comprometidosIds.has(e.id));
        return (
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Disponibles</CardTitle>
                <Package className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{disponibles.length}</div>
                <p className="text-xs text-muted-foreground">Equipos listos para renta</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">En Taller</CardTitle>
                <Wrench className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{enTaller.length}</div>
                <p className="text-xs text-muted-foreground">En mantenimiento</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Comprometidos</CardTitle>
                <AlertCircle className="h-4 w-4 text-accent-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{comprometidos.length}</div>
                <p className="text-xs text-muted-foreground">En contrato activo</p>
              </CardContent>
            </Card>
          </div>
        );
      })()}


      <Tabs defaultValue="activos" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="activos">Activos ({equipos.length - equiposBaja.length})</TabsTrigger>
          <TabsTrigger value="baja">Fuera de Servicio ({equiposBaja.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="activos" className="space-y-6 mt-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2 items-center flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por número, descripción, marca, modelo, serie o cliente..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="gap-2">
                  <SlidersHorizontal className="h-4 w-4" />
                  Filtros
                  {(() => {
                    const active =
                      (typeFilter.length > 0 ? 1 : 0) +
                      (disponibilidadFilter.length > 0 ? 1 : 0) +
                      (almacenFilter.length > 0 ? 1 : 0) +
                      (tipoNegocioFilter.length > 0 ? 1 : 0) +
                      (estadoFilter.length > 0 ? 1 : 0) +
                      (marcaFilter.length > 0 ? 1 : 0) +
                      (modeloFilter.length > 0 ? 1 : 0) +
                      (descripcionFilter.length > 0 ? 1 : 0) +
                      (ubicacionFilter.length > 0 ? 1 : 0);
                    return active > 0 ? (
                      <BadgeUI variant="secondary" className="ml-1 h-5 px-1.5">
                        {active}
                      </BadgeUI>
                    ) : null;
                  })()}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-[min(95vw,520px)] max-h-[80vh] overflow-y-auto">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-sm">Filtros de búsqueda</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => {
                        setTypeFilter([]);
                        setDisponibilidadFilter([]);
                        setAlmacenFilter([]);
                        setTipoNegocioFilter([]);
                        setEstadoFilter([]);
                        setMarcaFilter([]);
                        setModeloFilter([]);
                        setDescripcionFilter([]);
                        setUbicacionFilter([]);
                      }}
                    >
                      <X className="h-3 w-3 mr-1" /> Limpiar todo
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase">Tipo</Label>
                      <MultiSelectFilter
                        options={[
                          { value: "ELECTRICA", label: "Eléctricos" },
                          { value: "COMBUSTIÓN", label: "Combustión" },
                        ]}
                        selected={typeFilter}
                        onChange={setTypeFilter}
                        placeholder="Todos"
                      />
                    </div>

                    <div>
                      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase">Disponibilidad</Label>
                      <MultiSelectFilter
                        options={[
                          { value: "DISPONIBLE", label: "Disponibles" },
                          { value: "RENTADO", label: "Rentados" },
                        ]}
                        selected={disponibilidadFilter}
                        onChange={setDisponibilidadFilter}
                        placeholder="Todos"
                      />
                    </div>

                    <div>
                      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase">Estado del equipo</Label>
                      <MultiSelectFilter
                        options={[
                          "DISPONIBLE",
                          "CONTRATADO",
                          "DENTRO",
                          "COMPROMETIDO",
                          "TALLER",
                          "CHECKLIST OK",
                          "CHECKLIST NO OK",
                          "TALLER EXTERNO",
                        ].map(v => ({ value: v, label: v }))}
                        selected={estadoFilter}
                        onChange={setEstadoFilter}
                        placeholder="Todos"
                      />
                    </div>

                    <div>
                      <Label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase">Almacén</Label>
                      <MultiSelectFilter
                        options={[
                          { value: "TALLER", label: "Taller" },
                          ...almacenes.map(a => ({ value: a.id, label: a.nombre })),
                        ]}
                        selected={almacenFilter}
                        onChange={setAlmacenFilter}
                        placeholder="Todos"
                      />
                    </div>

                    {tiposNegocio.length > 0 && (
                      <div>
                        <Label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase">Tipo de Negocio</Label>
                        <MultiSelectFilter
                          options={tiposNegocio.map(t => ({ value: t, label: t }))}
                          selected={tipoNegocioFilter}
                          onChange={setTipoNegocioFilter}
                          placeholder="Todos"
                        />
                      </div>
                    )}

                    {(() => {
                      const marcasUnicas = Array.from(
                        new Set(equipos.map(e => (e.marca || '').trim()).filter(Boolean))
                      ).sort();
                      return (
                        <div>
                          <Label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase">Marca</Label>
                          <MultiSelectFilter
                            options={marcasUnicas.map(m => ({ value: m, label: m }))}
                            selected={marcaFilter}
                            onChange={(next) => {
                              setMarcaFilter(next);
                              setModeloFilter([]);
                            }}
                            placeholder="Todas"
                          />
                        </div>
                      );
                    })()}

                    {(() => {
                      const modelosUnicos = Array.from(
                        new Set(
                          equipos
                            .filter(e => marcaFilter.length === 0 || marcaFilter.includes((e.marca || '').trim()))
                            .map(e => (e.modelo || '').trim())
                            .filter(Boolean)
                        )
                      ).sort();
                      return (
                        <div>
                          <Label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase">Modelo</Label>
                          <MultiSelectFilter
                            options={modelosUnicos.map(m => ({ value: m, label: m }))}
                            selected={modeloFilter}
                            onChange={setModeloFilter}
                            placeholder="Todos"
                          />
                        </div>
                      );
                    })()}

                    {(() => {
                      const descripcionesUnicas = Array.from(
                        new Set(equipos.map(e => (e.descripcion || '').trim()).filter(Boolean))
                      ).sort();
                      return (
                        <div className="sm:col-span-2">
                          <Label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase">Descripción</Label>
                          <MultiSelectFilter
                            options={descripcionesUnicas.map(d => ({ value: d, label: d }))}
                            selected={descripcionFilter}
                            onChange={setDescripcionFilter}
                            placeholder="Todas"
                          />
                        </div>
                      );
                    })()}

                    {(() => {
                      const ubicacionesUnicas = Array.from(
                        new Set(
                          equipos
                            .map(e => (e.ubicacion_actual || '').split('COMPROMETIDO:')[0].trim())
                            .map(u => u || 'Sin ubicación')
                        )
                      ).sort();
                      return (
                        <div className="sm:col-span-2">
                          <Label className="mb-1.5 block text-xs font-medium text-muted-foreground uppercase">Ubicación actual</Label>
                          <MultiSelectFilter
                            options={ubicacionesUnicas.map(u => ({ value: u, label: u }))}
                            selected={ubicacionFilter}
                            onChange={setUbicacionFilter}
                            placeholder="Todas"
                          />
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <SortableHead k="folio">Folio</SortableHead>
                  <SortableHead k="numero_equipo">N° Equipo</SortableHead>
                  <SortableHead k="descripcion">Descripción</SortableHead>
                  <SortableHead k="marca">Marca</SortableHead>
                  <SortableHead k="modelo">Modelo</SortableHead>
                  <SortableHead k="serie">Serie</SortableHead>
                  <SortableHead k="tipo">Tipo</SortableHead>
                  <SortableHead k="almacen">Almacén</SortableHead>
                  <SortableHead k="estado">Estado</SortableHead>
                  
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedEquipos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8 text-muted-foreground">
                      No se encontraron equipos
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedEquipos.map((equipo) => (
                    <TableRow key={equipo.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-mono text-sm font-bold">{equipo.folio}</TableCell>
                      <TableCell className="font-medium">{equipo.numero_equipo}</TableCell>
                      <TableCell>{equipo.descripcion}</TableCell>
                      <TableCell>{equipo.marca || "N/A"}</TableCell>
                      <TableCell>{equipo.modelo || "N/A"}</TableCell>
                      <TableCell className="font-mono text-sm">{equipo.serie || "N/A"}</TableCell>
                      <TableCell>{getTipoBadge(equipo.tipo)}</TableCell>
                      <TableCell>
                        {equipo.enMantenimiento ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                            Taller
                          </Badge>
                        ) : equipo.almacenes ? (
                          <Badge variant="outline">{equipo.almacenes.nombre}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Sin asignar</span>
                        )}
                      </TableCell>
                      <TableCell>{getDisponibilidadBadge(equipo)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEquipo(equipo as any);
                              setInitialTab("detalles");
                              setDialogOpen(true);
                            }}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            Ver detalles
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEquipo(equipo as any);
                              setInitialTab("qr");
                              setDialogOpen(true);
                            }}
                            title="Ver código QR"
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Collapsible>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full">
            <Upload className="h-4 w-4 mr-2" />
            Importar Equipos desde Excel
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <ExcelEquiposImport onImportComplete={fetchEquipos} />
        </CollapsibleContent>
      </Collapsible>
        </TabsContent>

        <TabsContent value="baja" className="space-y-6 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Equipos Fuera de Servicio</CardTitle>
              <CardDescription>
                Equipos dados de baja. Total: {equiposBaja.length}
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Folio</TableHead>
                      <TableHead>N° Equipo</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Marca</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Serie</TableHead>
                      <TableHead>Motivo / Ubicación</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {equiposBaja.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                          No hay equipos fuera de servicio
                        </TableCell>
                      </TableRow>
                    ) : (
                      equiposBaja.map((equipo) => (
                        <TableRow key={equipo.id} className="cursor-pointer hover:bg-muted/50">
                          <TableCell className="font-mono text-sm font-bold">{equipo.folio}</TableCell>
                          <TableCell className="font-medium">{equipo.numero_equipo}</TableCell>
                          <TableCell>{equipo.descripcion}</TableCell>
                          <TableCell>{equipo.marca || "N/A"}</TableCell>
                          <TableCell>{equipo.modelo || "N/A"}</TableCell>
                          <TableCell className="font-mono text-sm">{equipo.serie || "N/A"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                            {equipo.ubicacion_actual || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant="destructive">BAJA</Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedEquipo(equipo as any);
                                setInitialTab("detalles");
                                setDialogOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              Ver detalles
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <EquipoDetailsDialog
        equipo={selectedEquipo as any}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onUpdate={fetchEquipos}
        initialTab={initialTab}
      />

      <AgregarEquipoDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSuccess={fetchEquipos}
      />
    </div>
  );
}
