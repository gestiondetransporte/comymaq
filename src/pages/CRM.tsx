import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Phone, MessageSquare, Mail, MapPin, Clock, AlertTriangle, Plus, RefreshCw, Bell, Send, Check } from 'lucide-react';

type Cot = {
  id: string;
  folio_cotizacion: string | null;
  cliente_nombre: string;
  equipo_descripcion: string;
  equipo_modelo: string | null;
  total_con_iva: number;
  status: string | null;
  created_at: string;
  atencion: string | null;
  telefono: string | null;
  correo: string | null;
  vendedor: string | null;
  ultimo_acercamiento_fecha: string | null;
  ultimo_acercamiento_nota: string | null;
  motivo_rechazo: string | null;
};

type Seguimiento = {
  id: string;
  cotizacion_id: string;
  tipo_contacto: string;
  notas: string | null;
  resultado: string | null;
  proxima_accion: string | null;
  proxima_accion_fecha: string | null;
  usuario_email: string | null;
  created_at: string;
};

type Recordatorio = {
  id: string;
  cotizacion_id: string;
  motivo: string;
  destinatario_tipo: string;
  destinatario_nombre: string | null;
  destinatario_email: string | null;
  destinatario_telefono: string | null;
  canal: string;
  asunto: string | null;
  mensaje: string | null;
  estado: string;
  enviado_at: string | null;
  created_at: string;
};

type RecordatoriosConfig = {
  id: string;
  activo: boolean;
  dias_sin_contacto: number;
  dias_anticipacion_accion: number;
  notificar_vendedor: boolean;
  notificar_cliente: boolean;
};

const soloDigitos = (t: string | null) => (t || '').replace(/\D/g, '');

const waLink = (tel: string | null, msg: string | null) => {
  const d = soloDigitos(tel);
  const num = d.length === 10 ? `52${d}` : d;
  return `https://wa.me/${num}?text=${encodeURIComponent(msg || '')}`;
};

const motivoLabel = (m: string) =>
  m === 'sin_contacto' ? 'Sin contacto' : m === 'proxima_accion' ? 'Próxima acción' : m;


const TIPOS = ['llamada', 'whatsapp', 'correo', 'visita', 'otro'] as const;

const iconoTipo = (t: string) => {
  switch (t) {
    case 'llamada': return <Phone className="h-3.5 w-3.5" />;
    case 'whatsapp': return <MessageSquare className="h-3.5 w-3.5" />;
    case 'correo': return <Mail className="h-3.5 w-3.5" />;
    case 'visita': return <MapPin className="h-3.5 w-3.5" />;
    default: return <Clock className="h-3.5 w-3.5" />;
  }
};

const diasDesde = (iso: string | null) => {
  if (!iso) return null;
  const ms = Date.now() - new Date(iso).getTime();
  return Math.floor(ms / 86400000);
};

export default function CRM() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cotizaciones, setCotizaciones] = useState<Cot[]>([]);
  const [seguimientos, setSeguimientos] = useState<Record<string, Seguimiento[]>>({});
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selected, setSelected] = useState<Cot | null>(null);
  const [tipo, setTipo] = useState<typeof TIPOS[number]>('llamada');
  const [notas, setNotas] = useState('');
  const [resultado, setResultado] = useState('');
  const [proxAccion, setProxAccion] = useState('');
  const [proxFecha, setProxFecha] = useState('');
  const [saving, setSaving] = useState(false);
  const [recordatorios, setRecordatorios] = useState<Recordatorio[]>([]);
  const [config, setConfig] = useState<RecordatoriosConfig | null>(null);
  const [generando, setGenerando] = useState(false);

  const fetchAll = async () => {
    setLoading(true);
    const { data: cots } = await supabase
      .from('cotizaciones')
      .select('id, folio_cotizacion, cliente_nombre, equipo_descripcion, equipo_modelo, total_con_iva, status, created_at, atencion, telefono, correo, vendedor, ultimo_acercamiento_fecha, ultimo_acercamiento_nota, motivo_rechazo')
      .in('status', ['pendiente'])
      .order('created_at', { ascending: false })
      .limit(200);
    const { data: segs } = await supabase
      .from('crm_seguimientos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(500);
    const { data: recs } = await supabase
      .from('crm_recordatorios')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(300);
    const { data: cfg } = await supabase
      .from('crm_recordatorios_config')
      .select('*')
      .limit(1)
      .maybeSingle();
    const grouped: Record<string, Seguimiento[]> = {};
    (segs || []).forEach((s: any) => {
      grouped[s.cotizacion_id] = grouped[s.cotizacion_id] || [];
      grouped[s.cotizacion_id].push(s);
    });
    setCotizaciones((cots || []) as Cot[]);
    setSeguimientos(grouped);
    setRecordatorios((recs || []) as Recordatorio[]);
    setConfig((cfg || null) as RecordatoriosConfig | null);
    setLoading(false);
  };

  const generarRecordatorios = async () => {
    setGenerando(true);
    const { data, error } = await supabase.functions.invoke('crm-recordatorios', { body: {} });
    setGenerando(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      return;
    }
    toast({ title: 'Recordatorios actualizados', description: `${(data as any)?.creados ?? 0} nuevos recordatorios.` });
    fetchAll();
  };

  const marcarEnviado = async (r: Recordatorio) => {
    const { error } = await supabase
      .from('crm_recordatorios')
      .update({ estado: 'enviado', enviado_at: new Date().toISOString() })
      .eq('id', r.id);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      return;
    }
    setRecordatorios(prev => prev.map(x => (x.id === r.id ? { ...x, estado: 'enviado', enviado_at: new Date().toISOString() } : x)));
  };

  const updateConfig = async (patch: Partial<RecordatoriosConfig>) => {
    if (!config) return;
    const next = { ...config, ...patch };
    setConfig(next);
    const { error } = await supabase.from('crm_recordatorios_config').update(patch).eq('id', config.id);
    if (error) toast({ variant: 'destructive', title: 'Error', description: error.message });
  };

  useEffect(() => { fetchAll(); }, []);



  const openDialog = (c: Cot) => {
    setSelected(c);
    setTipo('llamada');
    setNotas('');
    setResultado('');
    setProxAccion('');
    setProxFecha('');
    setDialogOpen(true);
  };

  const saveSeguimiento = async () => {
    if (!selected || !user) return;
    setSaving(true);
    const { error } = await supabase.from('crm_seguimientos').insert({
      cotizacion_id: selected.id,
      tipo_contacto: tipo,
      notas: notas || null,
      resultado: resultado || null,
      proxima_accion: proxAccion || null,
      proxima_accion_fecha: proxFecha || null,
      usuario_id: user.id,
      usuario_email: user.email,
    });
    setSaving(false);
    if (error) {
      toast({ variant: 'destructive', title: 'Error', description: error.message });
      return;
    }
    toast({ title: 'Seguimiento registrado' });
    setDialogOpen(false);
    fetchAll();
  };

  const clasificar = (c: Cot): 'nueva' | 'seguimiento' | 'vencida' => {
    const dCreada = diasDesde(c.created_at) ?? 0;
    const dContacto = diasDesde(c.ultimo_acercamiento_fecha);
    if (dContacto === null && dCreada >= 3) return 'vencida';
    if (dContacto !== null && dContacto >= 7) return 'vencida';
    if (dContacto === null) return 'nueva';
    return 'seguimiento';
  };

  const badgeSemaforo = (c: Cot) => {
    const cat = clasificar(c);
    if (cat === 'vencida') return <Badge className="bg-red-600 hover:bg-red-700">Vencida</Badge>;
    if (cat === 'nueva') return <Badge className="bg-blue-600 hover:bg-blue-700">Nueva</Badge>;
    return <Badge className="bg-green-600 hover:bg-green-700">En seguimiento</Badge>;
  };

  const vencidas = cotizaciones.filter(c => clasificar(c) === 'vencida');
  const nuevas = cotizaciones.filter(c => clasificar(c) === 'nueva');
  const enSeguimiento = cotizaciones.filter(c => clasificar(c) === 'seguimiento');

  const renderCotList = (list: Cot[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Folio</TableHead>
          <TableHead>Cliente / Contacto</TableHead>
          <TableHead>Equipo</TableHead>
          <TableHead>Total</TableHead>
          <TableHead>Estatus CRM</TableHead>
          <TableHead>Último acercamiento</TableHead>
          <TableHead className="text-right">Acción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {list.map(c => {
          const d = diasDesde(c.ultimo_acercamiento_fecha);
          const historial = seguimientos[c.id] || [];
          return (
            <TableRow key={c.id}>
              <TableCell className="font-mono text-xs">{c.folio_cotizacion || '—'}</TableCell>
              <TableCell>
                <div className="font-medium">{c.cliente_nombre}</div>
                <div className="text-xs text-muted-foreground">
                  {c.atencion || '—'} {c.telefono ? `· ${c.telefono}` : ''}
                </div>
              </TableCell>
              <TableCell className="max-w-[200px] truncate" title={c.equipo_descripcion}>
                {c.equipo_modelo && <Badge variant="outline" className="mr-1">{c.equipo_modelo}</Badge>}
                {c.equipo_descripcion}
              </TableCell>
              <TableCell>${c.total_con_iva?.toLocaleString('es-MX')}</TableCell>
              <TableCell>{badgeSemaforo(c)}</TableCell>
              <TableCell className="text-xs">
                {c.ultimo_acercamiento_fecha ? (
                  <>
                    <div>Hace {d} d</div>
                    <div className="text-muted-foreground truncate max-w-[180px]" title={c.ultimo_acercamiento_nota || ''}>
                      {c.ultimo_acercamiento_nota}
                    </div>
                    {historial.length > 0 && (
                      <div className="flex gap-1 mt-1">
                        {historial.slice(0, 4).map(h => (
                          <span key={h.id} title={`${h.tipo_contacto} · ${new Date(h.created_at).toLocaleDateString()}`}>
                            {iconoTipo(h.tipo_contacto)}
                          </span>
                        ))}
                        {historial.length > 4 && <span className="text-muted-foreground">+{historial.length - 4}</span>}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-muted-foreground">Sin contacto</span>
                )}
              </TableCell>
              <TableCell className="text-right">
                <Button size="sm" onClick={() => openDialog(c)}>
                  <Plus className="h-4 w-4 mr-1" /> Registrar
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
        {list.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
              Sin cotizaciones en este grupo
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 py-4">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary">CRM de Seguimiento</h1>
          <p className="text-muted-foreground text-sm">
            Cotizaciones pendientes con semáforo por antigüedad y registro de acercamientos.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchAll} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} /> Actualizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border-l-4 border-l-red-600">
          <CardHeader className="pb-2">
            <CardDescription>Vencidas</CardDescription>
            <CardTitle className="text-3xl flex items-center gap-2">
              {vencidas.length}
              {vencidas.length > 0 && <AlertTriangle className="h-5 w-5 text-red-600" />}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Sin contacto {'>'} 7 días o {'>'} 3 días sin registro.
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-600">
          <CardHeader className="pb-2">
            <CardDescription>Nuevas sin contactar</CardDescription>
            <CardTitle className="text-3xl">{nuevas.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Cotizaciones recientes sin seguimiento.
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-green-600">
          <CardHeader className="pb-2">
            <CardDescription>En seguimiento</CardDescription>
            <CardTitle className="text-3xl">{enSeguimiento.length}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Contactadas en los últimos 7 días.
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vencidas">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="vencidas">Vencidas ({vencidas.length})</TabsTrigger>
          <TabsTrigger value="nuevas">Nuevas ({nuevas.length})</TabsTrigger>
          <TabsTrigger value="seguimiento">En seguimiento ({enSeguimiento.length})</TabsTrigger>
          <TabsTrigger value="todas">Todas ({cotizaciones.length})</TabsTrigger>
          <TabsTrigger value="recordatorios">
            <Bell className="h-3.5 w-3.5 mr-1" /> Recordatorios ({recordatoriosPendientes.length})
          </TabsTrigger>
        </TabsList>
        <TabsContent value="vencidas"><Card><CardContent className="pt-4">{renderCotList(vencidas)}</CardContent></Card></TabsContent>
        <TabsContent value="nuevas"><Card><CardContent className="pt-4">{renderCotList(nuevas)}</CardContent></Card></TabsContent>
        <TabsContent value="seguimiento"><Card><CardContent className="pt-4">{renderCotList(enSeguimiento)}</CardContent></Card></TabsContent>
        <TabsContent value="todas"><Card><CardContent className="pt-4">{renderCotList(cotizaciones)}</CardContent></Card></TabsContent>
        <TabsContent value="recordatorios" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><Bell className="h-4 w-4" /> Configuración de recordatorios</CardTitle>
              <CardDescription>
                Se revisan automáticamente cada día a las 9:00 (hora de Monterrey) las cotizaciones pendientes.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center justify-between gap-2 rounded-md border p-3">
                <Label className="text-sm">Recordatorios activos</Label>
                <Switch
                  checked={!!config?.activo}
                  disabled={!isAdmin || !config}
                  onCheckedChange={(v) => updateConfig({ activo: v })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Días sin contacto</Label>
                <Input
                  type="number"
                  min={1}
                  disabled={!isAdmin || !config}
                  value={config?.dias_sin_contacto ?? 5}
                  onChange={(e) => updateConfig({ dias_sin_contacto: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Días de anticipación (próxima acción)</Label>
                <Input
                  type="number"
                  min={1}
                  disabled={!isAdmin || !config}
                  value={config?.dias_anticipacion_accion ?? 5}
                  onChange={(e) => updateConfig({ dias_anticipacion_accion: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Avisar al vendedor</Label>
                  <Switch
                    checked={!!config?.notificar_vendedor}
                    disabled={!isAdmin || !config}
                    onCheckedChange={(v) => updateConfig({ notificar_vendedor: v })}
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Label className="text-xs">Avisar al cliente</Label>
                  <Switch
                    checked={!!config?.notificar_cliente}
                    disabled={!isAdmin || !config}
                    onCheckedChange={(v) => updateConfig({ notificar_cliente: v })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex-row items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle className="text-base">Recordatorios pendientes</CardTitle>
                <CardDescription>Envía el mensaje por WhatsApp o correo y márcalo como enviado.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={generarRecordatorios} disabled={generando}>
                <RefreshCw className={`h-4 w-4 mr-2 ${generando ? 'animate-spin' : ''}`} /> Revisar ahora
              </Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cotización</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Destinatario</TableHead>
                    <TableHead>Canal</TableHead>
                    <TableHead className="max-w-[280px]">Mensaje</TableHead>
                    <TableHead className="text-right">Acción</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recordatoriosPendientes.map(r => {
                    const c = cotizaciones.find(x => x.id === r.cotizacion_id);
                    return (
                      <TableRow key={r.id}>
                        <TableCell className="font-mono text-xs">
                          {c?.folio_cotizacion || '—'}
                          <div className="text-muted-foreground">{c?.cliente_nombre}</div>
                        </TableCell>
                        <TableCell><Badge variant="outline">{motivoLabel(r.motivo)}</Badge></TableCell>
                        <TableCell>
                          <div className="text-sm">{r.destinatario_nombre || '—'}</div>
                          <div className="text-xs text-muted-foreground capitalize">{r.destinatario_tipo}</div>
                        </TableCell>
                        <TableCell className="capitalize">
                          <span className="inline-flex items-center gap-1 text-xs">
                            {r.canal === 'whatsapp' ? <MessageSquare className="h-3.5 w-3.5" /> : <Mail className="h-3.5 w-3.5" />}
                            {r.canal}
                          </span>
                        </TableCell>
                        <TableCell className="max-w-[280px] text-xs text-muted-foreground truncate" title={r.mensaje || ''}>
                          {r.mensaje}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {r.canal === 'whatsapp' ? (
                            <Button size="sm" variant="outline" asChild>
                              <a href={waLink(r.destinatario_telefono, r.mensaje)} target="_blank" rel="noreferrer">
                                <Send className="h-4 w-4 mr-1" /> WhatsApp
                              </a>
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" asChild>
                              <a href={`mailto:${r.destinatario_email}?subject=${encodeURIComponent(r.asunto || '')}&body=${encodeURIComponent(r.mensaje || '')}`}>
                                <Send className="h-4 w-4 mr-1" /> Correo
                              </a>
                            </Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => marcarEnviado(r)}>
                            <Check className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {recordatoriosPendientes.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No hay recordatorios pendientes
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Registrar acercamiento</DialogTitle>
            <DialogDescription>
              {selected?.cliente_nombre} · {selected?.folio_cotizacion || '—'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1">
              <Label>Tipo de contacto</Label>
              <Select value={tipo} onValueChange={(v) => setTipo(v as any)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TIPOS.map(t => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Resultado / respuesta del cliente</Label>
              <Input value={resultado} onChange={e => setResultado(e.target.value)} placeholder="Ej: interesado, pidió descuento, no contesta..." />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea rows={3} value={notas} onChange={e => setNotas(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Próxima acción</Label>
                <Input value={proxAccion} onChange={e => setProxAccion(e.target.value)} placeholder="Ej: enviar contrato" />
              </div>
              <div className="space-y-1">
                <Label>Fecha próxima acción</Label>
                <Input type="date" value={proxFecha} onChange={e => setProxFecha(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={saveSeguimiento} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
