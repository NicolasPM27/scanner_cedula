import { Router } from 'express';
import { getPool } from '../config/database';

const router = Router();

/**
 * GET /api/health
 * Verifica el estado de la API y la conexión a BD
 */
router.get('/', async (req, res, next) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query('SELECT 1 as status');
    
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: result.recordset[0].status === 1 ? 'connected' : 'error',
      version: '1.0.0',
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      message: 'No se pudo conectar a la base de datos',
    });
  }
});

export { router as healthRoutes };
