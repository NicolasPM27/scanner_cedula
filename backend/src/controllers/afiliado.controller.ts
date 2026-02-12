import { Request, Response, NextFunction } from 'express';
import { getPool, sql } from '../config/database';
import { mapFormToDbColumns, buildUpdateQuery, buildInsertQuery } from '../utils/field-mapper';
import { getBogotaDate } from '../utils/bogota-date';

/**
 * Busca un afiliado por numero de documento (cotizantes, no beneficiarios)
 * Joins catalog tables to return human-readable names alongside FK IDs.
 */
export async function buscarAfiliado(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { numeroDocumento } = req.params;

    console.log('Buscando afiliado con documento:', numeroDocumento);

    if (!numeroDocumento) {
      res.status(400).json({
        existe: false,
        error: 'Numero de documento requerido',
      });
      return;
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('doc', sql.NVarChar(64), numeroDocumento)
      .query(`
        SELECT
          a.*,
          td.codigo   AS tipo_documento_codigo,
          ec.nombre   AS estado_civil_nombre,
          ta.nombre   AS tipo_afiliado_nombre,
          d.nombre    AS departamento_nombre,
          d.codigo_dane AS departamento_codigo,
          m.nombre    AS municipio_nombre,
          m.codigo_dane AS municipio_codigo,
          disc.nombre AS discapacidad_nombre,
          gd.nombre   AS grado_discapacidad_nombre
        FROM fomag.afiliado a
          LEFT JOIN fomag.cat_tipo_documento td ON td.tipo_documento_id = a.tipo_documento_id
          LEFT JOIN fomag.cat_estado_civil   ec ON ec.estado_civil_id   = a.estado_civil_id
          LEFT JOIN fomag.cat_tipo_afiliado  ta ON ta.tipo_afiliado_id  = a.tipo_afiliado_id
          LEFT JOIN fomag.cat_departamento    d ON d.departamento_id    = a.departamento_residencia_id
          LEFT JOIN fomag.cat_municipio       m ON m.municipio_id       = a.municipio_residencia_id
          LEFT JOIN fomag.cat_discapacidad disc ON disc.discapacidad_id = a.discapacidad_id
          LEFT JOIN fomag.cat_grado_discapacidad gd ON gd.grado_discapacidad_id = a.grado_discapacidad_id
        WHERE a.numero_documento = @doc
          AND (a.tipo_afiliado_id IS NULL OR a.tipo_afiliado_id <> 3)
      `);

    console.log('Resultados encontrados:', result.recordset.length);

    if (result.recordset.length === 0) {
      console.log('No se encontro afiliado');
      res.json({ existe: false });
      return;
    }

    console.log('Afiliado encontrado:', result.recordset[0].numero_documento);
    res.json({
      existe: true,
      afiliado: result.recordset[0],
    });
  } catch (error) {
    console.error('Error en buscarAfiliado:', error);
    next(error);
  }
}

/**
 * Búsqueda administrativa de afiliados por número de documento o nombre
 */
export async function buscarAfiliadosAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const q = String(req.query.q || '').trim();

    if (!q) {
      res.json({ afiliados: [] });
      return;
    }

    const pool = await getPool();
    const isNumeric = /^\d+$/.test(q);
    const byDocumentPattern = `${q}%`;
    const byNamePattern = `%${q}%`;

    const result = await pool
      .request()
      .input('docPattern', sql.NVarChar(100), byDocumentPattern)
      .input('namePattern', sql.NVarChar(200), byNamePattern)
      .input('isNumeric', sql.Bit, isNumeric)
      .query(`
        SELECT TOP 50
          a.*,
          td.codigo   AS tipo_documento_codigo,
          ec.nombre   AS estado_civil_nombre,
          ta.nombre   AS tipo_afiliado_nombre,
          d.nombre    AS departamento_nombre,
          d.codigo_dane AS departamento_codigo,
          m.nombre    AS municipio_nombre,
          m.codigo_dane AS municipio_codigo,
          disc.nombre AS discapacidad_nombre,
          gd.nombre   AS grado_discapacidad_nombre
        FROM fomag.afiliado a
          LEFT JOIN fomag.cat_tipo_documento td ON td.tipo_documento_id = a.tipo_documento_id
          LEFT JOIN fomag.cat_estado_civil   ec ON ec.estado_civil_id   = a.estado_civil_id
          LEFT JOIN fomag.cat_tipo_afiliado  ta ON ta.tipo_afiliado_id  = a.tipo_afiliado_id
          LEFT JOIN fomag.cat_departamento    d ON d.departamento_id    = a.departamento_residencia_id
          LEFT JOIN fomag.cat_municipio       m ON m.municipio_id       = a.municipio_residencia_id
          LEFT JOIN fomag.cat_discapacidad disc ON disc.discapacidad_id = a.discapacidad_id
          LEFT JOIN fomag.cat_grado_discapacidad gd ON gd.grado_discapacidad_id = a.grado_discapacidad_id
        WHERE
          (a.tipo_afiliado_id IS NULL OR a.tipo_afiliado_id <> 3)
          AND (
            (@isNumeric = 1 AND a.numero_documento LIKE @docPattern)
            OR
            (
              a.primer_nombre LIKE @namePattern
              OR a.segundo_nombre LIKE @namePattern
              OR a.primer_apellido LIKE @namePattern
              OR a.segundo_apellido LIKE @namePattern
              OR CONCAT(
                COALESCE(a.primer_nombre, ''), ' ',
                COALESCE(a.segundo_nombre, ''), ' ',
                COALESCE(a.primer_apellido, ''), ' ',
                COALESCE(a.segundo_apellido, '')
              ) LIKE @namePattern
            )
          )
        ORDER BY a.primer_apellido, a.primer_nombre
      `);

    res.json({ afiliados: result.recordset });
  } catch (error) {
    console.error('Error en buscarAfiliadosAdmin:', error);
    next(error);
  }
}

/**
 * Actualiza los datos de un afiliado usando numero_documento como PK
 */
export async function actualizarAfiliado(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params; // This is now numero_documento
    const datos = req.body;

    console.log('Actualizando afiliado documento:', id);

    if (!id) {
      res.status(400).json({
        success: false,
        mensaje: 'Numero de documento requerido',
      });
      return;
    }

    const pool = await getPool();

    // Verify the affiliate exists
    const checkResult = await pool
      .request()
      .input('doc', sql.NVarChar(100), id)
      .query('SELECT afiliado_id FROM fomag.afiliado WHERE numero_documento = @doc');

    if (checkResult.recordset.length === 0) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado',
      });
      return;
    }

    // Map form fields to DB columns (async: resolves FK lookups)
    const dbColumns = await mapFormToDbColumns(datos);

    // Audit fields
    dbColumns.fecha_ultima_actualizacion = getBogotaDate();
    if (datos.aceptoHabeasData) {
      dbColumns.acepto_habeas_data = true;
      dbColumns.fecha_acepto_habeas_data = getBogotaDate();
    }

    // Build and execute UPDATE
    const { query, inputs } = buildUpdateQuery(dbColumns, id);

    const request = pool.request();
    request.input('numero_documento', sql.NVarChar(100), id);
    bindDynamicInputs(request, inputs);

    await request.query(query);

    console.log('Afiliado actualizado exitosamente, documento:', id);

    res.json({
      success: true,
      mensaje: 'Datos actualizados correctamente',
    });
  } catch (error) {
    console.error('Error en actualizarAfiliado:', error);
    next(error);
  }
}

/**
 * Crea un nuevo afiliado (cotizante)
 */
export async function crearAfiliado(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const datos = req.body ?? {};

    const requiredFields: Array<keyof typeof datos> = [
      'numeroDocumento',
      'primerNombre',
      'primerApellido',
      'fechaNacimiento',
      'genero',
    ];

    const missingField = requiredFields.find((field) => {
      const value = datos[field];
      return value === undefined || value === null || value === '';
    });

    if (missingField) {
      res.status(400).json({
        success: false,
        mensaje: `Campo obligatorio faltante: ${String(missingField)}`,
      });
      return;
    }

    const numeroDocumento = String(datos.numeroDocumento).trim();
    const pool = await getPool();

    // Check duplicate documento
    const existeResult = await pool
      .request()
      .input('doc', sql.NVarChar(100), numeroDocumento)
      .query('SELECT TOP 1 afiliado_id FROM fomag.afiliado WHERE numero_documento = @doc');

    if (existeResult.recordset.length > 0) {
      res.status(409).json({
        success: false,
        mensaje: 'Ya existe un afiliado con ese numero de documento',
      });
      return;
    }

    const dbColumns = await mapFormToDbColumns(datos);

    // Identity fields
    dbColumns.numero_documento = numeroDocumento;
    dbColumns.primer_nombre = String(datos.primerNombre).trim();
    dbColumns.segundo_nombre = datos.segundoNombre ? String(datos.segundoNombre).trim() : null;
    dbColumns.primer_apellido = String(datos.primerApellido).trim();
    dbColumns.segundo_apellido = datos.segundoApellido ? String(datos.segundoApellido).trim() : null;
    dbColumns.fecha_nacimiento = String(datos.fechaNacimiento);
    dbColumns.sexo_id = normalizeSexoId(datos.genero);
    dbColumns.tipo_documento_id = parseTipoDocumentoId(datos.tipoDocumentoId);

    // Audit fields
    dbColumns.fecha_ultima_actualizacion = getBogotaDate();
    dbColumns.acepto_habeas_data = datos.aceptoHabeasData !== false;
    if (dbColumns.acepto_habeas_data) {
      dbColumns.fecha_acepto_habeas_data = getBogotaDate();
    }

    const { query, inputs } = buildInsertQuery(dbColumns);
    const request = pool.request();
    bindDynamicInputs(request, inputs);

    await request.query(query);

    res.status(201).json({
      success: true,
      mensaje: 'Afiliado creado correctamente',
    });
  } catch (error) {
    console.error('Error en crearAfiliado:', error);
    next(error);
  }
}

function bindDynamicInputs(request: sql.Request, inputs: Record<string, any>): void {
  for (const [key, value] of Object.entries(inputs)) {
    if (value instanceof Date) {
      request.input(key, sql.DateTime2, value);
    } else if (typeof value === 'boolean') {
      request.input(key, sql.Bit, value);
    } else if (typeof value === 'number') {
      request.input(key, sql.Int, value);
    } else if (value === null) {
      request.input(key, sql.NVarChar(sql.MAX), null);
    } else {
      request.input(key, sql.NVarChar(sql.MAX), value);
    }
  }
}

function normalizeSexoId(genero: unknown): number {
  const value = String(genero || '').toUpperCase().trim();
  if (value === 'F' || value === '2' || value === 'FEMENINO') {
    return 2;
  }
  return 1;
}

function parseTipoDocumentoId(tipoDocumentoId: unknown): number {
  const parsed = Number(tipoDocumentoId);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return 1;
}
