import { getPool, sql } from '../config/database';
import * as fs from 'fs';
import * as path from 'path';

// ════════════════════════════════════════════════════════════
// TIPOS
// ════════════════════════════════════════════════════════════

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
// PARSEO MULTI-FORMATO
// ════════════════════════════════════════════════════════════

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

async function parseExcel(filePath: string): Promise<FilaNormalizada[]> {
  const ExcelJS = await import('exceljs');
  const workbook = new ExcelJS.default.Workbook();
  await workbook.xlsx.readFile(filePath);

  const sheet = workbook.worksheets[0];
  if (!sheet || sheet.rowCount < 2) {
    throw new Error('La hoja de Excel debe tener al menos un encabezado y una fila de datos');
  }

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

async function parseFile(filePath: string): Promise<FilaNormalizada[]> {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.xlsx' || ext === '.xls') {
    return parseExcel(filePath);
  }
  return parseDelimited(filePath);
}

// ════════════════════════════════════════════════════════════
// IMPORTACION POR DIMENSIONES (sin transacciones)
//
// Estrategia:
// 1. Parsear Excel completo en memoria
// 2. Deduplicar entidades por dimension (dept, muni, sec, etc.)
// 3. Insertar cada dimension en bulk (una query por entidad unica)
// 4. Insertar sedes y relaciones many-to-many
//
// Todas las queries usan IF NOT EXISTS = idempotentes.
// No se usan transacciones: si algo falla, se puede re-ejecutar.
// ════════════════════════════════════════════════════════════

const LOG_EVERY = 5000;

export async function importarInstituciones(
  filePath: string
): Promise<ImportResult> {
  const startTime = Date.now();
  const pool = await getPool();

  console.log('  Parseando archivo...');
  const rows = await parseFile(filePath);
  console.log(`  ${rows.length} filas parseadas en ${((Date.now() - startTime) / 1000).toFixed(1)}s`);

  const result: ImportResult = {
    totalRows: rows.length,
    processed: 0,
    errors: [],
    duration: '',
    stats: { departamentos: 0, municipios: 0, secretarias: 0, establecimientos: 0, sedes: 0, niveles: 0, modelos: 0 },
  };

  // Registrar importacion
  const importRec = await pool.request()
    .input('archivo', sql.NVarChar(256), path.basename(filePath))
    .input('total', sql.Int, rows.length)
    .query(`
      INSERT INTO ie.importaciones (archivo_origen, registros_total, estado)
      OUTPUT INSERTED.id
      VALUES (@archivo, @total, 'EN_PROCESO')
    `);
  const importId: number = importRec.recordset[0].id;

  // ── 1. Deduplicar dimensiones en memoria ──
  console.log('  Deduplicando dimensiones en memoria...');

  const deptsMap = new Map<number, string>();       // codigo → nombre
  const munisMap = new Map<number, { nombre: string; dep: number }>();
  const secsSet = new Set<string>();
  const estabsMap = new Map<number, { nombre: string; mun: number; sec: string }>();
  const sedesMap = new Map<number, {
    nombre: string; est: number; zona: string;
    direccion: string; telefono: string; estado: string;
  }>();
  const nivelesSet = new Set<string>();
  const modelosSet = new Set<string>();

  // sede → relaciones many-to-many
  const sedeNiveles = new Map<number, Set<string>>();
  const sedeModelos = new Map<number, Set<string>>();
  const sedeGrados = new Map<number, Set<string>>();

  for (const row of rows) {
    if (!row.codigoDepartamento || !row.codigoMunicipio || !row.codigoSede) continue;

    if (!deptsMap.has(row.codigoDepartamento)) {
      deptsMap.set(row.codigoDepartamento, row.nombreDepartamento);
    }
    if (!munisMap.has(row.codigoMunicipio)) {
      munisMap.set(row.codigoMunicipio, { nombre: row.nombreMunicipio, dep: row.codigoDepartamento });
    }
    if (row.secretaria) secsSet.add(row.secretaria);
    if (!estabsMap.has(row.codigoEstablecimiento)) {
      estabsMap.set(row.codigoEstablecimiento, {
        nombre: row.nombreEstablecimiento, mun: row.codigoMunicipio, sec: row.secretaria,
      });
    }
    if (!sedesMap.has(row.codigoSede)) {
      sedesMap.set(row.codigoSede, {
        nombre: row.nombreSede,
        est: row.codigoEstablecimiento,
        zona: row.zona === 'URBANA' ? 'URBANA' : 'RURAL',
        direccion: row.direccion,
        telefono: (row.telefono || '').substring(0, 30),
        estado: row.estadoSede || 'ACTIVO',
      });
    }

    for (const n of row.niveles) { const norm = n.toUpperCase(); nivelesSet.add(norm); }
    for (const m of row.modelos) { const norm = m.toUpperCase(); modelosSet.add(norm); }

    // Many-to-many
    if (!sedeNiveles.has(row.codigoSede)) sedeNiveles.set(row.codigoSede, new Set());
    for (const n of row.niveles) sedeNiveles.get(row.codigoSede)!.add(n.toUpperCase());

    if (!sedeModelos.has(row.codigoSede)) sedeModelos.set(row.codigoSede, new Set());
    for (const m of row.modelos) sedeModelos.get(row.codigoSede)!.add(m.toUpperCase());

    if (!sedeGrados.has(row.codigoSede)) sedeGrados.set(row.codigoSede, new Set());
    for (const g of row.grados) sedeGrados.get(row.codigoSede)!.add(g);
  }

  console.log(`  Unicos: ${deptsMap.size} deptos, ${munisMap.size} munis, ${secsSet.size} secs, ${estabsMap.size} estabs, ${sedesMap.size} sedes, ${nivelesSet.size} niveles, ${modelosSet.size} modelos`);

  // ── 2. Pre-cargar caches existentes ──
  console.log('  Cargando caches existentes...');
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

  depR.recordset.forEach((r: any) => deptCache.add(r.codigo_departamento));
  munR.recordset.forEach((r: any) => muniCache.add(r.codigo_municipio));
  secR.recordset.forEach((r: any) => secCache.set(r.nombre, r.id));
  estR.recordset.forEach((r: any) => estabCache.add(Number(r.codigo_establecimiento)));
  sedR.recordset.forEach((r: any) => sedeCache.add(Number(r.codigo_sede)));
  nivR.recordset.forEach((r: any) => nivelCache.set(r.nombre, r.id));
  modR.recordset.forEach((r: any) => modeloCache.set(r.nombre, r.id));

  // ── 3. Insertar departamentos ──
  console.log('  Insertando departamentos...');
  for (const [cod, nombre] of deptsMap) {
    if (deptCache.has(cod)) continue;
    try {
      await pool.request()
        .input('cod', sql.Int, cod)
        .input('nom', sql.NVarChar(100), nombre)
        .query(`IF NOT EXISTS (SELECT 1 FROM geo.departamentos WHERE codigo_departamento = @cod)
          INSERT INTO geo.departamentos (codigo_departamento, nombre) VALUES (@cod, @nom)`);
      deptCache.add(cod);
      result.stats.departamentos++;
    } catch (e: any) {
      result.errors.push({ row: 0, message: `Depto ${cod}: ${e.message}` });
    }
  }
  console.log(`  ${result.stats.departamentos} departamentos insertados`);

  // ── 4. Insertar municipios ──
  console.log('  Insertando municipios...');
  for (const [cod, { nombre, dep }] of munisMap) {
    if (muniCache.has(cod)) continue;
    try {
      await pool.request()
        .input('cod', sql.Int, cod)
        .input('nom', sql.NVarChar(120), nombre)
        .input('dep', sql.Int, dep)
        .query(`IF NOT EXISTS (SELECT 1 FROM geo.municipios WHERE codigo_municipio = @cod)
          INSERT INTO geo.municipios (codigo_municipio, nombre, codigo_departamento) VALUES (@cod, @nom, @dep)`);
      muniCache.add(cod);
      result.stats.municipios++;
    } catch (e: any) {
      result.errors.push({ row: 0, message: `Muni ${cod}: ${e.message}` });
    }
  }
  console.log(`  ${result.stats.municipios} municipios insertados`);

  // ── 5. Insertar secretarias ──
  console.log('  Insertando secretarias...');
  for (const nombre of secsSet) {
    if (secCache.has(nombre)) continue;
    try {
      const r = await pool.request()
        .input('nom', sql.NVarChar(150), nombre)
        .query(`IF NOT EXISTS (SELECT 1 FROM ie.secretarias WHERE nombre = @nom)
          INSERT INTO ie.secretarias (nombre) VALUES (@nom);
          SELECT id FROM ie.secretarias WHERE nombre = @nom;`);
      const id = r.recordset[0]?.id;
      if (id !== undefined) {
        secCache.set(nombre, id);
        result.stats.secretarias++;
      }
    } catch (e: any) {
      result.errors.push({ row: 0, message: `Sec ${nombre}: ${e.message}` });
    }
  }
  console.log(`  ${result.stats.secretarias} secretarias insertadas`);

  // ── 6. Insertar niveles ──
  console.log('  Insertando niveles...');
  for (const nombre of nivelesSet) {
    if (nivelCache.has(nombre)) continue;
    try {
      const r = await pool.request()
        .input('nom', sql.NVarChar(100), nombre)
        .query(`IF NOT EXISTS (SELECT 1 FROM ie.niveles WHERE nombre = @nom)
          INSERT INTO ie.niveles (nombre) VALUES (@nom);
          SELECT id FROM ie.niveles WHERE nombre = @nom;`);
      const id = r.recordset[0]?.id;
      if (id !== undefined) {
        nivelCache.set(nombre, id);
        result.stats.niveles++;
      }
    } catch (e: any) {
      result.errors.push({ row: 0, message: `Nivel ${nombre}: ${e.message}` });
    }
  }
  console.log(`  ${result.stats.niveles} niveles insertados`);

  // ── 7. Insertar modelos ──
  console.log('  Insertando modelos...');
  for (const nombre of modelosSet) {
    if (modeloCache.has(nombre)) continue;
    try {
      const r = await pool.request()
        .input('nom', sql.NVarChar(150), nombre)
        .query(`IF NOT EXISTS (SELECT 1 FROM ie.modelos WHERE nombre = @nom)
          INSERT INTO ie.modelos (nombre) VALUES (@nom);
          SELECT id FROM ie.modelos WHERE nombre = @nom;`);
      const id = r.recordset[0]?.id;
      if (id !== undefined) {
        modeloCache.set(nombre, id);
        result.stats.modelos++;
      }
    } catch (e: any) {
      result.errors.push({ row: 0, message: `Modelo ${nombre}: ${e.message}` });
    }
  }
  console.log(`  ${result.stats.modelos} modelos insertados`);

  // ── 8. Cargar cache de grados (ya seeded) ──
  const gradoCache = new Map<string, number>();
  const gradoR = await pool.request().query('SELECT id, codigo FROM ie.grados');
  gradoR.recordset.forEach((r: any) => gradoCache.set(r.codigo, r.id));

  // ── 9. Insertar establecimientos ──
  console.log('  Insertando establecimientos...');
  let estCount = 0;
  for (const [cod, { nombre, mun, sec }] of estabsMap) {
    if (estabCache.has(cod)) { estCount++; continue; }
    const secId = secCache.get(sec);
    if (secId === undefined) {
      result.errors.push({ row: 0, message: `Estab ${cod}: secretaria "${sec}" no encontrada` });
      continue;
    }
    try {
      await pool.request()
        .input('cod', sql.BigInt, cod)
        .input('nom', sql.NVarChar(300), nombre)
        .input('mun', sql.Int, mun)
        .input('sec', sql.Int, secId)
        .query(`IF NOT EXISTS (SELECT 1 FROM ie.establecimientos WHERE codigo_establecimiento = @cod)
          INSERT INTO ie.establecimientos (codigo_establecimiento, nombre, codigo_municipio, secretaria_id)
          VALUES (@cod, @nom, @mun, @sec)`);
      estabCache.add(cod);
      result.stats.establecimientos++;
      estCount++;
    } catch (e: any) {
      result.errors.push({ row: 0, message: `Estab ${cod}: ${e.message}` });
    }
    if (estCount % LOG_EVERY === 0) {
      console.log(`    ${estCount}/${estabsMap.size} establecimientos...`);
    }
  }
  console.log(`  ${result.stats.establecimientos} establecimientos insertados`);

  // ── 10. Insertar sedes ──
  console.log('  Insertando sedes...');
  let sedeCount = 0;
  for (const [cod, { nombre, est, zona, direccion, telefono, estado }] of sedesMap) {
    if (sedeCache.has(cod)) { sedeCount++; result.processed++; continue; }
    try {
      await pool.request()
        .input('cod', sql.BigInt, cod)
        .input('nom', sql.NVarChar(300), nombre)
        .input('est', sql.BigInt, est)
        .input('zona', sql.NVarChar(10), zona)
        .input('dir', sql.NVarChar(300), direccion || null)
        .input('tel', sql.NVarChar(30), telefono || null)
        .input('estado', sql.NVarChar(30), estado)
        .query(`IF NOT EXISTS (SELECT 1 FROM ie.sedes WHERE codigo_sede = @cod)
          INSERT INTO ie.sedes (codigo_sede, nombre, codigo_establecimiento, zona, direccion, telefono, estado)
          VALUES (@cod, @nom, @est, @zona, @dir, @tel, @estado)`);
      sedeCache.add(cod);
      result.stats.sedes++;
    } catch (e: any) {
      result.errors.push({ row: 0, message: `Sede ${cod}: ${e.message}` });
    }
    sedeCount++;
    result.processed++;
    if (sedeCount % LOG_EVERY === 0) {
      const pct = Math.round((sedeCount / sedesMap.size) * 100);
      console.log(`    ${sedeCount}/${sedesMap.size} sedes (${pct}%)...`);
    }
  }
  console.log(`  ${result.stats.sedes} sedes insertadas`);

  // ── 11. Insertar relaciones many-to-many ──
  console.log('  Insertando relaciones sede-niveles...');
  let relCount = 0;
  const totalRels = sedeNiveles.size + sedeModelos.size + sedeGrados.size;

  for (const [codigoSede, niveles] of sedeNiveles) {
    for (const nivel of niveles) {
      const nId = nivelCache.get(nivel);
      if (nId === undefined) continue;
      try {
        await pool.request()
          .input('sede', sql.BigInt, codigoSede)
          .input('nid', sql.Int, nId)
          .query(`IF NOT EXISTS (SELECT 1 FROM ie.sede_niveles WHERE codigo_sede = @sede AND nivel_id = @nid)
            INSERT INTO ie.sede_niveles (codigo_sede, nivel_id) VALUES (@sede, @nid)`);
      } catch { /* idempotent, skip */ }
    }
    relCount++;
    if (relCount % LOG_EVERY === 0) console.log(`    ${relCount}/${totalRels} relaciones...`);
  }

  console.log('  Insertando relaciones sede-modelos...');
  for (const [codigoSede, modelos] of sedeModelos) {
    for (const modelo of modelos) {
      const mId = modeloCache.get(modelo);
      if (mId === undefined) continue;
      try {
        await pool.request()
          .input('sede', sql.BigInt, codigoSede)
          .input('mid', sql.Int, mId)
          .query(`IF NOT EXISTS (SELECT 1 FROM ie.sede_modelos WHERE codigo_sede = @sede AND modelo_id = @mid)
            INSERT INTO ie.sede_modelos (codigo_sede, modelo_id) VALUES (@sede, @mid)`);
      } catch { /* idempotent, skip */ }
    }
    relCount++;
    if (relCount % LOG_EVERY === 0) console.log(`    ${relCount}/${totalRels} relaciones...`);
  }

  console.log('  Insertando relaciones sede-grados...');
  for (const [codigoSede, grados] of sedeGrados) {
    for (const gradoCod of grados) {
      const gId = gradoCache.get(gradoCod);
      if (gId === undefined) continue;
      try {
        await pool.request()
          .input('sede', sql.BigInt, codigoSede)
          .input('gid', sql.Int, gId)
          .query(`IF NOT EXISTS (SELECT 1 FROM ie.sede_grados WHERE codigo_sede = @sede AND grado_id = @gid)
            INSERT INTO ie.sede_grados (codigo_sede, grado_id) VALUES (@sede, @gid)`);
      } catch { /* idempotent, skip */ }
    }
    relCount++;
    if (relCount % LOG_EVERY === 0) console.log(`    ${relCount}/${totalRels} relaciones...`);
  }
  console.log(`  Relaciones completadas`);

  // Set processed to total rows since we deduplicated
  result.processed = rows.length - result.errors.length;

  // Actualizar auditoria
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
          completado_en = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'SA Pacific Standard Time' AS DATETIME2(0)), errores_detalle = @errores
      WHERE id = @id`);

  return result;
}
