import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileBarChart, Package, Wrench, TrendingUp, Download, X } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { MultiSelectFilter } from "@/components/MultiSelectFilter";

interface InventoryReport {
  categoria: string;
  clase: string;
  descripcion: string;
  cantidad: number;
  dentro: number;
  disponible: number;
  taller: number;
  inactivo: number;
  general: number;
  segmento_renta: number;
  segmento_disponible: number;
  segmento_taller: number;
  segmento_inactivo: number;
  segmento_clase: number;
}

interface EquipoRaw {
  id: string;
  categoria: string | null;
  clase: string | null;
  descripcion: string;
  estado: string | null;
  tipo_negocio: string | null;
  almacen_id: string | null;
  almacenes?: { id: string; nombre: string } | null;
}

interface Almacen {
  id: string;
  nombre: string;
}

export default function ReporteInventario() {
  const [equiposRaw, setEquiposRaw] = useState<EquipoRaw[]>([]);
  const [equiposEnContrato, setEquiposEnContrato] = useState<Set<string>>(new Set());
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [almacenFilter, setAlmacenFilter] = useState<string[]>([]);
  const [categoriaFilter, setCategoriaFilter] = useState<string[]>([]);
  const [claseFilter, setClaseFilter] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [equiposRes, contratosRes, almacenesRes] = await Promise.all([
        supabase
          .from("equipos")
          .select("id, categoria, clase, descripcion, estado, tipo_negocio, almacen_id, almacenes(id, nombre)"),
        supabase.from("contratos").select("equipo_id, status").eq("status", "activo"),
        supabase.from("almacenes").select("id, nombre").order("nombre"),
      ]);

      if (equiposRes.error) throw equiposRes.error;
      if (contratosRes.error) throw contratosRes.error;
      if (almacenesRes.error) throw almacenesRes.error;

      setEquiposRaw((equiposRes.data as any) || []);
      setEquiposEnContrato(
        new Set(contratosRes.data?.map((c) => c.equipo_id).filter(Boolean) || [])
      );
      setAlmacenes(almacenesRes.data || []);
    } catch (error) {
      console.error("Error fetching report data:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el reporte de inventario",
      });
    } finally {
      setLoading(false);
    }
  };

  // Aplica filtros a la lista de equipos antes de agregar
  const filteredEquipos = useMemo(() => {
    let list = equiposRaw;

    if (almacenFilter.length > 0) {
      list = list.filter((e) => e.almacen_id && almacenFilter.includes(e.almacen_id));
    }
    if (categoriaFilter.length > 0) {
      list = list.filter((e) => categoriaFilter.includes(((e.categoria || "").replace(/\s+/g, " ").trim()) || "Sin categoría"));
    }
    if (claseFilter.length > 0) {
      list = list.filter((e) => claseFilter.includes(((e.clase || "").replace(/\s+/g, " ").trim()) || "Sin clase"));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (e) =>
          (e.categoria || "").toLowerCase().includes(q) ||
          (e.clase || "").toLowerCase().includes(q) ||
          (e.descripcion || "").toLowerCase().includes(q)
      );
    }

    return list;
  }, [equiposRaw, almacenFilter, categoriaFilter, claseFilter, searchQuery]);

  // Construye el reporte agregando los equipos filtrados
  const reportData = useMemo<InventoryReport[]>(() => {
    const grouped: Record<string, InventoryReport> = {};

    filteredEquipos.forEach((equipo) => {
      const cat = (equipo.categoria || "").replace(/\s+/g, " ").trim() || "Sin categoría";
      const cls = (equipo.clase || "").replace(/\s+/g, " ").trim() || "Sin clase";
      const desc = (equipo.descripcion || "").replace(/\s+/g, " ").trim();
      const key = `${cat}-${cls}-${desc}`;
      if (!grouped[key]) {
        grouped[key] = {
          categoria: cat,
          clase: cls,
          descripcion: desc,
          cantidad: 0,
          dentro: 0,
          disponible: 0,
          taller: 0,
          inactivo: 0,
          general: 0,
          segmento_renta: 0,
          segmento_disponible: 0,
          segmento_taller: 0,
          segmento_inactivo: 0,
          segmento_clase: 0,
        };
      }
      grouped[key].cantidad++;
      const estUp = (equipo.estado || "").toUpperCase();
      const enContrato = equiposEnContrato.has(equipo.id);
      const enTaller =
        equipo.estado?.toLowerCase().includes("taller") ||
        equipo.estado?.toLowerCase().includes("mantenimiento");
      const isInactivo = estUp === "INACTIVO";
      if (isInactivo) grouped[key].inactivo++;
      else if (enContrato) grouped[key].dentro++;
      else if (enTaller) grouped[key].taller++;
      else grouped[key].disponible++;
    });

    const totalPorClase: Record<string, number> = {};
    let totalGeneral = 0;
    Object.values(grouped).forEach((item) => {
      totalPorClase[item.clase] = (totalPorClase[item.clase] || 0) + item.cantidad;
      totalGeneral += item.cantidad;
    });

    const arr = Object.values(grouped).map((item) => {
      const general = totalGeneral > 0 ? (item.cantidad / totalGeneral) * 100 : 0;
      const segmento_renta = item.cantidad > 0 ? (item.dentro / item.cantidad) * 100 : 0;
      const segmento_disponible = item.cantidad > 0 ? (item.disponible / item.cantidad) * 100 : 0;
      const segmento_taller = item.cantidad > 0 ? (item.taller / item.cantidad) * 100 : 0;
      const segmento_inactivo = item.cantidad > 0 ? (item.inactivo / item.cantidad) * 100 : 0;
      const segmento_clase =
        totalPorClase[item.clase] > 0 ? (item.cantidad / totalPorClase[item.clase]) * 100 : 0;
      return {
        ...item,
        general: Math.round(general * 10) / 10,
        segmento_renta: Math.round(segmento_renta * 10) / 10,
        segmento_disponible: Math.round(segmento_disponible * 10) / 10,
        segmento_taller: Math.round(segmento_taller * 10) / 10,
        segmento_inactivo: Math.round(segmento_inactivo * 10) / 10,
        segmento_clase: Math.round(segmento_clase * 10) / 10,
      };
    });

    arr.sort((a, b) => {
      if (a.categoria !== b.categoria) return a.categoria.localeCompare(b.categoria);
      return a.clase.localeCompare(b.clase);
    });

    return arr;
  }, [filteredEquipos, equiposEnContrato]);

  // Opciones para selects
  const almacenOptions = useMemo(
    () => almacenes.map((a) => ({ value: a.id, label: a.nombre })),
    [almacenes]
  );
  const categoriaOptions = useMemo(() => {
    const set = new Set<string>();
    equiposRaw.forEach((e) => set.add(((e.categoria || "").replace(/\s+/g, " ").trim()) || "Sin categoría"));
    return Array.from(set).sort().map((v) => ({ value: v, label: v }));
  }, [equiposRaw]);
  const claseOptions = useMemo(() => {
    const set = new Set<string>();
    equiposRaw.forEach((e) => set.add(((e.clase || "").replace(/\s+/g, " ").trim()) || "Sin clase"));
    return Array.from(set).sort().map((v) => ({ value: v, label: v }));
  }, [equiposRaw]);

  // Totales para tarjetas
  const totalCantidad = reportData.reduce((sum, item) => sum + item.cantidad, 0);
  const totalTaller = reportData.reduce((sum, item) => sum + item.taller, 0);
  const totalDisponible = reportData.reduce((sum, item) => sum + item.disponible, 0);
  const totalInactivo = reportData.reduce((sum, item) => sum + item.inactivo, 0);
  const porcentajeDisponibilidad = totalCantidad > 0 ? (totalDisponible / totalCantidad) * 100 : 0;

  const isNewCategory = (index: number): boolean => {
    if (index === 0) return true;
    return reportData[index].categoria !== reportData[index - 1].categoria;
  };

  const activeFilterCount =
    (almacenFilter.length > 0 ? 1 : 0) +
    (categoriaFilter.length > 0 ? 1 : 0) +
    (claseFilter.length > 0 ? 1 : 0) +
    (searchQuery.trim() ? 1 : 0);

  const resetFilters = () => {
    setAlmacenFilter([]);
    setCategoriaFilter([]);
    setClaseFilter([]);
    setSearchQuery("");
  };

  const downloadPDF = async () => {
    const doc = new jsPDF("landscape");
    const pageWidth = doc.internal.pageSize.getWidth();

    // Logo
    const logoImg = new Image();
    logoImg.crossOrigin = "anonymous";
    await new Promise<void>((resolve) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => resolve();
      logoImg.src = "/comymaq-cotizacion-logo.png";
    });
    let titleX = 14;
    if (logoImg.complete && logoImg.naturalWidth > 0) {
      const maxW = 35;
      const maxH = 18;
      const ar = logoImg.naturalWidth / logoImg.naturalHeight;
      let w = maxW;
      let h = w / ar;
      if (h > maxH) { h = maxH; w = h * ar; }
      doc.addImage(logoImg, "PNG", 10, 8, w, h);
      titleX = 10 + w + 6;
    }

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Reporte de Inventario de Equipos", titleX, 15);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text("Disponibilidad y Taller", titleX, 21);

    // Resumen de filtros
    const filtros: string[] = [];
    if (almacenFilter.length > 0) {
      const labels = almacenFilter.map(
        (v) => almacenes.find((a) => a.id === v)?.nombre || v
      );
      filtros.push(`Bodega: ${labels.join(", ")}`);
    }
    if (categoriaFilter.length > 0) filtros.push(`Categoría: ${categoriaFilter.join(", ")}`);
    if (claseFilter.length > 0) filtros.push(`Clase: ${claseFilter.join(", ")}`);
    if (searchQuery.trim()) filtros.push(`Búsqueda: "${searchQuery.trim()}"`);

    doc.setFontSize(9);
    doc.setTextColor(80);
    const filtrosTexto = filtros.length
      ? `Filtros: ${filtros.join("  |  ")}`
      : "Filtros: Ninguno";
    doc.text(filtrosTexto, 14, 30);
    doc.setTextColor(0);

    // Resumen
    doc.setFontSize(10);
    doc.text(`Total: ${totalCantidad}`, 14, 37);
    doc.text(`Taller: ${totalTaller}`, 60, 37);
    doc.text(`Disponibles: ${totalDisponible}`, 100, 37);
    doc.text(`Inactivos: ${totalInactivo}`, 150, 37);
    doc.text(`Disponibilidad General: ${porcentajeDisponibilidad.toFixed(1)}%`, 200, 37);

    const tableData = reportData.map((row) => [
      row.categoria,
      row.clase,
      row.descripcion,
      row.cantidad.toString(),
      row.dentro.toString(),
      row.disponible.toString(),
      row.taller.toString(),
      row.inactivo.toString(),
      `${row.general}%`,
      `${row.segmento_renta}%`,
      `${row.segmento_disponible}%`,
      `${row.segmento_taller}%`,
      `${row.segmento_inactivo}%`,
      `${row.segmento_clase}%`,
    ]);

    autoTable(doc, {
      head: [["Cat", "Clase", "Descripción", "Cant", "Dentro", "Disp", "Taller", "Inact", "General", "S.Renta", "S.Disp", "S.Taller", "S.Inact", "S.Clase"]],
      body: tableData,
      startY: 42,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], fontStyle: "bold" },
      columnStyles: {
        0: { cellWidth: 14 },
        1: { cellWidth: 14 },
        2: { cellWidth: 42 },
        3: { cellWidth: 12, halign: "right" },
        4: { cellWidth: 14, halign: "right" },
        5: { cellWidth: 14, halign: "right", textColor: [22, 163, 74] },
        6: { cellWidth: 14, halign: "right", textColor: [220, 38, 38] },
        7: { cellWidth: 14, halign: "right", textColor: [100, 116, 139] },
        8: { cellWidth: 16, halign: "right" },
        9: { cellWidth: 16, halign: "right" },
        10: { cellWidth: 16, halign: "right" },
        11: { cellWidth: 16, halign: "right" },
        12: { cellWidth: 16, halign: "right" },
        13: { cellWidth: 16, halign: "right" },
      },
      didParseCell: (data: any) => {
        const rowIndex = data.row.index;
        if (rowIndex > 0 && reportData[rowIndex]) {
          if (isNewCategory(rowIndex)) {
            data.cell.styles.fillColor = [243, 244, 246];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    const fecha = new Date().toISOString().split("T")[0];
    doc.save(`reporte-inventario-${fecha}.pdf`);

    toast({ title: "PDF Generado", description: "El reporte se ha descargado correctamente" });
  };

  if (loading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando reporte...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileBarChart className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Reporte de Inventario de Equipos</h1>
            <p className="text-muted-foreground">Disponibilidad y Taller</p>
          </div>
        </div>
        <Button onClick={downloadPDF} variant="default">
          <Download className="mr-2 h-4 w-4" />
          Descargar PDF
        </Button>
      </div>

      {/* Tarjetas de Resumen */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Equipos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCantidad}</div>
            <p className="text-xs text-muted-foreground">Cantidad total filtrada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total en Taller</CardTitle>
            <Wrench className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totalTaller}</div>
            <p className="text-xs text-muted-foreground">Equipos en mantenimiento</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponibilidad General</CardTitle>
            <TrendingUp className={`h-4 w-4 ${porcentajeDisponibilidad > 80 ? "text-green-600" : "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${porcentajeDisponibilidad > 80 ? "text-green-600" : ""}`}>
              {porcentajeDisponibilidad.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">{totalDisponible} equipos disponibles</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Filtros</CardTitle>
              <CardDescription>
                Los filtros se aplican tanto a la tabla como al PDF.
                {activeFilterCount > 0 && ` ${activeFilterCount} filtro(s) activo(s).`}
              </CardDescription>
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={resetFilters}>
                <X className="mr-1 h-4 w-4" /> Limpiar
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>Búsqueda</Label>
              <Input
                placeholder="Categoría, clase o descripción..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Bodega</Label>
              <MultiSelectFilter
                options={almacenOptions}
                selected={almacenFilter}
                onChange={setAlmacenFilter}
                placeholder="Todas las bodegas"
                searchPlaceholder="Buscar bodega..."
              />
            </div>
            <div className="space-y-2">
              <Label>Categoría</Label>
              <MultiSelectFilter
                options={categoriaOptions}
                selected={categoriaFilter}
                onChange={setCategoriaFilter}
                placeholder="Todas las categorías"
              />
            </div>
            <div className="space-y-2">
              <Label>Clase</Label>
              <MultiSelectFilter
                options={claseOptions}
                selected={claseFilter}
                onChange={setClaseFilter}
                placeholder="Todas las clases"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Datos */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Inventario</CardTitle>
          <CardDescription>{reportData.length} registros</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[5%]">Categoría</TableHead>
                  <TableHead className="w-[5%]">Clase</TableHead>
                  <TableHead className="w-[20%]">Descripción</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead className="text-right">Dentro</TableHead>
                  <TableHead className="text-right">Disponible</TableHead>
                  <TableHead className="text-right">Taller</TableHead>
                  <TableHead className="text-right">Inactivo</TableHead>
                  <TableHead className="w-[12%]">General</TableHead>
                  <TableHead className="text-right">Seg. Renta</TableHead>
                  <TableHead className="text-right">Seg. Disponible</TableHead>
                  <TableHead className="text-right">Seg. Taller</TableHead>
                  <TableHead className="text-right">Seg. Inactivo</TableHead>
                  <TableHead className="text-right">Seg. Clase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground">
                      No hay datos disponibles
                    </TableCell>
                  </TableRow>
                ) : (
                  reportData.map((row, index) => (
                    <TableRow
                      key={`${row.categoria}-${row.clase}-${row.descripcion}`}
                      className={isNewCategory(index) ? "bg-muted/50 border-l-4 border-l-primary" : ""}
                    >
                      <TableCell className="font-medium">{row.categoria}</TableCell>
                      <TableCell>{row.clase}</TableCell>
                      <TableCell>{row.descripcion}</TableCell>
                      <TableCell className="text-right font-medium">{row.cantidad}</TableCell>
                      <TableCell className="text-right">{row.dentro}</TableCell>
                      <TableCell className="text-right text-green-600 font-semibold">{row.disponible}</TableCell>
                      <TableCell className="text-right text-destructive font-semibold">{row.taller}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span>{row.general}%</span>
                          </div>
                          <Progress value={row.general} className="h-2" />
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-xs">{row.segmento_renta}%</TableCell>
                      <TableCell className="text-right text-xs text-green-600 font-medium">{row.segmento_disponible}%</TableCell>
                      <TableCell className="text-right text-xs text-destructive font-medium">{row.segmento_taller}%</TableCell>
                      <TableCell className="text-right text-xs">{row.segmento_clase}%</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
