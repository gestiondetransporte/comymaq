import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Plus, Edit, Search, Users } from 'lucide-react';

interface Personal {
  id: string;
  nombre: string;
  correo: string | null;
  telefono: string | null;
  categoria: string;
  puesto: string | null;
  activo: boolean;
  created_at: string;
}

export default function PersonalPage() {
  const [personal, setPersonal] = useState<Personal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [telefono, setTelefono] = useState('');
  const [categoria, setCategoria] = useState('trabajador');
  const [puesto, setPuesto] = useState('');
  const [activo, setActivo] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    fetchPersonal();
  }, []);

  const fetchPersonal = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('personal')
      .select('*')
      .order('nombre');
    if (!error && data) setPersonal(data);
    setLoading(false);
  };

  const resetForm = () => {
    setNombre('');
    setCorreo('');
    setTelefono('');
    setCategoria('trabajador');
    setPuesto('');
    setActivo(true);
    setEditingId(null);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (p: Personal) => {
    setEditingId(p.id);
    setNombre(p.nombre);
    setCorreo(p.correo || '');
    setTelefono(p.telefono || '');
    setCategoria(p.categoria);
    setPuesto(p.puesto || '');
    setActivo(p.activo);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!nombre.trim()) {
      toast({ title: 'Error', description: 'El nombre es obligatorio', variant: 'destructive' });
      return;
    }

    const record = {
      nombre: nombre.trim(),
      correo: correo.trim() || null,
      telefono: telefono.trim() || null,
      categoria,
      puesto: puesto.trim() || null,
      activo,
    };

    if (editingId) {
      const { error } = await supabase.from('personal').update(record).eq('id', editingId);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Actualizado', description: 'Registro actualizado correctamente' });
    } else {
      const { error } = await supabase.from('personal').insert(record);
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Creado', description: 'Registro creado correctamente' });
    }

    setDialogOpen(false);
    resetForm();
    fetchPersonal();
  };

  const filtered = personal.filter(p => {
    const matchSearch = p.nombre.toLowerCase().includes(search.toLowerCase()) ||
      (p.correo || '').toLowerCase().includes(search.toLowerCase());
    const matchCategoria = filterCategoria === 'todos' || p.categoria === filterCategoria;
    return matchSearch && matchCategoria;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Personal</h1>
          <p className="text-muted-foreground">Gestión de vendedores y trabajadores</p>
        </div>
        <Button onClick={openNew}>
          <Plus className="mr-2 h-4 w-4" /> Agregar Personal
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por nombre o correo..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filterCategoria} onValueChange={setFilterCategoria}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos</SelectItem>
            <SelectItem value="vendedor">Vendedores</SelectItem>
            <SelectItem value="trabajador">Trabajadores</SelectItem>
            <SelectItem value="tecnico">Técnicos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Personal ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Puesto</TableHead>
                <TableHead>Correo</TableHead>
                <TableHead>Teléfono</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
              ) : filtered.length === 0 ? (
                <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No se encontró personal</TableCell></TableRow>
              ) : (
                filtered.map(p => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell>
                      <Badge variant={p.categoria === 'vendedor' ? 'default' : p.categoria === 'tecnico' ? 'secondary' : 'outline'}>
                        {p.categoria.charAt(0).toUpperCase() + p.categoria.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>{p.puesto || '-'}</TableCell>
                    <TableCell>{p.correo || '-'}</TableCell>
                    <TableCell>{p.telefono || '-'}</TableCell>
                    <TableCell>
                      <Badge variant={p.activo ? 'default' : 'destructive'}>
                        {p.activo ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Personal' : 'Agregar Personal'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input value={nombre} onChange={e => setNombre(e.target.value)} placeholder="Nombre completo" />
            </div>
            <div>
              <Label>Categoría</Label>
              <Select value={categoria} onValueChange={setCategoria}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="vendedor">Vendedor</SelectItem>
                  <SelectItem value="trabajador">Trabajador</SelectItem>
                  <SelectItem value="tecnico">Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Puesto</Label>
              <Input value={puesto} onChange={e => setPuesto(e.target.value)} placeholder="Puesto o cargo" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Correo</Label>
                <Input value={correo} onChange={e => setCorreo(e.target.value)} placeholder="correo@ejemplo.com" />
              </div>
              <div>
                <Label>Teléfono</Label>
                <Input value={telefono} onChange={e => setTelefono(e.target.value)} placeholder="Teléfono" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={activo} onCheckedChange={setActivo} />
              <Label>Activo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? 'Actualizar' : 'Guardar'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
