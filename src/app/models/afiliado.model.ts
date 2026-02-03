/**
 * Modelos de datos para el flujo de actualización de datos de afiliados
 */

// ============================================================================
// ENUMS Y TIPOS
// ============================================================================

export type EstadoCivil = 'soltero' | 'casado' | 'viudo' | 'union_libre';
export type Zona = 'urbano' | 'rural';
export type Estrato = 1 | 2 | 3 | 4 | 5 | 6;
export type TipoAfiliado = 'docente_activo' | 'directivo_activo' | 'pensionado' | 'beneficiario';

export type TipoDiscapacidad = 
  | 'fisica'
  | 'auditiva'
  | 'mental_psiquica'
  | 'sordo_ceguera'
  | 'visual'
  | 'multiple'
  | 'ninguna';

export type GrupoEtnico = 
  | 'indigena'
  | 'gitano_rrom'
  | 'afrodescendiente'
  | 'negro'
  | 'raizal'
  | 'palenquero'
  | 'ninguna';

export type PoblacionLGBTIQ = 
  | 'lesbiana'
  | 'gay'
  | 'bisexual'
  | 'transgenero'
  | 'transexual'
  | 'travesti'
  | 'intersexual'
  | 'queer'
  | 'otro'
  | 'ninguno';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Información sociodemográfica
 */
export interface InformacionSociodemografica {
  estadoCivil?: EstadoCivil;
  direccion: string;
  zona: Zona;
  barrio?: string;
  localidad?: string;
  departamento: string;
  municipio: string;
  estrato: Estrato;
}

/**
 * Información de contacto
 */
export interface InformacionContacto {
  correoElectronico: string;
  celular: string;
  telefonoFijo?: string;
}

/**
 * Información laboral (solo para docentes activos, opcional para pensionados)
 */
export interface InformacionLaboral {
  tipoAfiliado: TipoAfiliado;
  secretariaEducacion?: string;
  institucionEducativa?: string;
  cargo?: string;
  escalafon?: string;
  gradoEscalafon?: string;
  fechaPension?: string;
}

/**
 * Información de caracterización
 */
export interface InformacionCaracterizacion {
  tipoDiscapacidad?: TipoDiscapacidad[];
  detalleDiscapacidad?: string;
  grupoEtnico?: GrupoEtnico;
  poblacionLGBTIQ?: PoblacionLGBTIQ;
  observaciones?: string;
}

/**
 * Datos completos del afiliado (cotizante)
 */
export interface DatosAfiliado {
  // Datos de la cédula escaneada
  numeroDocumento: string;
  primerApellido: string;
  segundoApellido?: string;
  primerNombre: string;
  segundoNombre?: string;
  fechaNacimiento: string;
  genero: 'M' | 'F';
  
  // Tipo de afiliado
  tipoAfiliado: TipoAfiliado;
  
  // Información adicional
  sociodemografica?: InformacionSociodemografica;
  contacto?: InformacionContacto;
  laboral?: InformacionLaboral;
  caracterizacion?: InformacionCaracterizacion;
  
  // Beneficiarios
  beneficiarios?: Beneficiario[];
  
  // Estado de actualización
  actualizacionPrevia?: boolean;
  fechaUltimaActualizacion?: string;
}

/**
 * Datos de un beneficiario
 */
export interface Beneficiario {
  id: string;
  numeroDocumento: string;
  tipoDocumento: 'CC' | 'TI' | 'RC' | 'CE';
  primerApellido: string;
  segundoApellido?: string;
  primerNombre: string;
  segundoNombre?: string;
  fechaNacimiento: string;
  edad: number;
  parentesco: 'conyuge' | 'hijo' | 'padre' | 'madre' | 'otro';
  
  // Información del beneficiario
  sociodemografica?: InformacionSociodemografica;
  contacto?: InformacionContacto; // Solo para mayores de 18
  
  // Estado
  seleccionado?: boolean;
  actualizado?: boolean;
}

/**
 * Estado del flujo de actualización
 */
export interface EstadoFlujo {
  paso: PasoFlujo;
  afiliado?: DatosAfiliado;
  beneficiarioSeleccionado?: Beneficiario;
  esCorreccion?: boolean;
  errores?: string[];
}

export type PasoFlujo = 
  | 'inicio'
  | 'escaneo'
  | 'verificacion'
  | 'usuario_existente'
  | 'sociodemografico'
  | 'contacto'
  | 'laboral'
  | 'caracterizacion'
  | 'seleccion_beneficiarios'
  | 'actualizacion_beneficiario'
  | 'confirmacion'
  | 'completado';

// ============================================================================
// OPCIONES PARA LISTAS DESPLEGABLES
// ============================================================================

export const OPCIONES_ESTADO_CIVIL: { value: EstadoCivil; label: string }[] = [
  { value: 'soltero', label: 'Soltero(a)' },
  { value: 'casado', label: 'Casado(a)' },
  { value: 'viudo', label: 'Viudo(a)' },
  { value: 'union_libre', label: 'Unión Libre' },
];

export const OPCIONES_ZONA: { value: Zona; label: string }[] = [
  { value: 'urbano', label: 'Urbano' },
  { value: 'rural', label: 'Rural' },
];

export const OPCIONES_ESTRATO: { value: Estrato; label: string }[] = [
  { value: 1, label: 'Estrato 1' },
  { value: 2, label: 'Estrato 2' },
  { value: 3, label: 'Estrato 3' },
  { value: 4, label: 'Estrato 4' },
  { value: 5, label: 'Estrato 5' },
  { value: 6, label: 'Estrato 6' },
];

export const OPCIONES_TIPO_DISCAPACIDAD: { value: TipoDiscapacidad; label: string }[] = [
  { value: 'fisica', label: 'Física' },
  { value: 'auditiva', label: 'Auditiva' },
  { value: 'mental_psiquica', label: 'Mental/Psíquica' },
  { value: 'sordo_ceguera', label: 'Sordo/Ceguera' },
  { value: 'visual', label: 'Visual' },
  { value: 'multiple', label: 'Múltiple' },
  { value: 'ninguna', label: 'Ninguna' },
];

export const OPCIONES_GRUPO_ETNICO: { value: GrupoEtnico; label: string }[] = [
  { value: 'indigena', label: 'Indígena' },
  { value: 'gitano_rrom', label: 'Gitano – Rrom' },
  { value: 'afrodescendiente', label: 'Afrodescendiente' },
  { value: 'negro', label: 'Negro' },
  { value: 'raizal', label: 'Raizal' },
  { value: 'palenquero', label: 'Palenquero' },
  { value: 'ninguna', label: 'Ninguna' },
];

export const OPCIONES_POBLACION_LGBTIQ: { value: PoblacionLGBTIQ; label: string }[] = [
  { value: 'lesbiana', label: 'Lesbiana' },
  { value: 'gay', label: 'Gay' },
  { value: 'bisexual', label: 'Bisexual' },
  { value: 'transgenero', label: 'Transgénero' },
  { value: 'transexual', label: 'Transexual' },
  { value: 'travesti', label: 'Travesti' },
  { value: 'intersexual', label: 'Intersexual' },
  { value: 'queer', label: 'Queer' },
  { value: 'otro', label: 'Otro' },
  { value: 'ninguno', label: 'Prefiero no responder' },
];

export const OPCIONES_TIPO_AFILIADO: { value: TipoAfiliado; label: string }[] = [
  { value: 'docente_activo', label: 'Docente Activo' },
  { value: 'directivo_activo', label: 'Directivo Docente Activo' },
  { value: 'pensionado', label: 'Pensionado' },
  { value: 'beneficiario', label: 'Beneficiario' },
];

// Aliases for easier imports
export const ESTADOS_CIVILES = OPCIONES_ESTADO_CIVIL;
export const ZONAS = OPCIONES_ZONA;
export const ESTRATOS = OPCIONES_ESTRATO;
export const TIPOS_DISCAPACIDAD = OPCIONES_TIPO_DISCAPACIDAD;
export const GRUPOS_ETNICOS = OPCIONES_GRUPO_ETNICO;
export const POBLACIONES_LGBTIQ = OPCIONES_POBLACION_LGBTIQ;
export const TIPOS_AFILIADO = OPCIONES_TIPO_AFILIADO;
