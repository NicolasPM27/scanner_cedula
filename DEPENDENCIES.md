# Dependencias y Configuración - Scanner Cédula Colombiana

## 1. Plugins de Capacitor Requeridos

### a) Barcode Scanner (PDF417 - Cédulas Antiguas)
```bash
npm install @capacitor-mlkit/barcode-scanning
npx cap sync
```

### b) Text Recognition / OCR (MRZ - Cédulas Nuevas)
```bash
npm install @capacitor-mlkit/text-recognition
npx cap sync
```

> **Nota:** Ambos plugins usan Google ML Kit bajo el capó, garantizando procesamiento ON-DEVICE.

---

## 2. Configuración Android

### `android/app/src/main/AndroidManifest.xml`

Agregar dentro de `<manifest>`:
```xml
<!-- Permisos de Cámara -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="true" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
```

Agregar dentro de `<application>`:
```xml
<!-- ML Kit Barcode Model (descarga bajo demanda) -->
<meta-data
    android:name="com.google.mlkit.vision.DEPENDENCIES"
    android:value="barcode,ocr" />
```

### `android/app/build.gradle`

Asegurar que el `minSdkVersion` sea al menos 21:
```gradle
android {
    defaultConfig {
        minSdkVersion 21
        // ...
    }
}
```

---

## 3. Configuración iOS

### `ios/App/App/Info.plist`

Agregar las siguientes entradas:
```xml
<!-- Permiso de Cámara -->
<key>NSCameraUsageDescription</key>
<string>Esta aplicación necesita acceso a la cámara para escanear su documento de identidad.</string>

<!-- Permiso de Fotos (opcional, si permites seleccionar desde galería) -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Esta aplicación necesita acceso a sus fotos para procesar imágenes de documentos.</string>
```

### `ios/App/Podfile`

Asegurar la versión mínima de iOS:
```ruby
platform :ios, '13.0'
```

Después de modificar:
```bash
cd ios/App && pod install && cd ../..
```

---

## 4. Configuración Capacitor

### `capacitor.config.ts`

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.tuempresa.scanner',
  appName: 'Scanner Cédula',
  webDir: 'www',
  plugins: {
    // Configuración del Barcode Scanner
    BarcodeScanner: {
      // Formatos habilitados (PDF417 para cédulas antiguas)
      formats: ['PDF417'],
      // Usar modelo de Google para mejor precisión
      googleBarcodeScannerModuleInstallState: true
    }
  }
};

export default config;
```

---

## 5. Comandos de Instalación Completa

```bash
# 1. Instalar plugins
npm install @capacitor-mlkit/barcode-scanning @capacitor-mlkit/text-recognition

# 2. Sincronizar con proyectos nativos
npx cap sync

# 3. Abrir en Android Studio (para verificar configuración)
npx cap open android

# 4. Abrir en Xcode (para verificar configuración)
npx cap open ios
```

---

## 6. Verificación de Instalación

Ejecutar en el proyecto:
```bash
npx cap doctor
```

Verificar que ambos plugins aparezcan en la lista de plugins instalados.
