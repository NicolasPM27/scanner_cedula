# Guía de Configuración - Scanner Cédula

Esta guía detalla los pasos necesarios para configurar el entorno de desarrollo de la aplicación Scanner Cédula.

## Tabla de Contenidos

- [Requisitos del Sistema](#requisitos-del-sistema)
- [Instalación de Herramientas](#instalación-de-herramientas)
- [Configuración del Proyecto](#configuración-del-proyecto)
- [Desarrollo](#desarrollo)
- [Build y Deploy](#build-y-deploy)
- [Troubleshooting](#troubleshooting)

---

## Requisitos del Sistema

### Software Requerido

| Herramienta | Versión Mínima | Notas |
|-------------|----------------|-------|
| Node.js | v18+ | Recomendado v20 LTS |
| npm | v9+ | Incluido con Node.js |
| Git | v2.30+ | Control de versiones |

### Para desarrollo iOS (solo macOS)

| Herramienta | Versión Mínima | Notas |
|-------------|----------------|-------|
| macOS | Ventura 13+ | Requerido para Xcode |
| Xcode | v15+ | Descargar desde App Store |
| CocoaPods | v1.14+ | Requerido para ML Kit |

### Para desarrollo Android

| Herramienta | Versión Mínima | Notas |
|-------------|----------------|-------|
| Android Studio | Hedgehog+ | Incluye SDK y emuladores |
| Java JDK | v17 | OpenJDK recomendado |

---

## Instalación de Herramientas

### 1. Node.js

**macOS (usando Homebrew):**
```bash
brew install node@20
```

**Windows (usando Chocolatey):**
```powershell
choco install nodejs-lts
```

**Alternativa universal:** Descargar desde [nodejs.org](https://nodejs.org/)

### 2. Ionic CLI y Angular CLI

```bash
npm install -g @ionic/cli @angular/cli
```

Verificar instalación:
```bash
ionic --version
ng version
```

### 3. CocoaPods (solo macOS - requerido para iOS)

```bash
sudo gem install cocoapods
pod --version
```

Si tienes problemas con permisos:
```bash
brew install cocoapods
```

### 4. Xcode (solo macOS)

1. Descargar Xcode desde App Store
2. Abrir Xcode y aceptar la licencia
3. Instalar Command Line Tools:
```bash
xcode-select --install
```

### 5. Android Studio

1. Descargar desde [developer.android.com/studio](https://developer.android.com/studio)
2. Durante la instalación, asegurar que se instalen:
   - Android SDK
   - Android SDK Platform-Tools
   - Android Emulator
3. Configurar variables de entorno:

**macOS/Linux (~/.zshrc o ~/.bashrc):**
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/emulator
export PATH=$PATH:$ANDROID_HOME/platform-tools
```

**Windows (Variables de entorno del sistema):**
```
ANDROID_HOME = C:\Users\<usuario>\AppData\Local\Android\Sdk
PATH += %ANDROID_HOME%\emulator
PATH += %ANDROID_HOME%\platform-tools
```

---

## Configuración del Proyecto

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd scanner_cedula
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Sincronizar plataformas nativas

```bash
npx cap sync
```

### 4. Configuración iOS (solo macOS)

```bash
cd ios/App
pod install
cd ../..
```

### 5. Verificar configuración

```bash
npx cap doctor
```

---

## Desarrollo

### Desarrollo Web (navegador)

Para desarrollo de UI y lógica que no requiera funcionalidades nativas:

```bash
npm start
# o
ionic serve
```

La aplicación estará disponible en `http://localhost:4200`

### Desarrollo iOS

```bash
# Construir y abrir en Xcode
ionic build
npx cap sync ios
npx cap open ios
```

En Xcode:
1. Seleccionar un simulador o dispositivo
2. Click en el botón "Play" o `Cmd + R`

**Ejecución directa (sin abrir Xcode):**
```bash
npx cap run ios
```

### Desarrollo Android

```bash
# Construir y abrir en Android Studio
ionic build
npx cap sync android
npx cap open android
```

En Android Studio:
1. Esperar a que Gradle sincronice
2. Seleccionar un emulador o dispositivo
3. Click en "Run" o `Shift + F10`

**Ejecución directa (sin abrir Android Studio):**
```bash
npx cap run android
```

### Live Reload (desarrollo en dispositivo)

Para ver cambios en tiempo real en un dispositivo/emulador:

```bash
# iOS
ionic cap run ios --livereload --external

# Android
ionic cap run android --livereload --external
```

---

## Build y Deploy

### Build de Producción

```bash
# Build web optimizado
ionic build --prod

# Sincronizar con plataformas
npx cap sync
```

### Build iOS (Release)

1. Abrir proyecto en Xcode: `npx cap open ios`
2. Seleccionar "Any iOS Device" como destino
3. Product > Archive
4. Distribuir a App Store o exportar IPA

### Build Android (Release)

1. Abrir proyecto en Android Studio: `npx cap open android`
2. Build > Generate Signed Bundle/APK
3. Seguir el asistente para firmar la app

---

## Permisos Nativos

### iOS - Info.plist

Los siguientes permisos deben estar configurados en `ios/App/App/Info.plist`:

```xml
<key>NSCameraUsageDescription</key>
<string>Esta app necesita acceso a la cámara para escanear documentos</string>

<key>NSPhotoLibraryUsageDescription</key>
<string>Esta app necesita acceso a fotos para seleccionar imágenes de documentos</string>
```

### Android - AndroidManifest.xml

Los siguientes permisos deben estar en `android/app/src/main/AndroidManifest.xml`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="true" />
```

---

## Troubleshooting

### Problemas comunes

#### Error: "CocoaPods not installed"
```bash
sudo gem install cocoapods
# o con Homebrew
brew install cocoapods
```

#### Error: "pod install" falla
```bash
cd ios/App
pod deintegrate
pod cache clean --all
pod install
```

#### Error: Gradle sync failed (Android)
1. File > Invalidate Caches and Restart
2. Verificar que ANDROID_HOME esté configurado
3. Actualizar Gradle si es necesario

#### Error: "Command not found: cap"
```bash
npm install @capacitor/cli --save-dev
# o usar npx
npx cap <comando>
```

#### La cámara no funciona en el simulador iOS
Los simuladores de iOS no tienen cámara real. Usar un dispositivo físico para probar funcionalidades de cámara y ML Kit.

#### ML Kit no funciona
1. Verificar que CocoaPods esté instalado (iOS)
2. Verificar conexión a internet (ML Kit descarga modelos)
3. Probar en dispositivo físico, no en emulador

### Limpiar y reconstruir

Si tienes problemas persistentes:

```bash
# Limpiar todo
rm -rf node_modules
rm -rf www
rm -rf ios/App/Pods
rm -rf android/app/build

# Reinstalar
npm install
ionic build
npx cap sync
cd ios/App && pod install && cd ../..
```

---

## Comandos Útiles

| Comando | Descripción |
|---------|-------------|
| `npm start` | Iniciar servidor de desarrollo |
| `npm run build` | Build de producción |
| `npm run lint` | Ejecutar linter |
| `npm test` | Ejecutar tests |
| `npx cap sync` | Sincronizar web con plataformas nativas |
| `npx cap open ios` | Abrir proyecto en Xcode |
| `npx cap open android` | Abrir proyecto en Android Studio |
| `npx cap run ios` | Ejecutar en dispositivo/simulador iOS |
| `npx cap run android` | Ejecutar en dispositivo/emulador Android |
| `npx cap doctor` | Diagnosticar problemas de configuración |

---

## Estructura del Proyecto

```
scanner_cedula/
├── src/                    # Código fuente Angular/Ionic
│   ├── app/               # Componentes y páginas
│   ├── assets/            # Recursos estáticos
│   ├── environments/      # Configuración por entorno
│   └── theme/             # Variables de estilo
├── ios/                    # Proyecto nativo iOS
├── android/                # Proyecto nativo Android
├── www/                    # Build de producción (generado)
├── capacitor.config.ts     # Configuración de Capacitor
├── angular.json            # Configuración de Angular
└── package.json            # Dependencias y scripts
```

---

## Recursos Adicionales

- [Documentación Ionic](https://ionicframework.com/docs)
- [Documentación Capacitor](https://capacitorjs.com/docs)
- [Documentación Angular](https://angular.dev)
- [ML Kit Barcode Scanning](https://github.com/capawesome-team/capacitor-mlkit)
- [ML Kit Text Recognition](https://github.com/nicobuzeta/capacitor-plugin-ml-kit-text-recognition)

---

## Contacto

Si tienes problemas con la configuración, contacta al equipo de desarrollo.
