import { Request, Response, NextFunction } from 'express';
import { getPool, sql } from '../config/database';

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hora

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const cache = new Map<string, CacheEntry<unknown>>();

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

interface GeoDepartamentoDTO {
  codigo: string;
  nombre: string;
}

interface GeoMunicipioDTO {
  codigo: string;
  nombre: string;
  codigoDepartamento: string;
}

/**
 * GET /api/geo/departamentos
 * Lista TODOS los departamentos activos (sin filtro por instituciones).
 * Códigos DANE como strings zero-padded para compatibilidad con formularios.
 */
export async function listarDepartamentosGeo(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const cacheKey = 'geo:departamentos';
    let data = getCached<GeoDepartamentoDTO[]>(cacheKey);

    if (!data) {
      const pool = await getPool();
      const result = await pool.request().query(`
        SELECT
          RIGHT('00' + CAST(codigo_departamento AS VARCHAR), 2) AS codigo,
          nombre
        FROM geo.departamentos
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
 * GET /api/geo/municipios/:codigoDepartamento
 * Lista TODOS los municipios activos de un departamento.
 * Acepta código DANE como string (ej: "05") o número (ej: 5).
 */
export async function listarMunicipiosGeo(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const codigoDept = Number(req.params.codigoDepartamento);

    if (isNaN(codigoDept) || codigoDept <= 0) {
      res.status(400).json({ success: false, error: 'Código de departamento inválido' });
      return;
    }

    const cacheKey = `geo:municipios:${codigoDept}`;
    let data = getCached<GeoMunicipioDTO[]>(cacheKey);

    if (!data) {
      const pool = await getPool();
      const result = await pool.request()
        .input('codDept', sql.Int, codigoDept)
        .query(`
          SELECT
            RIGHT('00000' + CAST(codigo_municipio AS VARCHAR), 5) AS codigo,
            nombre,
            RIGHT('00' + CAST(codigo_departamento AS VARCHAR), 2) AS codigoDepartamento
          FROM geo.municipios
          WHERE codigo_departamento = @codDept
            AND activo = 1
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
