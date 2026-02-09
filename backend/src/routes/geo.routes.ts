import { Router } from 'express';
import {
  listarDepartamentosGeo,
  listarMunicipiosGeo,
} from '../controllers/geo.controller';

const router = Router();

/**
 * GET /api/geo/departamentos
 * Todos los departamentos activos (para formularios de residencia)
 */
router.get('/departamentos', listarDepartamentosGeo);

/**
 * GET /api/geo/municipios/:codigoDepartamento
 * Municipios activos de un departamento
 */
router.get('/municipios/:codigoDepartamento', listarMunicipiosGeo);

export { router as geoRoutes };
