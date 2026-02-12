import { Request, Response, NextFunction } from 'express';
import { getPool, sql } from '../config/database';
import { mapFormToDbColumns, buildUpdateQuery, buildInsertQuery } from '../utils/field-mapper';
import { getBogotaDate } from '../utils/bogota-date';

/**
 * Obtiene todos los beneficiarios de un cotizante
 * tipo_afiliado_id = 3 means "Beneficiario"
 */
export async function obtenerBeneficiarios(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { numeroDocumento } = req.params;

    if (!numeroDocumento) {
      res.status(400).json({
        beneficiarios: [],
        error: 'Numero de documento del cotizante requerido',
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
          p.nombre    AS parentesco_nombre
        FROM fomag.afiliado a
          LEFT JOIN fomag.cat_tipo_documento td ON td.tipo_documento_id = a.tipo_documento_id
          LEFT JOIN fomag.cat_estado_civil   ec ON ec.estado_civil_id   = a.estado_civil_id
          LEFT JOIN fomag.cat_tipo_afiliado  ta ON ta.tipo_afiliado_id  = a.tipo_afiliado_id
          LEFT JOIN fomag.cat_departamento    d ON d.departamento_id    = a.departamento_residencia_id
          LEFT JOIN fomag.cat_municipio       m ON m.municipio_id       = a.municipio_residencia_id
          LEFT JOIN fomag.cat_discapacidad disc ON disc.discapacidad_id = a.discapacidad_id
          LEFT JOIN fomag.cat_parentesco      p ON p.parentesco_id      = a.parentesco_id
        WHERE a.numero_documento_cotizante = @doc
          AND a.tipo_afiliado_id = 3
        ORDER BY a.primer_apellido, a.primer_nombre
      `);

    res.json({
      beneficiarios: result.recordset,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualiza los datos de un beneficiario usando numero_documento como PK
 */
export async function actualizarBeneficiario(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params; // This is now numero_documento
    const datos = req.body;

    console.log('Actualizando beneficiario documento:', id);

    if (!id) {
      res.status(400).json({
        success: false,
        mensaje: 'Numero de documento del beneficiario requerido',
      });
      return;
    }

    const pool = await getPool();

    // Verify the beneficiary exists
    const checkResult = await pool
      .request()
      .input('doc', sql.NVarChar(100), id)
      .query(`
        SELECT afiliado_id FROM fomag.afiliado
        WHERE numero_documento = @doc AND tipo_afiliado_id = 3
      `);

    if (checkResult.recordset.length === 0) {
      res.status(404).json({
        success: false,
        mensaje: 'Beneficiario no encontrado',
      });
      return;
    }

    // Map form fields to DB columns (async: resolves FK lookups)
    const dbColumns = await mapFormToDbColumns(datos);

    // Audit fields
    dbColumns.fecha_ultima_actualizacion = getBogotaDate();

    // Build and execute UPDATE
    const { query, inputs } = buildUpdateQuery(dbColumns, id);

    const request = pool.request();
    request.input('numero_documento', sql.NVarChar(100), id);

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

    await request.query(query);

    console.log('Beneficiario actualizado exitosamente, documento:', id);

    res.json({
      success: true,
      mensaje: 'Datos del beneficiario actualizados correctamente',
    });
  } catch (error) {
    console.error('Error en actualizarBeneficiario:', error);
    next(error);
  }
}

/**
 * Crea un nuevo beneficiario vinculado a un cotizante.
 * - tipo_afiliado_id = 3 (Beneficiario) se fija automáticamente
 * - numero_documento_cotizante = documento del cotizante que lo registra
 * - parentesco_id se resuelve desde el texto del formulario
 * - afiliado_id es IDENTITY (lo genera SQL Server)
 * - Bloquea duplicados por numero_documento
 */
export async function crearBeneficiario(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const datos = req.body ?? {};

    // Validate required fields
    const requiredFields = [
      'numeroDocumento',
      'primerNombre',
      'primerApellido',
      'fechaNacimiento',
      'genero',
      'parentesco',
      'numeroDocumentoCotizante',
    ];

    const missingField = requiredFields.find((field) => {
      const value = datos[field];
      return value === undefined || value === null || value === '';
    });

    if (missingField) {
      res.status(400).json({
        success: false,
        mensaje: `Campo obligatorio faltante: ${missingField}`,
      });
      return;
    }

    const numeroDocumento = String(datos.numeroDocumento).trim();
    const numeroDocumentoCotizante = String(datos.numeroDocumentoCotizante).trim();

    const pool = await getPool();

    // Verify the cotizante exists
    const cotizanteResult = await pool
      .request()
      .input('docCotizante', sql.NVarChar(100), numeroDocumentoCotizante)
      .query(`
        SELECT afiliado_id FROM fomag.afiliado
        WHERE numero_documento = @docCotizante
          AND (tipo_afiliado_id IS NULL OR tipo_afiliado_id <> 3)
      `);

    if (cotizanteResult.recordset.length === 0) {
      res.status(404).json({
        success: false,
        mensaje: 'Cotizante no encontrado',
      });
      return;
    }

    // Block duplicates
    const existeResult = await pool
      .request()
      .input('doc', sql.NVarChar(100), numeroDocumento)
      .query('SELECT TOP 1 afiliado_id FROM fomag.afiliado WHERE numero_documento = @doc');

    if (existeResult.recordset.length > 0) {
      res.status(409).json({
        success: false,
        mensaje: 'Ya existe un afiliado con ese número de documento',
      });
      return;
    }

    // Map form fields to DB columns (resolves FK lookups for departamento, municipio, etc.)
    const dbColumns = await mapFormToDbColumns(datos);

    // Identity fields
    dbColumns.numero_documento = numeroDocumento;
    dbColumns.primer_nombre = String(datos.primerNombre).trim();
    dbColumns.segundo_nombre = datos.segundoNombre ? String(datos.segundoNombre).trim() : null;
    dbColumns.primer_apellido = String(datos.primerApellido).trim();
    dbColumns.segundo_apellido = datos.segundoApellido ? String(datos.segundoApellido).trim() : null;
    dbColumns.fecha_nacimiento = String(datos.fechaNacimiento);
    dbColumns.sexo_id = datos.genero === 'F' || datos.genero === '2' ? 2 : 1;
    dbColumns.tipo_documento_id = parseTipoDocumentoId(datos.tipoDocumentoId);

    // Beneficiario-specific fields
    dbColumns.tipo_afiliado_id = 3; // Beneficiario
    dbColumns.numero_documento_cotizante = numeroDocumentoCotizante;
    // parentesco_id already resolved by mapFormToDbColumns via PARENTESCO_MAP

    // Audit fields
    dbColumns.fecha_ultima_actualizacion = getBogotaDate();
    if (datos.aceptoHabeasData !== false) {
      dbColumns.acepto_habeas_data = true;
      dbColumns.fecha_acepto_habeas_data = getBogotaDate();
    }

    const { query, inputs } = buildInsertQuery(dbColumns);
    const request = pool.request();
    bindDynamicInputs(request, inputs);

    await request.query(query);

    console.log('Beneficiario creado exitosamente, documento:', numeroDocumento, 'cotizante:', numeroDocumentoCotizante);

    res.status(201).json({
      success: true,
      mensaje: 'Beneficiario creado correctamente',
    });
  } catch (error) {
    console.error('Error en crearBeneficiario:', error);
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

function parseTipoDocumentoId(tipoDocumentoId: unknown): number {
  const parsed = Number(tipoDocumentoId);
  if (Number.isInteger(parsed) && parsed > 0) {
    return parsed;
  }
  return 1;
}
