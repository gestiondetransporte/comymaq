import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { 
  Calendar, 
  User, 
  Building2, 
  Truck, 
  FileText, 
  AlertCircle,
  Image as ImageIcon,
  FileIcon,
  Warehouse
} from "lucide-react";

interface EntradaSalidaDetailsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  movimientoId: string | null;
}

interface MovimientoDetalle {
  id: string;
  fecha: string;
  tipo: string;
  cliente: string | null;
  obra: string | null;
  chofer: string | null;
  transporte: string | null;
  serie: string | null;
  modelo: string | null;
  comentarios: string | null;
  tiene_danos: boolean | null;
  descripcion_danos: string | null;
  fotografia_url: string | null;
  fotografia_url_2: string | null;
  fotografia_url_3: string | null;
  foto_odometro_url: string | null;
  foto_calca_url: string | null;
  foto_tablero_url: string | null;
  foto_cargador_url: string | null;
  foto_extintor_url: string | null;
  equipos: {
    numero_equipo: string;
    descripcion: string;
    marca: string | null;
  } | null;
  almacen_origen: {
    nombre: string;
  } | null;
  almacen_destino: {
    nombre: string;
  } | null;
}

interface Archivo {
  id: string;
  archivo_url: string;
  tipo_archivo: string;
  nombre_archivo: string | null;
}

export function EntradaSalidaDetailsDialog({
  open,
  onOpenChange,
  movimientoId,
}: EntradaSalidaDetailsDialogProps) {
  const [movimiento, setMovimiento] = useState<MovimientoDetalle | null>(null);
  const [archivos, setArchivos] = useState<Archivo[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && movimientoId) {
      fetchMovimientoDetails();
      fetchArchivos();
    }
  }, [open, movimientoId]);

  const fetchMovimientoDetails = async () => {
    if (!movimientoId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('entradas_salidas')
        .select(`
          *,
          equipos!equipo_id (
            numero_equipo,
            descripcion,
            marca
          ),
          almacen_origen:almacenes!almacen_origen_id (
            nombre
          ),
          almacen_destino:almacenes!almacen_destino_id (
            nombre
          )
        `)
        .eq('id', movimientoId)
        .maybeSingle();

      if (error) throw error;
      setMovimiento(data);
    } catch (error) {
      console.error('Error fetching movimiento details:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchArchivos = async () => {
    if (!movimientoId) return;

    try {
      const { data, error } = await supabase
        .from('entradas_salidas_archivos')
        .select('*')
        .eq('entrada_salida_id', movimientoId);

      if (error) throw error;
      setArchivos(data || []);
    } catch (error) {
      console.error('Error fetching archivos:', error);
    }
  };

  const getTipoBadge = (tipo: string) => {
    if (tipo === "entrada") return <Badge variant="default" className="bg-green-600">Entrada</Badge>;
    if (tipo === "salida") return <Badge variant="destructive">Salida</Badge>;
    if (tipo === "traspaso") return <Badge variant="secondary" className="bg-blue-600">Traspaso</Badge>;
    return <Badge variant="outline">{tipo}</Badge>;
  };

  const formatDate = (date: string) => {
    try {
      return format(new Date(date), "dd 'de' MMMM 'de' yyyy", { locale: es });
    } catch {
      return date;
    }
  };

  const InfoRow = ({ icon: Icon, label, value }: { icon: any; label: string; value: string | null }) => (
    <div className="flex items-start gap-3 py-2">
      <Icon className="h-5 w-5 text-muted-foreground mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="text-sm">{value || 'N/A'}</p>
      </div>
    </div>
  );

  const PhotoSection = ({ title, photos }: { title: string; photos: { url: string | null; label: string }[] }) => {
    const validPhotos = photos.filter(p => p.url);
    if (validPhotos.length === 0) return null;

    return (
      <div className="space-y-2">
        <h4 className="text-sm font-semibold">{title}</h4>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {validPhotos.map((photo, idx) => (
            <a
              key={idx}
              href={photo.url!}
              target="_blank"
              rel="noopener noreferrer"
              className="block relative group"
            >
              <img
                src={photo.url!}
                alt={photo.label}
                className="w-full h-32 object-cover rounded-lg border hover:opacity-80 transition-opacity"
              />
              <p className="text-xs text-center mt-1 text-muted-foreground">{photo.label}</p>
            </a>
          ))}
        </div>
      </div>
    );
  };

  if (!movimiento && !loading) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Detalle del Movimiento
            {movimiento && getTipoBadge(movimiento.tipo)}
          </DialogTitle>
          <DialogDescription>
            {movimiento && `Registrado el ${formatDate(movimiento.fecha)}`}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Cargando detalles...</div>
        ) : movimiento ? (
          <div className="space-y-6">
            {/* Información del Equipo */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Información del Equipo</h3>
                <div className="grid gap-2">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Número de Equipo:</span>
                    <span>{movimiento.equipos?.numero_equipo || 'N/A'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">Descripción:</span>
                    <span>{movimiento.equipos?.descripcion || 'N/A'}</span>
                  </div>
                  {movimiento.equipos?.marca && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Marca:</span>
                      <span>{movimiento.equipos.marca}</span>
                    </div>
                  )}
                  {movimiento.modelo && (
                    <div className="flex justify-between py-2 border-b">
                      <span className="font-medium">Modelo:</span>
                      <span>{movimiento.modelo}</span>
                    </div>
                  )}
                  {movimiento.serie && (
                    <div className="flex justify-between py-2">
                      <span className="font-medium">Serie:</span>
                      <span>{movimiento.serie}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Información del Movimiento */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="text-lg font-semibold mb-4">Detalles del Movimiento</h3>
                <div className="space-y-1">
                  <InfoRow icon={Calendar} label="Fecha" value={formatDate(movimiento.fecha)} />
                  <InfoRow icon={User} label="Cliente" value={movimiento.cliente} />
                  <InfoRow icon={Building2} label="Obra" value={movimiento.obra} />
                  <InfoRow icon={User} label="Chofer" value={movimiento.chofer} />
                  <InfoRow icon={Truck} label="Transporte" value={movimiento.transporte} />
                  
                  {movimiento.tipo === "traspaso" && (
                    <>
                      <Separator className="my-2" />
                      <InfoRow 
                        icon={Warehouse} 
                        label="Almacén Origen" 
                        value={movimiento.almacen_origen?.nombre} 
                      />
                      <InfoRow 
                        icon={Warehouse} 
                        label="Almacén Destino" 
                        value={movimiento.almacen_destino?.nombre} 
                      />
                    </>
                  )}

                  {movimiento.comentarios && (
                    <>
                      <Separator className="my-2" />
                      <InfoRow icon={FileText} label="Comentarios" value={movimiento.comentarios} />
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Daños */}
            {movimiento.tiene_danos && (
              <Card className="border-destructive/50 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-destructive mb-2">Reporte de Daños</h3>
                      <p className="text-sm">{movimiento.descripcion_danos || 'Sin descripción de daños'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Fotografías Generales */}
            <PhotoSection
              title="Fotografías Generales"
              photos={[
                { url: movimiento.fotografia_url, label: 'Foto 1' },
                { url: movimiento.fotografia_url_2, label: 'Foto 2' },
                { url: movimiento.fotografia_url_3, label: 'Foto 3' },
              ]}
            />

            {/* Fotografías Específicas */}
            <PhotoSection
              title="Fotografías Específicas"
              photos={[
                { url: movimiento.foto_odometro_url, label: 'Odómetro' },
                { url: movimiento.foto_calca_url, label: 'Calca' },
                { url: movimiento.foto_tablero_url, label: 'Tablero' },
                { url: movimiento.foto_cargador_url, label: 'Cargador' },
                { url: movimiento.foto_extintor_url, label: 'Extintor' },
              ]}
            />

            {/* Archivos Adicionales */}
            {archivos.length > 0 && (
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <FileIcon className="h-5 w-5" />
                    Archivos Adicionales ({archivos.length})
                  </h3>
                  <div className="grid gap-2">
                    {archivos.map((archivo) => (
                      <a
                        key={archivo.id}
                        href={archivo.archivo_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 p-3 border rounded-lg hover:bg-accent transition-colors"
                      >
                        {archivo.tipo_archivo === 'imagen' ? (
                          <ImageIcon className="h-5 w-5 text-primary" />
                        ) : (
                          <FileIcon className="h-5 w-5 text-primary" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">
                            {archivo.nombre_archivo || 'Archivo sin nombre'}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {archivo.tipo_archivo}
                          </p>
                        </div>
                      </a>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="py-8 text-center text-muted-foreground">
            No se encontró información del movimiento
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
