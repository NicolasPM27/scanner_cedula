import { Router } from 'express';
import { buscarAfiliado, actualizarAfiliado } from '../controllers/afiliado.controller';

const router = Router();

/**
 * GET /api/afiliados/buscar/:numeroDocumento
 * Busca un afiliado (cotizante) por número de documento
 */
router.get('/buscar/:numeroDocumento', buscarAfiliado);

/**
 * PUT /api/afiliados/:id
 * Actualiza los datos de un afiliado
 */
router.put('/:id', actualizarAfiliado);

export { router as afiliadoRoutes };
