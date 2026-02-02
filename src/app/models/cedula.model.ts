/**
 * Modelo de datos para Cédulas Colombianas
 * Soporta tanto cédulas antiguas (PDF417) como nuevas (MRZ)
 *
 * Basado en la estructura oficial de la Registraduría Nacional
 * Referencias:
 * - https://github.com/Eitol/colombian-cedula-reader
 * - https://github.com/Eitol/colombian_cedula_mrz_reader
 */

/**
 * Tipo de documento escaneado
 */
export type TipoDocumento = 'ANTIGUA' | 'NUEVA';

/**
 * Género del titular
 */
export type Genero = 'M' | 'F' | 'DESCONOCIDO';

/**
 * Grupos sanguíneos válidos
 */
export type GrupoRH = 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'DESCONOCIDO';

/**
 * Información de ubicación geográfica (DIVIPOLA)
 */
export interface Ubicacion {
  /** Código del departamento (3 dígitos) */
  codigoDepartamento: string;

  /** Nombre del departamento */
  departamento: string;

  /** Código del municipio (2 dígitos) */
  codigoMunicipio: string;

  /** Nombre del municipio */
  municipio: string;
}

/**
 * Información adicional del documento (solo PDF417)
 */
export interface DocumentoInfo {
  /** Código AFIS (Sistema Automatizado de Identificación de Huellas) */
  codigoAfis?: string;

  /** Número de tarjeta dactilar */
  tarjetaDactilar?: string;
}

/**
 * Interfaz principal con los datos extraídos de la cédula
 */
export interface CedulaData {
  /** Número de cédula (sin puntos ni espacios) */
  numeroDocumento: string;

  /** Primer apellido del titular */
  primerApellido: string;

  /** Segundo apellido del titular (puede ser vacío) */
  segundoApellido: string;

  /** Primer nombre del titular */
  primerNombre: string;

  /** Segundo nombre del titular (puede ser vacío) */
  segundoNombre: string;

  /** Nombres completos del titular (primerNombre + segundoNombre) */
  nombres: string;

  /** Fecha de nacimiento en formato ISO (YYYY-MM-DD) */
  fechaNacimiento: string;

  /** Grupo sanguíneo y factor RH */
  rh: GrupoRH;

  /** Género del titular */
  genero: Genero;

  /** Tipo de documento escaneado */
  tipoDocumento: TipoDocumento;

  /** Lugar de expedición/nacimiento */
  ubicacion?: Ubicacion;

  /** Información adicional del documento (solo en cédulas antiguas) */
  documentoInfo?: DocumentoInfo;

  /** Fecha de expiración (solo en cédulas nuevas) */
  fechaExpiracion?: string;

  /** NUIP - Número Único de Identificación Personal (cédulas nuevas) */
  nuip?: string;

  /** Indica si los nombres fueron truncados en el MRZ */
  nombresTruncados?: boolean;

  /** Nivel de confianza del parsing (0-100) */
  confianza?: number;
}

/**
 * Resultado del escaneo antes de procesar
 */
export interface ScanResult {
  /** Indica si el escaneo fue exitoso */
  success: boolean;

  /** Datos crudos del escaneo */
  rawData?: string;

  /** Líneas MRZ (para cédulas nuevas) */
  mrzLines?: string[];

  /** Tipo detectado */
  detectedType?: TipoDocumento;

  /** Mensaje de error si aplica */
  errorMessage?: string;

  /** Código de error para manejo programático */
  errorCode?: ScanErrorCode;
}

/**
 * Códigos de error del escáner
 */
export enum ScanErrorCode {
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  CAMERA_UNAVAILABLE = 'CAMERA_UNAVAILABLE',
  SCAN_CANCELLED = 'SCAN_CANCELLED',
  INVALID_FORMAT = 'INVALID_FORMAT',
  PARSE_ERROR = 'PARSE_ERROR',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  PLUGIN_NOT_AVAILABLE = 'PLUGIN_NOT_AVAILABLE',
  CHECKSUM_ERROR = 'CHECKSUM_ERROR'
}

/**
 * Configuración para el escáner
 */
export interface ScannerConfig {
  /** Tiempo máximo de escaneo en milisegundos */
  timeout?: number;

  /** Habilitar flash/linterna */
  enableTorch?: boolean;

  /** Mostrar guía visual de escaneo */
  showGuide?: boolean;

  /** Vibrar al detectar código */
  vibrateOnDetection?: boolean;
}

/**
 * Valores por defecto de configuración
 */
export const DEFAULT_SCANNER_CONFIG: ScannerConfig = {
  timeout: 30000,
  enableTorch: false,
  showGuide: true,
  vibrateOnDetection: true
};

/**
 * Constantes del formato PDF417 colombiano
 */
export const PDF417_CONSTANTS = {
  /** Longitud esperada de datos */
  DATA_LENGTH: 530,

  /** Codificación de caracteres */
  ENCODING: 'latin-1',

  /** Identificador del formato */
  IDENTIFIER: 'PubDSK_'
} as const;

/**
 * Constantes del formato MRZ TD1 colombiano
 */
export const MRZ_TD1_CONSTANTS = {
  /** Longitud de cada línea */
  LINE_LENGTH: 30,

  /** Número de líneas */
  LINE_COUNT: 3,

  /** Código de país */
  COUNTRY_CODE: 'COL',

  /** Tipo de documento */
  DOC_TYPE: 'I'
} as const;
