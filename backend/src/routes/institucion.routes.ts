import { Router } from 'express';
import {
  listarDepartamentos,
  listarMunicipios,
  listarSecretarias,
  listarEstablecimientos,
  listarSedes,
  obtenerDetalleSede,
  importarCSV,
  importarArchivoSubido,
  refreshCache,
  obtenerEstadisticas,
} from '../controllers/institucion.controller';
import { uploadSingle } from '../middleware/upload';

const router = Router();

// ════════════════════════════════════════════════════════════
// SELECTORES CASCADING (GET - público, cacheado)
// Flujo: departamento → municipio → establecimiento → sede
// ════════════════════════════════════════════════════════════

/**
 * GET /api/instituciones/departamentos
 * Primer nivel del cascading dropdown
 */
router.get('/departamentos', listarDepartamentos);

/**
 * GET /api/instituciones/municipios/:codigoDepartamento
 * Segundo nivel: municipios de un departamento
 */
router.get('/municipios/:codigoDepartamento', listarMunicipios);

/**
 * GET /api/instituciones/secretarias
 * Lista todas las secretarías de educación
 */
router.get('/secretarias', listarSecretarias);

/**
 * GET /api/instituciones/establecimientos?municipio=XXXXX&secretaria=N
 * Tercer nivel: establecimientos por municipio (y opcionalmente secretaría)
 */
router.get('/establecimientos', listarEstablecimientos);

/**
 * GET /api/instituciones/sedes/:codigoEstablecimiento
 * Cuarto nivel: sedes de un establecimiento
 */
router.get('/sedes/:codigoEstablecimiento', listarSedes);

/**
 * GET /api/instituciones/sede/:codigoSede/detalle
 * Detalle completo de una sede (niveles, modelos, grados incluidos)
 */
router.get('/sede/:codigoSede/detalle', obtenerDetalleSede);

// ════════════════════════════════════════════════════════════
// ADMINISTRACIÓN (proteger con auth en producción)
// ════════════════════════════════════════════════════════════

/**
 * POST /api/instituciones/importar
 * Importa instituciones desde un CSV en el servidor
 */
router.post('/importar', importarCSV);

/**
 * POST /api/instituciones/importar/upload
 * Importa instituciones desde un archivo subido (multipart/form-data).
 * Campo: "file" (.xlsx, .csv, .tsv)
 * Solo disponible en desarrollo.
 */
router.post('/importar/upload', uploadSingle, importarArchivoSubido);

/**
 * POST /api/instituciones/cache/refresh
 * Invalida el cache en memoria
 */
router.post('/cache/refresh', refreshCache);

/**
 * GET /api/instituciones/stats
 * Estadísticas del catálogo
 */
router.get('/stats', obtenerEstadisticas);

export { router as institucionRoutes };
