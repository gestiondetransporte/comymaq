import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Save, ArrowRightLeft, Wrench, FileText, QrCode } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EquipoArchivosTab } from "./EquipoArchivosTab";
import { MultipleFileUpload } from "./MultipleFileUpload";
import { EquipoQRCode } from "./EquipoQRCode";

interface FileWithPreview {
  file: File;
  preview?: string;
  type: 'imagen' | 'documento';
}

interface Equipo {
  id: string;
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
  tipo_negocio: string | null;
  asegurado: string | null;
  ubicacion_actual: string | null;
  almacen_id: string | null;
  codigo_qr: string | null;
}

interface EquipoDetailsDialogProps {
  equipo: Equipo | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
  initialTab?: "detalles" | "movimiento" | "mantenimiento" | "archivos" | "qr";
}

export function EquipoDetailsDialog({
  equipo,
  open,
  onOpenChange,
  onUpdate,
  initialTab = "detalles",
}: EquipoDetailsDialogProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [formData, setFormData] = useState<Partial<Equipo>>({});
  const [loading, setLoading] = useState(false);
  
  // Entrada/Salida form
  const [movimientoTipo, setMovimientoTipo] = useState<"entrada" | "salida">("salida");
  const [almacenOrigenId, setAlmacenOrigenId] = useState("");
  const [almacenDestinoId, setAlmacenDestinoId] = useState("");
  const [cliente, setCliente] = useState("");
  const [obra, setObra] = useState("");
  const [chofer, setChofer] = useState("");
  const [transporte, setTransporte] = useState("");
  const [comentariosMovimiento, setComentariosMovimiento] = useState("");
  const [filesMovimiento, setFilesMovimiento] = useState<FileWithPreview[]>([]);
  
  // Mantenimiento form
  const [tipoServicio, setTipoServicio] = useState("");
  const [ordenServicio, setOrdenServicio] = useState("");
  const [tecnico, setTecnico] = useState("");
  const [descripcionMantenimiento, setDescripcionMantenimiento] = useState("");
  const [proximoServicioHoras, setProximoServicioHoras] = useState<number | "">("");
  
  // Maintenance tracking
  const [mantenimientoInfo, setMantenimientoInfo] = useState<{
    horasActuales: number;
    horasUltimoMantenimiento: number;
    enRenta: boolean;
    proximoMantenimiento: number;
  } | null>(null);
  
  // Clientes list
  const [clientes, setClientes] = useState<Array<{ id: string; nombre: string }>>([]);
  
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (equipo) {
      setFormData(equipo);
      fetchMantenimientoInfo();
    }
  }, [equipo]);

  // Update active tab when dialog opens
  useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
      fetchClientes();
    }
  }, [open, initialTab]);

  const fetchClientes = async () => {
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nombre')
        .order('nombre', { ascending: true });

      if (error) throw error;

      setClientes(data || []);
    } catch (error) {
      console.error('Error fetching clientes:', error);
    }
  };

  const fetchMantenimientoInfo = async () => {
    if (!equipo) return;

    try {
      // Get active contract for this equipment
      const { data: contratos, error: contratoError } = await supabase
        .from("contratos")
        .select("horas_trabajo, status")
        .eq("equipo_id", equipo.id)
        .eq("status", "activo")
        .order("created_at", { ascending: false })
        .limit(1);

      if (contratoError) throw contratoError;

      const enRenta = contratos && contratos.length > 0;
      const horasActuales = enRenta ? (contratos[0].horas_trabajo || 0) : 0;

      // Get last maintenance record
      const { data: mantenimientos, error: mantenimientoError } = await supabase
        .from("mantenimientos")
        .select("*")
        .eq("equipo_id", equipo.id)
        .order("fecha", { ascending: false })
        .limit(1);

      if (mantenimientoError) throw mantenimientoError;

      // Get the contract hours at the time of last maintenance
      let horasUltimoMantenimiento = 0;
      if (mantenimientos && mantenimientos.length > 0) {
        const fechaUltimoMantenimiento = mantenimientos[0].fecha;
        
        // Get contract hours at the time of last maintenance
        const { data: contratoAnterior } = await supabase
          .from("contratos")
          .select("horas_trabajo")
          .eq("equipo_id", equipo.id)
          .lte("fecha_inicio", fechaUltimoMantenimiento)
          .order("fecha_inicio", { ascending: false })
          .limit(1);

        horasUltimoMantenimiento = contratoAnterior && contratoAnterior.length > 0 
          ? (contratoAnterior[0].horas_trabajo || 0) 
          : 0;
      }

      const horasDesdeMantenimiento = horasActuales - horasUltimoMantenimiento;
      const proximoMantenimiento = horasUltimoMantenimiento + 300;

      setMantenimientoInfo({
        horasActuales,
        horasUltimoMantenimiento,
        enRenta,
        proximoMantenimiento
      });

    } catch (error) {
      console.error("Error fetching mantenimiento info:", error);
    }
  };

  const handleTabChange = (value: string) => {
    if (value === "detalles" || value === "movimiento" || value === "mantenimiento" || value === "archivos" || value === "qr") {
      setActiveTab(value);
    }
  };


  const handleUpdateEquipo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipo) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("equipos")
        .update({
          descripcion: formData.descripcion,
          marca: formData.marca,
          modelo: formData.modelo,
          serie: formData.serie,
          tipo: formData.tipo,
          estado: formData.estado,
          categoria: formData.categoria,
          clase: formData.clase,
          anio: formData.anio,
          proveedor: formData.proveedor,
          precio_lista: formData.precio_lista,
          precio_real_cliente: formData.precio_real_cliente,
          costo_proveedor_mxn: formData.costo_proveedor_mxn,
          costo_proveedor_usd: formData.costo_proveedor_usd,
          ganancia: formData.ganancia,
          tipo_negocio: formData.tipo_negocio,
          asegurado: formData.asegurado,
          ubicacion_actual: formData.ubicacion_actual,
        })
        .eq("id", equipo.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Equipo actualizado correctamente",
      });
      onUpdate();
    } catch (error) {
      console.error("Error updating equipo:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar el equipo",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarMovimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipo) return;

    setLoading(true);
    try {
      const imageUrls: string[] = [];
      if (filesMovimiento.length > 0) {
        for (let i = 0; i < filesMovimiento.length; i++) {
          const fileWithPreview = filesMovimiento[i];
          const file = fileWithPreview.file;
          const fileName = `${Date.now()}-${i}-${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('fotografias')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('fotografias')
            .getPublicUrl(fileName);

          imageUrls.push(publicUrl);
        }
      }

      const { data: insertData, error } = await supabase
        .from("entradas_salidas")
        .insert({
          equipo_id: equipo.id,
          created_by: user?.id,
          tipo: movimientoTipo,
          fecha: new Date().toISOString().split('T')[0],
          almacen_origen_id: almacenOrigenId || null,
          almacen_destino_id: almacenDestinoId || null,
          cliente: cliente || null,
          obra: obra || null,
          serie: equipo.serie,
          modelo: equipo.modelo,
          chofer: chofer || null,
          transporte: transporte || null,
          comentarios: comentariosMovimiento || null,
          fotografia_url: imageUrls[0] || null,
          fotografia_url_2: imageUrls[1] || null,
          fotografia_url_3: imageUrls[2] || null,
        })
        .select()
        .single();

      if (error) throw error;

      if (filesMovimiento.length > 0 && insertData) {
        const archivos = filesMovimiento.map((fw, index) => ({
          entrada_salida_id: insertData.id,
          archivo_url: imageUrls[index],
          tipo_archivo: fw.type,
          nombre_archivo: fw.file.name,
        }));

        await supabase.from('entradas_salidas_archivos').insert(archivos);
      }

      toast({
        title: "Éxito",
        description: `${movimientoTipo === "entrada" ? "Entrada" : "Salida"} registrada correctamente`,
      });
      
      // Limpiar formulario
      setCliente("");
      setObra("");
      setChofer("");
      setTransporte("");
      setComentariosMovimiento("");
      setAlmacenOrigenId("");
      setAlmacenDestinoId("");
      setFilesMovimiento([]);
      
      onUpdate();
    } catch (error) {
      console.error("Error registering movimiento:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el movimiento",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRegistrarMantenimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipo) return;

    if (!tipoServicio || !descripcionMantenimiento) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Tipo de servicio y descripción son obligatorios",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("mantenimientos")
        .insert({
          equipo_id: equipo.id,
          usuario_id: user?.id,
          tipo_servicio: tipoServicio,
          orden_servicio: ordenServicio || null,
          tecnico: tecnico || null,
          descripcion: descripcionMantenimiento,
          fecha: new Date().toISOString().split('T')[0],
          proximo_servicio_horas: proximoServicioHoras || null,
        });

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Mantenimiento registrado correctamente",
      });
      
      // Limpiar formulario
      setTipoServicio("");
      setOrdenServicio("");
      setTecnico("");
      setDescripcionMantenimiento("");
      setProximoServicioHoras("");
      
      onUpdate();
    } catch (error) {
      console.error("Error registering mantenimiento:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo registrar el mantenimiento",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!equipo) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle>Equipo #{equipo.numero_equipo}</DialogTitle>
              <DialogDescription>
                {equipo.descripcion}
              </DialogDescription>
              
              {/* Maintenance Alert */}
              {mantenimientoInfo && mantenimientoInfo.enRenta && 
               mantenimientoInfo.horasActuales >= mantenimientoInfo.proximoMantenimiento && (
                <div className="mt-2">
                  <Badge variant="destructive" className="gap-1">
                    <Wrench className="h-3 w-3" />
                    Mantenimiento preventivo requerido a las {mantenimientoInfo.proximoMantenimiento} horas
                  </Badge>
                </div>
              )}
              
              {mantenimientoInfo && mantenimientoInfo.enRenta && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Horas actuales: {mantenimientoInfo.horasActuales} | 
                  Próximo mantenimiento: {mantenimientoInfo.proximoMantenimiento} horas
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("movimiento")}
                className="gap-2"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Entrada/Salida
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveTab("mantenimiento")}
                className="gap-2"
              >
                <Wrench className="h-4 w-4" />
                Mantenimiento
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={handleTabChange}>
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1">
            <TabsTrigger value="detalles" className="text-xs md:text-sm">
              <Save className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
              <span className="hidden md:inline">Detalles</span>
            </TabsTrigger>
            <TabsTrigger value="movimiento" className="text-xs md:text-sm">
              <ArrowRightLeft className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
              <span className="hidden sm:inline">E/S</span>
              <span className="hidden md:inline sm:hidden">Entrada/Salida</span>
            </TabsTrigger>
            <TabsTrigger value="mantenimiento" className="text-xs md:text-sm">
              <Wrench className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
              <span className="hidden md:inline">Mantenimiento</span>
            </TabsTrigger>
            <TabsTrigger value="archivos" className="text-xs md:text-sm">
              <FileText className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
              <span className="hidden md:inline">Archivos</span>
            </TabsTrigger>
            <TabsTrigger value="qr" className="text-xs md:text-sm">
              <QrCode className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
              <span className="hidden sm:inline">QR</span>
              <span className="hidden md:inline sm:hidden">Código QR</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="detalles" className="space-y-4">
            <form onSubmit={handleUpdateEquipo} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="numero_equipo">Número de Equipo</Label>
                  <Input
                    id="numero_equipo"
                    value={formData.numero_equipo || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="descripcion">Descripción *</Label>
                  <Input
                    id="descripcion"
                    required
                    value={formData.descripcion || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, descripcion: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="marca">Marca</Label>
                  <Input
                    id="marca"
                    value={formData.marca || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, marca: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelo">Modelo</Label>
                  <Input
                    id="modelo"
                    value={formData.modelo || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, modelo: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="serie">Serie</Label>
                  <Input
                    id="serie"
                    value={formData.serie || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, serie: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo</Label>
                  <Select
                    value={formData.tipo || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, tipo: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ELECTRICA">ELÉCTRICA</SelectItem>
                      <SelectItem value="COMBUSTIÓN">COMBUSTIÓN</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="estado">Estado</Label>
                  <Input
                    id="estado"
                    value={formData.estado || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, estado: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoría</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, categoria: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="clase">Clase</Label>
                  <Input
                    id="clase"
                    value={formData.clase || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, clase: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="anio">Año</Label>
                  <Input
                    id="anio"
                    type="number"
                    value={formData.anio || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, anio: parseInt(e.target.value) || null })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proveedor">Proveedor</Label>
                  <Input
                    id="proveedor"
                    value={formData.proveedor || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, proveedor: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ubicacion_actual">Ubicación Actual</Label>
                  <Input
                    id="ubicacion_actual"
                    value={formData.ubicacion_actual || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, ubicacion_actual: e.target.value })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precio_lista">Precio Lista (MXN)</Label>
                  <Input
                    id="precio_lista"
                    type="number"
                    step="0.01"
                    value={formData.precio_lista || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, precio_lista: parseFloat(e.target.value) || null })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="precio_real_cliente">Precio Real Cliente (MXN)</Label>
                  <Input
                    id="precio_real_cliente"
                    type="number"
                    step="0.01"
                    value={formData.precio_real_cliente || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, precio_real_cliente: parseFloat(e.target.value) || null })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="asegurado">Asegurado</Label>
                  <Select
                    value={formData.asegurado || ""}
                    onValueChange={(value) =>
                      setFormData({ ...formData, asegurado: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Si">Sí</SelectItem>
                      <SelectItem value="No">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo_negocio">Tipo de Negocio</Label>
                  <Input
                    id="tipo_negocio"
                    value={formData.tipo_negocio || ""}
                    onChange={(e) =>
                      setFormData({ ...formData, tipo_negocio: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Guardar Cambios
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="movimiento" className="space-y-4">
            <form onSubmit={handleRegistrarMovimiento} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="movimiento_tipo">Tipo de Movimiento *</Label>
                  <Select
                    value={movimientoTipo}
                    onValueChange={(value: "entrada" | "salida") => setMovimientoTipo(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="entrada">Entrada</SelectItem>
                      <SelectItem value="salida">Salida</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente</Label>
                  <Select value={cliente} onValueChange={setCliente}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cliente..." />
                    </SelectTrigger>
                    <SelectContent>
                      {clientes.map((c) => (
                        <SelectItem key={c.id} value={c.nombre}>
                          {c.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="obra">Obra</Label>
                  <Input
                    id="obra"
                    value={obra}
                    onChange={(e) => setObra(e.target.value)}
                    placeholder="Nombre de la obra"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chofer">Chofer</Label>
                  <Input
                    id="chofer"
                    value={chofer}
                    onChange={(e) => setChofer(e.target.value)}
                    placeholder="Nombre del chofer"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="transporte">Transporte</Label>
                  <Input
                    id="transporte"
                    value={transporte}
                    onChange={(e) => setTransporte(e.target.value)}
                    placeholder="Tipo o placas del transporte"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="comentarios_movimiento">Comentarios</Label>
                <Textarea
                  id="comentarios_movimiento"
                  value={comentariosMovimiento}
                  onChange={(e) => setComentariosMovimiento(e.target.value)}
                  placeholder="Observaciones adicionales..."
                  rows={3}
                />
              </div>

              <MultipleFileUpload
                files={filesMovimiento}
                onFilesChange={setFilesMovimiento}
                maxFiles={10}
                acceptImages={true}
                acceptDocuments={true}
                label="Archivos e Imágenes (hasta 10)"
              />

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("detalles")}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <ArrowRightLeft className="mr-2 h-4 w-4" />
                      Registrar Movimiento
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="mantenimiento" className="space-y-4">
            <form onSubmit={handleRegistrarMantenimiento} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="tipo_servicio">Tipo de Servicio *</Label>
                  <Select
                    value={tipoServicio}
                    onValueChange={setTipoServicio}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="preventivo">Preventivo</SelectItem>
                      <SelectItem value="correctivo">Correctivo</SelectItem>
                      <SelectItem value="revision">Revisión</SelectItem>
                      <SelectItem value="reparacion">Reparación</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="orden_servicio">Orden de Servicio</Label>
                  <Input
                    id="orden_servicio"
                    value={ordenServicio}
                    onChange={(e) => setOrdenServicio(e.target.value)}
                    placeholder="Número de orden"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tecnico">Técnico</Label>
                  <Input
                    id="tecnico"
                    value={tecnico}
                    onChange={(e) => setTecnico(e.target.value)}
                    placeholder="Nombre del técnico"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="proximo_servicio_horas">Próximo Servicio (Horas)</Label>
                  <Input
                    id="proximo_servicio_horas"
                    type="number"
                    placeholder="300, 400, 500..."
                    value={proximoServicioHoras}
                    onChange={(e) => setProximoServicioHoras(e.target.value ? parseInt(e.target.value) : "")}
                    min="0"
                    step="100"
                  />
                  <p className="text-xs text-muted-foreground">
                    Ingresa las horas de operación para programar el próximo mantenimiento
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descripcion_mantenimiento">Descripción del Servicio *</Label>
                <Textarea
                  id="descripcion_mantenimiento"
                  required
                  value={descripcionMantenimiento}
                  onChange={(e) => setDescripcionMantenimiento(e.target.value)}
                  placeholder="Describe el servicio realizado..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTab("detalles")}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Registrando...
                    </>
                  ) : (
                    <>
                      <Wrench className="mr-2 h-4 w-4" />
                      Registrar Mantenimiento
                    </>
                  )}
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="archivos">
            {equipo && <EquipoArchivosTab equipoId={equipo.id} />}
          </TabsContent>

          <TabsContent value="qr">
            {equipo && (
              <EquipoQRCode
                numeroEquipo={equipo.numero_equipo}
                descripcion={equipo.descripcion}
                equipoId={equipo.id}
              />
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
