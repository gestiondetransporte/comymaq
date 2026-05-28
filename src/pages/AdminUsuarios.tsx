import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Trash2, Shield, Edit2 } from "lucide-react";
import { Navigate } from "react-router-dom";
import { z } from "zod";
import { APP_MODULES } from "@/lib/modules";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const passwordSchema = z.string()
  .min(12, "La contraseña debe tener al menos 12 caracteres")
  .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
  .regex(/[a-z]/, "Debe contener al menos una minúscula")
  .regex(/[0-9]/, "Debe contener al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial (!@#$%^&*)");

type Role = 'admin' | 'moderator' | 'user' | 'vendedor';

interface UserWithRole {
  id: string;
  email: string;
  nombre: string | null;
  role: Role;
  created_at: string;
}

export default function AdminUsuarios() {
  const { isAdmin, createUser } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>('user');
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  const [editingUser, setEditingUser] = useState<UserWithRole | null>(null);
  const [editNombre, setEditNombre] = useState("");
  const [editRole, setEditRole] = useState<Role>('user');
  const [editModules, setEditModules] = useState<string[]>([]);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (isAdmin) fetchUsers();
  }, [isAdmin]);

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, nombre, created_at');

    if (!profiles) return;

    const usersWithRoles = await Promise.all(
      profiles.map(async (profile: any) => {
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', profile.id)
          .maybeSingle();

        return {
          ...profile,
          role: (roleData?.role as Role) || 'user',
        };
      })
    );

    setUsers(usersWithRoles as UserWithRole[]);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      passwordSchema.parse(password);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({ variant: "destructive", title: "Contraseña inválida", description: error.errors[0].message });
        setLoading(false);
        return;
      }
    }

    const { error } = await createUser(email, password, role);

    if (error) {
      toast({ variant: "destructive", title: "Error al crear usuario", description: error.message });
      setLoading(false);
      return;
    }

    // Save name on profile (look up by email)
    if (nombreNuevo.trim()) {
      const { data: prof } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (prof?.id) {
        await supabase.from('profiles').update({ nombre: nombreNuevo.trim() } as any).eq('id', prof.id);
      }
    }

    toast({ title: "Usuario creado", description: `Se ha creado el usuario ${email}` });
    setEmail(""); setPassword(""); setNombreNuevo(""); setRole('user');
    fetchUsers();
    setLoading(false);
  };

  const handleDeleteUser = async (userId: string) => {
    const { error: roleError } = await supabase.from('user_roles').delete().eq('user_id', userId);
    if (roleError) {
      toast({ variant: "destructive", title: "Error al eliminar usuario", description: roleError.message });
      return;
    }
    await supabase.from('user_module_access').delete().eq('user_id', userId);
    toast({ title: "Usuario eliminado", description: "El usuario ha sido eliminado del sistema" });
    fetchUsers();
    setDeleteUserId(null);
  };

  const openEdit = async (user: UserWithRole) => {
    setEditingUser(user);
    setEditNombre(user.nombre || "");
    setEditRole(user.role);
    const { data } = await supabase
      .from('user_module_access')
      .select('module_key')
      .eq('user_id', user.id);
    setEditModules((data || []).map((m: any) => m.module_key));
  };

  const toggleModule = (key: string) => {
    setEditModules((prev) => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const toggleCategory = (category: string, allKeys: string[]) => {
    const allSelected = allKeys.every(k => editModules.includes(k));
    if (allSelected) {
      setEditModules(prev => prev.filter(k => !allKeys.includes(k)));
    } else {
      setEditModules(prev => Array.from(new Set([...prev, ...allKeys])));
    }
  };

  const handleSaveEdit = async () => {
    if (!editingUser) return;
    setSavingEdit(true);
    try {
      // Update name
      await supabase.from('profiles').update({ nombre: editNombre.trim() || null } as any).eq('id', editingUser.id);

      // Update role
      await supabase.from('user_roles').delete().eq('user_id', editingUser.id);
      const { error: roleErr } = await supabase.from('user_roles').insert({ user_id: editingUser.id, role: editRole });
      if (roleErr) throw roleErr;

      // Sync module access
      await supabase.from('user_module_access').delete().eq('user_id', editingUser.id);
      if (editModules.length > 0) {
        const rows = editModules.map(k => ({ user_id: editingUser.id, module_key: k }));
        const { error: modErr } = await supabase.from('user_module_access').insert(rows);
        if (modErr) throw modErr;
      }

      toast({ title: "Usuario actualizado", description: `Cambios guardados para ${editingUser.email}` });
      setEditingUser(null);
      fetchUsers();
    } catch (error: any) {
      toast({ variant: "destructive", title: "Error al actualizar", description: error.message });
    } finally {
      setSavingEdit(false);
    }
  };

  const getRoleBadge = (role: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      admin: "destructive", moderator: "secondary", vendedor: "default", user: "default",
    };
    const labels: Record<string, string> = {
      admin: "Administrador", moderator: "Moderador", vendedor: "Vendedor", user: "Usuario",
    };
    return <Badge variant={variants[role]}>{labels[role] || role}</Badge>;
  };

  if (!isAdmin) return <Navigate to="/" />;

  const modulesByCat = {
    operaciones: APP_MODULES.filter(m => m.category === 'operaciones'),
    gestion: APP_MODULES.filter(m => m.category === 'gestion'),
    administracion: APP_MODULES.filter(m => m.category === 'administracion'),
  };

  const isAdminEdit = editRole === 'admin';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-2">
        <Shield className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Administración de Usuarios</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Crear Nuevo Usuario
          </CardTitle>
          <CardDescription>
            Registra nuevos usuarios y asigna sus roles en el sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nombre-nuevo">Nombre</Label>
                <Input
                  id="nombre-nuevo"
                  placeholder="Nombre completo"
                  value={nombreNuevo}
                  onChange={(e) => setNombreNuevo(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Correo Electrónico</Label>
                <Input id="email" type="email" placeholder="usuario@ejemplo.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Contraseña</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={12} />
                <p className="text-xs text-muted-foreground">Mínimo 12 caracteres con mayúsculas, minúsculas, números y caracteres especiales</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={role} onValueChange={(value: any) => setRole(value)}>
                  <SelectTrigger id="role"><SelectValue placeholder="Seleccionar rol" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="moderator">Moderador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" disabled={loading}>{loading ? "Creando..." : "Crear Usuario"}</Button>
            <p className="text-xs text-muted-foreground">
              Después de crear el usuario podrás asignar los módulos a los que tendrá acceso desde el botón de editar.
            </p>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios Registrados</CardTitle>
          <CardDescription>Listado de todos los usuarios y sus roles en el sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Correo Electrónico</TableHead>
                <TableHead>Rol</TableHead>
                <TableHead>Fecha de Registro</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground">No hay usuarios registrados</TableCell></TableRow>
              ) : (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.nombre || <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{new Date(user.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(user)} title="Editar usuario y permisos">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => setDeleteUserId(user.id)} title="Eliminar usuario">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>Esta acción eliminará el usuario del sistema. Esta acción no se puede deshacer.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteUserId && handleDeleteUser(deleteUserId)}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!editingUser} onOpenChange={(open) => !open && setEditingUser(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Usuario</DialogTitle>
            <DialogDescription>{editingUser?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-nombre">Nombre</Label>
                <Input id="edit-nombre" value={editNombre} onChange={(e) => setEditNombre(e.target.value)} placeholder="Nombre completo" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-role">Rol</Label>
                <Select value={editRole} onValueChange={(value: any) => setEditRole(value)}>
                  <SelectTrigger id="edit-role"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Usuario</SelectItem>
                    <SelectItem value="vendedor">Vendedor</SelectItem>
                    <SelectItem value="moderator">Moderador</SelectItem>
                    <SelectItem value="admin">Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-3 pt-2">
              <div>
                <Label className="text-base">Módulos accesibles</Label>
                <p className="text-xs text-muted-foreground">
                  {isAdminEdit
                    ? "Los administradores tienen acceso a todos los módulos automáticamente."
                    : "Selecciona los módulos que este usuario podrá ver en el menú."}
                </p>
              </div>

              {(['operaciones', 'gestion', 'administracion'] as const).map((cat) => {
                const items = modulesByCat[cat];
                const allKeys = items.map(i => i.key);
                const allSelected = allKeys.every(k => editModules.includes(k));
                const someSelected = !allSelected && allKeys.some(k => editModules.includes(k));
                return (
                  <div key={cat} className="border rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        {cat === 'operaciones' ? 'Operaciones' : cat === 'gestion' ? 'Gestión' : 'Administración'}
                      </p>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={isAdminEdit}
                        onClick={() => toggleCategory(cat, allKeys)}
                      >
                        {allSelected ? "Quitar todo" : someSelected ? "Seleccionar todo" : "Seleccionar todo"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {items.map((m) => (
                        <label key={m.key} className="flex items-center gap-2 text-sm cursor-pointer">
                          <Checkbox
                            checked={isAdminEdit ? true : editModules.includes(m.key)}
                            disabled={isAdminEdit}
                            onCheckedChange={() => toggleModule(m.key)}
                          />
                          <span>{m.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>Cancelar</Button>
            <Button onClick={handleSaveEdit} disabled={savingEdit}>
              {savingEdit ? "Guardando..." : "Guardar cambios"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
