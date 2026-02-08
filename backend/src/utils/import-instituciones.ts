import { getPool, sql } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

// ════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════

/** Fila normalizada extraída del Excel/CSV */
interface FilaNormalizada {
  secretaria: string;
  codigoDepartamento: number;
  nombreDepartamento: string;
  codigoMunicipio: number;
  nombreMunicipio: string;
  codigoEstablecimiento: number;
  nombreEstablecimiento: string;
  codigoSede: number;
  nombreSede: string;
  zona: string;
  direccion: string;
  telefono: string;
  estadoSede: string;
  niveles: string[];
  modelos: string[];
  grados: string[];
}

/** Resultado de la importación */
export interface ImportResult {
  totalRows: number;
  processed: number;
  errors: Array<{ row: number; message: string }>;
  duration: string;
  stats: {
    departamentos: number;
    municipios: number;
    secretarias: number;
    establecimientos: number;
    sedes: number;
    niveles: number;
    modelos: number;
  };
}

// ════════════════════════════════════════════════════════════
// PARSEO MULTI-FORMATO (CSV / TSV / XLSX)
// ════════════════════════════════════════════════════════════

/**
 * Header aliases: mapea variantes de encabezados a campo canónico.
 * Soporta columnas con/sin tildes, mayúsculas, espacios extra.
 */
const HEADER_MAP: Record<string, keyof FilaNormalizada> = {
  'secretaria':              'secretaria',
  'codigo departamento':     'codigoDepartamento',
  'código departamento':     'codigoDepartamento',
  'nombre departamento':     'nombreDepartamento',
  'codigo municipio':        'codigoMunicipio',
  'código municipio':        'codigoMunicipio',
  'nombre municipio':        'nombreMunicipio',
  'codigo establecimiento':  'codigoEstablecimiento',
  'código establecimiento':  'codigoEstablecimiento',
  'nombre establecimiento':  'nombreEstablecimiento',
  'codigo sede':             'codigoSede',
  'código sede':             'codigoSede',
  'nombre sede':             'nombreSede',
  'zona':                    'zona',
  'direccion':               'direccion',
  'dirección':               'direccion',
  'telefono':                'telefono',
  'teléfono':                'telefono',
  'estado sede':             'estadoSede',
  'niveles':                 'niveles',
  'modelos':                 'modelos',
  'grados':                  'grados',
};

function normalizeHeader(raw: string): keyof FilaNormalizada | null {
  const clean = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  return HEADER_MAP[clean] ?? null;
}

/**
 * Lee un Excel (.xlsx) usando ExcelJS.
 * Requiere: npm install exceljs
 */
async function parseExcel(filePath: string): Promise<FilaNormalizada[]> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.default.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    throw new Error('La hoja de Excel debe tener al menos un encabezado y una fila de datos');
  }

  // Mapear encabezados
  const headerRow = sheet.getRow(1);
  const columnMap: Array<{ col: number; field: keyof FilaNormalizada }> = [];
  headerRow.eachCell((cell, colNumber) => {
    const field = normalizeHeader(String(cell.value ?? ''));
    if (field) columnMap.push({ col: colNumber, field });
  });

  const rows: FilaNormalizada[] = [];
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const raw: Record<string, string> = {};
    for (const { col, field } of columnMap) {
      raw[field] = String(row.getCell(col).value ?? '').trim();
    }
    rows.push(buildRow(raw));
  });

  return rows;
}

/**
 * Lee CSV/TSV con soporte de campos entre comillas.
 * Auto-detecta delimitador (tab / coma).
 */
function parseDelimited(filePath: string): FilaNormalizada[] {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) {
    throw new Error('El archivo debe tener al menos un encabezado y una fila de datos');
  }

  const delimiter = lines[0].includes('\t') ? '\t' : ',';
  const headers = parseLine(lines[0], delimiter);

  const columnMap: Array<{ idx: number; field: keyof FilaNormalizada }> = [];
  headers.forEach((h, idx) => {
    const field = normalizeHeader(h);
    if (field) columnMap.push({ idx, field });
  });

  const rows: FilaNormalizada[] = [];
  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i], delimiter);
    const raw: Record<string, string> = {};
    for (const { idx, field } of columnMap) {
      raw[field] = (values[idx] ?? '').trim();
    }
    rows.push(buildRow(raw));
  }
  return rows;
}

function parseLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === delimiter && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result;
}

function buildRow(raw: Record<string, string>): FilaNormalizada {
  const splitList = (v: string | undefined) =>
    (v ?? '').split(',').map(s => s.trim()).filter(Boolean);

  return {
    secretaria: (raw['secretaria'] ?? '').toUpperCase(),
    codigoDepartamento: Number(raw['codigoDepartamento']) || 0,
    nombreDepartamento: (raw['nombreDepartamento'] ?? '').toUpperCase(),
    codigoMunicipio: Number(raw['codigoMunicipio']) || 0,
    nombreMunicipio: (raw['nombreMunicipio'] ?? '').toUpperCase(),
    codigoEstablecimiento: Number(raw['codigoEstablecimiento']) || 0,
    nombreEstablecimiento: raw['nombreEstablecimiento'] ?? '',
    codigoSede: Number(raw['codigoSede']) || 0,
    nombreSede: raw['nombreSede'] ?? '',
    zona: (raw['zona'] ?? '').toUpperCase(),
    direccion: raw['direccion'] ?? '',
    telefono: raw['telefono'] ?? '',
    estadoSede: raw['estadoSede'] ?? 'ACTIVO',
    niveles: splitList(raw['niveles'] as string),
    modelos: splitList(raw['modelos'] as string),
    grados: splitList(raw['grados'] as string),
  };
}

/** Auto-detecta formato según extensión */
async function parseFile(filePath: string): Promise<FilaNormalizada[]> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    return parseExcel(filePath);
  }
  return parseDelimited(filePath);
}

// ════════════════════════════════════════════════════════════
// IMPORTACIÓN CON TRANSACCIONES POR BATCH
// ════════════════════════════════════════════════════════════

const BATCH_SIZE = 500;

/**
 * Importa instituciones educativas desde Excel (.xlsx) o CSV al schema 3NF.
 *
 * Estrategia de rendimiento:
 * - Pre-carga caches completos en paralelo
 * - Procesa filas en batches de 500 con transacción por batch
 * - Caches locales Set/Map evitan queries repetidos
 * - Auditoría en ie.importaciones con detalle de errores en JSON
 */
export async function importarInstituciones(
  filePath: string
): Promise<ImportResult> {
  const startTime = Date.now();
  const pool = await getPool();
  const rows = await parseFile(filePath);

  const result: ImportResult = {
    totalRows: rows.length,
    processed: 0,
    errors: [],
    duration: '',
    stats: { departamentos: 0, municipios: 0, secretarias: 0, establecimientos: 0, sedes: 0, niveles: 0, modelos: 0 },
  };

  // Registrar importación
  const importRec = await pool.request()
    .input('archivo', sql.NVarChar(256), path.basename(filePath))
    .input('total', sql.Int, rows.length)
    .query(`
      INSERT INTO ie.importaciones (archivo_origen, registros_total, estado)
      OUTPUT INSERTED.id
      VALUES (@archivo, @total, 'EN_PROCESO')
    `);
  const importId: number = importRec.recordset[0].id;

  // Pre-cargar caches en paralelo
  const deptCache = new Set<number>();
  const muniCache = new Set<number>();
  const secCache = new Map<string, number>();
  const estabCache = new Set<number>();
  const sedeCache = new Set<number>();
  const nivelCache = new Map<string, number>();
  const modeloCache = new Map<string, number>();

  const [depR, munR, secR, estR, sedR, nivR, modR] = await Promise.all([
    pool.request().query('SELECT codigo_departamento FROM geo.departamentos'),
    pool.request().query('SELECT codigo_municipio FROM geo.municipios'),
    pool.request().query('SELECT id, nombre FROM ie.secretarias'),
    pool.request().query('SELECT codigo_establecimiento FROM ie.establecimientos'),
    pool.request().query('SELECT codigo_sede FROM ie.sedes'),
    pool.request().query('SELECT id, nombre FROM ie.niveles'),
    pool.request().query('SELECT id, nombre FROM ie.modelos'),
  ]);

  depR.recordset.forEach((r: { codigo_departamento: number }) => deptCache.add(r.codigo_departamento));
  munR.recordset.forEach((r: { codigo_municipio: number }) => muniCache.add(r.codigo_municipio));
  secR.recordset.forEach((r: { id: number; nombre: string }) => secCache.set(r.nombre, r.id));
  estR.recordset.forEach((r: { codigo_establecimiento: number }) => estabCache.add(Number(r.codigo_establecimiento)));
  sedR.recordset.forEach((r: { codigo_sede: number }) => sedeCache.add(Number(r.codigo_sede)));
  nivR.recordset.forEach((r: { id: number; nombre: string }) => nivelCache.set(r.nombre, r.id));
  modR.recordset.forEach((r: { id: number; nombre: string }) => modeloCache.set(r.nombre, r.id));

  // ────────────────────────────────────────────────────────
  // Helper: procesa una fila individual contra pool (sin transacción).
  // Se usa como fallback cuando un batch falla.
  // Todas las queries son idempotentes (IF NOT EXISTS), por lo
  // que es seguro re-ejecutar filas que ya se insertaron parcialmente.
  // ────────────────────────────────────────────────────────
  async function processRow(
    ctx: sql.ConnectionPool | sql.Transaction,
    row: FilaNormalizada,
    rowIdx: number,
  ): Promise<void> {
    if (!row.codigoDepartamento || !row.codigoMunicipio || !row.codigoSede) {
      result.errors.push({ row: rowIdx, message: 'Códigos obligatorios faltantes' });
      return;
    }

    // 1. Departamento
    if (!deptCache.has(row.codigoDepartamento)) {
      await ctx.request()
        .input('cod', sql.Int, row.codigoDepartamento)
        .input('nom', sql.NVarChar(100), row.nombreDepartamento)
        .query(`IF NOT EXISTS (SELECT 1 FROM geo.departamentos WHERE codigo_departamento = @cod)
          INSERT INTO geo.departamentos (codigo_departamento, nombre) VALUES (@cod, @nom)`);
      deptCache.add(row.codigoDepartamento);
      result.stats.departamentos++;
    }

    // 2. Municipio
    if (!muniCache.has(row.codigoMunicipio)) {
      await ctx.request()
        .input('cod', sql.Int, row.codigoMunicipio)
        .input('nom', sql.NVarChar(120), row.nombreMunicipio)
        .input('dep', sql.Int, row.codigoDepartamento)
        .query(`IF NOT EXISTS (SELECT 1 FROM geo.municipios WHERE codigo_municipio = @cod)
          INSERT INTO geo.municipios (codigo_municipio, nombre, codigo_departamento) VALUES (@cod, @nom, @dep)`);
      muniCache.add(row.codigoMunicipio);
      result.stats.municipios++;
    }

    // 3. Secretaría
    let secId = secCache.get(row.secretaria);
    if (secId === undefined) {
      const r = await ctx.request()
        .input('nom', sql.NVarChar(150), row.secretaria)
        .query(`IF NOT EXISTS (SELECT 1 FROM ie.secretarias WHERE nombre = @nom)
          INSERT INTO ie.secretarias (nombre) VALUES (@nom);
          SELECT id FROM ie.secretarias WHERE nombre = @nom;`);
      secId = r.recordset[0]?.id as number;
      if (secId === undefined) {
        throw new Error(`No se pudo obtener id de secretaría "${row.secretaria}"`);
      }
      secCache.set(row.secretaria, secId);
      result.stats.secretarias++;
    }

    // 4. Establecimiento
    if (!estabCache.has(row.codigoEstablecimiento)) {
      await ctx.request()
        .input('cod', sql.BigInt, row.codigoEstablecimiento)
        .input('nom', sql.NVarChar(300), row.nombreEstablecimiento)
        .input('mun', sql.Int, row.codigoMunicipio)
        .input('sec', sql.Int, secId)
        .query(`IF NOT EXISTS (SELECT 1 FROM ie.establecimientos WHERE codigo_establecimiento = @cod)
          INSERT INTO ie.establecimientos (codigo_establecimiento, nombre, codigo_municipio, secretaria_id)
          VALUES (@cod, @nom, @mun, @sec)`);
      estabCache.add(row.codigoEstablecimiento);
      result.stats.establecimientos++;
    }

    // 5. Sede
    if (!sedeCache.has(row.codigoSede)) {
      const zona = row.zona === 'URBANA' ? 'URBANA' : 'RURAL';
      await ctx.request()
        .input('cod', sql.BigInt, row.codigoSede)
        .input('nom', sql.NVarChar(300), row.nombreSede)
        .input('est', sql.BigInt, row.codigoEstablecimiento)
        .input('zona', sql.NVarChar(10), zona)
        .input('dir', sql.NVarChar(300), row.direccion || null)
        .input('tel', sql.NVarChar(30), row.telefono || null)
        .input('estado', sql.NVarChar(30), row.estadoSede || 'ACTIVO')
        .query(`IF NOT EXISTS (SELECT 1 FROM ie.sedes WHERE codigo_sede = @cod)
          INSERT INTO ie.sedes (codigo_sede, nombre, codigo_establecimiento, zona, direccion, telefono, estado)
          VALUES (@cod, @nom, @est, @zona, @dir, @tel, @estado)`);
      sedeCache.add(row.codigoSede);
      result.stats.sedes++;
    }

    // 6. Niveles
    for (const nivel of row.niveles) {
      const norm = nivel.toUpperCase();
      let nId = nivelCache.get(norm);
      if (nId === undefined) {
        const r = await ctx.request()
          .input('nom', sql.NVarChar(100), norm)
          .query(`IF NOT EXISTS (SELECT 1 FROM ie.niveles WHERE nombre = @nom)
            INSERT INTO ie.niveles (nombre) VALUES (@nom);
            SELECT id FROM ie.niveles WHERE nombre = @nom;`);
        nId = r.recordset[0]?.id as number;
        if (nId !== undefined) {
          nivelCache.set(norm, nId);
          result.stats.niveles++;
        }
      }
      if (nId !== undefined) {
        await ctx.request()
          .input('sede', sql.BigInt, row.codigoSede)
          .input('nid', sql.Int, nId)
          .query(`IF NOT EXISTS (SELECT 1 FROM ie.sede_niveles WHERE codigo_sede = @sede AND nivel_id = @nid)
            INSERT INTO ie.sede_niveles (codigo_sede, nivel_id) VALUES (@sede, @nid)`);
      }
    }

    // 7. Modelos
    for (const modelo of row.modelos) {
      const norm = modelo.toUpperCase();
      let mId = modeloCache.get(norm);
      if (mId === undefined) {
        const r = await ctx.request()
          .input('nom', sql.NVarChar(150), norm)
          .query(`IF NOT EXISTS (SELECT 1 FROM ie.modelos WHERE nombre = @nom)
            INSERT INTO ie.modelos (nombre) VALUES (@nom);
            SELECT id FROM ie.modelos WHERE nombre = @nom;`);
        mId = r.recordset[0]?.id as number;
        if (mId !== undefined) {
          modeloCache.set(norm, mId);
          result.stats.modelos++;
        }
      }
      if (mId !== undefined) {
        await ctx.request()
          .input('sede', sql.BigInt, row.codigoSede)
          .input('mid', sql.Int, mId)
          .query(`IF NOT EXISTS (SELECT 1 FROM ie.sede_modelos WHERE codigo_sede = @sede AND modelo_id = @mid)
            INSERT INTO ie.sede_modelos (codigo_sede, modelo_id) VALUES (@sede, @mid)`);
      }
    }

    // 8. Grados
    for (const grado of row.grados) {
      await ctx.request()
        .input('sede', sql.BigInt, row.codigoSede)
        .input('cod', sql.NVarChar(10), grado)
        .query(`DECLARE @gid INT;
          SELECT @gid = id FROM ie.grados WHERE codigo = @cod;
          IF @gid IS NOT NULL AND NOT EXISTS (SELECT 1 FROM ie.sede_grados WHERE codigo_sede = @sede AND grado_id = @gid)
            INSERT INTO ie.sede_grados (codigo_sede, grado_id) VALUES (@sede, @gid)`);
    }

    result.processed++;
  }

  // ────────────────────────────────────────────────────────
  // Procesar en batches con transacción.
  // Si un batch falla, se reintenta fila por fila sin transacción
  // (las queries son idempotentes gracias a IF NOT EXISTS).
  // ────────────────────────────────────────────────────────
  for (let batchStart = 0; batchStart < rows.length; batchStart += BATCH_SIZE) {
    const batch = rows.slice(batchStart, batchStart + BATCH_SIZE);
    const batchNum = Math.floor(batchStart / BATCH_SIZE) + 1;

    // ── Intento 1: batch transaccional (rápido) ──
    const transaction = pool.transaction();
    let batchOk = false;

    try {
      await transaction.begin();

      for (let i = 0; i < batch.length; i++) {
        const rowIdx = batchStart + i + 2;
        const row = batch[i];
        await processRow(transaction, row, rowIdx);
      }

      await transaction.commit();
      batchOk = true;

      const pct = Math.round(((batchStart + batch.length) / rows.length) * 100);
      console.log(`  📦 Batch ${batchNum} completado (${pct}%)`);
    } catch (batchErr: unknown) {
      // Rollback seguro: si la transacción ya fue abortada por SQL Server
      // el rollback lanzará EABORT; lo ignoramos.
      try { await transaction.rollback(); } catch { /* ya abortada */ }

      const msg = batchErr instanceof Error ? batchErr.message : String(batchErr);
      console.warn(`  ⚠️  Batch ${batchNum} falló en modo transaccional: ${msg}`);
      console.log(`  🔄 Reintentando batch ${batchNum} fila por fila...`);
    }

    // ── Intento 2: fila por fila sin transacción (resiliente) ──
    if (!batchOk) {
      // Refrescar caches desde BD antes del reintento para
      // no perder las entradas insertadas antes del abort
      const [depR2, munR2, secR2, estR2, sedR2, nivR2, modR2] = await Promise.all([
        pool.request().query('SELECT codigo_departamento FROM geo.departamentos'),
        pool.request().query('SELECT codigo_municipio FROM geo.municipios'),
        pool.request().query('SELECT id, nombre FROM ie.secretarias'),
        pool.request().query('SELECT codigo_establecimiento FROM ie.establecimientos'),
        pool.request().query('SELECT codigo_sede FROM ie.sedes'),
        pool.request().query('SELECT id, nombre FROM ie.niveles'),
        pool.request().query('SELECT id, nombre FROM ie.modelos'),
      ]);

      deptCache.clear();
      muniCache.clear();
      secCache.clear();
      estabCache.clear();
      sedeCache.clear();
      nivelCache.clear();
      modeloCache.clear();

      depR2.recordset.forEach((r: { codigo_departamento: number }) => deptCache.add(r.codigo_departamento));
      munR2.recordset.forEach((r: { codigo_municipio: number }) => muniCache.add(r.codigo_municipio));
      secR2.recordset.forEach((r: { id: number; nombre: string }) => secCache.set(r.nombre, r.id));
      estR2.recordset.forEach((r: { codigo_establecimiento: number }) => estabCache.add(Number(r.codigo_establecimiento)));
      sedR2.recordset.forEach((r: { codigo_sede: number }) => sedeCache.add(Number(r.codigo_sede)));
      nivR2.recordset.forEach((r: { id: number; nombre: string }) => nivelCache.set(r.nombre, r.id));
      modR2.recordset.forEach((r: { id: number; nombre: string }) => modeloCache.set(r.nombre, r.id));

      let rowOk = 0;
      let rowFail = 0;
      for (let i = 0; i < batch.length; i++) {
        const rowIdx = batchStart + i + 2;
        const row = batch[i];
        try {
          await processRow(pool, row, rowIdx);
          rowOk++;
        } catch (rowErr: unknown) {
          const msg = rowErr instanceof Error ? rowErr.message : String(rowErr);
          result.errors.push({ row: rowIdx, message: msg });
          rowFail++;
        }
      }

      const pct = Math.round(((batchStart + batch.length) / rows.length) * 100);
      console.log(`  📦 Batch ${batchNum} reintentado fila a fila: ${rowOk} OK, ${rowFail} errores (${pct}%)`);
    }
  }

  // Actualizar auditoría
  const estado = result.errors.length === 0 ? 'COMPLETADO' : (result.processed > 0 ? 'COMPLETADO' : 'ERROR');
  result.duration = `${((Date.now() - startTime) / 1000).toFixed(2)}s`;

  await pool.request()
    .input('id', sql.Int, importId)
    .input('ok', sql.Int, result.processed)
    .input('err', sql.Int, result.errors.length)
    .input('estado', sql.NVarChar(20), estado)
    .input('errores', sql.NVarChar(sql.MAX), result.errors.length > 0 ? JSON.stringify(result.errors.slice(0, 200)) : null)
    .query(`UPDATE ie.importaciones
      SET registros_ok = @ok, registros_error = @err, estado = @estado,
          completado_en = SYSUTCDATETIME(), errores_detalle = @errores
      WHERE id = @id`);

  return result;
}
