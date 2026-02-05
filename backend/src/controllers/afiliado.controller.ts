import { Request, Response, NextFunction } from 'express';
import { getPool, sql } from '../config/database';
import { mapFormToDbColumns, buildUpdateQuery } from '../utils/field-mapper';

/**
 * Busca un afiliado por número de documento
 * Solo busca cotizantes (no beneficiarios)
 */
export async function buscarAfiliado(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { numeroDocumento } = req.params;
    
    console.log('🔍 Buscando afiliado con documento:', numeroDocumento);

    if (!numeroDocumento) {
      res.status(400).json({
        existe: false,
        error: 'Número de documento requerido',
      });
      return;
    }

    const pool = await getPool();
    const result = await pool
      .request()
      .input('doc', sql.NVarChar(64), numeroDocumento)
      .query(`
        SELECT * FROM poblacion 
        WHERE numero_documento = @doc 
        AND (tipo_afiliado IS NULL OR tipo_afiliado <> 'BENEFICIARIO')
      `);
    
    console.log('📊 Resultados encontrados:', result.recordset.length);

    if (result.recordset.length === 0) {
      console.log('❌ No se encontró afiliado');
      res.json({ existe: false });
      return;
    }

    console.log('✅ Afiliado encontrado:', result.recordset[0].numero_documento);
    res.json({
      existe: true,
      afiliado: result.recordset[0],
    });
  } catch (error) {
    console.error('💥 Error en buscarAfiliado:', error);
    next(error);
  }
}

/**
 * Actualiza los datos de un afiliado
 */
export async function actualizarAfiliado(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const datos = req.body;

    console.log('📝 Actualizando afiliado ID:', id);
    console.log('📝 Datos recibidos:', JSON.stringify(datos, null, 2));

    if (!id) {
      res.status(400).json({
        success: false,
        mensaje: 'ID de afiliado requerido',
      });
      return;
    }

    const pool = await getPool();

    // Verificar que el afiliado existe (usamos id_hosvital como PK - soporta números y UUIDs)
    const checkResult = await pool
      .request()
      .input('id_hosvital', sql.NVarChar(128), id)
      .query('SELECT id_hosvital FROM poblacion WHERE id_hosvital = @id_hosvital');

    if (checkResult.recordset.length === 0) {
      res.status(404).json({
        success: false,
        mensaje: 'Afiliado no encontrado',
      });
      return;
    }

    // Mapear campos del formulario a columnas de BD
    const dbColumns = mapFormToDbColumns(datos);

    // Agregar campos de auditoría
    dbColumns.fecha_ultima_actualizacion = new Date();
    if (datos.aceptoHabeasData) {
      dbColumns.acepto_habeas_data = true;
      dbColumns.fecha_acepto_habeas_data = new Date();
    }

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

    console.log('✅ Afiliado actualizado exitosamente, ID:', id);

    res.json({
      success: true,
      mensaje: 'Datos actualizados correctamente',
    });
  } catch (error) {
    console.error('💥 Error en actualizarAfiliado:', error);
    next(error);
  }
}
