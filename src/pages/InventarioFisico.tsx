import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Package, Wrench, AlertCircle, Search, Download, RefreshCw } from "lucide-react";
import { differenceInDays, parseISO, format } from "date-fns";
import { es } from "date-fns/locale";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface EquipoInventario {
  id: string;
  numero_equipo: string;
  folio: number;
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  anio: number | null;
  tipo: string | null;
  tipo_negocio: string | null;
  estado: string | null;
  // From contratos
  contrato_fecha_inicio?: string | null;
  contrato_fecha_vencimiento?: string | null;
  contrato_cliente?: string | null;
  contrato_folio?: string | null;
  // From mantenimientos
  mantenimiento_fecha?: string | null;
  mantenimiento_tipo?: string | null;
  mantenimiento_tecnico?: string | null;
  mantenimiento_descripcion?: string | null;
  // Computed
  dias_como?: number;
  dias_en_taller?: number;
  fecha_regreso?: string | null;
  observacion?: string | null;
}

const today = new Date();
const todayStr = format(today, "dd/MM/yyyy", { locale: es });

export default function InventarioFisico() {
  const [disponibles, setDisponibles] = useState<EquipoInventario[]>([]);
  const [taller, setTaller] = useState<EquipoInventario[]>([]);
  const [comprometidos, setComprometidos] = useState<EquipoInventario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchDisponible, setSearchDisponible] = useState("");
  const [searchTaller, setSearchTaller] = useState("");
  const [searchComprometido, setSearchComprometido] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch equipos
      const { data: equipos, error: eqError } = await supabase
        .from("equipos")
        .select("id, numero_equipo, folio, descripcion, marca, modelo, anio, tipo, tipo_negocio, estado")
        .order("folio");

      if (eqError) throw eqError;

      // Fetch active contracts with equipo_id
      const { data: contratos, error: ctError } = await supabase
        .from("contratos")
        .select("id, equipo_id, cliente, folio_contrato, fecha_inicio, fecha_vencimiento, status")
        .eq("status", "activo");

      if (ctError) throw ctError;

      // Fetch latest mantenimiento per equipo (en_taller state)
      const { data: mantenimientos, error: mtError } = await supabase
        .from("mantenimientos")
        .select("id, equipo_id, fecha, tipo_servicio, tecnico, descripcion")
        .order("fecha", { ascending: false });

      if (mtError) throw mtError;

      // Build maps
      const contratoMap = new Map<string, typeof contratos[0]>();
      contratos?.forEach((c) => {
        if (c.equipo_id) contratoMap.set(c.equipo_id, c);
      });

      const mantenimientoMap = new Map<string, typeof mantenimientos[0]>();
      mantenimientos?.forEach((m) => {
        if (!mantenimientoMap.has(m.equipo_id)) {
          mantenimientoMap.set(m.equipo_id, m);
        }
      });

      const disp: EquipoInventario[] = [];
      const tall: EquipoInventario[] = [];
      const comp: EquipoInventario[] = [];

      equipos?.forEach((eq) => {
        const contrato = contratoMap.get(eq.id);
        const mant = mantenimientoMap.get(eq.id);
        const estadoLower = (eq.estado || "").toLowerCase();

        const base: EquipoInventario = {
          id: eq.id,
          numero_equipo: eq.numero_equipo,
          folio: eq.folio,
          descripcion: eq.descripcion,
          marca: eq.marca,
          modelo: eq.modelo,
          anio: eq.anio,
          tipo: eq.tipo,
          tipo_negocio: eq.tipo_negocio,
          estado: eq.estado,
        };

        if (estadoLower.includes("taller") || estadoLower.includes("mantenimiento")) {
          // TALLER
          const fechaMant = mant?.fecha ? parseISO(mant.fecha) : null;
          const diasTaller = fechaMant ? differenceInDays(today, fechaMant) : null;
          tall.push({
            ...base,
            mantenimiento_fecha: mant?.fecha || null,
            mantenimiento_tipo: mant?.tipo_servicio || null,
            mantenimiento_tecnico: mant?.tecnico || null,
            mantenimiento_descripcion: mant?.descripcion || null,
            dias_en_taller: diasTaller ?? undefined,
          });
        } else if (contrato) {
          // COMPROMETIDO (rentado con contrato activo)
          const fechaVenc = contrato.fecha_vencimiento ? parseISO(contrato.fecha_vencimiento) : null;
          const fechaInicio = contrato.fecha_inicio ? parseISO(contrato.fecha_inicio) : null;
          const diasComo = fechaInicio ? differenceInDays(today, fechaInicio) : null;
          comp.push({
            ...base,
            contrato_fecha_inicio: contrato.fecha_inicio,
            contrato_fecha_vencimiento: contrato.fecha_vencimiento,
            contrato_cliente: contrato.cliente,
            contrato_folio: contrato.folio_contrato,
            dias_como: diasComo ?? undefined,
            fecha_regreso: contrato.fecha_vencimiento,
          });
        } else {
          // DISPONIBLE
          const updated = eq as any;
          disp.push({
            ...base,
            dias_como: undefined,
          });
        }
      });

      setDisponibles(disp);
      setTaller(tall);
      setComprometidos(comp);
    } catch (err) {
      console.error(err);
      toast({ variant: "destructive", title: "Error", description: "No se pudo cargar el inventario" });
    } finally {
      setLoading(false);
    }
  };

  const filterRows = (rows: EquipoInventario[], query: string) => {
    if (!query.trim()) return rows;
    const q = query.toLowerCase();
    return rows.filter(
      (r) =>
        r.numero_equipo?.toLowerCase().includes(q) ||
        r.descripcion?.toLowerCase().includes(q) ||
        r.marca?.toLowerCase().includes(q) ||
        r.modelo?.toLowerCase().includes(q) ||
        r.tipo?.toLowerCase().includes(q) ||
        r.contrato_cliente?.toLowerCase().includes(q)
    );
  };

  const exportPDF = (rows: EquipoInventario[], title: string, type: "disponible" | "taller" | "comprometido") => {
    const doc = new jsPDF("landscape");
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(`${title}`, 14, 18);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`AL  ${todayStr}`, 14, 26);

    const baseHead = ["NO", "NO EQUIPO", "ESTATUS", "TIPO", "DESCRIPCIÓN", "MARCA", "AÑO", "MODELO"];

    let head: string[];
    let body: (string | number)[][];

    if (type === "taller") {
      head = [...baseHead, "FECHA INGRESO TALLER", "DÍAS EN TALLER", "OBSERVACIÓN", "TÉCNICO"];
      body = rows.map((r, i) => [
        i + 1,
        r.numero_equipo,
        r.estado || "",
        r.tipo || r.tipo_negocio || "",
        r.descripcion,
        r.marca || "",
        r.anio || 0,
        r.modelo || "",
        r.mantenimiento_fecha ? format(parseISO(r.mantenimiento_fecha), "dd/MM/yyyy") : "",
        r.dias_en_taller ?? "",
        r.mantenimiento_descripcion || "",
        r.mantenimiento_tecnico || "",
      ]);
    } else if (type === "comprometido") {
      head = [...baseHead, "CLIENTE", "FECHA REGRESO", "DÍAS COMO"];
      body = rows.map((r, i) => [
        i + 1,
        r.numero_equipo,
        r.estado || "",
        r.tipo || r.tipo_negocio || "",
        r.descripcion,
        r.marca || "",
        r.anio || 0,
        r.modelo || "",
        r.contrato_cliente || "",
        r.fecha_regreso ? format(parseISO(r.fecha_regreso), "dd/MM/yyyy") : "",
        r.dias_como ?? "",
      ]);
    } else {
      head = [...baseHead, "OBSERVACIÓN"];
      body = rows.map((r, i) => [
        i + 1,
        r.numero_equipo,
        r.estado || "",
        r.tipo || r.tipo_negocio || "",
        r.descripcion,
        r.marca || "",
        r.anio || 0,
        r.modelo || "",
        "",
      ]);
    }

    autoTable(doc, {
      head: [head],
      body,
      startY: 32,
      styles: { fontSize: 7, cellPadding: 1.5 },
      headStyles: { fillColor: [30, 64, 175], fontStyle: "bold", textColor: 255 },
    });

    const fecha = new Date().toISOString().split("T")[0];
    doc.save(`inventario-${type}-${fecha}.pdf`);
    toast({ title: "PDF descargado" });
  };

  const estadoBadge = (estado: string | null) => {
    const e = (estado || "").toLowerCase();
    if (e.includes("taller") || e.includes("mantenimiento"))
      return <Badge variant="destructive" className="text-xs">TALLER</Badge>;
    if (e.includes("rentado") || e.includes("renta"))
      return <Badge variant="default" className="text-xs">RENTADO</Badge>;
    return <Badge variant="secondary" className="text-xs">DISPONIBLE</Badge>;
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando inventario físico...</p>
        </div>
      </div>
    );
  }

  const filteredDisp = filterRows(disponibles, searchDisponible);
  const filteredTall = filterRows(taller, searchTaller);
  const filteredComp = filterRows(comprometidos, searchComprometido);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Package className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Inventario Físico de Equipos</h1>
            <p className="text-muted-foreground text-sm">AL {todayStr}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      {/* Summary cards */}
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
            <div className="text-2xl font-bold text-destructive">{taller.length}</div>
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

      <Tabs defaultValue="disponible">
        <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="disponible">
          Disponible ({disponibles.length})
        </TabsTrigger>
        <TabsTrigger value="taller">
          En Taller ({taller.length})
        </TabsTrigger>
        <TabsTrigger value="comprometido">
          Comprometido ({comprometidos.length})
        </TabsTrigger>
        </TabsList>

        {/* ==================== DISPONIBLE ==================== */}
        <TabsContent value="disponible">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-primary">INVENTARIO FÍSICO DE EQUIPOS DISPONIBLES</CardTitle>
                <div className="flex gap-2 items-center">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      className="pl-8 w-56"
                      value={searchDisponible}
                      onChange={(e) => setSearchDisponible(e.target.value)}
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportPDF(filteredDisp, "INVENTARIO FÍSICO DE EQUIPOS DISPONIBLES", "disponible")}>
                    <Download className="mr-1 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">AL {todayStr} — {filteredDisp.length} equipos</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary/90">
                      <TableHead className="text-white w-10 text-center">NO</TableHead>
                      <TableHead className="text-white">NO EQUIPO</TableHead>
                      <TableHead className="text-white">ESTATUS EN<br />CONTROL DE</TableHead>
                      <TableHead className="text-white">TIPO</TableHead>
                      <TableHead className="text-white">DESCRIPCIÓN</TableHead>
                      <TableHead className="text-white">MARCA</TableHead>
                      <TableHead className="text-white text-center">AÑO</TableHead>
                      <TableHead className="text-white">MODELO</TableHead>
                      <TableHead className="text-white">OBSERVACIÓN</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDisp.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                          No hay equipos disponibles
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredDisp.map((eq, idx) => (
                        <TableRow key={eq.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <TableCell className="text-center text-xs font-medium">{idx + 1}</TableCell>
                          <TableCell className="font-semibold">{eq.numero_equipo}</TableCell>
                          <TableCell>
                            {estadoBadge(eq.estado)}
                          </TableCell>
                          <TableCell className="text-xs uppercase">{eq.tipo || eq.tipo_negocio || "—"}</TableCell>
                          <TableCell className="text-xs font-medium">{eq.descripcion}</TableCell>
                          <TableCell className="text-xs">{eq.marca || "—"}</TableCell>
                          <TableCell className="text-center text-xs">{eq.anio || 0}</TableCell>
                          <TableCell className="text-xs">{eq.modelo || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">—</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ==================== TALLER ==================== */}
        <TabsContent value="taller">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-destructive">INVENTARIO FÍSICO DE EQUIPOS EN TALLER</CardTitle>
                <div className="flex gap-2 items-center">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      className="pl-8 w-56"
                      value={searchTaller}
                      onChange={(e) => setSearchTaller(e.target.value)}
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportPDF(filteredTall, "INVENTARIO FÍSICO DE EQUIPOS EN TALLER", "taller")}>
                    <Download className="mr-1 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">AL {todayStr} — {filteredTall.length} equipos</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary/90">
                      <TableHead className="text-white w-10 text-center">NO</TableHead>
                      <TableHead className="text-white">NO DE<br />EQUIPO</TableHead>
                      <TableHead className="text-white">ESTATUS EN<br />CONTROL DE</TableHead>
                      <TableHead className="text-white">DESCRIPCIÓN</TableHead>
                      <TableHead className="text-white">MARCA</TableHead>
                      <TableHead className="text-white text-center">AÑO</TableHead>
                      <TableHead className="text-white">MODELO</TableHead>
                      <TableHead className="text-white">FECHA DE<br />REGRESO A TALLER</TableHead>
                      <TableHead className="text-white text-center">DÍAS EN<br />TALLER</TableHead>
                      <TableHead className="text-white">OBSERVACIÓN</TableHead>
                      <TableHead className="text-white">TÉCNICO<br />ASIGNADO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTall.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                          No hay equipos en taller
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTall.map((eq, idx) => (
                        <TableRow key={eq.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <TableCell className="text-center text-xs font-medium">{idx + 1}</TableCell>
                          <TableCell className="font-semibold">{eq.numero_equipo}</TableCell>
                          <TableCell>
                            <Badge variant="destructive" className="text-xs">TALLER</Badge>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{eq.descripcion}</TableCell>
                          <TableCell className="text-xs">{eq.marca || "—"}</TableCell>
                          <TableCell className="text-center text-xs">{eq.anio || 0}</TableCell>
                          <TableCell className="text-xs">{eq.modelo || "—"}</TableCell>
                          <TableCell className="text-xs">
                            {eq.mantenimiento_fecha
                              ? format(parseISO(eq.mantenimiento_fecha), "dd/MM/yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {eq.dias_en_taller != null ? (
                              <span className={`font-bold text-sm ${eq.dias_en_taller > 30 ? "text-destructive" : eq.dias_en_taller > 14 ? "text-orange-500" : "text-foreground"}`}>
                                {eq.dias_en_taller}
                              </span>
                            ) : "—"}
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px]">
                            {eq.mantenimiento_descripcion || "—"}
                          </TableCell>
                          <TableCell className="text-xs">
                            {eq.mantenimiento_tecnico || "—"}
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

        {/* ==================== COMPROMETIDO ==================== */}
        <TabsContent value="comprometido">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle>EQUIPOS COMPROMETIDOS</CardTitle>
                <div className="flex gap-2 items-center">
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar..."
                      className="pl-8 w-56"
                      value={searchComprometido}
                      onChange={(e) => setSearchComprometido(e.target.value)}
                    />
                  </div>
                  <Button size="sm" variant="outline" onClick={() => exportPDF(filteredComp, "EQUIPOS COMPROMETIDOS", "comprometido")}>
                    <Download className="mr-1 h-4 w-4" />
                    PDF
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">AL {todayStr} — {filteredComp.length} equipos en contrato activo</p>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-primary hover:bg-primary/90">
                      <TableHead className="text-white w-10 text-center">NO</TableHead>
                      <TableHead className="text-white">NO EQUIPO</TableHead>
                      <TableHead className="text-white">ESTATUS EN<br />CONTROL DE</TableHead>
                      <TableHead className="text-white">TIPO</TableHead>
                      <TableHead className="text-white">DESCRIPCIÓN</TableHead>
                      <TableHead className="text-white">MARCA</TableHead>
                      <TableHead className="text-white text-center">AÑO</TableHead>
                      <TableHead className="text-white">MODELO</TableHead>
                      <TableHead className="text-white">FECHA DE<br />REGRESO A</TableHead>
                      <TableHead className="text-white text-center">DÍAS<br />COMO</TableHead>
                      <TableHead className="text-white">CLIENTE</TableHead>
                      <TableHead className="text-white">FOLIO<br />CONTRATO</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredComp.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center text-muted-foreground py-8">
                          No hay equipos comprometidos
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredComp.map((eq, idx) => (
                        <TableRow key={eq.id} className={idx % 2 === 0 ? "bg-background" : "bg-muted/30"}>
                          <TableCell className="text-center text-xs font-medium">{idx + 1}</TableCell>
                          <TableCell className="font-semibold">{eq.numero_equipo}</TableCell>
                          <TableCell>
                            <Badge variant="default" className="text-xs">RENTADO</Badge>
                          </TableCell>
                          <TableCell className="text-xs uppercase">{eq.tipo || eq.tipo_negocio || "—"}</TableCell>
                          <TableCell className="text-xs font-medium">{eq.descripcion}</TableCell>
                          <TableCell className="text-xs">{eq.marca || "—"}</TableCell>
                          <TableCell className="text-center text-xs">{eq.anio || 0}</TableCell>
                          <TableCell className="text-xs">{eq.modelo || "—"}</TableCell>
                          <TableCell className="text-xs">
                            {eq.fecha_regreso
                              ? format(parseISO(eq.fecha_regreso), "dd/MM/yyyy")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-bold text-sm">{eq.dias_como ?? "—"}</span>
                          </TableCell>
                          <TableCell className="text-xs font-medium">{eq.contrato_cliente || "—"}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{eq.contrato_folio || "—"}</TableCell>
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
    </div>
  );
}
