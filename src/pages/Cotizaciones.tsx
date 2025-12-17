import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { FileText, Download, Calculator, History, RefreshCw, UserPlus, Plus, CheckCircle, XCircle } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Cliente {
  id: string;
  nombre: string;
  persona_contacto: string | null;
  telefono: string | null;
  correo_electronico: string | null;
  tipo: string | null;
}

interface Equipo {
  id: string;
  numero_equipo: string;
  descripcion: string;
  modelo: string | null;
  marca: string | null;
  precio_lista: number | null;
  estado: string | null;
}

interface ModeloConfig {
  modelo: string;
  precio_lista: number | null;
  foto_url: string | null;
}

interface CotizacionHistorial {
  id: string;
  cliente_id: string | null;
  cliente_nombre: string;
  equipo_id: string | null;
  equipo_descripcion: string;
  equipo_modelo: string | null;
  dias_renta: number;
  subtotal: number;
  total_con_iva: number;
  vendedor: string | null;
  created_at: string;
  status: string | null;
  es_prospecto: boolean | null;
  contrato_id: string | null;
  atencion: string | null;
}

export default function Cotizaciones() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [modelosConfig, setModelosConfig] = useState<ModeloConfig[]>([]);
  const [historial, setHistorial] = useState<CotizacionHistorial[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  
  // Form state
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [selectedEquipoId, setSelectedEquipoId] = useState('');
  const [diasRenta, setDiasRenta] = useState('');
  const [atencion, setAtencion] = useState('');
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [vendedor, setVendedor] = useState('CARLOS OMAR SANTANA RODRIGUEZ');
  const [vendedorCorreo, setVendedorCorreo] = useState('cos.santana@live.com.mx');
  const [vendedorTelefono, setVendedorTelefono] = useState('812 390 12 59');
  
  // Prospecto form
  const [showProspectoForm, setShowProspectoForm] = useState(false);
  const [newProspecto, setNewProspecto] = useState({ nombre: '', telefono: '', correo: '', persona_contacto: '' });
  const [isProspecto, setIsProspecto] = useState(false);
  
  // Pricing
  const [precioBase, setPrecioBase] = useState<number>(0);
  const [entregaRecoleccion, setEntregaRecoleccion] = useState<number>(4000);
  const [seguroPercent, setSeguroPercent] = useState<number>(4);
  
  // Accept dialog
  const [acceptDialogOpen, setAcceptDialogOpen] = useState(false);
  const [selectedCotizacion, setSelectedCotizacion] = useState<CotizacionHistorial | null>(null);
  const [acceptLoading, setAcceptLoading] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchClientes();
    fetchEquipos();
    fetchModelosConfig();
    fetchHistorial();
  }, []);

  const fetchClientes = async () => {
    const { data, error } = await supabase
      .from('clientes')
      .select('id, nombre, persona_contacto, telefono, correo_electronico, tipo')
      .order('nombre');
    if (!error && data) setClientes(data);
  };

  const fetchEquipos = async () => {
    const { data, error } = await supabase
      .from('equipos')
      .select('id, numero_equipo, descripcion, modelo, marca, precio_lista, estado')
      .eq('estado', 'disponible')
      .order('numero_equipo');
    if (!error && data) setEquipos(data);
  };

  const fetchModelosConfig = async () => {
    const { data, error } = await supabase
      .from('modelos_configuracion')
      .select('modelo, precio_lista, foto_url');
    if (!error && data) setModelosConfig(data);
  };

  const fetchHistorial = async () => {
    setLoadingHistorial(true);
    try {
      const { data, error } = await supabase
        .from('cotizaciones')
        .select('id, cliente_id, cliente_nombre, equipo_id, equipo_descripcion, equipo_modelo, dias_renta, subtotal, total_con_iva, vendedor, created_at, status, es_prospecto, contrato_id, atencion')
        .order('created_at', { ascending: false })
        .limit(50);
      
      if (!error && data) setHistorial(data as CotizacionHistorial[]);
    } catch (error) {
      console.error('Error fetching historial:', error);
    } finally {
      setLoadingHistorial(false);
    }
  };

  const handleCreateProspecto = async () => {
    if (!newProspecto.nombre.trim()) {
      toast({ variant: "destructive", title: "Error", description: "El nombre del prospecto es requerido" });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('clientes')
        .insert({
          nombre: newProspecto.nombre,
          telefono: newProspecto.telefono || null,
          correo_electronico: newProspecto.correo || null,
          persona_contacto: newProspecto.persona_contacto || null,
          tipo: 'prospecto',
        })
        .select()
        .single();

      if (error) throw error;

      toast({ title: "Éxito", description: "Prospecto creado correctamente" });
      
      await fetchClientes();
      setSelectedClienteId(data.id);
      setAtencion(data.persona_contacto || '');
      setTelefono(data.telefono || '');
      setCorreo(data.correo_electronico || '');
      setIsProspecto(true);
      setShowProspectoForm(false);
      setNewProspecto({ nombre: '', telefono: '', correo: '', persona_contacto: '' });
    } catch (error) {
      console.error('Error creating prospecto:', error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo crear el prospecto" });
    }
  };

  const saveCotizacion = async () => {
    if (!selectedCliente || !selectedEquipo || !user) return;

    const cliente = clientes.find(c => c.id === selectedClienteId);

    try {
      const { error } = await supabase
        .from('cotizaciones')
        .insert({
          cliente_id: selectedClienteId,
          equipo_id: selectedEquipoId,
          created_by: user.id,
          cliente_nombre: selectedCliente.nombre,
          atencion,
          telefono,
          correo,
          equipo_descripcion: selectedEquipo.descripcion,
          equipo_modelo: selectedEquipo.modelo,
          equipo_marca: selectedEquipo.marca,
          dias_renta: dias,
          precio_base: precioBase,
          entrega_recoleccion: entregaRecoleccion,
          seguro_percent: seguroPercent,
          subtotal: subtotal,
          total_con_iva: subtotal * 1.16,
          vendedor,
          vendedor_correo: vendedorCorreo,
          vendedor_telefono: vendedorTelefono,
          status: 'pendiente',
          es_prospecto: cliente?.tipo === 'prospecto',
        });

      if (error) throw error;
      
      fetchHistorial();
    } catch (error: any) {
      console.error('Error saving cotizacion:', error);
    }
  };

  const handleAcceptCotizacion = async () => {
    if (!selectedCotizacion) return;

    setAcceptLoading(true);
    try {
      // 1. If it's a prospecto, convert to cliente
      if (selectedCotizacion.es_prospecto && selectedCotizacion.cliente_id) {
        await supabase
          .from('clientes')
          .update({ tipo: 'cliente' })
          .eq('id', selectedCotizacion.cliente_id);
      }

      // 2. Generate folio for new contract
      const { data: folioData } = await supabase.rpc('generate_contrato_folio');
      const folio = folioData || `CTR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`;

      // 3. Calculate hours from days (8 hours per day)
      const horasTrabajo = selectedCotizacion.dias_renta * 8;

      // 4. Create contract from cotización
      const fechaInicio = new Date().toISOString().split('T')[0];
      const fechaVencimiento = new Date(Date.now() + selectedCotizacion.dias_renta * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const { data: contratoData, error: contratoError } = await supabase
        .from('contratos')
        .insert({
          folio_contrato: folio,
          cliente: selectedCotizacion.cliente_nombre,
          comprador: selectedCotizacion.atencion || null,
          equipo_id: selectedCotizacion.equipo_id,
          suma: selectedCotizacion.total_con_iva,
          fecha_inicio: fechaInicio,
          fecha_vencimiento: fechaVencimiento,
          dias_contratado: selectedCotizacion.dias_renta,
          horas_trabajo: horasTrabajo,
          status: 'activo',
          vendedor: selectedCotizacion.vendedor,
          dentro_fuera: 'Dentro',
        })
        .select()
        .single();

      if (contratoError) throw contratoError;

      // 5. Update equipment status to 'rentado'
      if (selectedCotizacion.equipo_id) {
        await supabase
          .from('equipos')
          .update({ estado: 'rentado' })
          .eq('id', selectedCotizacion.equipo_id);
      }

      // 6. Update cotización status to 'aceptada' and link to contrato
      await supabase
        .from('cotizaciones')
        .update({ 
          status: 'aceptada',
          contrato_id: contratoData.id 
        })
        .eq('id', selectedCotizacion.id);

      toast({ 
        title: "Cotización Aceptada", 
        description: `Se creó el contrato ${folio}. El prospecto ahora es cliente y el equipo está rentado.` 
      });

      fetchHistorial();
      fetchEquipos();
      fetchClientes();
      setAcceptDialogOpen(false);
      setSelectedCotizacion(null);
    } catch (error) {
      console.error('Error accepting cotizacion:', error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo procesar la cotización" });
    } finally {
      setAcceptLoading(false);
    }
  };

  const handleRejectCotizacion = async (cotizacion: CotizacionHistorial) => {
    try {
      await supabase
        .from('cotizaciones')
        .update({ status: 'rechazada' })
        .eq('id', cotizacion.id);

      toast({ title: "Cotización rechazada" });
      fetchHistorial();
    } catch (error) {
      console.error('Error rejecting cotizacion:', error);
      toast({ variant: "destructive", title: "Error", description: "No se pudo rechazar la cotización" });
    }
  };

  const handleClienteChange = (clienteId: string) => {
    setSelectedClienteId(clienteId);
    const cliente = clientes.find(c => c.id === clienteId);
    if (cliente) {
      setAtencion(cliente.persona_contacto || '');
      setTelefono(cliente.telefono || '');
      setCorreo(cliente.correo_electronico || '');
      setIsProspecto(cliente.tipo === 'prospecto');
    }
  };

  const handleEquipoChange = (equipoId: string) => {
    setSelectedEquipoId(equipoId);
    const equipo = equipos.find(e => e.id === equipoId);
    if (equipo) {
      const modelConfig = modelosConfig.find(m => 
        m.modelo.toUpperCase() === equipo.modelo?.toUpperCase()
      );
      if (modelConfig?.precio_lista) {
        setPrecioBase(modelConfig.precio_lista);
      } else if (equipo.precio_lista) {
        setPrecioBase(equipo.precio_lista);
      } else {
        setPrecioBase(0);
      }
    }
  };

  const selectedCliente = clientes.find(c => c.id === selectedClienteId);
  const selectedEquipo = equipos.find(e => e.id === selectedEquipoId);
  const modeloConfig = selectedEquipo?.modelo 
    ? modelosConfig.find(m => m.modelo.toUpperCase() === selectedEquipo.modelo?.toUpperCase())
    : null;

  const dias = parseInt(diasRenta) || 0;
  const precioTotal = precioBase * (dias <= 7 ? 1 : dias <= 14 ? 1.5 : Math.ceil(dias / 7) * 0.8);
  const seguro = (precioTotal * seguroPercent) / 100;
  const subtotal = precioTotal + entregaRecoleccion + seguro;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', { 
      style: 'currency', 
      currency: 'MXN',
      minimumFractionDigits: 2 
    }).format(value);
  };

  const formatDate = () => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    };
    return new Date().toLocaleDateString('es-MX', options);
  };

  const getPeriodoLabel = () => {
    if (dias === 1) return 'POR DÍA';
    if (dias <= 7) return 'POR SEMANA';
    if (dias <= 14) return 'POR 2 SEMANAS';
    return `POR ${Math.ceil(dias / 7)} SEMANAS`;
  };

  const generatePDF = async () => {
    if (!selectedCliente || !selectedEquipo || !dias) {
      toast({ title: "Error", description: "Completa todos los campos requeridos", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const marginBottom = 20;
      
      const logoImg = new Image();
      logoImg.crossOrigin = 'anonymous';
      
      await new Promise<void>((resolve) => {
        logoImg.onload = () => resolve();
        logoImg.onerror = () => resolve();
        logoImg.src = '/comymaq-cotizacion-logo.png';
      });

      if (logoImg.complete && logoImg.naturalWidth > 0) {
        // Calculate proper aspect ratio for logo
        const logoMaxWidth = 70;
        const logoMaxHeight = 25;
        const aspectRatio = logoImg.naturalWidth / logoImg.naturalHeight;
        let logoWidth = logoMaxWidth;
        let logoHeight = logoWidth / aspectRatio;
        
        if (logoHeight > logoMaxHeight) {
          logoHeight = logoMaxHeight;
          logoWidth = logoHeight * aspectRatio;
        }
        
        doc.addImage(logoImg, 'PNG', 14, 8, logoWidth, logoHeight);
      } else {
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0, 100, 150);
        doc.text('COMYMAQ', 14, 20);
      }

      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      // Remove "COMPRESORES Y MAQUINARIA" as it's in the logo

      doc.setFontSize(11);
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'bold');
      doc.text(`EMPRESA: ${selectedCliente.nombre.toUpperCase()}`, 14, 50);
      
      doc.setFont('helvetica', 'normal');
      const ubicacion = 'Escobedo Nuevo León, ' + formatDate();
      doc.text(ubicacion, pageWidth - 14 - doc.getTextWidth(ubicacion), 50);
      
      doc.text(`ATENCIÓN: ${atencion.toUpperCase()}`, 14, 58);
      doc.text(`TELÉFONO: ${telefono}`, 14, 66);
      doc.text(`correo: ${correo}`, 14, 74);

      doc.setFontSize(10);
      const introText = `Buen día:

Espero que se encuentre bien. Por medio de la presente, me permito presentar la cotización formal correspondiente a la renta del equipo en cuestión.

Cabe señalar que los precios considerados en esta propuesta están calculados con base en una jornada de trabajo de 8 horas diarias, 50 horas semanales y un total de 200 horas mensuales.

Asimismo, reiteramos nuestro compromiso de brindar a su personal una capacitación formal y completa sobre el uso y operación del equipo cotizado. De igual manera, garantizamos que el proceso de entrega y capacitación no se dará por concluido hasta que su personal se encuentre plenamente satisfecho y capacitado respecto al equipo.

Quedo a sus órdenes para cualquier aclaración o información adicional que requiera.`;
      
      const splitIntro = doc.splitTextToSize(introText, pageWidth - 28);
      doc.text(splitIntro, 14, 88);

      let yPos = 145;
      doc.setFillColor(0, 100, 150);
      doc.rect(14, yPos, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('EQUIPO COTIZADO EN ESTA OPORTUNIDAD', 16, yPos + 6);

      yPos += 15;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(12);
      doc.text(selectedEquipo.descripcion.toUpperCase(), 14, yPos);
      
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (selectedEquipo.marca) {
        doc.text(`MARCA: ${selectedEquipo.marca.toUpperCase()}`, 14, yPos);
        yPos += 6;
      }
      if (selectedEquipo.modelo) {
        doc.text(`MODELO: ${selectedEquipo.modelo.toUpperCase()}`, 14, yPos);
        yPos += 6;
      }

      if (modeloConfig?.foto_url) {
        try {
          const equipoImg = new Image();
          equipoImg.crossOrigin = 'anonymous';
          await new Promise<void>((resolve) => {
            equipoImg.onload = () => resolve();
            equipoImg.onerror = () => resolve();
            equipoImg.src = modeloConfig.foto_url!;
          });
          if (equipoImg.complete && equipoImg.naturalWidth > 0) {
            doc.addImage(equipoImg, 'PNG', pageWidth - 70, yPos - 30, 50, 40);
          }
        } catch (e) {
          console.log('Could not load equipment image');
        }
      }

      yPos += 10;
      doc.setFillColor(0, 100, 150);
      doc.rect(14, yPos, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text(`PRECIOS DE RENTA ${getPeriodoLabel()}`, 16, yPos + 6);

      yPos += 12;
      autoTable(doc, {
        startY: yPos,
        head: [],
        body: [
          [`PRECIO ${getPeriodoLabel()} (${dias} días)`, formatCurrency(precioTotal), '1'],
          ['ENTREGA Y RECOLECCIÓN', formatCurrency(entregaRecoleccion), ''],
          [`SEGURO DEL EQUIPO (${seguroPercent}% DEL COSTO DE LA RENTA)`, formatCurrency(seguro), ''],
        ],
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 110 },
          1: { cellWidth: 40, halign: 'right' },
          2: { cellWidth: 20, halign: 'center' },
        },
        margin: { left: 14 },
      });

      yPos = (doc as any).lastAutoTable.finalY + 10;

      // Check if we need a new page for the remaining content
      const remainingContentHeight = 85; // Approximate height needed for the rest
      if (yPos + remainingContentHeight > pageHeight - marginBottom) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFillColor(0, 100, 150);
      doc.rect(14, yPos, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('EN EL PRECIO INCLUYE', 16, yPos + 6);

      yPos += 12;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text('• ATENCIÓN A FALLAS EN GENERAL', 14, yPos);
      yPos += 6;
      doc.text('• ATENCIÓN ESPECIAL A DESHORAS', 14, yPos);

      yPos += 12;
      
      // Check again before payment conditions
      if (yPos + 50 > pageHeight - marginBottom) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFillColor(0, 100, 150);
      doc.rect(14, yPos, pageWidth - 28, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('CONDICIONES DE PAGO', 16, yPos + 6);

      yPos += 12;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text('CONTADO', 14, yPos);
      yPos += 6;
      doc.text('VIGENCIA DE LA COTIZACIÓN: 15 DÍAS', 14, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'bold');
      doc.text('LOS PRECIOS NO INCLUYEN I.V.A.', 14, yPos);
      yPos += 6;
      doc.setFont('helvetica', 'normal');
      const tiempoEntrega = 'TIEMPO DE ENTREGA: 24 HORAS DESPUÉS DE RECIBIR SU ORDEN DE COMPRA.';
      const splitTiempo = doc.splitTextToSize(tiempoEntrega, pageWidth - 28);
      doc.text(splitTiempo, 14, yPos);
      yPos += splitTiempo.length * 5 + 8;

      // Check before signature section
      if (yPos + 35 > pageHeight - marginBottom) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.text('Sin más por el momento, esperando vernos favorecidos por su pedido.', 14, yPos);

      yPos += 10;
      doc.setFont('helvetica', 'bold');
      doc.text(vendedor.toUpperCase(), 14, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.text(`correo: ${vendedorCorreo}`, 14, yPos);
      yPos += 5;
      doc.text(`Oficina: 01 81 89 01 07 12`, 14, yPos);
      yPos += 5;
      doc.text(`Cel.: ${vendedorTelefono}`, 14, yPos);

      const fileName = `Cotizacion_${selectedCliente.nombre.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      await saveCotizacion();

      toast({ title: "PDF generado", description: `Cotización guardada como ${fileName}` });
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      toast({ title: "Error", description: "No se pudo generar el PDF", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'aceptada':
        return <Badge className="bg-green-600">Aceptada</Badge>;
      case 'rechazada':
        return <Badge variant="destructive">Rechazada</Badge>;
      case 'pendiente':
      default:
        return <Badge variant="secondary">Pendiente</Badge>;
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Calculator className="h-8 w-8" />
          Cotizador de Rentas
        </h1>
        <p className="text-muted-foreground">
          Genera cotizaciones profesionales en PDF
        </p>
      </div>

      <Tabs defaultValue="nueva" className="space-y-6">
        <TabsList>
          <TabsTrigger value="nueva" className="gap-2">
            <FileText className="h-4 w-4" />
            Nueva Cotización
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <History className="h-4 w-4" />
            Historial ({historial.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="nueva">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Datos de la Cotización</CardTitle>
                <CardDescription>Completa la información para generar el PDF</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cliente / Prospecto */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Cliente / Prospecto *</Label>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setShowProspectoForm(!showProspectoForm)}
                    >
                      <UserPlus className="h-4 w-4 mr-1" />
                      {showProspectoForm ? 'Cancelar' : 'Nuevo Prospecto'}
                    </Button>
                  </div>
                  
                  {showProspectoForm ? (
                    <div className="p-4 border rounded-lg space-y-3 bg-muted/50">
                      <Input
                        placeholder="Nombre / Empresa *"
                        value={newProspecto.nombre}
                        onChange={(e) => setNewProspecto({ ...newProspecto, nombre: e.target.value })}
                      />
                      <Input
                        placeholder="Persona de contacto"
                        value={newProspecto.persona_contacto}
                        onChange={(e) => setNewProspecto({ ...newProspecto, persona_contacto: e.target.value })}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <Input
                          placeholder="Teléfono"
                          value={newProspecto.telefono}
                          onChange={(e) => setNewProspecto({ ...newProspecto, telefono: e.target.value })}
                        />
                        <Input
                          placeholder="Correo electrónico"
                          type="email"
                          value={newProspecto.correo}
                          onChange={(e) => setNewProspecto({ ...newProspecto, correo: e.target.value })}
                        />
                      </div>
                      <Button type="button" onClick={handleCreateProspecto} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Crear Prospecto
                      </Button>
                    </div>
                  ) : (
                    <Select value={selectedClienteId} onValueChange={handleClienteChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona un cliente o prospecto" />
                      </SelectTrigger>
                      <SelectContent>
                        {clientes.map((cliente) => (
                          <SelectItem key={cliente.id} value={cliente.id}>
                            {cliente.nombre} {cliente.tipo === 'prospecto' && <span className="text-muted-foreground">(Prospecto)</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  
                  {isProspecto && selectedClienteId && (
                    <p className="text-xs text-amber-600">Este es un prospecto. Al aceptar la cotización se convertirá en cliente.</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Atención</Label>
                    <Input value={atencion} onChange={(e) => setAtencion(e.target.value)} placeholder="Nombre de contacto" />
                  </div>
                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Teléfono" />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Correo</Label>
                  <Input value={correo} onChange={(e) => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" />
                </div>

                {/* Equipo */}
                <div className="space-y-2">
                  <Label>Equipo Disponible *</Label>
                  <Select value={selectedEquipoId} onValueChange={handleEquipoChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un equipo disponible" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipos.map((equipo) => (
                        <SelectItem key={equipo.id} value={equipo.id}>
                          {equipo.numero_equipo} - {equipo.modelo || 'Sin modelo'} - {equipo.descripcion.substring(0, 40)}...
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">Solo se muestran equipos disponibles</p>
                </div>

                {selectedEquipo && (
                  <div className="p-4 bg-muted rounded-lg flex gap-4 items-start">
                    {modeloConfig?.foto_url && (
                      <img 
                        src={modeloConfig.foto_url} 
                        alt={selectedEquipo.modelo || 'Equipo'}
                        className="w-24 h-24 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{selectedEquipo.descripcion}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedEquipo.marca && `Marca: ${selectedEquipo.marca}`}
                        {selectedEquipo.modelo && ` | Modelo: ${selectedEquipo.modelo}`}
                      </p>
                      <p className="text-sm font-medium mt-1">
                        Precio Lista: {formatCurrency(precioBase)}
                      </p>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Tiempo de Renta (días) *</Label>
                  <Input 
                    type="number" 
                    value={diasRenta} 
                    onChange={(e) => setDiasRenta(e.target.value)} 
                    placeholder="Ej: 14"
                    min={1}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Precio Base</Label>
                    <Input 
                      type="number" 
                      value={precioBase} 
                      onChange={(e) => setPrecioBase(parseFloat(e.target.value) || 0)} 
                      step="0.01"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Entrega/Recolección</Label>
                    <Input 
                      type="number" 
                      value={entregaRecoleccion} 
                      onChange={(e) => setEntregaRecoleccion(parseFloat(e.target.value) || 0)} 
                      step="0.01"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Seguro (%)</Label>
                  <Input 
                    type="number" 
                    value={seguroPercent} 
                    onChange={(e) => setSeguroPercent(parseFloat(e.target.value) || 0)} 
                    step="0.1"
                  />
                </div>

                <div className="space-y-2 border-t pt-4">
                  <Label className="text-sm font-medium">Datos del Vendedor</Label>
                  <Input value={vendedor} onChange={(e) => setVendedor(e.target.value)} placeholder="Nombre del vendedor" />
                  <div className="grid grid-cols-2 gap-2">
                    <Input value={vendedorCorreo} onChange={(e) => setVendedorCorreo(e.target.value)} placeholder="Correo" />
                    <Input value={vendedorTelefono} onChange={(e) => setVendedorTelefono(e.target.value)} placeholder="Teléfono" />
                  </div>
                </div>

                <Button 
                  onClick={generatePDF} 
                  disabled={loading || !selectedClienteId || !selectedEquipoId || !diasRenta}
                  className="w-full"
                  size="lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  {loading ? 'Generando...' : 'Generar PDF de Cotización'}
                </Button>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Vista Previa</CardTitle>
                <CardDescription>Resumen de la cotización</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedCliente && selectedEquipo && dias > 0 ? (
                  <>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Cliente</p>
                      <p className="font-medium">{selectedCliente.nombre}</p>
                      {isProspecto && <Badge variant="outline" className="text-amber-600 border-amber-600">Prospecto</Badge>}
                      {atencion && <p className="text-sm">Atención: {atencion}</p>}
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Equipo</p>
                      <p className="font-medium">{selectedEquipo.descripcion}</p>
                      <p className="text-sm">
                        {selectedEquipo.marca} - {selectedEquipo.modelo}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">Periodo de Renta</p>
                      <p className="font-medium">{dias} días ({getPeriodoLabel()})</p>
                      <p className="text-sm text-muted-foreground">= {dias * 8} horas de trabajo</p>
                    </div>

                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Concepto</TableHead>
                          <TableHead className="text-right">Monto</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell>Renta ({dias} días)</TableCell>
                          <TableCell className="text-right">{formatCurrency(precioTotal)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Entrega y Recolección</TableCell>
                          <TableCell className="text-right">{formatCurrency(entregaRecoleccion)}</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell>Seguro ({seguroPercent}%)</TableCell>
                          <TableCell className="text-right">{formatCurrency(seguro)}</TableCell>
                        </TableRow>
                        <TableRow className="font-bold">
                          <TableCell>Subtotal (sin IVA)</TableCell>
                          <TableCell className="text-right">{formatCurrency(subtotal)}</TableCell>
                        </TableRow>
                        <TableRow className="font-bold text-lg">
                          <TableCell>Total (con IVA 16%)</TableCell>
                          <TableCell className="text-right">{formatCurrency(subtotal * 1.16)}</TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Selecciona un cliente, equipo y tiempo de renta para ver la vista previa</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="historial">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Historial de Cotizaciones
                </CardTitle>
                <CardDescription>Últimas 50 cotizaciones generadas</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchHistorial} disabled={loadingHistorial}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loadingHistorial ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </CardHeader>
            <CardContent>
              {loadingHistorial ? (
                <div className="text-center py-8 text-muted-foreground">Cargando historial...</div>
              ) : historial.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No hay cotizaciones en el historial</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Equipo</TableHead>
                      <TableHead className="text-center">Días</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historial.map((cot) => (
                      <TableRow key={cot.id}>
                        <TableCell className="text-sm">
                          {formatDateShort(cot.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{cot.cliente_nombre}</div>
                          {cot.es_prospecto && <Badge variant="outline" className="text-xs">Prospecto</Badge>}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate" title={cot.equipo_descripcion}>
                          {cot.equipo_modelo && <Badge variant="outline" className="mr-1">{cot.equipo_modelo}</Badge>}
                          {cot.equipo_descripcion.substring(0, 30)}...
                        </TableCell>
                        <TableCell className="text-center">{cot.dias_renta}</TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(cot.total_con_iva)}
                        </TableCell>
                        <TableCell>{getStatusBadge(cot.status)}</TableCell>
                        <TableCell className="text-right">
                          {cot.status === 'pendiente' && (
                            <div className="flex gap-1 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                onClick={() => {
                                  setSelectedCotizacion(cot);
                                  setAcceptDialogOpen(true);
                                }}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleRejectCotizacion(cot)}
                              >
                                <XCircle className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                          {cot.status === 'aceptada' && cot.contrato_id && (
                            <span className="text-xs text-muted-foreground">Contrato creado</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Accept Cotización Dialog */}
      <Dialog open={acceptDialogOpen} onOpenChange={setAcceptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aceptar Cotización</DialogTitle>
            <DialogDescription>
              Al aceptar esta cotización se realizarán las siguientes acciones:
            </DialogDescription>
          </DialogHeader>
          
          {selectedCotizacion && (
            <div className="space-y-3 py-4">
              <div className="p-3 bg-muted rounded-lg space-y-2">
                <p className="font-medium">{selectedCotizacion.cliente_nombre}</p>
                <p className="text-sm">{selectedCotizacion.equipo_descripcion}</p>
                <p className="text-sm">{selectedCotizacion.dias_renta} días - {formatCurrency(selectedCotizacion.total_con_iva)}</p>
              </div>
              
              <ul className="space-y-2 text-sm">
                {selectedCotizacion.es_prospecto && (
                  <li className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    El prospecto pasará a ser <strong>Cliente</strong>
                  </li>
                )}
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Se creará un nuevo <strong>Contrato</strong> con folio automático
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  El equipo cambiará a estado <strong>"Rentado"</strong>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Horas de trabajo: <strong>{selectedCotizacion.dias_renta * 8} horas</strong>
                </li>
              </ul>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAcceptDialogOpen(false)} disabled={acceptLoading}>
              Cancelar
            </Button>
            <Button onClick={handleAcceptCotizacion} disabled={acceptLoading} className="bg-green-600 hover:bg-green-700">
              {acceptLoading ? 'Procesando...' : 'Confirmar y Crear Contrato'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
