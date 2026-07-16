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
import { Phone, MessageSquare, Mail, MapPin, Clock, AlertTriangle, Plus, RefreshCw } from 'lucide-react';

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
  const { user } = useAuth();
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
    const grouped: Record<string, Seguimiento[]> = {};
    (segs || []).forEach((s: any) => {
      grouped[s.cotizacion_id] = grouped[s.cotizacion_id] || [];
      grouped[s.cotizacion_id].push(s);
    });
    setCotizaciones((cots || []) as Cot[]);
    setSeguimientos(grouped);
    setLoading(false);
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
        <TabsList>
          <TabsTrigger value="vencidas">Vencidas ({vencidas.length})</TabsTrigger>
          <TabsTrigger value="nuevas">Nuevas ({nuevas.length})</TabsTrigger>
          <TabsTrigger value="seguimiento">En seguimiento ({enSeguimiento.length})</TabsTrigger>
          <TabsTrigger value="todas">Todas ({cotizaciones.length})</TabsTrigger>
        </TabsList>
        <TabsContent value="vencidas"><Card><CardContent className="pt-4">{renderCotList(vencidas)}</CardContent></Card></TabsContent>
        <TabsContent value="nuevas"><Card><CardContent className="pt-4">{renderCotList(nuevas)}</CardContent></Card></TabsContent>
        <TabsContent value="seguimiento"><Card><CardContent className="pt-4">{renderCotList(enSeguimiento)}</CardContent></Card></TabsContent>
        <TabsContent value="todas"><Card><CardContent className="pt-4">{renderCotList(cotizaciones)}</CardContent></Card></TabsContent>
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
