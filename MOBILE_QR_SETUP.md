# Configuración del Lector QR en Dispositivos Móviles (iOS/Android)

## ✅ Cambios Implementados

### 1. Importación CSV de Contratos
- Ahora la importación **actualiza** contratos existentes si el `folio_contrato` ya existe
- Si el `folio_contrato` es nuevo, se **inserta** como nuevo registro
- Esto permite mantener la base de datos sincronizada sin duplicados

### 2. Lector QR Nativo con Permisos
- Se mejoró el manejo de permisos de cámara para dispositivos móviles
- Ahora verifica el estado de permisos antes de abrir la cámara
- Muestra mensajes claros cuando se necesitan permisos
- Registra logs para facilitar el debugging

## 📱 Configuración para Dispositivos Móviles

### Requisitos Previos
- Tener instalado `@capacitor/camera` (ya está en tu proyecto)
- Tener instalado `@capacitor/core` (ya está en tu proyecto)

### Pasos para Probar en Dispositivo Real

#### 1. Exportar a GitHub
1. En Lovable, haz clic en "Export to GitHub"
2. Clona el repositorio en tu computadora local

#### 2. Instalar Dependencias
```bash
cd tu-proyecto
npm install
```

#### 3. Agregar Plataformas
```bash
# Para iOS (requiere Mac con Xcode)
npx cap add ios

# Para Android (requiere Android Studio)
npx cap add android
```

#### 4. Configurar Permisos

**Para iOS** - Edita `ios/App/App/Info.plist` y agrega:
```xml
<key>NSCameraUsageDescription</key>
<string>Esta app necesita acceso a la cámara para escanear códigos QR de equipos</string>
```

**Para Android** - Edita `android/app/src/main/AndroidManifest.xml` y verifica que tenga:
```xml
<uses-permission android:name="android.permission.CAMERA" />
```

#### 5. Construir y Sincronizar
```bash
npm run build
npx cap sync
```

#### 6. Abrir en IDE Nativo

**Para iOS:**
```bash
npx cap open ios
```
- Se abrirá Xcode
- Conecta tu iPhone
- Selecciona tu dispositivo
- Haz clic en el botón "Play" para compilar e instalar

**Para Android:**
```bash
npx cap open android
```
- Se abrirá Android Studio
- Conecta tu dispositivo Android o usa un emulador
- Haz clic en "Run" para compilar e instalar

### 7. Probar el Scanner QR
1. Abre la app en tu dispositivo
2. Ve a la sección donde está el botón "Escanear QR"
3. Al hacer clic, la app solicitará permisos de cámara
4. Acepta los permisos
5. La cámara se abrirá para escanear códigos QR

## 🔍 Debugging

Si los permisos no funcionan:

1. **Verifica los logs:**
   - Los logs están disponibles en la consola de Xcode (iOS) o Android Studio (Android)
   - Busca mensajes como "Camera permission status:" para ver el estado

2. **Verifica permisos manualmente:**
   - **iOS:** Configuración → Tu App → Permisos → Cámara
   - **Android:** Configuración → Apps → Tu App → Permisos → Cámara

3. **Reinstala la app:**
   - A veces es necesario desinstalar y reinstalar para que los permisos se registren correctamente

## 🌐 Probando en el Navegador

En navegadores web (no móvil nativo), el lector QR usa la API de WebRTC que también requiere permisos de cámara pero se maneja automáticamente por el navegador.

## 📝 Notas Importantes

- El archivo `capacitor.config.ts` ya está configurado con hot-reload desde Lovable
- Los permisos de cámara se solicitan automáticamente la primera vez
- Si el usuario niega los permisos, debe habilitarlos manualmente en la configuración del sistema
- En iOS, los permisos se solicitan solo una vez; si se niegan, el usuario debe ir a Configuración

## 🆘 Problemas Comunes

**Problema:** "No se pudo acceder a la cámara"
- **Solución:** Verifica que los permisos estén configurados en Info.plist (iOS) o AndroidManifest.xml (Android)

**Problema:** "Permission denied"
- **Solución:** Ve a la configuración del dispositivo y habilita manualmente el permiso de cámara para la app

**Problema:** La cámara se abre pero no detecta QR
- **Solución:** Asegúrate de que el código QR esté bien iluminado y enfocado
