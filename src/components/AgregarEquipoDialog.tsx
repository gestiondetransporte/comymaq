import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const equipoSchema = z.object({
  numero_equipo: z.string().min(1, "El número de equipo es requerido"),
  descripcion: z.string().min(1, "La descripción es requerida"),
  marca: z.string().optional(),
  modelo: z.string().optional(),
  serie: z.string().optional(),
  tipo: z.string().optional(),
  estado: z.string().optional(),
  categoria: z.string().optional(),
  clase: z.string().optional(),
  almacen_id: z.string().optional(),
  tipo_negocio: z.string().optional(),
  anio: z.string().optional(),
  precio_lista: z.string().optional(),
  precio_real_cliente: z.string().optional(),
  costo_proveedor_usd: z.string().optional(),
  costo_proveedor_mxn: z.string().optional(),
  proveedor: z.string().optional(),
  asegurado: z.string().optional(),
  ubicacion_actual: z.string().optional(),
});

type EquipoFormValues = z.infer<typeof equipoSchema>;

interface AgregarEquipoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

interface Almacen {
  id: string;
  nombre: string;
}

interface ModeloConfig {
  modelo: string;
  precio_lista: number | null;
}

export function AgregarEquipoDialog({ open, onOpenChange, onSuccess }: AgregarEquipoDialogProps) {
  const [almacenes, setAlmacenes] = useState<Almacen[]>([]);
  const [modelosConfig, setModelosConfig] = useState<ModeloConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<EquipoFormValues>({
    resolver: zodResolver(equipoSchema),
    defaultValues: {
      numero_equipo: "",
      descripcion: "",
      marca: "",
      modelo: "",
      serie: "",
      tipo: "",
      estado: "",
      categoria: "",
      clase: "",
      almacen_id: "",
      tipo_negocio: "",
      anio: "",
      precio_lista: "",
      precio_real_cliente: "",
      costo_proveedor_usd: "",
      costo_proveedor_mxn: "",
      proveedor: "",
      asegurado: "",
      ubicacion_actual: "",
    },
  });

  useEffect(() => {
    if (open) {
      fetchAlmacenes();
      fetchModelosConfig();
    }
  }, [open]);

  const fetchAlmacenes = async () => {
    const { data, error } = await supabase
      .from('almacenes')
      .select('id, nombre')
      .order('nombre', { ascending: true });

    if (!error && data) {
      setAlmacenes(data);
    }
  };

  const fetchModelosConfig = async () => {
    const { data, error } = await supabase
      .from('modelos_configuracion')
      .select('modelo, precio_lista');

    if (!error && data) {
      setModelosConfig(data);
    }
  };

  // Auto-apply price when model changes
  const handleModeloChange = (value: string) => {
    const upperValue = value.toUpperCase();
    form.setValue('modelo', upperValue);
    
    // Look up model configuration
    const config = modelosConfig.find(m => m.modelo === upperValue);
    if (config?.precio_lista) {
      form.setValue('precio_lista', config.precio_lista.toString());
      toast({
        title: "Precio aplicado",
        description: `Precio de lista $${config.precio_lista.toLocaleString()} aplicado automáticamente para modelo ${upperValue}`,
      });
    }
  };

  const onSubmit = async (values: EquipoFormValues) => {
    setLoading(true);
    try {
      const equipoData: any = {
        numero_equipo: values.numero_equipo,
        descripcion: values.descripcion,
        marca: values.marca || null,
        modelo: values.modelo || null,
        serie: values.serie || null,
        tipo: values.tipo || null,
        estado: values.estado || null,
        categoria: values.categoria || null,
        clase: values.clase || null,
        almacen_id: values.almacen_id || null,
        tipo_negocio: values.tipo_negocio || null,
        anio: values.anio ? parseInt(values.anio) : null,
        precio_lista: values.precio_lista ? parseFloat(values.precio_lista) : null,
        precio_real_cliente: values.precio_real_cliente ? parseFloat(values.precio_real_cliente) : null,
        costo_proveedor_usd: values.costo_proveedor_usd ? parseFloat(values.costo_proveedor_usd) : null,
        costo_proveedor_mxn: values.costo_proveedor_mxn ? parseFloat(values.costo_proveedor_mxn) : null,
        proveedor: values.proveedor || null,
        asegurado: values.asegurado || null,
        ubicacion_actual: values.ubicacion_actual || null,
      };

      const { error } = await supabase
        .from('equipos')
        .insert([equipoData]);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Equipo agregado correctamente",
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "No se pudo agregar el equipo",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Agregar Nuevo Equipo</DialogTitle>
          <DialogDescription>
            Ingresa la información del equipo. Los campos marcados con * son obligatorios.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="numero_equipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Equipo *</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: 001" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un tipo" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="ELECTRICA">ELÉCTRICA</SelectItem>
                        <SelectItem value="COMBUSTIÓN">COMBUSTIÓN</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descripcion"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripción *</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Describe el equipo" rows={3} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="marca"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marca</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Caterpillar" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="modelo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modelo</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Ej: TS1882" 
                        onChange={(e) => handleModeloChange(e.target.value)}
                        onBlur={() => handleModeloChange(field.value || '')}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="serie"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Número de Serie</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: ABC123456" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="anio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Año</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" placeholder="Ej: 2024" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoría</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Montacargas" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="clase"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Clase</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Clase I" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Nuevo" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="almacen_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Almacén</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecciona un almacén" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {almacenes.map((almacen) => (
                          <SelectItem key={almacen.id} value={almacen.id}>
                            {almacen.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tipo_negocio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Negocio</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Ej: Renta, Venta, Subrenta" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="proveedor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proveedor</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Nombre del proveedor" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="asegurado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Asegurado</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Sí/No" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="precio_lista"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio Lista</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="precio_real_cliente"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio Real Cliente</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="costo_proveedor_usd"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Proveedor (USD)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="costo_proveedor_mxn"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Costo Proveedor (MXN)</FormLabel>
                    <FormControl>
                      <Input {...field} type="number" step="0.01" placeholder="0.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="ubicacion_actual"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ubicación Actual</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Ubicación del equipo" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : "Guardar Equipo"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
