import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FileBarChart, Package, Wrench, TrendingUp, Download } from "lucide-react";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface InventoryReport {
  categoria: string;
  clase: string;
  descripcion: string;
  cantidad: number;
  dentro: number;
  disponible: number;
  taller: number;
  general: number;
  segmento_renta: number;
  segmento_disponible: number;
  segmento_taller: number;
  segmento_clase: number;
}

export default function ReporteInventario() {
  const [reportData, setReportData] = useState<InventoryReport[]>([]);
  const [filteredData, setFilteredData] = useState<InventoryReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const { toast } = useToast();

  useEffect(() => {
    fetchReportData();
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = reportData.filter(
        (row) =>
          row.categoria?.toLowerCase().includes(query) ||
          row.clase?.toLowerCase().includes(query) ||
          row.descripcion?.toLowerCase().includes(query)
      );
      setFilteredData(filtered);
    } else {
      setFilteredData(reportData);
    }
  }, [searchQuery, reportData]);

  const fetchReportData = async () => {
    try {
      setLoading(true);

      // Obtener todos los equipos
      const { data: equipos, error: equiposError } = await supabase
        .from('equipos')
        .select('id, categoria, clase, descripcion, estado, tipo_negocio');

      if (equiposError) throw equiposError;

      // Obtener contratos activos
      const { data: contratos, error: contratosError } = await supabase
        .from('contratos')
        .select('equipo_id, status')
        .eq('status', 'activo');

      if (contratosError) throw contratosError;

      // Crear un Set de equipos en contrato activo
      const equiposEnContrato = new Set(contratos?.map((c) => c.equipo_id) || []);

      // Agrupar por categoría, clase y descripción
      const grouped: Record<string, InventoryReport> = {};

      equipos?.forEach((equipo) => {
        const key = `${equipo.categoria || 'Sin categoría'}-${equipo.clase || 'Sin clase'}-${equipo.descripcion}`;
        
        if (!grouped[key]) {
          grouped[key] = {
            categoria: equipo.categoria || 'Sin categoría',
            clase: equipo.clase || 'Sin clase',
            descripcion: equipo.descripcion,
            cantidad: 0,
            dentro: 0,
            disponible: 0,
            taller: 0,
            general: 0,
            segmento_renta: 0,
            segmento_disponible: 0,
            segmento_taller: 0,
            segmento_clase: 0,
          };
        }

        grouped[key].cantidad++;

        // Determinar estado del equipo
        const enContrato = equiposEnContrato.has(equipo.id);
        const enTaller = equipo.estado?.toLowerCase().includes('taller') || 
                         equipo.estado?.toLowerCase().includes('mantenimiento');

        if (enContrato) {
          grouped[key].dentro++;
        } else if (enTaller) {
          grouped[key].taller++;
        } else {
          grouped[key].disponible++;
        }
      });

      // Calcular totales por categoría y clase para segmentos
      const totalPorCategoria: Record<string, number> = {};
      const totalPorClase: Record<string, number> = {};

      Object.values(grouped).forEach((item) => {
        totalPorCategoria[item.categoria] = (totalPorCategoria[item.categoria] || 0) + item.cantidad;
        totalPorClase[item.clase] = (totalPorClase[item.clase] || 0) + item.cantidad;
      });

      // Calcular porcentajes
      const reportArray = Object.values(grouped).map((item) => {
        const general = item.cantidad > 0 ? ((item.dentro + item.disponible) / item.cantidad) * 100 : 0;
        const segmento_renta = item.cantidad > 0 ? (item.dentro / item.cantidad) * 100 : 0;
        const segmento_disponible = item.cantidad > 0 ? (item.disponible / item.cantidad) * 100 : 0;
        const segmento_taller = item.cantidad > 0 ? (item.taller / item.cantidad) * 100 : 0;
        const segmento_clase = totalPorClase[item.clase] > 0 ? (item.cantidad / totalPorClase[item.clase]) * 100 : 0;

        return {
          ...item,
          general: Math.round(general * 10) / 10,
          segmento_renta: Math.round(segmento_renta * 10) / 10,
          segmento_disponible: Math.round(segmento_disponible * 10) / 10,
          segmento_taller: Math.round(segmento_taller * 10) / 10,
          segmento_clase: Math.round(segmento_clase * 10) / 10,
        };
      });

      // Ordenar por categoría y clase
      reportArray.sort((a, b) => {
        if (a.categoria !== b.categoria) {
          return a.categoria.localeCompare(b.categoria);
        }
        return a.clase.localeCompare(b.clase);
      });

      setReportData(reportArray);
      setFilteredData(reportArray);
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo cargar el reporte de inventario",
      });
    } finally {
      setLoading(false);
    }
  };

  // Calcular totales para las tarjetas de resumen
  const totalCantidad = filteredData.reduce((sum, item) => sum + item.cantidad, 0);
  const totalTaller = filteredData.reduce((sum, item) => sum + item.taller, 0);
  const totalDisponible = filteredData.reduce((sum, item) => sum + item.disponible, 0);
  const porcentajeDisponibilidad = totalCantidad > 0 ? (totalDisponible / totalCantidad) * 100 : 0;

  // Función para determinar si una fila es el inicio de una nueva categoría
  const isNewCategory = (index: number): boolean => {
    if (index === 0) return true;
    return filteredData[index].categoria !== filteredData[index - 1].categoria;
  };

  // Función para descargar el reporte en PDF
  const downloadPDF = () => {
    const doc = new jsPDF('landscape');
    
    // Título
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Reporte de Inventario de Equipos', 14, 20);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Disponibilidad y Taller', 14, 28);

    // Resumen
    doc.setFontSize(10);
    doc.text(`Total de Equipos: ${totalCantidad}`, 14, 38);
    doc.text(`Total en Taller: ${totalTaller}`, 80, 38);
    doc.text(`Disponibilidad General: ${porcentajeDisponibilidad.toFixed(1)}%`, 146, 38);

    // Preparar datos de la tabla
    const tableData = filteredData.map(row => [
      row.categoria,
      row.clase,
      row.descripcion,
      row.cantidad.toString(),
      row.dentro.toString(),
      row.disponible.toString(),
      row.taller.toString(),
      `${row.general}%`,
      `${row.segmento_renta}%`,
      `${row.segmento_disponible}%`,
      `${row.segmento_taller}%`,
      `${row.segmento_clase}%`,
    ]);

    // Agregar tabla
    autoTable(doc, {
      head: [[
        'Cat',
        'Clase',
        'Descripción',
        'Cant',
        'Dentro',
        'Disp',
        'Taller',
        'General',
        'S.Renta',
        'S.Disp',
        'S.Taller',
        'S.Clase'
      ]],
      body: tableData,
      startY: 45,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [59, 130, 246], fontStyle: 'bold' },
      columnStyles: {
        0: { cellWidth: 15 },
        1: { cellWidth: 15 },
        2: { cellWidth: 50 },
        3: { cellWidth: 15, halign: 'right' },
        4: { cellWidth: 15, halign: 'right' },
        5: { cellWidth: 15, halign: 'right', textColor: [22, 163, 74] },
        6: { cellWidth: 15, halign: 'right', textColor: [220, 38, 38] },
        7: { cellWidth: 20, halign: 'right' },
        8: { cellWidth: 20, halign: 'right' },
        9: { cellWidth: 20, halign: 'right' },
        10: { cellWidth: 20, halign: 'right' },
        11: { cellWidth: 20, halign: 'right' },
      },
      didParseCell: (data: any) => {
        // Resaltar inicio de nueva categoría
        const rowIndex = data.row.index;
        if (rowIndex > 0 && filteredData[rowIndex]) {
          if (isNewCategory(rowIndex)) {
            data.cell.styles.fillColor = [243, 244, 246];
            data.cell.styles.fontStyle = 'bold';
          }
        }
      },
    });

    // Guardar PDF
    const fecha = new Date().toISOString().split('T')[0];
    doc.save(`reporte-inventario-${fecha}.pdf`);

    toast({
      title: "PDF Generado",
      description: "El reporte se ha descargado correctamente",
    });
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
            <p className="text-xs text-muted-foreground">
              Cantidad total en inventario
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total en Taller</CardTitle>
            <Wrench className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{totalTaller}</div>
            <p className="text-xs text-muted-foreground">
              Equipos en mantenimiento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disponibilidad General</CardTitle>
            <TrendingUp className={`h-4 w-4 ${porcentajeDisponibilidad > 80 ? 'text-green-600' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${porcentajeDisponibilidad > 80 ? 'text-green-600' : ''}`}>
              {porcentajeDisponibilidad.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {totalDisponible} equipos disponibles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro de búsqueda */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrar Reporte</CardTitle>
          <CardDescription>Buscar por categoría, clase o descripción</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Búsqueda</Label>
              <Input
                id="search"
                placeholder="Buscar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Datos */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Inventario</CardTitle>
          <CardDescription>
            {filteredData.length} registros {searchQuery && `(filtrados de ${reportData.length})`}
          </CardDescription>
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
                  <TableHead className="w-[12%]">General</TableHead>
                  <TableHead className="text-right">Seg. Renta</TableHead>
                  <TableHead className="text-right">Seg. Disponible</TableHead>
                  <TableHead className="text-right">Seg. Taller</TableHead>
                  <TableHead className="text-right">Seg. Clase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center text-muted-foreground">
                      No hay datos disponibles
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((row, index) => (
                    <TableRow 
                      key={`${row.categoria}-${row.clase}-${row.descripcion}`}
                      className={isNewCategory(index) ? 'bg-muted/50 border-l-4 border-l-primary' : ''}
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
                      <TableCell className="text-right text-xs text-green-600 font-medium">
                        {row.segmento_disponible}%
                      </TableCell>
                      <TableCell className="text-right text-xs text-destructive font-medium">
                        {row.segmento_taller}%
                      </TableCell>
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
