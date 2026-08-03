import React, { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatMty, nowMty, diffDaysMty } from "@/lib/timezone";
import { Download, TrendingUp, Target, AlertTriangle, FileText, RefreshCw } from "lucide-react";
import * as XLSX from "xlsx";

type Cot = {
  id: string;
  folio_cotizacion: string | null;
  cliente_nombre: string;
  vendedor: string | null;
  status: string | null;
  total_con_iva: number | null;
  created_at: string;
  status_changed_at: string | null;
  motivo_rechazo: string | null;
  ultimo_acercamiento_fecha: string | null;
};

type Contrato = {
  id: string;
  numero_contrato: string | null;
  folio_contrato: string;
  cliente: string;
  vendedor: string | null;
  suma: number | null;
  fecha_vencimiento: string | null;
  status: string | null;
  motivo_baja: string | null;
  contrato_firmado?: boolean | null;
  orden_compra?: boolean | null;
};

const money = (n: number) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n || 0);

export default function Supervision() {
  const [cotizaciones, setCotizaciones] = useState<Cot[]>([]);
  const [contratos, setContratos] = useState<Contrato[]>([]);
  const [periodo, setPeriodo] = useState("30");
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [cots, cons] = await Promise.all([
        supabase
          .from("cotizaciones")
          .select("id, folio_cotizacion, cliente_nombre, vendedor, status, total_con_iva, created_at, status_changed_at, motivo_rechazo, ultimo_acercamiento_fecha")
          .order("created_at", { ascending: false }),
        supabase
          .from("contratos")
          .select("id, numero_contrato, folio_contrato, cliente, vendedor, suma, fecha_vencimiento, status, motivo_baja"),
      ]);
      if (cots.error) throw cots.error;
      if (cons.error) throw cons.error;
      setCotizaciones((cots.data || []) as Cot[]);
      setContratos((cons.data || []) as Contrato[]);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "No se pudieron cargar los indicadores" });
    } finally {
      setLoading(false);
    }
  };

  const cotsPeriodo = useMemo(() => {
    if (periodo === "todos") return cotizaciones;
    const dias = Number(periodo);
    return cotizaciones.filter((c) => diffDaysMty(nowMty(), c.created_at) <= dias);
  }, [cotizaciones, periodo]);

  const kpis = useMemo(() => {
    const total = cotsPeriodo.length;
    const aceptadas = cotsPeriodo.filter((c) => c.status === "aceptada").length;
    const rechazadas = cotsPeriodo.filter((c) => c.status === "rechazada").length;
    const pendientes = total - aceptadas - rechazadas;
    const montoAceptado = cotsPeriodo
      .filter((c) => c.status === "aceptada")
      .reduce((s, c) => s + (c.total_con_iva || 0), 0);
    const conversion = total > 0 ? Math.round((aceptadas / total) * 100) : 0;
    const sinSeguimiento = cotsPeriodo.filter(
      (c) => c.status !== "aceptada" && c.status !== "rechazada" &&
        (!c.ultimo_acercamiento_fecha || diffDaysMty(nowMty(), c.ultimo_acercamiento_fecha) > 3)
    ).length;
    return { total, aceptadas, rechazadas, pendientes, montoAceptado, conversion, sinSeguimiento };
  }, [cotsPeriodo]);

  const porVendedor = useMemo(() => {
    const map: Record<string, { vendedor: string; cotizaciones: number; aceptadas: number; rechazadas: number; monto: number; sinSeguimiento: number }> = {};
    cotsPeriodo.forEach((c) => {
      const v = (c.vendedor || "Sin asignar").trim();
      if (!map[v]) map[v] = { vendedor: v, cotizaciones: 0, aceptadas: 0, rechazadas: 0, monto: 0, sinSeguimiento: 0 };
      map[v].cotizaciones++;
      if (c.status === "aceptada") {
        map[v].aceptadas++;
        map[v].monto += c.total_con_iva || 0;
      }
      if (c.status === "rechazada") map[v].rechazadas++;
      if (
        c.status !== "aceptada" && c.status !== "rechazada" &&
        (!c.ultimo_acercamiento_fecha || diffDaysMty(nowMty(), c.ultimo_acercamiento_fecha) > 3)
      ) map[v].sinSeguimiento++;
    });
    return Object.values(map).sort((a, b) => b.monto - a.monto);
  }, [cotsPeriodo]);

  const motivosRechazo = useMemo(() => {
    const map: Record<string, number> = {};
    cotsPeriodo
      .filter((c) => c.status === "rechazada")
      .forEach((c) => {
        const m = (c.motivo_rechazo || "Sin motivo registrado").trim();
        map[m] = (map[m] || 0) + 1;
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [cotsPeriodo]);

  const contratosKpis = useMemo(() => {
    let activos = 0, porVencer = 0, vencidos = 0, monto = 0;
    contratos.forEach((c) => {
      if (c.motivo_baja || c.status === "cancelado") return;
      const d = c.fecha_vencimiento ? diffDaysMty(c.fecha_vencimiento, nowMty()) : null;
      if (d === null) { activos++; monto += c.suma || 0; return; }
      if (d < 0) vencidos++;
      else {
        activos++;
        monto += c.suma || 0;
        if (d <= 7) porVencer++;
      }
    });
    return { activos, porVencer, vencidos, monto };
  }, [contratos]);

  const exportar = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(
        porVendedor.map((v) => ({
          Vendedor: v.vendedor,
          Cotizaciones: v.cotizaciones,
          Aceptadas: v.aceptadas,
          Rechazadas: v.rechazadas,
          "Conversión %": v.cotizaciones ? Math.round((v.aceptadas / v.cotizaciones) * 100) : 0,
          "Monto ganado": v.monto,
          "Sin seguimiento": v.sinSeguimiento,
        }))
      ),
      "Vendedores"
    );
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(motivosRechazo.map(([motivo, veces]) => ({ Motivo: motivo, Veces: veces }))),
      "Motivos rechazo"
    );
    XLSX.writeFile(wb, `Supervision_COMYMAQ_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const kpiCards = [
    { label: "Cotizaciones", value: kpis.total, icon: FileText, hint: "en el periodo" },
    { label: "Tasa de conversión", value: `${kpis.conversion}%`, icon: Target, hint: `${kpis.aceptadas} aceptadas` },
    { label: "Monto ganado", value: money(kpis.montoAceptado), icon: TrendingUp, hint: "cotizaciones aceptadas" },
    { label: "Sin seguimiento", value: kpis.sinSeguimiento, icon: AlertTriangle, hint: "más de 3 días sin contacto" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Panel de Supervisión</h1>
          <p className="text-muted-foreground">Indicadores comerciales y de control de rentas</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={periodo} onValueChange={setPeriodo}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
              <SelectItem value="todos">Histórico</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={fetchAll} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Actualizar
          </Button>
          <Button onClick={exportar} className="gap-2">
            <Download className="h-4 w-4" /> Exportar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {kpiCards.map((k) => (
          <Card key={k.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{k.label}</CardTitle>
              <k.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? "…" : k.value}</div>
              <p className="text-xs text-muted-foreground">{k.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Contratos activos</p>
            <p className="text-2xl font-bold">{contratosKpis.activos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Por vencer (7 días)</p>
            <p className="text-2xl font-bold text-amber-600">{contratosKpis.porVencer}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Vencidos sin cerrar</p>
            <p className="text-2xl font-bold text-destructive">{contratosKpis.vencidos}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Monto en renta activa</p>
            <p className="text-2xl font-bold">{money(contratosKpis.monto)}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Desempeño por vendedor</CardTitle>
          <CardDescription>Cotizaciones generadas, cierre y seguimiento pendiente</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendedor</TableHead>
                  <TableHead>Cotizaciones</TableHead>
                  <TableHead>Aceptadas</TableHead>
                  <TableHead>Rechazadas</TableHead>
                  <TableHead>Conversión</TableHead>
                  <TableHead>Monto ganado</TableHead>
                  <TableHead>Sin seguimiento</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {porVendedor.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Sin cotizaciones en el periodo
                    </TableCell>
                  </TableRow>
                ) : (
                  porVendedor.map((v) => {
                    const conv = v.cotizaciones ? Math.round((v.aceptadas / v.cotizaciones) * 100) : 0;
                    return (
                      <TableRow key={v.vendedor}>
                        <TableCell className="font-medium">{v.vendedor}</TableCell>
                        <TableCell>{v.cotizaciones}</TableCell>
                        <TableCell>{v.aceptadas}</TableCell>
                        <TableCell>{v.rechazadas}</TableCell>
                        <TableCell>
                          <Badge
                            className={
                              conv >= 40
                                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                : conv >= 20
                                ? "bg-amber-500 hover:bg-amber-600 text-white"
                                : "bg-destructive/90 text-destructive-foreground"
                            }
                          >
                            {conv}%
                          </Badge>
                        </TableCell>
                        <TableCell>{money(v.monto)}</TableCell>
                        <TableCell>
                          {v.sinSeguimiento > 0 ? (
                            <Badge variant="destructive">{v.sinSeguimiento}</Badge>
                          ) : (
                            <Badge variant="outline">0</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Motivos de rechazo</CardTitle>
            <CardDescription>Por qué se pierden las cotizaciones</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {motivosRechazo.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sin rechazos registrados en el periodo</p>
            ) : (
              motivosRechazo.map(([motivo, veces]) => {
                const pct = Math.round((veces / Math.max(1, kpis.rechazadas)) * 100);
                return (
                  <div key={motivo} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="truncate pr-2">{motivo}</span>
                      <span className="text-muted-foreground shrink-0">{veces} ({pct}%)</span>
                    </div>
                    <div className="h-2 w-full rounded bg-muted">
                      <div className="h-2 rounded bg-primary" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cotizaciones sin seguimiento</CardTitle>
            <CardDescription>Más de 3 días sin acercamiento registrado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border overflow-auto max-h-[360px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Vendedor</TableHead>
                    <TableHead>Último contacto</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cotsPeriodo
                    .filter(
                      (c) =>
                        c.status !== "aceptada" && c.status !== "rechazada" &&
                        (!c.ultimo_acercamiento_fecha || diffDaysMty(nowMty(), c.ultimo_acercamiento_fecha) > 3)
                    )
                    .slice(0, 50)
                    .map((c) => (
                      <TableRow key={c.id}>
                        <TableCell className="font-medium">{c.folio_cotizacion || "—"}</TableCell>
                        <TableCell>{c.cliente_nombre}</TableCell>
                        <TableCell>{c.vendedor || "Sin asignar"}</TableCell>
                        <TableCell>
                          {c.ultimo_acercamiento_fecha ? (
                            <Badge variant="destructive">
                              hace {diffDaysMty(nowMty(), c.ultimo_acercamiento_fecha)} días
                            </Badge>
                          ) : (
                            <Badge variant="outline">Nunca</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  {kpis.sinSeguimiento === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        Todo con seguimiento al día
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
