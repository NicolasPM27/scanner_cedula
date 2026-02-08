import { Request, Response, NextFunction } from 'express';
import { getPool, sql } from '../config/database';
import fs from 'fs';

/**
 * Cache en memoria para datos estáticos de instituciones educativas.
 * Se invalida cada CACHE_TTL_MS o manualmente vía POST /refresh.
 * Estrategia: single-flight + TTL para evitar stampede en arranque.
 */
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora (datos estáticos)

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();
let refreshPromise: Promise<void> | null = null;

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// ════════════════════════════════════════════════════════════
// DTOs para respuestas tipadas (contratos API)
// ════════════════════════════════════════════════════════════

interface DepartamentoDTO {
  codigoDepartamento: number;
  nombre: string;
}

interface MunicipioDTO {
  codigoMunicipio: number;
  nombre: string;
}

interface SecretariaDTO {
  id: number;
  nombre: string;
}

interface EstablecimientoDTO {
  codigoEstablecimiento: number;
  nombre: string;
  secretaria: string;
}

interface SedeDTO {
  codigoSede: number;
  nombre: string;
  zona: string;
  direccion: string | null;
  telefono: string | null;
  estado: string;
}

// ════════════════════════════════════════════════════════════
// CONTROLADORES
// ════════════════════════════════════════════════════════════

/**
 * GET /api/instituciones/departamentos
 * Lista departamentos disponibles (que tengan instituciones).
 * Respuesta liviana para primer selector del cascading.
 */
export async function listarDepartamentos(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cacheKey = 'ie:departamentos';
    let data = getCached<DepartamentoDTO[]>(cacheKey);

    if (!data) {
      const pool = await getPool();
      const result = await pool.request().query(`
        SELECT DISTINCT
          d.codigo_departamento AS codigoDepartamento,
          d.nombre
        FROM geo.departamentos d
          INNER JOIN geo.municipios m ON d.codigo_departamento = m.codigo_departamento
          INNER JOIN ie.establecimientos e ON m.codigo_municipio = e.codigo_municipio
        WHERE d.activo = 1
        ORDER BY d.nombre
      `);
      data = result.recordset;
      setCache(cacheKey, data);
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/instituciones/municipios/:codigoDepartamento
 * Municipios de un departamento que tengan establecimientos.
 */
export async function listarMunicipios(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const codigoDept = Number(req.params.codigoDepartamento);

    if (!codigoDept || isNaN(codigoDept)) {
      res.status(400).json({ success: false, error: 'Código de departamento inválido' });
      return;
    }

    const cacheKey = `ie:municipios:${codigoDept}`;
    let data = getCached<MunicipioDTO[]>(cacheKey);

    if (!data) {
      const pool = await getPool();
      const result = await pool.request()
        .input('codDept', sql.Int, codigoDept)
        .query(`
          SELECT DISTINCT
            m.codigo_municipio AS codigoMunicipio,
            m.nombre
          FROM geo.municipios m
            INNER JOIN ie.establecimientos e ON m.codigo_municipio = e.codigo_municipio
          WHERE m.codigo_departamento = @codDept
            AND m.activo = 1
          ORDER BY m.nombre
        `);
      data = result.recordset;
      setCache(cacheKey, data);
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/instituciones/secretarias
 * Todas las secretarías de educación.
 */
export async function listarSecretarias(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cacheKey = 'ie:secretarias';
    let data = getCached<SecretariaDTO[]>(cacheKey);

    if (!data) {
      const pool = await getPool();
      const result = await pool.request().query(`
        SELECT id, nombre
        FROM ie.secretarias
        WHERE activo = 1
        ORDER BY nombre
      `);
      data = result.recordset;
      setCache(cacheKey, data);
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/instituciones/establecimientos?municipio=XXXXX&secretaria=N
 * Establecimientos filtrados por municipio y opcionalmente secretaría.
 * Soporta filtro doble para cascading dropdown eficiente.
 */
export async function listarEstablecimientos(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const codigoMunicipio = Number(req.query.municipio);
    const secretariaId = req.query.secretaria ? Number(req.query.secretaria) : null;

    if (!codigoMunicipio || isNaN(codigoMunicipio)) {
      res.status(400).json({ success: false, error: 'Parámetro municipio requerido' });
      return;
    }

    const cacheKey = `ie:establecimientos:${codigoMunicipio}:${secretariaId || 'all'}`;
    let data = getCached<EstablecimientoDTO[]>(cacheKey);

    if (!data) {
      const pool = await getPool();
      const request = pool.request()
        .input('codMuni', sql.Int, codigoMunicipio);

      let query = `
        SELECT
          e.codigo_establecimiento AS codigoEstablecimiento,
          e.nombre,
          s.nombre AS secretaria
        FROM ie.establecimientos e
          INNER JOIN ie.secretarias s ON e.secretaria_id = s.id
        WHERE e.codigo_municipio = @codMuni
          AND e.activo = 1
      `;

      if (secretariaId) {
        request.input('secId', sql.Int, secretariaId);
        query += ' AND e.secretaria_id = @secId';
      }

      query += ' ORDER BY e.nombre';

      const result = await request.query(query);
      data = result.recordset;
      setCache(cacheKey, data);
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/instituciones/sedes/:codigoEstablecimiento
 * Sedes de un establecimiento específico.
 * Último nivel del cascading dropdown.
 */
export async function listarSedes(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const codigoEstab = Number(req.params.codigoEstablecimiento);

    if (!codigoEstab || isNaN(codigoEstab)) {
      res.status(400).json({ success: false, error: 'Código de establecimiento inválido' });
      return;
    }

    const cacheKey = `ie:sedes:${codigoEstab}`;
    let data = getCached<SedeDTO[]>(cacheKey);

    if (!data) {
      const pool = await getPool();
      const result = await pool.request()
        .input('codEstab', sql.BigInt, codigoEstab)
        .query(`
          SELECT
            s.codigo_sede AS codigoSede,
            s.nombre,
            s.zona,
            s.direccion,
            s.telefono,
            s.estado
          FROM ie.sedes s
          WHERE s.codigo_establecimiento = @codEstab
            AND s.activo = 1
          ORDER BY s.nombre
        `);
      data = result.recordset;
      setCache(cacheKey, data);
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/instituciones/sede/:codigoSede/detalle
 * Detalle completo de una sede, incluyendo niveles, modelos y grados.
 * Se usa cuando el usuario selecciona una sede específica.
 */
export async function obtenerDetalleSede(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const codigoSede = Number(req.params.codigoSede);

    if (!codigoSede || isNaN(codigoSede)) {
      res.status(400).json({ success: false, error: 'Código de sede inválido' });
      return;
    }

    const cacheKey = `ie:sede-detalle:${codigoSede}`;
    let data = getCached<unknown>(cacheKey);

    if (!data) {
      const pool = await getPool();

      // Consulta principal + catálogos en paralelo
      const [sedeResult, nivelesResult, modelosResult, gradosResult] = await Promise.all([
        pool.request()
          .input('codSede', sql.BigInt, codigoSede)
          .query(`
            SELECT
              s.codigo_sede,
              s.nombre         AS sede_nombre,
              s.zona,
              s.direccion,
              s.telefono,
              s.estado,
              e.codigo_establecimiento,
              e.nombre         AS establecimiento_nombre,
              m.codigo_municipio,
              m.nombre         AS municipio_nombre,
              d.codigo_departamento,
              d.nombre         AS departamento_nombre,
              sec.nombre       AS secretaria_nombre
            FROM ie.sedes s
              INNER JOIN ie.establecimientos e  ON s.codigo_establecimiento = e.codigo_establecimiento
              INNER JOIN geo.municipios m       ON e.codigo_municipio = m.codigo_municipio
              INNER JOIN geo.departamentos d    ON m.codigo_departamento = d.codigo_departamento
              INNER JOIN ie.secretarias sec     ON e.secretaria_id = sec.id
            WHERE s.codigo_sede = @codSede
          `),
        pool.request()
          .input('codSede', sql.BigInt, codigoSede)
          .query(`
            SELECT n.nombre
            FROM ie.sede_niveles sn
              INNER JOIN ie.niveles n ON sn.nivel_id = n.id
            WHERE sn.codigo_sede = @codSede
            ORDER BY n.nombre
          `),
        pool.request()
          .input('codSede', sql.BigInt, codigoSede)
          .query(`
            SELECT m.nombre
            FROM ie.sede_modelos sm
              INNER JOIN ie.modelos m ON sm.modelo_id = m.id
            WHERE sm.codigo_sede = @codSede
            ORDER BY m.nombre
          `),
        pool.request()
          .input('codSede', sql.BigInt, codigoSede)
          .query(`
            SELECT g.codigo, g.nombre
            FROM ie.sede_grados sg
              INNER JOIN ie.grados g ON sg.grado_id = g.id
            WHERE sg.codigo_sede = @codSede
            ORDER BY CAST(g.codigo AS INT)
          `),
      ]);

      if (sedeResult.recordset.length === 0) {
        res.status(404).json({ success: false, error: 'Sede no encontrada' });
        return;
      }

      const sede = sedeResult.recordset[0];
      data = {
        ...sede,
        niveles: nivelesResult.recordset.map((r: { nombre: string }) => r.nombre),
        modelos: modelosResult.recordset.map((r: { nombre: string }) => r.nombre),
        grados: gradosResult.recordset.map((r: { codigo: string; nombre: string }) => ({ codigo: r.codigo, nombre: r.nombre })),
      };
      setCache(cacheKey, data);
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/instituciones/importar
 * Importa datos desde un CSV subido.
 * Solo disponible en desarrollo o con autenticación admin.
 */
export async function importarCSV(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { filePath } = req.body;

    if (!filePath) {
      res.status(400).json({ success: false, error: 'filePath requerido en el body' });
      return;
    }

    // Importar dinámicamente para no cargar el módulo en cada request
    const { importarInstituciones } = await import('../utils/import-instituciones');
    const result = await importarInstituciones(filePath);

    // Invalidar todo el cache tras importación
    cache.clear();

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/instituciones/importar/upload
 * Recibe un archivo Excel/CSV vía multipart/form-data, lo procesa
 * e importa las instituciones educativas a la base de datos.
 * Limpia el archivo temporal tras finalizar.
 */
export async function importarArchivoSubido(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const uploadedFile = req.file;

  try {
    if (!uploadedFile) {
      res.status(400).json({
        success: false,
        error: 'Se requiere un archivo. Campo esperado: "file" (.xlsx, .csv, .tsv)',
      });
      return;
    }

    console.log(`📤 Archivo recibido: ${uploadedFile.originalname} (${(uploadedFile.size / 1024).toFixed(1)} KB)`);

    const { importarInstituciones } = await import('../utils/import-instituciones');
    const result = await importarInstituciones(uploadedFile.path);

    // Invalidar todo el cache tras importación
    cache.clear();

    res.json({
      success: true,
      data: {
        ...result,
        archivo: uploadedFile.originalname,
      },
    });
  } catch (error) {
    next(error);
  } finally {
    // Limpiar archivo temporal
    if (uploadedFile?.path) {
      fs.unlink(uploadedFile.path, (err) => {
        if (err) console.warn(`⚠️  No se pudo eliminar temporal: ${uploadedFile.path}`);
      });
    }
  }
}

/**
 * POST /api/instituciones/cache/refresh
 * Invalida el cache en memoria. Útil tras cambios directos en BD.
 */
export async function refreshCache(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (refreshPromise) {
      await refreshPromise;
      res.json({ success: true, message: 'Cache ya estaba siendo refrescado' });
      return;
    }

    refreshPromise = (async () => {
      cache.clear();
    })();

    await refreshPromise;
    refreshPromise = null;

    res.json({ success: true, message: 'Cache invalidado exitosamente' });
  } catch (error) {
    refreshPromise = null;
    next(error);
  }
}

/**
 * GET /api/instituciones/stats
 * Estadísticas generales del catálogo de instituciones.
 */
export async function obtenerEstadisticas(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cacheKey = 'ie:stats';
    let data = getCached<unknown>(cacheKey);

    if (!data) {
      const pool = await getPool();
      const result = await pool.request().query(`
        SELECT
          (SELECT COUNT(*) FROM geo.departamentos WHERE activo = 1) AS departamentos,
          (SELECT COUNT(*) FROM geo.municipios WHERE activo = 1)    AS municipios,
          (SELECT COUNT(*) FROM ie.secretarias WHERE activo = 1)    AS secretarias,
          (SELECT COUNT(*) FROM ie.establecimientos WHERE activo = 1) AS establecimientos,
          (SELECT COUNT(*) FROM ie.sedes WHERE activo = 1)          AS sedes,
          (SELECT COUNT(*) FROM ie.niveles)                         AS niveles,
          (SELECT COUNT(*) FROM ie.modelos)                         AS modelos,
          (SELECT COUNT(*) FROM ie.grados)                          AS grados
      `);
      data = result.recordset[0];
      setCache(cacheKey, data);
    }

    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
