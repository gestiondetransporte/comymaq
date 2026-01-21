import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { format, differenceInDays, addDays } from "date-fns";
import { es } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Truck,
  Calendar,
  MapPin,
  User,
  RefreshCw,
  Check,
  Clock,
  AlertTriangle,
  Search,
  Loader2,
  Edit,
} from "lucide-react";

interface Recoleccion {
  id: string;
  contrato_id: string | null;
  equipo_id: string | null;
  fecha_programada: string;
  fecha_recoleccion: string | null;
  status: string;
  cliente: string | null;
  direccion: string | null;
  municipio: string | null;
  estado_ubicacion: string | null;
  ubicacion_gps: string | null;
  chofer: string | null;
  transporte: string | null;
  comentarios: string | null;
  usuario_email: string | null;
  created_at: string;
  contratos: {
    folio_contrato: string;
  } | null;
  equipos: {
    numero_equipo: string;
    descripcion: string;
  } | null;
}

export default function Recolecciones() {
  const [recolecciones, setRecolecciones] = useState<Recoleccion[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [completarDialogOpen, setCompletarDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedRecoleccion, setSelectedRecoleccion] = useState<Recoleccion | null>(null);
  const [editFormData, setEditFormData] = useState({
    fecha_programada: "",
    chofer: "",
    transporte: "",
    comentarios: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const { isAdmin, isVendedor } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAdmin && !isVendedor) {
      navigate("/");
      return;
    }
    fetchData();
  }, [isAdmin, isVendedor]);

  const fetchData = async () => {
    setLoading(true);
    await fetchRecolecciones();
    await checkAndCreateRecolecciones();
    setLoading(false);
  };

  const fetchRecolecciones = async () => {
    try {
      const { data, error } = await supabase
        .from("recolecciones")
        .select(`
          *,
          contratos:contrato_id (folio_contrato),
          equipos:equipo_id (numero_equipo, descripcion)
        `)
        .order("fecha_programada", { ascending: true });

      if (error) throw error;
      setRecolecciones(data || []);
    } catch (error) {
      console.error("Error fetching recolecciones:", error);
    }
  };

  const checkAndCreateRecolecciones = async () => {
    try {
      const today = new Date().toISOString().split("T")[0];
      
      // Get all active contracts that have expired
      const { data: contratosVencidos, error } = await supabase
        .from("contratos")
        .select(`
          id,
          folio_contrato,
          cliente,
          direccion,
          municipio,
          estado_ubicacion,
          ubicacion_gps,
          fecha_vencimiento,
          equipo_id
        `)
        .eq("status", "activo")
        .lte("fecha_vencimiento", today)
        .not("equipo_id", "is", null);

      if (error) throw error;

      if (!contratosVencidos || contratosVencidos.length === 0) return;

      // Get existing recolecciones for these contracts
      const contratoIds = contratosVencidos.map(c => c.id);
      const { data: existingRecolecciones } = await supabase
        .from("recolecciones")
        .select("contrato_id, status")
        .in("contrato_id", contratoIds);

      const contratosConRecoleccionActiva = (existingRecolecciones || [])
        .filter(r => r.status === "pendiente" || r.status === "en_proceso")
        .map(r => r.contrato_id);

      // Filter contracts that don't have active recolecciones
      const contratosNuevos = contratosVencidos.filter(
        c => !contratosConRecoleccionActiva.includes(c.id)
      );

      if (contratosNuevos.length === 0) return;

      // Auto-create recolecciones
      const { data: { user } } = await supabase.auth.getUser();
      const tomorrow = addDays(new Date(), 1).toISOString().split("T")[0];

      for (const contrato of contratosNuevos) {
        await supabase.from("recolecciones").insert({
          contrato_id: contrato.id,
          equipo_id: contrato.equipo_id,
          fecha_programada: tomorrow,
          cliente: contrato.cliente,
          direccion: contrato.direccion,
          municipio: contrato.municipio,
          estado_ubicacion: contrato.estado_ubicacion,
          ubicacion_gps: contrato.ubicacion_gps,
          status: "pendiente",
          usuario_id: user?.id || null,
          usuario_email: user?.email || null,
          comentarios: "Recolección programada automáticamente por vencimiento de contrato",
        });
      }

      // Refresh recolecciones after auto-creating
      await fetchRecolecciones();

      toast({
        title: "Recolecciones Programadas",
        description: `Se programaron ${contratosNuevos.length} recolección(es) automáticamente para contratos vencidos.`,
      });
    } catch (error) {
      console.error("Error checking/creating recolecciones:", error);
    }
  };

  const handleEditRecoleccion = (recoleccion: Recoleccion) => {
    setSelectedRecoleccion(recoleccion);
    setEditFormData({
      fecha_programada: recoleccion.fecha_programada,
      chofer: recoleccion.chofer || "",
      transporte: recoleccion.transporte || "",
      comentarios: recoleccion.comentarios || "",
    });
    setEditDialogOpen(true);
  };

  const handleSubmitEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecoleccion) return;

    setSubmitting(true);

    try {
      const { error } = await supabase
        .from("recolecciones")
        .update({
          fecha_programada: editFormData.fecha_programada,
          chofer: editFormData.chofer || null,
          transporte: editFormData.transporte || null,
          comentarios: editFormData.comentarios || null,
        })
        .eq("id", selectedRecoleccion.id);

      if (error) throw error;

      toast({
        title: "Éxito",
        description: "Recolección actualizada correctamente",
      });

      setEditDialogOpen(false);
      fetchRecolecciones();
    } catch (error) {
      console.error("Error updating recoleccion:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo actualizar la recolección",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompletarRecoleccion = (recoleccion: Recoleccion) => {
    setSelectedRecoleccion(recoleccion);
    setCompletarDialogOpen(true);
  };

  const handleSubmitCompletar = async () => {
    if (!selectedRecoleccion) return;

    setSubmitting(true);

    try {
      // Update recoleccion status
      const { error: recolError } = await supabase
        .from("recolecciones")
        .update({
          status: "completada",
          fecha_recoleccion: new Date().toISOString().split("T")[0],
        })
        .eq("id", selectedRecoleccion.id);

      if (recolError) throw recolError;

      // Update equipment status to available
      if (selectedRecoleccion.equipo_id) {
        await supabase
          .from("equipos")
          .update({ estado: "disponible" })
          .eq("id", selectedRecoleccion.equipo_id);
      }

      // Update contract status to finalized
      if (selectedRecoleccion.contrato_id) {
        await supabase
          .from("contratos")
          .update({ status: "finalizado" })
          .eq("id", selectedRecoleccion.contrato_id);
      }

      toast({
        title: "Éxito",
        description: "Recolección completada correctamente",
      });

      setCompletarDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error("Error completing recoleccion:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo completar la recolección",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pendiente":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
      case "en_proceso":
        return <Badge variant="outline"><Truck className="h-3 w-3 mr-1" />En Proceso</Badge>;
      case "completada":
        return <Badge variant="default"><Check className="h-3 w-3 mr-1" />Completada</Badge>;
      case "cancelada":
        return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd/MMM/yyyy", { locale: es });
    } catch {
      return dateString;
    }
  };

  const filteredRecolecciones = recolecciones.filter((r) => {
    const matchesSearch =
      !searchQuery ||
      r.cliente?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.contratos?.folio_contrato?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.equipos?.numero_equipo?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus =
      statusFilter === "todos" || r.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Truck className="h-8 w-8" />
            Recolección de Equipos
          </h1>
          <p className="text-muted-foreground">
            Las recolecciones se programan automáticamente cuando un contrato vence
          </p>
        </div>
        <Button variant="outline" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Info Card about automatic scheduling */}
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-primary" />
            <div>
              <p className="font-medium">Recolecciones Automáticas</p>
              <p className="text-sm text-muted-foreground">
                Las recolecciones se programan automáticamente para el día siguiente cuando un contrato vence. 
                Si el cliente renueva, la recolección se cancela automáticamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recolecciones Programadas */}
      <Card>
        <CardHeader>
          <CardTitle>Recolecciones Programadas</CardTitle>
          <CardDescription>
            Listado de todas las recolecciones programadas y su estado
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por cliente, folio o equipo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_proceso">En Proceso</SelectItem>
                <SelectItem value="completada">Completada</SelectItem>
                <SelectItem value="cancelada">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredRecolecciones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Truck className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No hay recolecciones que mostrar</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha Programada</TableHead>
                  <TableHead>Contrato</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Equipo</TableHead>
                  <TableHead>Ubicación</TableHead>
                  <TableHead>Chofer</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecolecciones.map((recoleccion) => (
                  <TableRow key={recoleccion.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {formatDate(recoleccion.fecha_programada)}
                      </div>
                    </TableCell>
                    <TableCell>
                      {recoleccion.contratos?.folio_contrato || "N/A"}
                    </TableCell>
                    <TableCell>{recoleccion.cliente || "N/A"}</TableCell>
                    <TableCell>
                      {recoleccion.equipos
                        ? `${recoleccion.equipos.numero_equipo} - ${recoleccion.equipos.descripcion}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      {recoleccion.municipio || recoleccion.estado_ubicacion ? (
                        <span className="flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {[recoleccion.municipio, recoleccion.estado_ubicacion]
                            .filter(Boolean)
                            .join(", ")}
                        </span>
                      ) : (
                        "N/A"
                      )}
                    </TableCell>
                    <TableCell>
                      {recoleccion.chofer ? (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {recoleccion.chofer}
                        </span>
                      ) : (
                        "Sin asignar"
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(recoleccion.status)}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {recoleccion.status === "pendiente" && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleEditRecoleccion(recoleccion)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCompletarRecoleccion(recoleccion)}
                            >
                              <Check className="h-4 w-4 mr-1" />
                              Completar
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Editar Recolección */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Recolección</DialogTitle>
            <DialogDescription>
              Actualiza los datos de la recolección
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitEdit} className="space-y-4">
            {selectedRecoleccion && (
              <div className="p-3 bg-muted rounded-lg">
                <p className="text-sm font-medium">
                  Equipo: {selectedRecoleccion.equipos?.numero_equipo} -{" "}
                  {selectedRecoleccion.equipos?.descripcion}
                </p>
                <p className="text-sm text-muted-foreground">
                  Cliente: {selectedRecoleccion.cliente}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="fecha_programada">Fecha Programada *</Label>
              <Input
                id="fecha_programada"
                type="date"
                required
                value={editFormData.fecha_programada}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, fecha_programada: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="chofer">Chofer</Label>
              <Input
                id="chofer"
                value={editFormData.chofer}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, chofer: e.target.value })
                }
                placeholder="Nombre del chofer"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="transporte">Transporte</Label>
              <Input
                id="transporte"
                value={editFormData.transporte}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, transporte: e.target.value })
                }
                placeholder="Tipo de transporte o placas"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="comentarios">Comentarios</Label>
              <Textarea
                id="comentarios"
                value={editFormData.comentarios}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, comentarios: e.target.value })
                }
                rows={2}
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar Cambios
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog para Completar Recolección */}
      <Dialog open={completarDialogOpen} onOpenChange={setCompletarDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Completar Recolección</DialogTitle>
            <DialogDescription>
              ¿Confirmas que el equipo ha sido recolectado?
            </DialogDescription>
          </DialogHeader>

          {selectedRecoleccion && (
            <div className="p-4 bg-muted rounded-lg space-y-2">
              <p>
                <strong>Cliente:</strong> {selectedRecoleccion.cliente}
              </p>
              <p>
                <strong>Equipo:</strong>{" "}
                {selectedRecoleccion.equipos?.numero_equipo} -{" "}
                {selectedRecoleccion.equipos?.descripcion}
              </p>
              <p>
                <strong>Fecha Programada:</strong>{" "}
                {formatDate(selectedRecoleccion.fecha_programada)}
              </p>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Al completar esta recolección:
            <ul className="list-disc list-inside mt-2">
              <li>El equipo pasará a estado "disponible"</li>
              <li>El contrato pasará a estado "finalizado"</li>
            </ul>
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCompletarDialogOpen(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button onClick={handleSubmitCompletar} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Check className="h-4 w-4 mr-1" />
              Confirmar Recolección
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
