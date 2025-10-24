# Funcionalidades Móviles Implementadas

## ✅ Modo Offline

### Estado Actual
- **Hook `useOffline`**: Detecta automáticamente el estado de conexión
- **Sistema de almacenamiento**: Usa `localforage` para guardar datos offline
- **Cola de sincronización**: Guarda cambios pendientes cuando no hay conexión
- **Componente `SyncButton`**: Permite sincronizar manualmente los cambios
- **Indicador offline**: Banner visual cuando no hay conexión

### Cómo funciona
1. Los cambios se guardan localmente cuando no hay conexión
2. Se mantiene una cola de operaciones pendientes
3. Al recuperar la conexión, aparece un botón para sincronizar
4. Los datos se sincronizan automáticamente con el backend

### Uso en el código
```typescript
import { useOffline } from '@/hooks/useOffline';
import { savePendingSync, cacheData, getCachedData } from '@/lib/offlineStorage';

// En tu componente
const { isOnline, isOffline } = useOffline();

// Guardar cambio pendiente
if (isOffline) {
  await savePendingSync({
    type: 'insert',
    table: 'equipos',
    data: newEquipo
  });
}
```

## ✅ Permisos de Cámara

### Estado Actual
- **Paquete**: `@capacitor/camera` instalado y configurado
- **Permisos**: Configurados automáticamente para Android e iOS
- **Implementación**: Funcionando en `QRScanner` component

### Uso
- Los permisos se solicitan automáticamente al usar el escáner QR
- Funciona en web, Android e iOS

## ✅ Permisos de Ubicación

### Estado Actual
- **Paquete**: `@capacitor/geolocation` instalado
- **Hook**: `useGeolocation` implementado con funciones completas
- **Permisos**: Gestión automática de permisos

### Funciones disponibles
```typescript
import { useGeolocation } from '@/hooks/useGeolocation';

const { 
  position,           // Posición actual (lat, lon, etc.)
  hasPermission,      // Si tiene permiso concedido
  requestPermissions, // Solicitar permisos
  getCurrentPosition  // Obtener ubicación actual
} = useGeolocation();
```

### Configuración requerida (Android/iOS)

**Android** - Agregar a `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
```

**iOS** - Ya incluido en `ios/App/App/Info.plist`:
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Necesitamos tu ubicación para registrar la posición de los equipos</string>
```

## ✅ Notificaciones Push

### Estado Actual
- **Paquete**: `@capacitor/push-notifications` instalado
- **Hook**: `usePushNotifications` implementado
- **Listeners**: Configurados para recibir y manejar notificaciones

### Funciones disponibles
```typescript
import { usePushNotifications } from '@/hooks/usePushNotifications';

const { 
  hasPermission,           // Si tiene permiso concedido
  token,                   // Token de registro (para backend)
  requestPermissions,      // Solicitar permisos
  sendLocalNotification    // Enviar notificación de prueba
} = usePushNotifications();
```

### Configuración requerida

**Android** - Configurar Firebase:
1. Descargar `google-services.json` de Firebase Console
2. Colocar en `android/app/google-services.json`
3. Las dependencias ya están configuradas

**iOS** - Configurar APNs:
1. Configurar certificados APNs en Apple Developer
2. Subir certificados a Firebase Console
3. Los permisos ya están en `Info.plist`

## 📱 Página de Configuración

Se creó una página completa en `/configuracion` donde los usuarios pueden:

- ✅ Ver el estado de conexión (online/offline)
- ✅ Ver cantidad de cambios pendientes de sincronizar
- ✅ Sincronizar cambios manualmente
- ✅ Gestionar permisos de ubicación
- ✅ Gestionar permisos de notificaciones push
- ✅ Probar cada funcionalidad
- ✅ Ver el estado de permisos de cámara

## 🚀 Próximos pasos

### Para usar en producción:

1. **Sincronizar el proyecto**:
   ```bash
   npm run build
   npx cap sync
   ```

2. **Abrir en Android Studio / Xcode**:
   ```bash
   npx cap open android  # Para Android
   npx cap open ios      # Para iOS
   ```

3. **Configurar notificaciones**:
   - Android: Agregar `google-services.json` de Firebase
   - iOS: Configurar certificados APNs

4. **Probar en dispositivo real**:
   - Las notificaciones push no funcionan en emuladores
   - La ubicación funciona mejor en dispositivos reales

## 📝 Notas importantes

- El modo offline ya está funcional en la web
- Los permisos se solicitan automáticamente cuando se necesitan
- En la web, algunas funcionalidades tienen limitaciones (ej: notificaciones push)
- Para desarrollo, usa `npx cap run android/ios` para probar en dispositivos
- La configuración de hot-reload está en `capacitor.config.ts`

## 🔗 Documentación útil

- [Capacitor Geolocation](https://capacitorjs.com/docs/apis/geolocation)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Capacitor Camera](https://capacitorjs.com/docs/apis/camera)
- [LocalForage (offline storage)](https://localforage.github.io/localForage/)
