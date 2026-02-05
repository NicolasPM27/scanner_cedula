/**
 * Mapeo de campos del formulario Angular a columnas de la BD
 */

// Mapeo de nombres de campo del frontend a columnas de BD
const FIELD_MAP: Record<string, string> = {
  // Sociodemográfico
  estadoCivil: 'estado_civil',
  direccion: 'direccion_Residencia_cargue',
  zona: 'zona',
  barrio: 'barrio',
  localidad: 'localidad',
  departamento: 'departamento_residencia',
  municipio: 'municipio_residencia',
  estrato: 'estrato',

  // Contacto
  correoElectronico: 'correo_principal',
  celular: 'celular_principal',
  telefonoFijo: 'telefono',

  // Laboral
  secretariaEducacion: 'secretaria_educacion',
  institucionEducativa: 'institucion_educativa',
  cargo: 'cargo',
  escalafon: 'escalafon',
  gradoEscalafon: 'grado_escalafon',
  fechaPension: 'fecha_pension',

  // Caracterización
  tieneDiscapacidad: 'tiene_discapacidad',
  tipoDiscapacidad: 'tipo_discapacidad',
  detalleDiscapacidad: 'detalle_discapacidad',
  perteneceGrupoEtnico: 'pertenece_grupo_etnico',
  grupoEtnico: 'grupo_etnico',
  perteneceLGBTIQ: 'pertenece_lgbtiq',
  poblacionLGBTIQ: 'poblacion_lgbtiq',
  observaciones: 'observaciones',

  // Auditoría
  aceptoHabeasData: 'acepto_habeas_data',
};

/**
 * Convierte un objeto de datos del formulario a columnas de BD
 */
export function mapFormToDbColumns(formData: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [formField, value] of Object.entries(formData)) {
    // Ignorar campos de confirmación y valores undefined/null
    if (formField.startsWith('confirmar') || value === undefined || value === null) {
      continue;
    }

    const dbColumn = FIELD_MAP[formField];
    if (dbColumn) {
      // Convertir arrays a string separado por comas
      if (Array.isArray(value)) {
        result[dbColumn] = value.join(',');
      } else {
        result[dbColumn] = value;
      }
    }
  }

  return result;
}

/**
 * Construye una consulta UPDATE dinámica
 */
export function buildUpdateQuery(
  tableName: string,
  columns: Record<string, any>,
  idColumn: string,
  idValue: string | number
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

  // Usamos el nombre de la columna como nombre del parámetro para evitar conflictos
  const query = `UPDATE [${tableName}] SET ${setClauses.join(', ')} WHERE [${idColumn}] = @${idColumn}`;

  return { query, inputs };
}

/**
 * Mapeo inverso: columnas de BD a campos del frontend
 */
const REVERSE_FIELD_MAP: Record<string, string> = Object.entries(FIELD_MAP).reduce(
  (acc, [formField, dbColumn]) => {
    acc[dbColumn] = formField;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Convierte una fila de BD a objeto del frontend
 */
export function mapDbRowToForm(dbRow: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [dbColumn, value] of Object.entries(dbRow)) {
    const formField = REVERSE_FIELD_MAP[dbColumn];
    if (formField) {
      // Convertir strings separados por comas a arrays para tipoDiscapacidad
      if (formField === 'tipoDiscapacidad' && typeof value === 'string') {
        result[formField] = value.split(',').filter(Boolean);
      } else {
        result[formField] = value;
      }
    } else {
      // Mantener columnas sin mapeo con su nombre original
      result[dbColumn] = value;
    }
  }

  return result;
}
