/**
 * Servicio de procesamiento de imagenes para escaneo de documentos
 *
 * Pipeline: base64 → Buffer → Sharp preprocessing → ZXing/Tesseract → Parser
 *
 * Todo el procesamiento es local, sin servicios externos.
 */

import sharp from 'sharp';
import path from 'path';
import Tesseract from 'tesseract.js';
import {
  CedulaData,
  TipoDocumentoScan,
  AuthenticityCheck,
} from '../models/cedula.model';
import { parsePDF417, parseMRZ } from './cedula-parser.service';

// zxing-wasm es ESM, se importa dinamicamente para compatibilidad con CommonJS
let _readBarcodes: typeof import('zxing-wasm/reader').readBarcodes | null = null;

async function getReadBarcodes() {
  if (!_readBarcodes) {
    const mod = await import('zxing-wasm/reader');
    _readBarcodes = mod.readBarcodes;
  }
  return _readBarcodes;
}

// ============================================================
// TIPOS INTERNOS
// ============================================================

interface ProcessingResult {
  data: CedulaData | null;
  method: 'pdf417' | 'mrz' | 'ocr_general' | 'none';
  rawText?: string;
  processingTimeMs: number;
}

// ============================================================
// PREPROCESAMIENTO DE IMAGEN
// ============================================================

/**
 * Convierte base64 a Buffer, valida que sea JPEG y retorna metadata
 */
export async function decodeAndValidateImage(base64: string): Promise<{
  buffer: Buffer;
  metadata: sharp.Metadata;
}> {
  // Quitar prefijo data:image/... si existe
  const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
  const buffer = Buffer.from(cleanBase64, 'base64');

  if (buffer.length < 1000) {
    throw new Error('Imagen demasiado pequena o corrupta');
  }

  if (buffer.length > 10 * 1024 * 1024) {
    throw new Error('Imagen excede el tamano maximo de 10MB');
  }

  const metadata = await sharp(buffer).metadata();

  if (!metadata.width || !metadata.height) {
    throw new Error('No se pudo leer metadata de la imagen');
  }

  return { buffer, metadata };
}

/**
 * Preprocesa imagen para lectura de barcode PDF417
 * - Redimensiona a ancho optimo (1600px)
 * - Convierte a escala de grises
 * - Aumenta contraste y nitidez
 */
async function preprocessForBarcode(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width: 1600, withoutEnlargement: false })
    .grayscale()
    .sharpen({ sigma: 1.5 })
    .normalise()
    .png()
    .toBuffer();
}

async function preprocessForBarcodeHighContrast(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width: 1800, withoutEnlargement: false })
    .grayscale()
    .linear(1.5, -(128 * 0.5))
    .sharpen({ sigma: 2.5 })
    .normalise()
    .png()
    .toBuffer();
}

async function preprocessForBarcodeGamma(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize({ width: 1600, withoutEnlargement: false })
    .grayscale()
    .gamma(2.0)
    .normalise()
    .sharpen({ sigma: 1.5 })
    .png()
    .toBuffer();
}

/**
 * Preprocesa imagen para OCR de zona MRZ
 * - Recorta el tercio inferior (donde esta el MRZ)
 * - Binariza con threshold alto para maximo contraste
 * - Aumenta resolucion si es necesario
 */
async function preprocessForMRZ(buffer: Buffer, cropRatio = 0.60, thresh = 140): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width!;
  const height = metadata.height!;

  const mrzTop = Math.floor(height * cropRatio);
  const mrzHeight = height - mrzTop;

  return sharp(buffer)
    .extract({ left: 0, top: mrzTop, width, height: mrzHeight })
    .resize({ width: 2000, withoutEnlargement: false })
    .grayscale()
    .sharpen({ sigma: 2 })
    .normalise()
    .threshold(thresh)
    .png()
    .toBuffer();
}

// ============================================================
// DECODIFICACION DE BARCODE (PDF417 via ZXing-WASM)
// ============================================================

/**
 * Intenta decodificar un barcode PDF417 de la imagen
 */
async function decodePDF417(imageBuffer: Buffer): Promise<string | null> {
  try {
    const readBarcodes = await getReadBarcodes();

    const readerOptions: Record<string, unknown> = {
      formats: ['PDF417'],
      tryHarder: true,
      tryRotate: true,
      tryInvert: true,
      maxNumberOfSymbols: 1,
    };

    // Pre-generate multiple preprocessing variants in parallel
    const [standard, highContrast, gamma, raw] = await Promise.all([
      preprocessForBarcode(imageBuffer),
      preprocessForBarcodeHighContrast(imageBuffer),
      preprocessForBarcodeGamma(imageBuffer),
      sharp(imageBuffer).png().toBuffer(),
    ]);

    const variants = [
      { label: 'standard', buffer: standard },
      { label: 'high-contrast', buffer: highContrast },
      { label: 'gamma', buffer: gamma },
      { label: 'raw', buffer: raw },
    ];

    for (const { label, buffer } of variants) {
      const results = await readBarcodes(buffer, readerOptions);
      if (results.length > 0) {
        const r = results[0] as { bytes?: Uint8Array; text?: string };
        if (r.bytes && r.bytes.length > 0) {
          const decoded = Buffer.from(r.bytes).toString('latin1');
          console.log(`[scan] PDF417 detectado (${label}) via bytes, longitud: ${decoded.length}`);
          return decoded;
        }
        if (r.text) {
          console.log(`[scan] PDF417 detectado (${label}) via text, longitud: ${r.text.length}`);
          return r.text;
        }
      }
    }

    return null;
  } catch (error) {
    console.error('[scan] Error decodificando PDF417:', error);
    return null;
  }
}

// ============================================================
// OCR (Tesseract.js para MRZ)
// ============================================================

// Worker de Tesseract reutilizable (se inicializa una vez)
let tesseractWorker: Tesseract.Worker | null = null;
let tesseractInitPromise: Promise<void> | null = null;

async function ensureTesseract(): Promise<Tesseract.Worker> {
  if (tesseractWorker) return tesseractWorker;

  if (!tesseractInitPromise) {
    tesseractInitPromise = (async () => {
      console.log('[scan] Inicializando Tesseract worker con modelo OCRB...');
      const langPath = path.resolve(process.cwd());
      tesseractWorker = await Tesseract.createWorker('ocrb', 1, { langPath });
      await tesseractWorker.setParameters({
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789<',
        tessedit_pageseg_mode: Tesseract.PSM.SINGLE_BLOCK,
      });
      console.log('[scan] Tesseract worker OCRB listo');
    })();
  }

  await tesseractInitPromise;
  return tesseractWorker!;
}

/**
 * Extrae texto MRZ de una imagen usando Tesseract OCR (OCRB model)
 * Intenta multiples regiones de crop y thresholds con salida temprana.
 */
async function extractMRZText(imageBuffer: Buffer): Promise<string[]> {
  const worker = await ensureTesseract();
  const allLines: string[] = [];

  // Pre-generate variants in parallel (Sharp es rapido)
  const variants = await Promise.all([
    preprocessForMRZ(imageBuffer, 0.58, 140),
    preprocessForMRZ(imageBuffer, 0.50, 120),
    preprocessForMRZ(imageBuffer, 0.65, 160),
  ]);

  for (let i = 0; i < variants.length; i++) {
    const { data } = await worker.recognize(variants[i]);

    const lines = data.text
      .split('\n')
      .map(l => l.trim().toUpperCase().replace(/\s/g, ''))
      .filter(l => l.length >= 25);

    if (lines.length > 0) {
      console.log(`[scan] MRZ variante ${i}: ${lines.length} lineas candidatas`);
    }

    allLines.push(...lines);

    // Early exit si ya detectamos un formato valido
    const detection = detectMRZFormat(allLines);
    if (detection) return allLines;
  }

  return allLines;
}

/**
 * Detecta formato MRZ (TD1 cedula vs TD3 pasaporte) y retorna lineas ordenadas.
 * Retorna null si no se detecta un patron valido (evita falsos positivos).
 */
interface MRZDetection {
  format: 'TD1' | 'TD3';
  lines: string[];
}

function detectMRZFormat(rawLines: string[]): MRZDetection | null {
  const scored = rawLines
    .map(line => {
      const cleaned = line.replace(/[«‹＜]/g, '<').replace(/[^A-Z0-9<]/g, '<');
      return { line: cleaned, score: scoreMRZLine(cleaned) };
    })
    .filter(c => c.score > 0)
    .sort((a, b) => b.score - a.score);

  // Try TD3 (passport): 2 lines of ~44 chars, one P< type + one data
  const td3All = scored.filter(c => c.line.length >= 40);
  // Deduplicate OCR variants (lines that are very similar = same physical line)
  const td3Unique: typeof td3All = [];
  for (const item of td3All) {
    const isDuplicate = td3Unique.some(u => {
      const len = Math.min(item.line.length, u.line.length, 20);
      let matches = 0;
      for (let i = 0; i < len; i++) {
        if (item.line[i] === u.line[i]) matches++;
      }
      return matches >= len * 0.7;
    });
    if (!isDuplicate) td3Unique.push(item);
  }
  if (td3Unique.length >= 2) {
    const typeLine = td3Unique.find(c => /^P[<A-Z]/.test(c.line));
    const dataLine = td3Unique.find(c => !/^P[<A-Z]/.test(c.line));
    if (typeLine && dataLine) {
      return { format: 'TD3', lines: [typeLine.line, dataLine.line] };
    }
  }

  // Try TD1 (cedula): 3 lines of ~30 chars with known pattern
  const td1All = scored.filter(c => c.line.length >= 28 && c.line.length <= 35);
  // Deduplicate by first 10 chars (multiple OCR variants)
  const td1Unique: typeof td1All = [];
  for (const item of td1All) {
    if (!td1Unique.some(u => u.line.substring(0, 10) === item.line.substring(0, 10))) {
      td1Unique.push(item);
    }
  }
  if (td1Unique.length >= 3) {
    const lines = td1Unique.slice(0, 3).map(c => c.line);
    // Require at least one line to match a known TD1 document pattern
    const hasKnownPattern = lines.some(l =>
      /^I[<C]COL/.test(l) || /^IDCOL/.test(l) || /^\d{6}\d[MF<]\d{6}/.test(l)
    );
    if (hasKnownPattern) {
      return { format: 'TD1', lines: orderMRZLines(lines) };
    }
  }

  return null;
}

function scoreMRZLine(line: string): number {
  if (line.length < 20) return 0;
  let score = 0;

  // Length scoring — TD1 (30 chars) or TD3 (44 chars)
  const diffTD1 = Math.abs(line.length - 30);
  const diffTD3 = Math.abs(line.length - 44);
  const lengthDiff = Math.min(diffTD1, diffTD3);
  if (lengthDiff <= 2) score += 30;
  else if (lengthDiff <= 5) score += 15;

  const fillCount = (line.match(/</g) || []).length;
  if (fillCount >= 1) score += 20;
  if (fillCount >= 3) score += 10;

  const validChars = (line.match(/[A-Z0-9<]/g) || []).length;
  if (validChars / line.length >= 0.95) score += 25;

  // TD1 patterns (cedula colombiana)
  if (/^I[<C]COL/.test(line) || /^IDCOL/.test(line)) score += 50;
  if (/^\d{6}\d[MF<]\d{6}/.test(line)) score += 40;

  // TD3 patterns (pasaporte)
  if (/^P[<A-Z][A-Z]{3}/.test(line)) score += 50;
  if (/^[A-Z0-9]{9}<?\d[A-Z]{3}\d{6}/.test(line)) score += 45;

  // Name patterns (both TD1 and TD3)
  if (/^[A-Z]+<<[A-Z]+/.test(line) || /[A-Z]+<[A-Z]+<</.test(line)) score += 40;

  return score;
}

function orderMRZLines(lines: string[]): string[] {
  if (lines.length < 3) return lines;
  const ordered: string[] = ['', '', ''];

  for (const line of lines) {
    if (/^I[<C]COL|^IDCOL/.test(line) && !ordered[0]) ordered[0] = line;
    else if (/^\d{6}/.test(line) && !ordered[1]) ordered[1] = line;
    else if (/<</.test(line) && !/^\d{6}/.test(line) && !ordered[2]) ordered[2] = line;
  }

  return ordered.some(l => !l) ? lines : ordered;
}

// ============================================================
// PIPELINE PRINCIPAL
// ============================================================

/**
 * Procesa una imagen de documento y extrae los datos
 *
 * Estrategia por tipo de documento:
 * - CC (antigua): Primero PDF417, fallback a MRZ
 * - CC (nueva), CE, PA: Primero MRZ, fallback a PDF417
 * - TI: PDF417
 * - NIT, RC: OCR general (fase futura)
 */
export async function processDocument(
  imageBuffer: Buffer,
  tipoDocumento: TipoDocumentoScan
): Promise<ProcessingResult> {
  const startTime = Date.now();

  // Auto-rotate portrait images to landscape for better document reading
  const meta = await sharp(imageBuffer).metadata();
  if (meta.height! > meta.width!) {
    imageBuffer = await sharp(imageBuffer).rotate(90).toBuffer();
    console.log(`[scan] Imagen rotada a landscape: ${meta.height}x${meta.width}`);
  }

  // Para CC intentamos ambos metodos
  if (tipoDocumento === 'CC' || tipoDocumento === 'TI') {
    // Intento 1: PDF417 (mas comun en cedulas antiguas)
    const barcodeData = await decodePDF417(imageBuffer);
    if (barcodeData) {
      try {
        const data = parsePDF417(barcodeData, tipoDocumento);
        return {
          data,
          method: 'pdf417',
          rawText: barcodeData.substring(0, 100),
          processingTimeMs: Date.now() - startTime
        };
      } catch (e) {
        console.warn('[scan] PDF417 detectado pero fallo parsing:', (e as Error).message);
      }
    }

    // Intento 2: MRZ (cedula nueva)
    if (tipoDocumento === 'CC') {
      const mrzResult = await tryMRZ(imageBuffer);
      if (mrzResult) {
        return { ...mrzResult, processingTimeMs: Date.now() - startTime };
      }

      // Intento 3: MRZ con imagen rotada 180° (documento al reves)
      const rotated180 = await sharp(imageBuffer).rotate(180).toBuffer();
      const mrzResult180 = await tryMRZ(rotated180);
      if (mrzResult180) {
        console.log('[scan] MRZ detectado tras rotacion 180°');
        return { ...mrzResult180, processingTimeMs: Date.now() - startTime };
      }
    }
  }

  // CE, PA: Usar MRZ directamente
  if (tipoDocumento === 'CE' || tipoDocumento === 'PA') {
    const mrzResult = await tryMRZ(imageBuffer);
    if (mrzResult) {
      return { ...mrzResult, processingTimeMs: Date.now() - startTime };
    }

    // Fallback: MRZ con imagen rotada 180°
    const rotated180 = await sharp(imageBuffer).rotate(180).toBuffer();
    const mrzResult180 = await tryMRZ(rotated180);
    if (mrzResult180) {
      console.log('[scan] MRZ detectado tras rotacion 180°');
      return { ...mrzResult180, processingTimeMs: Date.now() - startTime };
    }
  }

  // NIT, RC, NUIP: OCR general (placeholder para fase futura)
  if (tipoDocumento === 'NIT' || tipoDocumento === 'RC' || tipoDocumento === 'NUIP') {
    return {
      data: null,
      method: 'none',
      processingTimeMs: Date.now() - startTime
    };
  }

  return {
    data: null,
    method: 'none',
    processingTimeMs: Date.now() - startTime
  };
}

async function tryMRZ(imageBuffer: Buffer): Promise<Omit<ProcessingResult, 'processingTimeMs'> | null> {
  try {
    const rawLines = await extractMRZText(imageBuffer);
    const detection = detectMRZFormat(rawLines);

    console.log(`[scan] MRZ: ${rawLines.length} lineas crudas -> ${detection ? detection.format + ' ' + detection.lines.length + ' lineas' : 'no detectado'}`);
    if (detection) {
      console.log(`[scan] MRZ lineas (${detection.format}): ${detection.lines.map(l => l.substring(0, 15) + '...').join(' | ')}`);
      const data = parseMRZ(detection.lines, detection.format);
      return {
        data,
        method: 'mrz',
        rawText: detection.lines.join(' | ')
      };
    }
  } catch (e) {
    console.warn('[scan] MRZ fallo:', (e as Error).message);
  }
  return null;
}

/**
 * Libera el worker de Tesseract (para shutdown graceful)
 */
export async function terminateTesseract(): Promise<void> {
  if (tesseractWorker) {
    await tesseractWorker.terminate();
    tesseractWorker = null;
    tesseractInitPromise = null;
  }
}
