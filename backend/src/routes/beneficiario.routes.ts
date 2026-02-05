import { Router } from 'express';
import { obtenerBeneficiarios, actualizarBeneficiario } from '../controllers/beneficiario.controller';

const router = Router();

/**
 * GET /api/beneficiarios/cotizante/:numeroDocumento
 * Obtiene todos los beneficiarios de un cotizante
 */
router.get('/cotizante/:numeroDocumento', obtenerBeneficiarios);

/**
 * PUT /api/beneficiarios/:id
 * Actualiza los datos de un beneficiario
 */
router.put('/:id', actualizarBeneficiario);

export { router as beneficiarioRoutes };
