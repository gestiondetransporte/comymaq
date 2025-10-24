import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Search, UserPlus, Edit2, Trash2, Building2 } from "lucide-react";

interface Cliente {
  id: string;
  nombre: string;
  razon_social: string | null;
  rfc: string | null;
  correo_electronico: string | null;
  telefono: string | null;
  persona_contacto: string | null;
  direccion: string | null;
  created_at: string;
}

export default function Clientes() {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [filteredClientes, setFilteredClientes] = useState<Cliente[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingCliente, setEditingCliente] = useState<Cliente | null>(null);
  
  // Form fields
  const [nombre, setNombre] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [rfc, setRfc] = useState("");
  const [correo, setCorreo] = useState("");
  const [telefono, setTelefono] = useState("");
  const [personaContacto, setPersonaContacto] = useState("");
  const [direccion, setDireccion] = useState("");

  const { toast } = useToast();
  const { isAdmin, isVendedor } = useAuth();

  useEffect(() => {
    fetchClientes();
  }, []);

  useEffect(() => {
    filterClientes();
  }, [searchQuery, clientes]);

  const fetchClientes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('nombre', { ascending: true });

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudieron cargar los clientes",
      });
    } else {
      setClientes(data || []);
    }
    setLoading(false);
  };

  const filterClientes = () => {
    if (!searchQuery.trim()) {
      setFilteredClientes(clientes);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = clientes.filter(c =>
      c.nombre?.toLowerCase().includes(query) ||
      c.razon_social?.toLowerCase().includes(query) ||
      c.rfc?.toLowerCase().includes(query) ||
      c.correo_electronico?.toLowerCase().includes(query) ||
      c.telefono?.toLowerCase().includes(query) ||
      c.persona_contacto?.toLowerCase().includes(query)
    );
    setFilteredClientes(filtered);
  };

  const handleOpenDialog = (cliente?: Cliente) => {
    if (cliente) {
      setEditingCliente(cliente);
      setNombre(cliente.nombre);
      setRazonSocial(cliente.razon_social || "");
      setRfc(cliente.rfc || "");
      setCorreo(cliente.correo_electronico || "");
      setTelefono(cliente.telefono || "");
      setPersonaContacto(cliente.persona_contacto || "");
      setDireccion(cliente.direccion || "");
    } else {
      setEditingCliente(null);
      clearForm();
    }
    setDialogOpen(true);
  };

  const clearForm = () => {
    setNombre("");
    setRazonSocial("");
    setRfc("");
    setCorreo("");
    setTelefono("");
    setPersonaContacto("");
    setDireccion("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const clienteData = {
      nombre: nombre.trim(),
      razon_social: razonSocial.trim() || null,
      rfc: rfc.trim() || null,
      correo_electronico: correo.trim() || null,
      telefono: telefono.trim() || null,
      persona_contacto: personaContacto.trim() || null,
      direccion: direccion.trim() || null,
    };

    let error;
    if (editingCliente) {
      ({ error } = await supabase
        .from('clientes')
        .update(clienteData)
        .eq('id', editingCliente.id));
    } else {
      ({ error } = await supabase
        .from('clientes')
        .insert(clienteData));
    }

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: `No se pudo ${editingCliente ? 'actualizar' : 'crear'} el cliente`,
      });
    } else {
      toast({
        title: editingCliente ? "Cliente actualizado" : "Cliente creado",
        description: `El cliente ${nombre} fue ${editingCliente ? 'actualizado' : 'registrado'} exitosamente`,
      });
      setDialogOpen(false);
      clearForm();
      fetchClientes();
    }
    setLoading(false);
  };

  const handleDelete = async (id: string, nombre: string) => {
    if (!confirm(`¿Estás seguro de eliminar al cliente ${nombre}?`)) return;

    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "No se pudo eliminar el cliente",
      });
    } else {
      toast({
        title: "Cliente eliminado",
        description: `${nombre} fue eliminado del sistema`,
      });
      fetchClientes();
    }
  };

  if (!isAdmin && !isVendedor) {
    return <Navigate to="/" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Building2 className="h-8 w-8" />
            Clientes
          </h1>
          <p className="text-muted-foreground">Gestiona la información de tus clientes</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <UserPlus className="mr-2 h-4 w-4" />
          Nuevo Cliente
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Buscar Clientes</CardTitle>
          <CardDescription>
            Busca por nombre, razón social, RFC, correo o teléfono
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Razón Social</TableHead>
                  <TableHead>RFC</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Correo</TableHead>
                  <TableHead>Teléfono</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Cargando clientes...
                    </TableCell>
                  </TableRow>
                ) : filteredClientes.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchQuery ? "No se encontraron clientes" : "No hay clientes registrados"}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClientes.map((cliente) => (
                    <TableRow key={cliente.id}>
                      <TableCell className="font-medium">{cliente.nombre}</TableCell>
                      <TableCell>{cliente.razon_social || "N/A"}</TableCell>
                      <TableCell className="font-mono text-sm">{cliente.rfc || "N/A"}</TableCell>
                      <TableCell>{cliente.persona_contacto || "N/A"}</TableCell>
                      <TableCell>{cliente.correo_electronico || "N/A"}</TableCell>
                      <TableCell>{cliente.telefono || "N/A"}</TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenDialog(cliente)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(cliente.id, cliente.nombre)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingCliente ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
            <DialogDescription>
              {editingCliente 
                ? "Actualiza la información del cliente" 
                : "Registra un nuevo cliente en el sistema"}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nombre">Nombre *</Label>
                  <Input
                    id="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    required
                    placeholder="Nombre del cliente"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="razon_social">Razón Social</Label>
                  <Input
                    id="razon_social"
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    placeholder="Razón social"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rfc">RFC</Label>
                  <Input
                    id="rfc"
                    value={rfc}
                    onChange={(e) => setRfc(e.target.value)}
                    placeholder="RFC"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="persona_contacto">Persona de Contacto</Label>
                  <Input
                    id="persona_contacto"
                    value={personaContacto}
                    onChange={(e) => setPersonaContacto(e.target.value)}
                    placeholder="Nombre del contacto"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="correo">Correo Electrónico</Label>
                  <Input
                    id="correo"
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="correo@ejemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    placeholder="Teléfono"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={direccion}
                  onChange={(e) => setDireccion(e.target.value)}
                  placeholder="Dirección completa"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Guardando..." : editingCliente ? "Actualizar" : "Crear"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
