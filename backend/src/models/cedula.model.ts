/**
 * Modelo de datos para Cedulas Colombianas (Backend)
 * Portado desde frontend - compartido entre ambos
 */

export type TipoDocumento = 'ANTIGUA' | 'NUEVA' | 'PASAPORTE';
export type Genero = 'M' | 'F' | 'DESCONOCIDO';
export type GrupoRH = 'O+' | 'O-' | 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'DESCONOCIDO';

export interface Ubicacion {
  codigoDepartamento: string;
  departamento: string;
  codigoMunicipio: string;
  municipio: string;
}

export interface DocumentoInfo {
  codigoAfis?: string;
  tarjetaDactilar?: string;
}

export interface CedulaData {
  numeroDocumento: string;
  primerApellido: string;
  segundoApellido: string;
  primerNombre: string;
  segundoNombre: string;
  nombres: string;
  fechaNacimiento: string;
  rh: GrupoRH;
  genero: Genero;
  tipoDocumento: TipoDocumento;
  ubicacion?: Ubicacion;
  documentoInfo?: DocumentoInfo;
  fechaExpiracion?: string;
  nuip?: string;
  nombresTruncados?: boolean;
  confianza?: number;
}

export const PDF417_CONSTANTS = {
  DATA_LENGTH: 530,
  ENCODING: 'latin-1',
  IDENTIFIER: 'PubDSK_'
} as const;

export const MRZ_TD1_CONSTANTS = {
  LINE_LENGTH: 30,
  LINE_COUNT: 3,
  COUNTRY_CODE: 'COL',
  DOC_TYPE: 'I'
} as const;

/** Tipos de documento soportados para escaneo */
export type TipoDocumentoScan =
  | 'CC'       // Cedula de Ciudadania
  | 'CE'       // Cedula de Extranjeria
  | 'PA'       // Pasaporte
  | 'TI'       // Tarjeta de Identidad
  | 'RC'       // Registro Civil
  | 'NIT'      // NIT
  | 'NUIP';    // Numero unico de identificacion

export interface ScanRequest {
  /** Imagen principal en base64 (JPEG) */
  frame1: string;
  /** Imagen con documento inclinado en base64 (JPEG) - para anti-spoofing */
  frame2?: string;
  /** Tipo de documento a escanear */
  tipoDocumento: TipoDocumentoScan;
  /** Timestamp de captura ISO */
  timestamp: string;
}

export interface ScanResponse {
  success: boolean;
  data?: CedulaData;
  authenticityScore: number;
  checks: AuthenticityCheck[];
  error?: string;
}

export interface AuthenticityCheck {
  name: string;
  passed: boolean;
  score: number;
  details?: string;
}
