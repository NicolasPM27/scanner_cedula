import { Router } from 'express';
import {
  buscarAfiliado,
  buscarAfiliadosAdmin,
  actualizarAfiliado,
  crearAfiliado,
} from '../controllers/afiliado.controller';
import { notificarActualizacion } from '../controllers/notificacion.controller';
import { requireAdmin, requireAuth } from '../middleware/auth.middleware';

const router = Router();

/**
 * GET /api/afiliados/buscar/:numeroDocumento
 * Busca un afiliado (cotizante) por número de documento
 */
router.get('/buscar/:numeroDocumento', requireAuth, buscarAfiliado);

/**
 * GET /api/afiliados/admin/buscar?q=...
 * Búsqueda administrativa por documento o nombre
 */
router.get('/admin/buscar', requireAdmin, buscarAfiliadosAdmin);

/**
 * POST /api/afiliados/notificar-actualizacion
 * Envía notificación por correo electrónico tras la actualización
 */
router.post('/notificar-actualizacion', notificarActualizacion);

/**
 * POST /api/afiliados
 * Crea un afiliado nuevo
 */
router.post('/', requireAdmin, crearAfiliado);

/**
 * PUT /api/afiliados/:id
 * Actualiza los datos de un afiliado
 */
router.put('/:id', requireAuth, actualizarAfiliado);

export { router as afiliadoRoutes };
