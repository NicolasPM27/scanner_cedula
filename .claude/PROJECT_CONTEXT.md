# Scanner Cédula Colombiana - Contexto del Proyecto

> Documento generado: 2026-01-28
> Framework: Angular + Ionic Capacitor
> Propósito: Escaneo y parsing de cédulas colombianas (antiguas y nuevas)

---

## 1. Resumen Ejecutivo

Este módulo permite escanear y extraer datos de documentos de identidad colombianos usando procesamiento **ON-DEVICE** con Google ML Kit. Soporta dos tipos de cédulas:

| Tipo | Tecnología | Ubicación del código |
|------|------------|---------------------|
| **Cédula Antigua** (amarilla) | Código de barras PDF417 | Parte posterior |
| **Cédula Nueva** (holográfica) | MRZ (Machine Readable Zone) | Parte posterior, 3 líneas de texto |

---

## 2. Arquitectura del Proyecto

```
scanner_cedula/
├── .claude/
│   └── PROJECT_CONTEXT.md          # Este archivo
├── DEPENDENCIES.md                  # Guía de instalación de plugins
└── src/app/
    ├── data/
    │   └── localidades.data.ts     # Catálogo DIVIPOLA (1,190+ municipios)
    ├── models/
    │   ├── cedula.model.ts         # Interfaces y tipos TypeScript
    │   └── index.ts                # Barrel exports
    ├── services/
    │   ├── cedula-parser.service.ts    # Lógica de parsing PDF417 y MRZ
    │   ├── scanner.service.ts          # Abstracción de plugins nativos
    │   └── index.ts                    # Barrel exports
    └── example/
        └── scan-cedula.component.ts    # Componente de demostración
```

---

## 3. Dependencias Requeridas

### Plugins de Capacitor (ML Kit)

```bash
npm install @capacitor-mlkit/barcode-scanning @capacitor-mlkit/text-recognition
npx cap sync
```

### Configuración Android (`AndroidManifest.xml`)

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="true" />

<application>
    <meta-data
        android:name="com.google.mlkit.vision.DEPENDENCIES"
        android:value="barcode,ocr" />
</application>
```

### Configuración iOS (`Info.plist`)

```xml
<key>NSCameraUsageDescription</key>
<string>Esta aplicación necesita acceso a la cámara para escanear su documento de identidad.</string>
```

---

## 4. Especificaciones Técnicas

### 4.1 PDF417 (Cédula Antigua)

**Fuente:** https://github.com/Eitol/colombian-cedula-reader

#### Características Físicas
- Longitud total: **~530 bytes**
- Codificación: **latin-1** (ISO-8859-1)
- Separador de campos: carácter nulo `\x00`
- Identificador: contiene string `"PubDSK_"`

#### Estructura de Segmentos

```
Segmento 0: [2 chars basura] + Código AFIS
Segmento 1: Identificador "PubDSK_"
Segmento 2: Tarjeta Dactilar (8) + Número Documento (10) + Primer Apellido
Segmento 3: Segundo Apellido
Segmento 4: Primer Nombre
Segmento 5: Segundo Nombre (puede terminar en +/- si está vacío)
Segmento 6: Datos demográficos compactos
```

#### Datos Demográficos (Segmento 6)

```
Posición:  [?] G YYYY MM DD MM DDD [?] RH
              │  │    │  │  │   │      │
              │  │    │  │  │   │      └─ Tipo de sangre (2 chars)
              │  │    │  │  │   └──────── Código departamento (3 dígitos)
              │  │    │  │  └──────────── Código municipio (2 dígitos)
              │  │    │  └─────────────── Día nacimiento (2 dígitos)
              │  │    └────────────────── Mes nacimiento (2 dígitos)
              │  └─────────────────────── Año nacimiento (4 dígitos)
              └────────────────────────── Género (M/F)
```

#### Campos Extraídos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `codigoAfis` | string | Sistema Automatizado de Identificación de Huellas |
| `tarjetaDactilar` | string | Número de tarjeta dactilar (8 dígitos) |
| `numeroDocumento` | string | Número de cédula (sin ceros a la izquierda) |
| `primerApellido` | string | Primer apellido |
| `segundoApellido` | string | Segundo apellido (puede ser vacío) |
| `primerNombre` | string | Primer nombre |
| `segundoNombre` | string | Segundo nombre (puede ser vacío) |
| `fechaNacimiento` | string | Formato ISO: YYYY-MM-DD |
| `genero` | 'M' \| 'F' | Género del titular |
| `rh` | string | Tipo de sangre (ej: "O+", "A-") |
| `codigoMunicipio` | string | Código DIVIPOLA municipio (2 dígitos) |
| `codigoDepartamento` | string | Código DIVIPOLA departamento (3 dígitos) |

---

### 4.2 MRZ TD1 (Cédula Nueva)

**Fuente:** https://github.com/Eitol/colombian_cedula_mrz_reader

#### Características
- Formato: **TD1** (Travel Document Type 1)
- Líneas: **3 líneas de 30 caracteres cada una**
- Estándar: **ICAO 9303**
- Caracteres válidos: A-Z, 0-9, < (relleno)

#### Estructura Línea 1

```
Pos:  0  1  2-4  5-13      14   15-16  17-19  20-29
      │  │   │    │         │     │      │      │
      │  │   │    │         │     │      │      └─ Relleno (<<<<)
      │  │   │    │         │     │      └──────── Código departamento
      │  │   │    │         │     └─────────────── Código municipio
      │  │   │    │         └───────────────────── Dígito verificador documento
      │  │   │    └─────────────────────────────── Número documento (9 dígitos)
      │  │   └──────────────────────────────────── Código país (COL)
      │  └──────────────────────────────────────── Subtipo (< o C)
      └─────────────────────────────────────────── Tipo documento (I = ID)
```

**Ejemplo:** `I<COL1234567890112001<<<<<<<<<<`

#### Estructura Línea 2

```
Pos:  0-5     6   7   8-13     14   15-17  18-27       28   29
      │       │   │    │        │     │      │          │    │
      │       │   │    │        │     │      │          │    └─ Check digit compuesto
      │       │   │    │        │     │      │          └────── Check digit NUIP
      │       │   │    │        │     │      └─────────────────  NUIP (10 dígitos)
      │       │   │    │        │     └────────────────────────  Nacionalidad (COL)
      │       │   │    │        └──────────────────────────────  Check digit expiración
      │       │   │    └───────────────────────────────────────  Fecha expiración (YYMMDD)
      │       │   └────────────────────────────────────────────  Sexo (M/F/<)
      │       └────────────────────────────────────────────────  Check digit nacimiento
      └────────────────────────────────────────────────────────  Fecha nacimiento (YYMMDD)
```

**Ejemplo:** `9001015M3012315COL12345678901`

#### Estructura Línea 3

```
APELLIDO1<APELLIDO2<<NOMBRE1<NOMBRE2<<<
         │          │
         │          └─ Doble < separa apellidos de nombres
         └──────────── Simple < separa palabras
```

**Ejemplo:** `GONZALEZ<PEREZ<<MARIA<FERNANDA<<`

#### Algoritmo de Dígito Verificador (ICAO 9303)

```typescript
function calculateCheckDigit(data: string): string {
  const weights = [7, 3, 1]; // Pesos cíclicos
  let checksum = 0;

  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    let value: number;

    if (char >= '0' && char <= '9') {
      value = parseInt(char, 10);      // Dígitos: valor directo
    } else if (char >= 'A' && char <= 'Z') {
      value = char.charCodeAt(0) - 55; // Letras: A=10, B=11, ..., Z=35
    } else {
      value = 0;                       // '<' y otros: 0
    }

    checksum += value * weights[i % 3];
  }

  return (checksum % 10).toString();
}
```

#### Campos Extraídos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `numeroDocumento` | string | Número de cédula |
| `nuip` | string | Número Único de Identificación Personal |
| `primerApellido` | string | Primer apellido |
| `segundoApellido` | string | Segundo apellido |
| `primerNombre` | string | Primer nombre |
| `segundoNombre` | string | Segundo nombre |
| `fechaNacimiento` | string | Formato ISO: YYYY-MM-DD |
| `fechaExpiracion` | string | Formato ISO: YYYY-MM-DD |
| `genero` | 'M' \| 'F' | Género del titular |
| `codigoMunicipio` | string | Código DIVIPOLA municipio |
| `codigoDepartamento` | string | Código DIVIPOLA departamento |
| `nombresTruncados` | boolean | Si los nombres fueron truncados en el MRZ |

> **Nota:** El MRZ **no contiene** el tipo de sangre (RH).

---

## 5. Interfaces TypeScript

### CedulaData (Interfaz Principal)

```typescript
interface CedulaData {
  // Identificación
  numeroDocumento: string;
  nuip?: string;                    // Solo cédulas nuevas

  // Nombres
  primerApellido: string;
  segundoApellido: string;
  primerNombre: string;
  segundoNombre: string;
  nombres: string;                  // Concatenación de nombres

  // Datos demográficos
  fechaNacimiento: string;          // ISO: YYYY-MM-DD
  genero: 'M' | 'F' | 'DESCONOCIDO';
  rh: GrupoRH;

  // Ubicación
  ubicacion?: Ubicacion;

  // Metadatos
  tipoDocumento: 'ANTIGUA' | 'NUEVA';
  fechaExpiracion?: string;         // Solo cédulas nuevas
  nombresTruncados?: boolean;
  confianza?: number;               // 0-100

  // Técnicos (solo PDF417)
  documentoInfo?: DocumentoInfo;
}

interface Ubicacion {
  codigoMunicipio: string;
  codigoDepartamento: string;
  municipio: string;
  departamento: string;
}

interface DocumentoInfo {
  codigoAfis?: string;
  tarjetaDactilar?: string;
}

type GrupoRH = 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'DESCONOCIDO';
```

---

## 6. Uso de los Servicios

### ScannerService

```typescript
import { ScannerService } from './services';
import { CedulaData, ScanErrorCode } from './models';

@Component({...})
export class MyComponent {
  constructor(private scanner: ScannerService) {}

  async escanear() {
    try {
      // Escaneo automático (detecta tipo)
      const cedula = await this.scanner.scanCedula();

      // O escaneo específico:
      // const cedula = await this.scanner.scanPDF417();  // Solo antigua
      // const cedula = await this.scanner.scanMRZ();     // Solo nueva

      console.log('Número:', cedula.numeroDocumento);
      console.log('Nombre:', cedula.nombres);
      console.log('Tipo:', cedula.tipoDocumento);

    } catch (error: any) {
      switch (error.code) {
        case ScanErrorCode.PERMISSION_DENIED:
          await this.scanner.openSettings();
          break;
        case ScanErrorCode.SCAN_CANCELLED:
          console.log('Usuario canceló');
          break;
        case ScanErrorCode.INVALID_FORMAT:
          console.log('Documento no reconocido');
          break;
      }
    }
  }
}
```

### CedulaParserService (Uso Directo)

```typescript
import { CedulaParserService } from './services';

// Para PDF417 (datos crudos del escáner)
const parser = new CedulaParserService();
const cedula = parser.parsePDF417(rawBarcodeData);

// Para MRZ (líneas de texto del OCR)
const mrzLines = [
  'I<COL1234567890112001<<<<<<<<<<',
  '9001015M3012315COL12345678901',
  'GONZALEZ<PEREZ<<MARIA<FERNANDA<<'
];
const cedula = parser.parseMRZ(mrzLines);
```

---

## 7. Catálogo DIVIPOLA

El archivo `localidades.data.ts` contiene **1,190+ municipios** de Colombia según el estándar DIVIPOLA (División Político-Administrativa).

### Estructura

```typescript
// [codigoMunicipio, codigoDepartamento, nombreDepartamento, nombreMunicipio]
export const LOCALIDADES: [string, string, string, string][] = [
  ['01', '001', 'ANTIOQUIA', 'MEDELLIN'],
  ['01', '004', 'ANTIOQUIA', 'ABEJORRAL'],
  // ... 1,190+ entradas
];
```

### Códigos de Departamentos Principales

| Código | Departamento |
|--------|--------------|
| 001 | Antioquia |
| 005 | Atlántico |
| 008 | Bogotá D.C. |
| 011 | Bolívar |
| 017 | Cundinamarca |
| 027 | Valle del Cauca |

---

## 8. Manejo de Errores

### Códigos de Error

```typescript
enum ScanErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',      // Sin permisos de cámara
  CAMERA_UNAVAILABLE = 'CAMERA_UNAVAILABLE',    // Cámara no disponible
  SCAN_CANCELLED = 'SCAN_CANCELLED',            // Usuario canceló
  INVALID_FORMAT = 'INVALID_FORMAT',            // Formato no reconocido
  PARSE_ERROR = 'PARSE_ERROR',                  // Error al interpretar datos
  CHECKSUM_ERROR = 'CHECKSUM_ERROR',            // Dígito verificador inválido
  PLUGIN_NOT_AVAILABLE = 'PLUGIN_NOT_AVAILABLE', // Plugin no disponible (web)
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'               // Error desconocido
}
```

### Estrategia de Manejo

1. **PERMISSION_DENIED:** Mostrar botón para abrir configuración del dispositivo
2. **SCAN_CANCELLED:** No mostrar error, el usuario canceló intencionalmente
3. **INVALID_FORMAT:** Sugerir al usuario mejorar iluminación o enfoque
4. **PARSE_ERROR:** Posible daño en el documento o formato no estándar

---

## 9. Consideraciones Importantes

### PDF417

1. **Codificación Latin-1:** Los datos usan codificación ISO-8859-1, no UTF-8. El parser maneja esto internamente.

2. **Ceros de Padding:** El número de documento puede tener ceros a la izquierda que deben eliminarse.

3. **Caracteres Nulos:** El separador de campos es `\x00`. En Windows puede comportarse diferente que en macOS/Linux.

4. **Identificador:** Verificar que contenga `"PubDSK_"` para confirmar que es una cédula colombiana válida.

### MRZ

1. **Errores de OCR:** Correcciones comunes:
   - `0` ↔ `O` (cero vs letra O)
   - `1` ↔ `I` ↔ `L` (uno vs letras)
   - `«` → `<` (variantes del símbolo menor que)

2. **Truncamiento de Nombres:** Si el nombre completo no cabe en 30 caracteres, se trunca. El flag `nombresTruncados` indica esto.

3. **Orden de Líneas:** El OCR puede devolver las líneas en orden incorrecto. El parser intenta reordenarlas basándose en patrones.

4. **RH No Disponible:** El MRZ no incluye el tipo de sangre.

---

## 10. Referencias

- **Repositorio PDF417:** https://github.com/Eitol/colombian-cedula-reader
- **Repositorio MRZ:** https://github.com/Eitol/colombian_cedula_mrz_reader
- **Estándar ICAO 9303:** https://www.icao.int/publications/pages/publication.aspx?docnum=9303
- **DIVIPOLA Colombia:** https://geoportal.dane.gov.co/
- **Capacitor ML Kit Barcode:** https://github.com/capawesome-team/capacitor-mlkit
- **Capacitor ML Kit Text:** https://github.com/capawesome-team/capacitor-mlkit

---

## 11. Changelog

### v1.0.0 (2026-01-28)
- Implementación inicial
- Soporte para PDF417 (cédulas antiguas)
- Soporte para MRZ TD1 (cédulas nuevas)
- Catálogo DIVIPOLA completo
- Componente de ejemplo con UI moderna
- Documentación completa

---

## 12. TODO / Mejoras Futuras

- [ ] Implementar validación de dígitos verificadores en PDF417
- [ ] Agregar caché de escaneos recientes
- [ ] Soporte para escaneo desde galería de fotos
- [ ] Tests unitarios para el parser
- [ ] Mejorar detección de MRZ con ML personalizado

---

*Documento generado por Claude Code para el proyecto FOMAG Scanner Cédula*
