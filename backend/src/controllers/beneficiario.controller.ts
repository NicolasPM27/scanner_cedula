import { Request, Response, NextFunction } from 'express';
import { getPool, sql } from '../config/database';
import { mapFormToDbColumns, buildUpdateQuery } from '../utils/field-mapper';

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
    dbColumns.fecha_ultima_actualizacion = new Date();

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
