import { Router } from 'express';
import { buscarAfiliado, actualizarAfiliado } from '../controllers/afiliado.controller';
import { notificarActualizacion } from '../controllers/notificacion.controller';

const router = Router();

/**
 * GET /api/afiliados/buscar/:numeroDocumento
 * Busca un afiliado (cotizante) por número de documento
 */
router.get('/buscar/:numeroDocumento', buscarAfiliado);

/**
 * POST /api/afiliados/notificar-actualizacion
 * Envía notificación por correo electrónico tras la actualización
 */
router.post('/notificar-actualizacion', notificarActualizacion);

/**
 * PUT /api/afiliados/:id
 * Actualiza los datos de un afiliado
 */
router.put('/:id', actualizarAfiliado);

export { router as afiliadoRoutes };
