import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useOffline } from '@/hooks/useOffline';
import { getPendingSyncs, syncPendingChanges } from '@/lib/offlineStorage';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw,
  Lock,
  DollarSign,
  Upload,
  Trash2,
  Image
} from 'lucide-react';

interface ModeloConfig {
  id: string;
  modelo: string;
  precio_lista: number | null;
  foto_url: string | null;
}

const passwordSchema = z.string()
  .min(12, "La contraseña debe tener al menos 12 caracteres")
  .regex(/[A-Z]/, "Debe contener al menos una mayúscula")
  .regex(/[a-z]/, "Debe contener al menos una minúscula")
  .regex(/[0-9]/, "Debe contener al menos un número")
  .regex(/[^A-Za-z0-9]/, "Debe contener al menos un carácter especial (!@#$%^&*)");

export default function Configuracion() {
  const { isOnline } = useOffline();
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const { toast } = useToast();

  // Model pricing state
  const [modelos, setModelos] = useState<ModeloConfig[]>([]);
  const [existingModelos, setExistingModelos] = useState<string[]>([]);
  const [isLoadingModelos, setIsLoadingModelos] = useState(false);
  const [uploadingModelo, setUploadingModelo] = useState<string | null>(null);

  useEffect(() => {
    loadPendingCount();
  }, []);

  const loadPendingCount = async () => {
    const pending = await getPendingSyncs();
    setPendingCount(pending.length);
  };

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const result = await syncPendingChanges();
      if (result.success > 0) {
        toast({
          title: "Sincronización exitosa",
          description: `Se sincronizaron ${result.success} cambios`
        });
        loadPendingCount();
      }
      if (result.failed > 0) {
        toast({
          title: "Error en sincronización",
          description: `${result.failed} cambios no se pudieron sincronizar`,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo sincronizar los cambios",
        variant: "destructive"
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Load modelos on mount
  useEffect(() => {
    loadModelos();
    loadExistingModelos();
  }, []);

  const loadModelos = async () => {
    setIsLoadingModelos(true);
    try {
      const { data, error } = await supabase
        .from('modelos_configuracion')
        .select('*')
        .order('modelo');
      
      if (error) throw error;
      setModelos(data || []);
    } catch (error) {
      console.error('Error loading modelos:', error);
    } finally {
      setIsLoadingModelos(false);
    }
  };

  const loadExistingModelos = async () => {
    try {
      const { data, error } = await supabase
        .from('equipos')
        .select('modelo')
        .not('modelo', 'is', null)
        .order('modelo');
      
      if (error) throw error;
      
      // Get unique models
      const uniqueModelos = [...new Set(data?.map(e => e.modelo).filter(Boolean) as string[])];
      setExistingModelos(uniqueModelos);
    } catch (error) {
      console.error('Error loading existing modelos:', error);
    }
  };

  const handleQuickAddModelo = async (modelo: string) => {
    // Check if already configured
    if (modelos.some(m => m.modelo.toUpperCase() === modelo.toUpperCase())) {
      toast({ title: "Info", description: `Modelo ${modelo} ya está configurado` });
      return;
    }

    // Get the price from inventory if it exists
    const { data: equipoData } = await supabase
      .from('equipos')
      .select('precio_lista')
      .ilike('modelo', modelo)
      .not('precio_lista', 'is', null)
      .limit(1);

    const precioFromInventario = equipoData?.[0]?.precio_lista || null;

    try {
      const { error } = await supabase
        .from('modelos_configuracion')
        .insert({ modelo: modelo.toUpperCase(), precio_lista: precioFromInventario });

      if (error) throw error;

      toast({ title: "Modelo agregado", description: `Modelo ${modelo} agregado${precioFromInventario ? ` con precio $${precioFromInventario}` : '. Configura su precio.'}` });
      loadModelos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteModelo = async (id: string, modelo: string) => {
    try {
      // Delete photo from storage if exists
      const modelConfig = modelos.find(m => m.id === id);
      if (modelConfig?.foto_url) {
        const fileName = `${modelo}.png`;
        await supabase.storage.from('modelos').remove([fileName]);
      }

      const { error } = await supabase
        .from('modelos_configuracion')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({ title: "Modelo eliminado" });
      loadModelos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handlePhotoUpload = async (modeloId: string, modelo: string, file: File) => {
    setUploadingModelo(modeloId);
    try {
      const fileName = `${modelo}.png`;
      
      const { error: uploadError } = await supabase.storage
        .from('modelos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('modelos')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from('modelos_configuracion')
        .update({ foto_url: publicUrl })
        .eq('id', modeloId);

      if (updateError) throw updateError;

      toast({ title: "Foto actualizada", description: `Foto para ${modelo} subida exitosamente` });
      loadModelos();
    } catch (error: any) {
      toast({ title: "Error al subir foto", description: error.message, variant: "destructive" });
    } finally {
      setUploadingModelo(null);
    }
  };

  const handlePrecioUpdate = async (modeloId: string, modelo: string, precio: string) => {
    try {
      const precioNumerico = precio ? parseFloat(precio) : null;
      
      // Update model configuration
      const { error: configError } = await supabase
        .from('modelos_configuracion')
        .update({ precio_lista: precioNumerico })
        .eq('id', modeloId);

      if (configError) throw configError;

      // Update all equipment with this model
      const { data: updatedEquipos, error: equiposError } = await supabase
        .from('equipos')
        .update({ precio_lista: precioNumerico })
        .ilike('modelo', modelo)
        .select('id');

      if (equiposError) throw equiposError;

      const count = updatedEquipos?.length || 0;
      
      if (count > 0) {
        toast({ 
          title: "Precio actualizado", 
          description: `Se actualizó el precio de ${count} equipo(s) con modelo ${modelo}` 
        });
      }
      
      loadModelos();
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar que las contraseñas coincidan
    if (newPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Las contraseñas nuevas no coinciden",
      });
      return;
    }

    // Validar fortaleza de la contraseña
    try {
      passwordSchema.parse(newPassword);
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: "destructive",
          title: "Contraseña inválida",
          description: error.errors[0].message,
        });
        return;
      }
    }

    setIsChangingPassword(true);

    try {
      // Primero verificar la contraseña actual re-autenticando
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error("Usuario no encontrado");
      }

      // Intentar iniciar sesión con la contraseña actual para verificarla
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });

      if (signInError) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "La contraseña actual es incorrecta",
        });
        setIsChangingPassword(false);
        return;
      }

      // Actualizar la contraseña
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña ha sido cambiada exitosamente",
      });

      // Limpiar formulario
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error al cambiar contraseña",
        description: error.message || "No se pudo actualizar la contraseña",
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Configuración</h1>
          <p className="text-muted-foreground">
            Gestiona los permisos y configuración de la aplicación
          </p>
        </div>

        {/* Estado de Conexión */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {isOnline ? <Wifi className="h-5 w-5 text-green-500" /> : <WifiOff className="h-5 w-5 text-red-500" />}
              Estado de Conexión
            </CardTitle>
            <CardDescription>
              Estado actual de la conexión a internet y sincronización
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Estado:</span>
              <Badge variant={isOnline ? "default" : "destructive"}>
                {isOnline ? 'Conectado' : 'Sin conexión'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span>Cambios pendientes:</span>
              <Badge variant={pendingCount > 0 ? "secondary" : "outline"}>
                {pendingCount}
              </Badge>
            </div>
            {pendingCount > 0 && isOnline && (
              <Button 
                onClick={handleSync} 
                disabled={isSyncing}
                className="w-full"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
              </Button>
            )}
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Cambiar Contraseña */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Cambiar Contraseña
            </CardTitle>
            <CardDescription>
              Actualiza tu contraseña para mantener tu cuenta segura
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Contraseña Actual</Label>
                <Input
                  id="current-password"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  placeholder="Ingresa tu contraseña actual"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nueva Contraseña</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={12}
                  placeholder="Ingresa tu nueva contraseña"
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 12 caracteres con mayúsculas, minúsculas, números y caracteres especiales
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nueva Contraseña</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={12}
                  placeholder="Confirma tu nueva contraseña"
                />
              </div>

              <Button 
                type="submit" 
                disabled={isChangingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full"
              >
                {isChangingPassword ? 'Actualizando...' : 'Cambiar Contraseña'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Separator className="my-6" />

        {/* Configuración de Modelos */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Precios y Fotos por Modelo
            </CardTitle>
            <CardDescription>
              Configura precios de lista y fotografías para cada modelo de equipo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Show existing models from inventory that can be configured */}
            {(() => {
              const unconfiguredModelos = existingModelos.filter(
                em => !modelos.some(m => m.modelo.toUpperCase() === em.toUpperCase())
              );
              
              return (
                <div className="space-y-4">
                  {unconfiguredModelos.length > 0 && (
                    <div className="p-3 bg-muted/50 rounded-md space-y-2">
                      <Label className="text-sm font-medium">Modelos en Inventario sin Configurar ({unconfiguredModelos.length})</Label>
                      <div className="flex flex-wrap gap-2">
                        {unconfiguredModelos.map((modelo) => (
                          <Badge
                            key={modelo}
                            variant="outline"
                            className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                            onClick={() => handleQuickAddModelo(modelo)}
                          >
                            + {modelo}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground">Clic en un modelo para agregarlo y configurar su precio</p>
                    </div>
                  )}
                  
                  {unconfiguredModelos.length === 0 && modelos.length === 0 && (
                    <div className="text-center py-4 text-muted-foreground">
                      No hay modelos en el inventario para configurar
                    </div>
                  )}
                </div>
              );
            })()}

            {/* Models table */}
            {isLoadingModelos ? (
              <div className="text-center py-4 text-muted-foreground">Cargando modelos...</div>
            ) : modelos.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">No hay modelos configurados</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Precio Lista</TableHead>
                    <TableHead>Foto</TableHead>
                    <TableHead className="w-24">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {modelos.map((modelo) => (
                    <TableRow key={modelo.id}>
                      <TableCell className="font-medium">{modelo.modelo}</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-32"
                          defaultValue={modelo.precio_lista?.toString() || ''}
                          onBlur={(e) => handlePrecioUpdate(modelo.id, modelo.modelo, e.target.value)}
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {modelo.foto_url ? (
                            <img 
                              src={modelo.foto_url} 
                              alt={modelo.modelo}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <Image className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoUpload(modelo.id, modelo.modelo, file);
                              }}
                              disabled={uploadingModelo === modelo.id}
                            />
                            <Button variant="outline" size="sm" asChild disabled={uploadingModelo === modelo.id}>
                              <span>
                                <Upload className="h-4 w-4" />
                              </span>
                            </Button>
                          </label>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteModelo(modelo.id, modelo.modelo)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

      </div>
  );
}
