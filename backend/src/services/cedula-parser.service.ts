/**
 * Servicio para parsear datos de cedulas colombianas (Backend)
 * Portado desde el frontend - sin dependencias de Angular
 *
 * Soporta:
 * - PDF417: Codigo de barras de cedulas antiguas (530 bytes, latin-1)
 * - MRZ TD1: Machine Readable Zone de cedulas nuevas (3 lineas x 30 chars)
 */

import {
  CedulaData,
  Genero,
  GrupoRH,
  Ubicacion,
  PDF417_CONSTANTS,
  MRZ_TD1_CONSTANTS
} from '../models/cedula.model';
import { LOCALIDADES } from '../data/localidades.data';
import { parse as parseMRZLib } from 'mrz';

// ============================================================
// SECCION 1: PARSING DE CEDULAS ANTIGUAS (PDF417)
// ============================================================

export function parsePDF417(rawData: string | Buffer, tipoDocumento?: string): CedulaData {
  const dataStr = typeof rawData === 'string'
    ? rawData
    : bufferToLatin1(rawData);

  if (!dataStr || dataStr.length < 100) {
    throw new Error('Datos PDF417 vacios o muy cortos');
  }

  if (!dataStr.includes(PDF417_CONSTANTS.IDENTIFIER)) {
    throw new Error('Formato no reconocido: No se encontro identificador de cedula colombiana');
  }

  const normalizedData = dataStr.replace(/\x00{2,}/g, '\x00');
  const segments = normalizedData.split('\x00').filter(s => s.length > 0);

  if (segments.length < 6) {
    throw new Error('Formato PDF417 invalido: Segmentos insuficientes');
  }

  return extractPDF417Fields(segments, tipoDocumento);
}

function extractPDF417Fields(segments: string[], tipoDocumento?: string): CedulaData {
  const codigoAfis = segments[0].substring(2).trim();

  let tarjetaDactilar = '';
  let numeroDocumento = '';
  let primerApellido = '';

  const seg2 = segments[2] || '';

  if (seg2.length >= 18) {  // >= para TI donde seg2 es exactamente 18 chars (8 dactilar + 10 doc)
    tarjetaDactilar = seg2.substring(0, 8).trim();
    numeroDocumento = seg2.substring(8, 18).replace(/^0+/, '');
    primerApellido = seg2.substring(18).trim();
  } else if (seg2.length > 10) {
    numeroDocumento = seg2.substring(0, 10).replace(/^0+/, '');
    primerApellido = seg2.substring(10).trim();
  } else {
    numeroDocumento = findDocumentNumber(segments);
    primerApellido = seg2.trim();
  }

  let segundoApellido: string;
  let primerNombre: string;
  let segundoNombre: string;
  let demografico: string;

  if (!primerApellido) {
    // TI: seg2 no tiene nombre pegado, los nombres empiezan en seg[3]
    // CC: [2]=dactilar+doc+APELLIDO1  [3]=APELLIDO2  [4]=NOMBRE1  [5]=NOMBRE2  [6]=demo
    // TI: [2]=dactilar+doc            [3]=APELLIDO1  [4]=APELLIDO2 [5]=NOMBRE1 [6]=demo|NOMBRE2
    primerApellido = (segments[3] || '').trim();
    segundoApellido = (segments[4] || '').trim();
    primerNombre = (segments[5] || '').trim();
    segundoNombre = '';
    demografico = '';
    for (let i = 6; i < Math.min(segments.length, 10); i++) {
      const seg = (segments[i] || '').trim();
      if (/(19|20)\d{6}/.test(seg)) {
        demografico = seg;
        break;
      }
      if (/^[A-Za-z]+$/.test(seg)) {
        segundoNombre = seg;
      }
    }
  } else {
    // CC: primerApellido ya extraido de seg2
    segundoApellido = (segments[3] || '').trim();
    primerNombre = (segments[4] || '').trim();
    segundoNombre = (segments[5] || '').trim();
    // Buscar segmento demografico dinamicamente (contiene fecha 19xx/20xx)
    demografico = '';
    for (let i = 5; i < Math.min(segments.length, 10); i++) {
      const seg = (segments[i] || '').trim();
      if (/(19|20)\d{6}/.test(seg)) {
        demografico = seg;
        if (i === 5) segundoNombre = ''; // seg5 era el demografico, no un nombre
        break;
      }
    }
  }

  if (segundoNombre.endsWith('+') || segundoNombre.endsWith('-')) {
    segundoNombre = '';
  }

  if (tipoDocumento === 'TI') {
    console.log(`[scan] TI segments (${segments.length}):`, segments.map((s, i) => `[${i}] len=${s.length} "${s.substring(0, 40)}${s.length > 40 ? '...' : ''}"`).join(' | '));
    console.log(`[scan] TI parsed: doc=${numeroDocumento}, ${primerApellido} ${segundoApellido}, ${primerNombre} ${segundoNombre}`);
  }

  const datosDemo = extractDemograficData(demografico);
  const ubicacion = findUbicacion(datosDemo.codigoMunicipio, datosDemo.codigoDepartamento);

  return {
    numeroDocumento: numeroDocumento || findDocumentNumber(segments),
    primerApellido: normalizarNombre(primerApellido),
    segundoApellido: normalizarNombre(segundoApellido),
    primerNombre: normalizarNombre(primerNombre),
    segundoNombre: normalizarNombre(segundoNombre),
    nombres: normalizarNombre(`${primerNombre} ${segundoNombre}`.trim()),
    fechaNacimiento: datosDemo.fechaNacimiento,
    genero: datosDemo.genero,
    rh: datosDemo.rh,
    tipoDocumento: 'ANTIGUA',
    ubicacion,
    documentoInfo: { codigoAfis, tarjetaDactilar },
    confianza: 85
  };
}

/**
 * Para TI: busca el numero de documento despues del indicador de sexo (M/F).
 * Busca en datos crudos y tambien en version limpia (sin guiones/separadores).
 * Prioridad: 10 digitos > 8 digitos, con lookahead de fecha > sin lookahead.
 */
function findDocumentAfterSex(segments: string[]): { numero: string; genero: Genero } | null {
  // Concatenar todos los segmentos para buscar el patron completo
  // (puede cruzar limites de segmento)
  const allData = segments.join('');
  // Version limpia: solo letras y digitos (el barcode puede tener guiones, espacios, etc.)
  const clean = allData.replace(/[^A-Za-z0-9]/g, '');

  // Intentar en ambas versiones: cruda y limpia
  for (const data of [allData, clean]) {
    // 10 digitos seguidos de fecha (19xx/20xx) — mas preciso
    const m10 = data.match(/([MF])\D{0,2}(\d{10})[\D]?(?=\D{0,2}(?:19|20)\d{6})/);
    if (m10) {
      console.log(`[scan] TI doc found (10d+date): ${m10[2]}`);
      return { numero: m10[2].replace(/^0+/, ''), genero: m10[1] as Genero };
    }
    // 8 digitos seguidos de fecha
    const m8 = data.match(/([MF])\D{0,2}(\d{8})[\D]?(?=\D{0,2}(?:19|20)\d{6})/);
    if (m8) {
      console.log(`[scan] TI doc found (8d+date): ${m8[2]}`);
      return { numero: m8[2].replace(/^0+/, ''), genero: m8[1] as Genero };
    }
  }

  // Fallback sin lookahead de fecha: M/F seguido de 8-10 digitos
  for (const data of [allData, clean]) {
    const m = data.match(/([MF])\D{0,2}(\d{8,10})/);
    if (m) {
      console.log(`[scan] TI doc found (fallback): ${m[2]}`);
      return { numero: m[2].replace(/^0+/, ''), genero: m[1] as Genero };
    }
  }

  return null;
}

function extractDemograficData(data: string) {
  let genero: Genero = 'DESCONOCIDO';
  let fechaNacimiento = '';
  let codigoMunicipio = '';
  let codigoDepartamento = '';
  let rh: GrupoRH = 'DESCONOCIDO';

  if (!data || data.length < 10) {
    return { genero, fechaNacimiento, codigoMunicipio, codigoDepartamento, rh };
  }

  const generoMatch = data.match(/[MF]/);
  if (generoMatch) genero = generoMatch[0] as Genero;

  const fechaMatch = data.match(/(19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/);
  if (fechaMatch) {
    const year = fechaMatch[0].substring(0, 4);
    const month = fechaMatch[0].substring(4, 6);
    const day = fechaMatch[0].substring(6, 8);
    fechaNacimiento = `${year}-${month}-${day}`;

    const afterDate = data.substring(data.indexOf(fechaMatch[0]) + 8);
    const ubicMatch = afterDate.match(/^(\d{2})(\d{3})/);
    if (ubicMatch) {
      codigoMunicipio = ubicMatch[1];
      codigoDepartamento = ubicMatch[2];
    }
  }

  const rhMatch = data.match(/[ABO]{1,2}[+-]/);
  if (rhMatch) rh = parseRH(rhMatch[0]);

  return { genero, fechaNacimiento, codigoMunicipio, codigoDepartamento, rh };
}

function findDocumentNumber(segments: string[]): string {
  for (const seg of segments) {
    const match = seg.match(/\b\d{6,10}\b/);
    if (match) return match[0].replace(/^0+/, '');
  }
  return '';
}

// ============================================================
// SECCION 2: PARSING DE CEDULAS NUEVAS (MRZ TD1)
// ============================================================

export function parseMRZ(lines: string[], format: 'TD1' | 'TD3' = 'TD1'): CedulaData {
  if (format === 'TD3') return parseMRZ_TD3(lines);

  if (!lines || lines.length < 3) {
    throw new Error('Se requieren 3 lineas MRZ para formato TD1');
  }

  const rawCleanLines = lines.map(cleanMRZLine);
  const cleanLines = reorderTD1Lines(rawCleanLines);
  if (
    rawCleanLines[0] !== cleanLines[0]
    || rawCleanLines[1] !== cleanLines[1]
    || rawCleanLines[2] !== cleanLines[2]
  ) {
    console.log('[scan] MRZ TD1 reordenado para parseo');
  }
  const minLineLen = 24;

  for (let i = 0; i < 3; i++) {
    if (cleanLines[i].length < minLineLen) {
      throw new Error(`Linea ${i + 1} muy corta: ${cleanLines[i].length} caracteres`);
    }
  }

  const l1 = cleanLines[0].padEnd(30, '<');
  const l2 = cleanLines[1].padEnd(30, '<');
  const l3 = cleanLines[2].padEnd(30, '<');

  let confianza = 100;

  // ── Intentar parseo con libreria mrz (autocorreccion de errores OCR) ──
  let mrzFields: Record<string, any> | null = null;
  try {
    const padded = [l1, l2, l3].map(l => l.substring(0, 30).padEnd(30, '<'));
    const result = parseMRZLib(padded, { autocorrect: true });
    if (result.valid && result.fields?.documentNumber) {
      mrzFields = result.fields;
      console.log(`[scan] MRZ autocorrect: valid=${result.valid}, doc=${result.fields.documentNumber}`);
    } else if (result.fields?.documentNumber) {
      confianza -= 10;
      console.warn(`[scan] MRZ autocorrect descartado (valid=false), doc=${result.fields.documentNumber}`);
    }
  } catch (e) {
    console.warn('[scan] MRZ autocorrect fallo, usando parser manual:', (e as Error).message);
  }

  // ── NUIP (numero de cedula colombiana, L2 pos 18-28) ──
  // En cedulas colombianas TD1, el numero real esta despues del codigo de pais (COL)
  // en la linea 2, NO en el campo estandar ICAO de la linea 1 (que es un serial interno)
  const nuipDigits = l2.substring(18, 28).replace(/[^0-9]/g, '').replace(/^0+/, '');
  const nuip = nuipDigits.length >= 6 ? nuipDigits : '';
  const icoaDocNum = mrzFields?.documentNumber
    || l1.substring(5, 14).replace(/<|^0+/g, '');
  const numeroDocumento = nuip || icoaDocNum;

  // ── Fecha de nacimiento ──
  const fechaNacimiento = parseMRZDate(
    mrzFields?.birthDate || l2.substring(0, 6), true
  );

  // ── Genero ──
  let genero: Genero;
  if (mrzFields?.sex === 'male') genero = 'M';
  else if (mrzFields?.sex === 'female') genero = 'F';
  else genero = parseGeneroMRZ(l2[7]);

  // ── Fecha de expiracion ──
  const fechaExpiracion = parseMRZDate(
    mrzFields?.expirationDate || l2.substring(8, 14), false
  );

  // ── Nombres (mrz package separa mejor con autocorreccion) ──
  let primerApellido = '', segundoApellido = '';
  let primerNombre = '', segundoNombre = '';
  let truncado = false;

  // En cedula colombiana TD1, la linea 3 trae apellidos<<nombres; es la fuente mas confiable para orden.
  const parsed = parseNombresMRZ(l3);
  primerApellido = parsed.primerApellido;
  segundoApellido = parsed.segundoApellido;
  primerNombre = parsed.primerNombre;
  segundoNombre = parsed.segundoNombre;
  truncado = parsed.truncado;

  // Fallback: si OCR no separo bien con "<<", usar mrz package para rescatar nombres.
  if (!primerNombre && mrzFields?.firstName) {
    const lastParts = (mrzFields.lastName || '').split(' ').filter(Boolean);
    const firstParts = (mrzFields.firstName || '').split(' ').filter(Boolean);
    primerApellido = lastParts[0] || primerApellido;
    segundoApellido = lastParts.slice(1).join(' ') || segundoApellido;
    primerNombre = firstParts[0] || primerNombre;
    segundoNombre = firstParts.slice(1).join(' ') || segundoNombre;
    truncado = !primerNombre;
  }

  // ── Campos colombianos (no estan en libreria mrz estandar) ──
  const codigoMunicipio = l1.substring(15, 17).replace(/</g, '');
  const codigoDepartamento = l1.substring(17, 20).replace(/</g, '');

  // ── Validaciones de check digit (solo si mrz package no valido) ──
  if (!mrzFields) {
    const tipoDoc = normalizeMRZDocType(l1[0]);
    if (tipoDoc !== 'I') confianza -= 10;

    const codigoPais = l1.substring(2, 5).replace(/0/g, 'O');
    if (codigoPais !== 'COL') confianza -= 10;

    const checkDigitDoc = l1[14];
    if (checkDigitDoc !== calculateMRZCheckDigit(l1.substring(5, 14))) confianza -= 10;

    if (l2[6] !== calculateMRZCheckDigit(l2.substring(0, 6))) confianza -= 10;
    if (l2[14] !== calculateMRZCheckDigit(l2.substring(8, 14))) confianza -= 10;
  }

  const ubicacion = findUbicacion(codigoMunicipio, codigoDepartamento);
  if (!ubicacion.municipio && codigoMunicipio) confianza -= 10;

  return {
    numeroDocumento,
    primerApellido: normalizarNombre(primerApellido),
    segundoApellido: normalizarNombre(segundoApellido),
    primerNombre: normalizarNombre(primerNombre),
    segundoNombre: normalizarNombre(segundoNombre),
    nombres: normalizarNombre(`${primerNombre} ${segundoNombre}`.trim()),
    fechaNacimiento,
    genero,
    rh: 'DESCONOCIDO',
    tipoDocumento: 'NUEVA',
    ubicacion,
    fechaExpiracion,
    nuip,
    nombresTruncados: truncado,
    confianza: Math.max(0, confianza)
  };
}

// ============================================================
// SECCION 2B: PARSING DE PASAPORTES (MRZ TD3)
// ============================================================

function parseMRZ_TD3(lines: string[]): CedulaData {
  if (!lines || lines.length < 2) {
    throw new Error('Se requieren 2 lineas MRZ para formato TD3 (pasaporte)');
  }

  const cleanLines = lines.map(cleanMRZLine);
  const l1 = cleanLines[0].padEnd(44, '<');
  const l2 = cleanLines[1].padEnd(44, '<');

  let confianza = 100;

  // ── Intentar parseo con libreria mrz (autocorreccion OCR) ──
  let mrzFields: Record<string, any> | null = null;
  try {
    const padded = [l1, l2].map(l => l.substring(0, 44).padEnd(44, '<'));
    const result = parseMRZLib(padded, { autocorrect: true });
    if (result.valid && result.fields?.documentNumber) {
      mrzFields = result.fields;
      console.log(`[scan] MRZ TD3 autocorrect: valid=${result.valid}, doc=${result.fields.documentNumber}`);
    } else if (result.fields?.documentNumber) {
      confianza -= 10;
      console.warn(`[scan] MRZ TD3 autocorrect descartado (valid=false), doc=${result.fields.documentNumber}`);
    }
  } catch (e) {
    console.warn('[scan] MRZ TD3 autocorrect fallo:', (e as Error).message);
  }

  // ── Numero de documento (TD3 L2 pos 0-8) ──
  const numeroDocumento = mrzFields?.documentNumber
    || l2.substring(0, 9).replace(/<|^0+/g, '');

  // ── Fecha de nacimiento (TD3 L2 pos 13-18) ──
  const fechaNacimiento = parseMRZDate(
    mrzFields?.birthDate || l2.substring(13, 19), true
  );

  // ── Genero (TD3 L2 pos 20) ──
  let genero: Genero;
  if (mrzFields?.sex === 'male') genero = 'M';
  else if (mrzFields?.sex === 'female') genero = 'F';
  else genero = parseGeneroMRZ(l2[20]);

  // ── Fecha de expiracion (TD3 L2 pos 21-26) ──
  const fechaExpiracion = parseMRZDate(
    mrzFields?.expirationDate || l2.substring(21, 27), false
  );

  // ── Nombres (TD3 L1: P<PAIS APELLIDOS<<NOMBRES) ──
  let primerApellido = '', segundoApellido = '';
  let primerNombre = '', segundoNombre = '';

  if (mrzFields?.lastName) {
    const lastParts = mrzFields.lastName.split(' ');
    const firstParts = (mrzFields.firstName || '').split(' ');
    primerApellido = lastParts[0] || '';
    segundoApellido = lastParts.slice(1).join(' ');
    primerNombre = firstParts[0] || '';
    segundoNombre = firstParts.slice(1).join(' ');
  } else {
    const nameSection = l1.substring(5).replace(/<+$/, '');
    const parts = nameSection.split('<<');
    const apellidos = (parts[0] || '').split('<').filter(p => p.length > 0);
    const nombres = (parts[1] || '').split('<').filter(p => p.length > 0);
    primerApellido = apellidos[0] || '';
    segundoApellido = apellidos[1] || '';
    primerNombre = nombres[0] || '';
    segundoNombre = nombres.slice(1).join(' ');
  }

  // ── Validaciones ──
  if (!mrzFields) {
    if (l1[0] !== 'P') confianza -= 10;
    const codigoPais = l1.substring(2, 5).replace(/0/g, 'O');
    if (codigoPais !== 'COL') confianza -= 10;
  }

  return {
    numeroDocumento,
    primerApellido: normalizarNombre(primerApellido),
    segundoApellido: normalizarNombre(segundoApellido),
    primerNombre: normalizarNombre(primerNombre),
    segundoNombre: normalizarNombre(segundoNombre),
    nombres: normalizarNombre(`${primerNombre} ${segundoNombre}`.trim()),
    fechaNacimiento,
    genero,
    rh: 'DESCONOCIDO',
    tipoDocumento: 'PASAPORTE',
    ubicacion: { codigoMunicipio: '', codigoDepartamento: '', municipio: '', departamento: '' },
    fechaExpiracion,
    confianza: Math.max(0, confianza)
  };
}

function calculateMRZCheckDigit(data: string): string {
  const weights = [7, 3, 1];
  let checksum = 0;

  for (let i = 0; i < data.length; i++) {
    const char = data[i];
    let value: number;
    if (char >= '0' && char <= '9') value = parseInt(char, 10);
    else if (char >= 'A' && char <= 'Z') value = char.charCodeAt(0) - 55;
    else value = 0;
    checksum += value * weights[i % 3];
  }

  return (checksum % 10).toString();
}

function cleanMRZLine(line: string): string {
  let cleaned = line.toUpperCase().replace(/\s/g, '');
  cleaned = cleaned.replace(/[«‹＜]/g, '<');
  cleaned = cleaned.replace(/[^A-Z0-9<]/g, '<');
  return cleaned;
}

function normalizeMRZDocType(char: string): string {
  const normalized = char.toUpperCase();
  if (['L', '1', '|', 'l'].includes(normalized)) return 'I';
  return normalized;
}

function parseMRZDate(dateStr: string, isPast: boolean): string {
  if (!dateStr || dateStr.length < 6) return '';
  const raw = dateStr.substring(0, 6);
  if (!/^\d{6}$/.test(raw)) return '';

  const yy = parseInt(raw.substring(0, 2), 10);
  const mm = parseInt(raw.substring(2, 4), 10);
  const dd = parseInt(raw.substring(4, 6), 10);

  const currentYear = new Date().getFullYear() % 100;
  const year = isPast
    ? (yy > currentYear ? 1900 + yy : 2000 + yy)
    : 2000 + yy;

  if (mm < 1 || mm > 12) return '';
  if (dd < 1 || dd > 31) return '';

  const parsed = new Date(Date.UTC(year, mm - 1, dd));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== mm - 1
    || parsed.getUTCDate() !== dd
  ) return '';

  const mmStr = mm.toString().padStart(2, '0');
  const ddStr = dd.toString().padStart(2, '0');
  return `${year}-${mmStr}-${ddStr}`;
}

function looksLikeTD1DocLine(line: string): boolean {
  const prefix = line.substring(0, 12);
  return (
    /^[I1L|][<C]COL/.test(prefix)
    || /^[I1L|]DCOL/.test(prefix)
    || /^[I1L|]CCOL/.test(prefix)
    || /^[I1L|][<C][A-Z0-9<]COL/.test(prefix)
  );
}

function looksLikeTD1DateLine(line: string): boolean {
  const normalized = line.replace(/[OQ]/g, '0');
  return /^\d{6}[0-9<][MF<]\d{6}/.test(normalized);
}

function looksLikeTD1NameLine(line: string): boolean {
  if (/<<+/.test(line) && /[A-Z]{2,}/.test(line)) return true;
  const letters = (line.match(/[A-Z]/g) || []).length;
  const fillers = (line.match(/</g) || []).length;
  return (
    letters >= 10
    && fillers >= 1
    && !looksLikeTD1DocLine(line)
    && !looksLikeTD1DateLine(line)
  );
}

function reorderTD1Lines(lines: string[]): string[] {
  if (lines.length < 3) return lines;
  const remaining = [...lines];

  const takeFirst = (predicate: (line: string) => boolean): string | undefined => {
    const idx = remaining.findIndex(predicate);
    if (idx === -1) return undefined;
    const [picked] = remaining.splice(idx, 1);
    return picked;
  };

  const docLine = takeFirst(looksLikeTD1DocLine);
  const dateLine = takeFirst(looksLikeTD1DateLine);
  const nameLine = takeFirst(looksLikeTD1NameLine);

  const ordered = [
    docLine || remaining.shift() || '',
    dateLine || remaining.shift() || '',
    nameLine || remaining.shift() || '',
  ];

  return ordered.some(l => !l) ? lines : ordered;
}

function parseNombresMRZ(line: string) {
  const cleaned = line.replace(/<+$/, '');
  const parts = cleaned.split('<<');
  const apellidos = (parts[0] || '').split('<').filter(p => p.length > 0);
  const nombres = (parts[1] || '').split('<').filter(p => p.length > 0);
  const truncado = parts.length < 2 || nombres.length === 0;

  return {
    primerApellido: apellidos[0] || '',
    segundoApellido: apellidos[1] || '',
    primerNombre: nombres[0] || '',
    segundoNombre: nombres.slice(1).join(' '),
    truncado
  };
}

function parseGeneroMRZ(char: string): Genero {
  const upper = (char || '').toUpperCase();
  if (upper === 'M') return 'M';
  if (upper === 'F') return 'F';
  return 'DESCONOCIDO';
}

function parseRH(valor: string): GrupoRH {
  if (!valor) return 'DESCONOCIDO';
  const upper = valor.toUpperCase().replace(/\s/g, '');
  let normalized = upper
    .replace('POSITIVO', '+').replace('NEGATIVO', '-')
    .replace('POS', '+').replace('NEG', '-');

  const match = normalized.match(/^(O|A|B|AB)([+-])$/);
  if (!match) return 'DESCONOCIDO';

  const rh = `${match[1]}${match[2]}` as GrupoRH;
  const rhValidos: GrupoRH[] = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'];
  return rhValidos.includes(rh) ? rh : 'DESCONOCIDO';
}

// ============================================================
// SECCION 3: FUNCIONES AUXILIARES
// ============================================================

function bufferToLatin1(data: Buffer): string {
  return data.toString('latin1');
}

function normalizarNombre(nombre: string): string {
  if (!nombre) return '';
  return nombre
    .toLowerCase()
    .split(/\s+/)
    .map(p => p.length === 0 ? '' : p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
    .trim();
}

function findUbicacion(codigoMunicipio: string, codigoDepartamento: string): Ubicacion {
  const ubicacion: Ubicacion = {
    codigoMunicipio,
    codigoDepartamento,
    municipio: '',
    departamento: ''
  };

  if (!codigoMunicipio || !codigoDepartamento) return ubicacion;

  const localidad = LOCALIDADES.find(
    loc => loc[0] === codigoMunicipio && loc[1] === codigoDepartamento
  );

  if (localidad) {
    ubicacion.municipio = localidad[2];
    ubicacion.departamento = localidad[3];
  }

  return ubicacion;
}
