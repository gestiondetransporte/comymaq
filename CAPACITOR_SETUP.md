# Configuración de Capacitor para Android/iOS

## Requisitos Previos
- Node.js instalado
- Git instalado
- Para iOS: Mac con Xcode instalado
- Para Android: Android Studio instalado

## Pasos de Configuración

### 1. Exportar y Clonar el Proyecto
1. Exporta el proyecto a tu repositorio de GitHub usando el botón "Export to Github" en Lovable
2. Clona el repositorio en tu computadora:
   ```bash
   git clone <tu-repositorio-url>
   cd <nombre-del-proyecto>
   ```

### 2. Instalar Dependencias
```bash
npm install
```

### 3. Inicializar Capacitor (ya está hecho)
El archivo `capacitor.config.ts` ya está configurado con:
- App ID: `app.lovable.81259e17de1246949e58a115feb9395a`
- App Name: `COMYMAQ`
- Hot reload habilitado para desarrollo

### 4. Agregar Plataformas

#### Para Android:
```bash
npx cap add android
```

#### Para iOS (solo en Mac):
```bash
npx cap add ios
```

### 5. Actualizar Dependencias Nativas
```bash
# Para Android
npx cap update android

# Para iOS
npx cap update ios
```

### 6. Construir el Proyecto
```bash
npm run build
```

### 7. Sincronizar Cambios
```bash
npx cap sync
```

### 8. Ejecutar en Dispositivo o Emulador

#### Android:
```bash
npx cap run android
```

#### iOS (solo en Mac con Xcode):
```bash
npx cap run ios
```

## Permisos de Cámara

La aplicación solicita automáticamente permisos de cámara cuando intentas escanear un código QR.

### Android
Los permisos se configuran automáticamente en `android/app/src/main/AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.CAMERA" />
```

Para verificar permisos en Android Studio:
1. Abre el proyecto en Android Studio
2. Navega a `android/app/src/main/AndroidManifest.xml`
3. Asegúrate que la línea de permisos de cámara esté presente

### iOS
Los permisos se configuran automáticamente en `ios/App/App/Info.plist`:
```xml
<key>NSCameraUsageDescription</key>
<string>Esta aplicación necesita acceso a la cámara para escanear códigos QR de equipos</string>
```

Para verificar permisos en Xcode:
1. Abre el proyecto en Xcode
2. Selecciona el target "App"
3. Ve a la pestaña "Info"
4. Busca "Privacy - Camera Usage Description"

### Verificar que los permisos funcionan

**En la web:**
- Al hacer clic en "Escanear QR", el navegador mostrará un popup pidiendo permiso para usar la cámara
- Acepta el permiso para continuar

**En Android/iOS:**
- Al hacer clic en "Escanear QR", se abrirá la cámara nativa directamente
- Si es la primera vez, el sistema operativo mostrará un diálogo pidiendo permiso
- Si los permisos fueron denegados previamente, debes ir a:
  - **Android**: Ajustes → Apps → COMYMAQ → Permisos → Cámara
  - **iOS**: Ajustes → COMYMAQ → Permitir acceso a Cámara

### Problemas comunes con permisos

**"Permiso denegado":**
1. Verifica que los permisos estén en el manifest/Info.plist
2. Desinstala y reinstala la app
3. Verifica los permisos de la app en ajustes del dispositivo

**La cámara no se abre:**
1. Verifica que el dispositivo tenga cámara
2. Prueba la cámara con otra app para asegurarte que funciona
3. Revisa los logs de la consola (ver sección de debugging)

## Desarrollo con Hot Reload

El proyecto está configurado para usar hot reload desde el sandbox de Lovable:
- URL: `https://81259e17-de12-4694-9e58-a115feb9395a.lovableproject.com`
- Esto permite ver cambios en tiempo real sin recompilar

Para desarrollo local sin hot reload, edita `capacitor.config.ts` y comenta la sección `server`.

## Sincronización de Código

Después de hacer cambios en el código:
1. `git pull` - Descarga los últimos cambios
2. `npm run build` - Construye el proyecto
3. `npx cap sync` - Sincroniza con las plataformas nativas
4. `npx cap run android` o `npx cap run ios` - Ejecuta la app

## Funcionalidades Offline

La aplicación incluye:
- ✅ Detección automática de estado online/offline
- ✅ Almacenamiento local de datos pendientes
- ✅ Sincronización manual con botón dedicado
- ✅ Indicador visual de conexión
- ✅ Contador de cambios pendientes

## Solución de Problemas

### Error de permisos de cámara
- Android: Verifica que los permisos estén en AndroidManifest.xml
- iOS: Verifica que NSCameraUsageDescription esté en Info.plist

### La app no sincroniza
- Verifica que estés conectado a internet
- Revisa los logs en la consola del navegador o en Android Studio/Xcode
- Usa el botón de "Sincronizar" en la app

### Hot reload no funciona
- Verifica que tu dispositivo/emulador esté en la misma red
- Intenta con `cleartext: true` en capacitor.config.ts
