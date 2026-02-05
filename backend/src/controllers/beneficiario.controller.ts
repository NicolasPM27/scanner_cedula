import { Request, Response, NextFunction } from 'express';
import { getPool, sql } from '../config/database';
import { mapFormToDbColumns, buildUpdateQuery } from '../utils/field-mapper';

/**
 * Obtiene todos los beneficiarios de un cotizante
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
        error: 'Número de documento del cotizante requerido',
      });
      return;
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('doc', sql.NVarChar(64), numeroDocumento)
      .query(`
        SELECT * FROM poblacion 
        WHERE numero_documento_cotizante = @doc 
        AND tipo_afiliado = 'BENEFICIARIO'
        ORDER BY primer_apellido, primer_nombre
      `);

    res.json({
      beneficiarios: result.recordset,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Actualiza los datos de un beneficiario
 */
export async function actualizarBeneficiario(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const datos = req.body;

    console.log('📝 Actualizando beneficiario ID:', id);
    console.log('📝 Datos recibidos:', JSON.stringify(datos, null, 2));

    if (!id) {
      res.status(400).json({
        success: false,
        mensaje: 'ID de beneficiario requerido',
      });
      return;
    }

    const pool = await getPool();

    // Verificar que el beneficiario existe (usamos id_hosvital como PK - soporta números y UUIDs)
    const checkResult = await pool
      .request()
      .input('id_hosvital', sql.NVarChar(128), id)
      .query(`
        SELECT id_hosvital FROM poblacion 
        WHERE id_hosvital = @id_hosvital AND tipo_afiliado = 'BENEFICIARIO'
      `);

    if (checkResult.recordset.length === 0) {
      res.status(404).json({
        success: false,
        mensaje: 'Beneficiario no encontrado',
      });
      return;
    }

    // Mapear campos del formulario a columnas de BD
    const dbColumns = mapFormToDbColumns(datos);

    // Agregar campos de auditoría
    dbColumns.fecha_ultima_actualizacion = new Date();

    // Construir y ejecutar UPDATE (usamos id_hosvital como PK - string)
    const { query, inputs } = buildUpdateQuery('poblacion', dbColumns, 'id_hosvital', id);
    
    const request = pool.request();
    request.input('id_hosvital', sql.NVarChar(128), id);
    
    // Agregar inputs dinámicos
    for (const [key, value] of Object.entries(inputs)) {
      if (value instanceof Date) {
        request.input(key, sql.DateTime2, value);
      } else if (typeof value === 'boolean') {
        request.input(key, sql.Bit, value);
      } else if (typeof value === 'number') {
        request.input(key, sql.Int, value);
      } else {
        request.input(key, sql.NVarChar(sql.MAX), value);
      }
    }

    await request.query(query);

    console.log('✅ Beneficiario actualizado exitosamente, ID:', id);

    res.json({
      success: true,
      mensaje: 'Datos del beneficiario actualizados correctamente',
    });
  } catch (error) {
    console.error('💥 Error en actualizarBeneficiario:', error);
    next(error);
  }
}
