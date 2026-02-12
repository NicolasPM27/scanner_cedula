/**
 * Mapeo de campos del formulario Angular a columnas de fomag.afiliado (BD normalizada)
 *
 * Campos con FK usan resolución texto→ID antes del INSERT/UPDATE.
 * Campos directos se copian tal cual.
 */

import { getPool, sql } from '../config/database';

// ---------------------------------------------------------------------------
// FK lookup maps (texto del frontend → ID en catálogo)
// ---------------------------------------------------------------------------

const ESTADO_CIVIL_MAP: Record<string, number> = {
  soltero: 1,
  casado: 2,
  union_libre: 3,
  viudo: 5,
};

const TIPO_AFILIADO_MAP: Record<string, number> = {
  directivo_activo: 1,
  docente_activo: 2,
  beneficiario: 3,
  pensionado: 4,
};

const DISCAPACIDAD_MAP: Record<string, number> = {
  ninguna: 1,
  fisica: 2,
  auditiva: 3,
  visual: 4,
  mental_psiquica: 5,
  multiple: 6,
  sordo_ceguera: 7,
};

const PARENTESCO_MAP: Record<string, number> = {
  cotizante: 1,
  hijo: 2,
  conyuge: 3,
  padre: 4,
  madre: 5,
  hermano: 6,
  no_aplica: 99,
};

// Reverse maps for DB→form
const ESTADO_CIVIL_REVERSE: Record<number, string> = {};
for (const [k, v] of Object.entries(ESTADO_CIVIL_MAP)) { ESTADO_CIVIL_REVERSE[v] = k; }

const TIPO_AFILIADO_REVERSE: Record<number, string> = {};
for (const [k, v] of Object.entries(TIPO_AFILIADO_MAP)) { TIPO_AFILIADO_REVERSE[v] = k; }

const DISCAPACIDAD_REVERSE: Record<number, string> = {};
for (const [k, v] of Object.entries(DISCAPACIDAD_MAP)) { DISCAPACIDAD_REVERSE[v] = k; }

// ---------------------------------------------------------------------------
// Field map: form field → DB column (direct-copy fields only)
// FK fields are handled separately in resolveFormValueToFkId()
// ---------------------------------------------------------------------------

const FIELD_MAP: Record<string, string> = {
  // Sociodemographic
  direccion: 'direccion',
  zona: 'zona',
  barrio: 'barrio',
  localidad: 'localidad',
  estrato: 'estrato',

  // Contact
  correoElectronico: 'email',
  celular: 'celular',
  telefonoFijo: 'telefono',

  // Labor
  secretariaEducacion: 'secretaria_educacion',
  institucionEducativa: 'institucion_educativa',
  cargo: 'cargo',
  escalafon: 'escalafon',
  gradoEscalafon: 'grado_escalafon',
  fechaPension: 'fecha_pension',

  // Characterization (text / bit fields)
  detalleDiscapacidad: 'detalle_discapacidad',
  perteneceGrupoEtnico: 'pertenece_grupo_etnico',
  grupoEtnico: 'grupo_etnico',
  perteneceLGBTIQ: 'pertenece_lgbtiq',
  poblacionLGBTIQ: 'poblacion_lgbtiq',
  observaciones: 'observaciones',

  // Audit
  aceptoHabeasData: 'acepto_habeas_data',
};

// ---------------------------------------------------------------------------
// FK resolution helpers
// ---------------------------------------------------------------------------

/**
 * Resolves departamento DANE code → departamento_residencia_id via cat_departamento
 */
async function resolveDepartamentoId(codigoDane: string): Promise<number | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('codigo', sql.NVarChar(10), codigoDane)
    .query('SELECT departamento_id FROM fomag.cat_departamento WHERE codigo_dane = @codigo');
  return result.recordset.length > 0 ? result.recordset[0].departamento_id : null;
}

/**
 * Resolves municipio DANE code → municipio_residencia_id via cat_municipio
 */
async function resolveMunicipioId(codigoDane: string): Promise<number | null> {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('codigo', sql.NVarChar(10), codigoDane)
    .query('SELECT municipio_id FROM fomag.cat_municipio WHERE codigo_dane = @codigo');
  return result.recordset.length > 0 ? result.recordset[0].municipio_id : null;
}

/**
 * Resolves discapacidad from form selection.
 * - 'ninguna' or empty → 1 (Ninguna)
 * - single item → direct FK
 * - multiple items → 6 (Múltiple), stores CSV in tipo_discapacidad text column
 */
function resolveDiscapacidadId(tipos: string | string[]): number {
  if (!tipos || (Array.isArray(tipos) && tipos.length === 0)) return 1;

  const arr = Array.isArray(tipos) ? tipos : [tipos];

  if (arr.length === 1) {
    const key = arr[0];
    if (key === 'ninguna' || !key) return 1;
    return DISCAPACIDAD_MAP[key] ?? 1;
  }

  // Multiple selections → 6 (Múltiple)
  return 6;
}

// ---------------------------------------------------------------------------
// Main mapping function: form data → DB columns (with FK resolution)
// ---------------------------------------------------------------------------

export async function mapFormToDbColumns(formData: Record<string, any>): Promise<Record<string, any>> {
  const result: Record<string, any> = {};

  for (const [formField, value] of Object.entries(formData)) {
    // Skip confirmation fields and null/undefined
    if (formField.startsWith('confirmar') || value === undefined || value === null) {
      continue;
    }

    const dbColumn = FIELD_MAP[formField];
    if (dbColumn) {
      if (Array.isArray(value)) {
        result[dbColumn] = value.join(',');
      } else {
        result[dbColumn] = value;
      }
    }
  }

  // --- Resolve FK fields ---

  // Estado civil
  if (formData.estadoCivil && ESTADO_CIVIL_MAP[formData.estadoCivil] !== undefined) {
    result['estado_civil_id'] = ESTADO_CIVIL_MAP[formData.estadoCivil];
  }

  // Tipo afiliado
  if (formData.tipoAfiliado && TIPO_AFILIADO_MAP[formData.tipoAfiliado] !== undefined) {
    result['tipo_afiliado_id'] = TIPO_AFILIADO_MAP[formData.tipoAfiliado];
  }

  // Departamento (DANE code → FK)
  if (formData.departamento) {
    const depId = await resolveDepartamentoId(formData.departamento);
    if (depId !== null) {
      result['departamento_residencia_id'] = depId;
    }
  }

  // Municipio (DANE code → FK)
  if (formData.municipio) {
    const munId = await resolveMunicipioId(formData.municipio);
    if (munId !== null) {
      result['municipio_residencia_id'] = munId;
    }
  }

  // Parentesco
  if (formData.parentesco && PARENTESCO_MAP[formData.parentesco] !== undefined) {
    result['parentesco_id'] = PARENTESCO_MAP[formData.parentesco];
  }

  // Discapacidad (multi-select → FK + text CSV)
  if (formData.tipoDiscapacidad !== undefined) {
    const discId = resolveDiscapacidadId(formData.tipoDiscapacidad);
    result['discapacidad_id'] = discId;

    // Also store the text CSV for the new tipo_discapacidad column
    if (Array.isArray(formData.tipoDiscapacidad)) {
      result['tipo_discapacidad'] = formData.tipoDiscapacidad.join(',');
    } else {
      result['tipo_discapacidad'] = formData.tipoDiscapacidad || null;
    }
  } else if (formData.tieneDiscapacidad === false) {
    result['discapacidad_id'] = 1; // Ninguna
    result['tipo_discapacidad'] = null;
  }

  return result;
}

// ---------------------------------------------------------------------------
// Build UPDATE query targeting fomag.afiliado with numero_documento as PK
// ---------------------------------------------------------------------------

export function buildUpdateQuery(
  columns: Record<string, any>,
  numeroDocumento: string
): { query: string; inputs: Record<string, any> } {
  const setClauses: string[] = [];
  const inputs: Record<string, any> = {};

  let paramIndex = 0;
  for (const [column, value] of Object.entries(columns)) {
    const paramName = `p${paramIndex}`;
    setClauses.push(`[${column}] = @${paramName}`);
    inputs[paramName] = value;
    paramIndex++;
  }

  if (setClauses.length === 0) {
    throw new Error('No hay campos para actualizar');
  }

  const query = `UPDATE fomag.afiliado SET ${setClauses.join(', ')} WHERE numero_documento = @numero_documento`;

  return { query, inputs };
}

// ---------------------------------------------------------------------------
// Build INSERT query targeting fomag.afiliado
// ---------------------------------------------------------------------------

export function buildInsertQuery(
  columns: Record<string, any>
): { query: string; inputs: Record<string, any> } {
  const dbColumns: string[] = [];
  const valueClauses: string[] = [];
  const inputs: Record<string, any> = {};

  let paramIndex = 0;
  for (const [column, value] of Object.entries(columns)) {
    const paramName = `p${paramIndex}`;
    dbColumns.push(`[${column}]`);
    valueClauses.push(`@${paramName}`);
    inputs[paramName] = value;
    paramIndex++;
  }

  if (dbColumns.length === 0) {
    throw new Error('No hay campos para insertar');
  }

  const query = `INSERT INTO fomag.afiliado (${dbColumns.join(', ')}) VALUES (${valueClauses.join(', ')})`;

  return { query, inputs };
}

// ---------------------------------------------------------------------------
// Reverse mapping: DB row (with JOINed names) → form fields
// ---------------------------------------------------------------------------

const REVERSE_FIELD_MAP: Record<string, string> = Object.entries(FIELD_MAP).reduce(
  (acc, [formField, dbColumn]) => {
    acc[dbColumn] = formField;
    return acc;
  },
  {} as Record<string, string>
);

export function mapDbRowToForm(dbRow: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [dbColumn, value] of Object.entries(dbRow)) {
    const formField = REVERSE_FIELD_MAP[dbColumn];
    if (formField) {
      // Convert CSV strings to arrays for tipoDiscapacidad
      if (formField === 'tipoDiscapacidad' && typeof value === 'string') {
        result[formField] = value.split(',').filter(Boolean);
      } else {
        result[formField] = value;
      }
    } else {
      result[dbColumn] = value;
    }
  }

  // Reverse FK fields using JOINed name columns from the query
  if (dbRow['estado_civil_id'] != null) {
    result['estadoCivil'] = ESTADO_CIVIL_REVERSE[dbRow['estado_civil_id']] || dbRow['estado_civil_nombre'];
  }

  if (dbRow['tipo_afiliado_id'] != null) {
    result['tipoAfiliado'] = TIPO_AFILIADO_REVERSE[dbRow['tipo_afiliado_id']] || dbRow['tipo_afiliado_nombre'];
  }

  if (dbRow['discapacidad_id'] != null) {
    const discName = DISCAPACIDAD_REVERSE[dbRow['discapacidad_id']];
    if (discName && discName !== 'ninguna') {
      result['tieneDiscapacidad'] = true;
    } else {
      result['tieneDiscapacidad'] = false;
    }
  }

  // Departamento/Municipio come from JOIN as DANE codes
  if (dbRow['departamento_codigo']) {
    result['departamento'] = dbRow['departamento_codigo'];
  }
  if (dbRow['municipio_codigo']) {
    result['municipio'] = dbRow['municipio_codigo'];
  }

  return result;
}
