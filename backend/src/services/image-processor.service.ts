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
 * - Para imagenes muy pequenas (< 800px), aplica enhancement agresivo
 */
async function preprocessForBarcode(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const isSmall = (meta.width ?? 0) < 800;

  let pipeline = sharp(buffer)
    .resize({ width: isSmall ? 2000 : 1600, withoutEnlargement: false })
    .grayscale();

  if (isSmall) {
    pipeline = pipeline.sharpen({ sigma: 3 }).linear(1.8, -100);
  } else {
    pipeline = pipeline.sharpen({ sigma: 1.5 });
  }

  return pipeline.normalise().png().toBuffer();
}

async function preprocessForBarcodeHighContrast(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const isSmall = (meta.width ?? 0) < 800;

  return sharp(buffer)
    .resize({ width: isSmall ? 2200 : 1800, withoutEnlargement: false })
    .grayscale()
    .linear(isSmall ? 2.0 : 1.5, isSmall ? -120 : -(128 * 0.5))
    .sharpen({ sigma: isSmall ? 3.5 : 2.5 })
    .normalise()
    .png()
    .toBuffer();
}

async function preprocessForBarcodeGamma(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const isSmall = (meta.width ?? 0) < 800;

  return sharp(buffer)
    .resize({ width: isSmall ? 2000 : 1600, withoutEnlargement: false })
    .grayscale()
    .gamma(isSmall ? 2.5 : 2.0)
    .normalise()
    .sharpen({ sigma: isSmall ? 3 : 1.5 })
    .png()
    .toBuffer();
}

/**
 * Preprocesado agresivo para PDF417 en imagenes de baja resolucion.
 * Busca recuperar barras finas cuando el frame llega pequeno o comprimido.
 */
async function preprocessForBarcodeLowResBoost(
  buffer: Buffer,
  threshold: number | null = null,
): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;
  const verySmall = w < 700 || h < 420;

  let pipeline = sharp(buffer)
    .resize({
      width: verySmall ? 3600 : 3000,
      withoutEnlargement: false,
      kernel: sharp.kernel.lanczos3,
    })
    .grayscale()
    .median(1)
    .linear(verySmall ? 2.3 : 2.0, verySmall ? -150 : -120)
    .sharpen({ sigma: verySmall ? 4.5 : 3.8 })
    .normalise();

  if (typeof threshold === 'number') {
    pipeline = pipeline.threshold(threshold);
  }

  return pipeline.png().toBuffer();
}

/**
 * Crops the bottom 50% of a landscape image (where the CC PDF417 barcode lives)
 * and applies standard barcode preprocessing. Falls back to full-image preprocessing
 * if the image is portrait.
 */
async function preprocessForBarcodeZoneCrop(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  // Only crop if landscape (barcode is in lower half of CC back)
  if (w <= h || h < 200) {
    return preprocessForBarcode(buffer);
  }

  const cropTop = Math.floor(h * 0.5);
  const cropHeight = h - cropTop;

  const cropped = await sharp(buffer)
    .extract({ left: 0, top: cropTop, width: w, height: cropHeight })
    .toBuffer();

  const isSmall = w < 800;
  return sharp(cropped)
    .resize({ width: isSmall ? 2000 : 1600, withoutEnlargement: false })
    .grayscale()
    .sharpen({ sigma: isSmall ? 3 : 1.5 })
    .normalise()
    .png()
    .toBuffer();
}

/**
 * Crop lateral para casos donde el PDF417 queda en una franja vertical
 * (captura con tarjeta rotada dentro del frame).
 */
async function preprocessForBarcodeSideCrop(
  buffer: Buffer,
  side: 'left' | 'right',
): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  if (w < 250 || h < 180) {
    return preprocessForBarcode(buffer);
  }

  const cropWidth = Math.max(120, Math.floor(w * 0.42));
  const left = side === 'left' ? 0 : Math.max(0, w - cropWidth);

  const cropped = await sharp(buffer)
    .extract({ left, top: 0, width: cropWidth, height: h })
    .toBuffer();

  return sharp(cropped)
    .resize({ width: 2000, withoutEnlargement: false })
    .grayscale()
    .linear(1.7, -90)
    .sharpen({ sigma: 3 })
    .normalise()
    .png()
    .toBuffer();
}

/**
 * Crop central amplio para reducir fondo y ampliar el area util del documento.
 */
async function preprocessForBarcodeCenterCrop(buffer: Buffer): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const w = meta.width ?? 0;
  const h = meta.height ?? 0;

  if (w < 320 || h < 240) {
    return preprocessForBarcode(buffer);
  }

  const left = Math.floor(w * 0.1);
  const top = Math.floor(h * 0.08);
  const width = Math.floor(w * 0.8);
  const height = Math.floor(h * 0.84);

  const cropped = await sharp(buffer)
    .extract({ left, top, width, height })
    .toBuffer();

  return preprocessForBarcodeHighContrast(cropped);
}

/**
 * Preprocesa imagen para OCR de zona MRZ.
 * Permite recortar franjas verticales diferentes (inferior/superior/centro/full)
 * porque segun orientacion el MRZ no siempre cae en la parte baja.
 */
async function preprocessForMRZ(
  buffer: Buffer,
  cropTopRatio = 0.60,
  thresh: number | null = 140,
  cropBottomRatio = 1.0,
): Promise<Buffer> {
  const metadata = await sharp(buffer).metadata();
  const width = metadata.width!;
  const height = metadata.height!;
  const isSmall = width < 800;

  let mrzTop = Math.max(0, Math.floor(height * cropTopRatio));
  let mrzBottom = Math.min(height, Math.floor(height * cropBottomRatio));
  if (mrzBottom <= mrzTop) mrzBottom = height;

  const minBandHeight = Math.min(48, height);
  if (mrzBottom - mrzTop < minBandHeight) {
    mrzTop = 0;
    mrzBottom = height;
  }

  const mrzHeight = mrzBottom - mrzTop;

  let pipeline = sharp(buffer)
    .extract({ left: 0, top: mrzTop, width, height: mrzHeight })
    .resize({ width: isSmall ? 2400 : 2000, withoutEnlargement: false })
    .grayscale();

  if (isSmall) {
    pipeline = pipeline.sharpen({ sigma: 3 }).linear(1.8, -100);
  } else {
    pipeline = pipeline.sharpen({ sigma: 2 });
  }

  pipeline = pipeline.normalise();
  if (typeof thresh === 'number') {
    pipeline = pipeline.threshold(thresh);
  }

  return pipeline.png().toBuffer();
}

/**
 * Pure binarization for PDF417: resize → grayscale → normalize → threshold.
 * No contrast manipulation that could distort bar widths — ideal for wide-bar
 * barcodes found on 8-digit cédulas antiguas.
 */
async function preprocessForBarcodeThreshold(
  buffer: Buffer,
  thresholdValue: number,
): Promise<Buffer> {
  const meta = await sharp(buffer).metadata();
  const isSmall = (meta.width ?? 0) < 800;

  return sharp(buffer)
    .resize({ width: isSmall ? 2000 : 1600, withoutEnlargement: false })
    .grayscale()
    .normalise()
    .threshold(thresholdValue)
    .png()
    .toBuffer();
}

// ============================================================
// DECODIFICACION DE BARCODE (PDF417 via ZXing-WASM)
// ============================================================

/**
 * Helper: intenta decodificar un buffer con las opciones dadas.
 * Retorna el texto decodificado o null.
 */
async function tryDecodeBarcode(
  readBarcodes: Awaited<ReturnType<typeof getReadBarcodes>>,
  buffer: Buffer,
  options: Record<string, unknown>,
  label: string,
): Promise<string | null> {
  const results = await readBarcodes(buffer, options);
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
  return null;
}

/**
 * Intenta decodificar un barcode PDF417 de la imagen.
 * Prueba multiples variantes de preprocesamiento (crops, contraste, gamma, threshold)
 * con el binarizer LocalAverage por defecto.
 */
async function decodePDF417(imageBuffer: Buffer): Promise<string | null> {
  try {
    const readBarcodes = await getReadBarcodes();
    const meta = await sharp(imageBuffer).metadata();
    const isLowRes = (meta.width ?? 0) < 900 || (meta.height ?? 0) < 500;

    const readerOptions: Record<string, unknown> = {
      formats: ['PDF417'],
      tryHarder: true,
      tryRotate: true,
      tryInvert: true,
      maxNumberOfSymbols: 1,
    };

    // Pre-generate multiple preprocessing variants in parallel
    const basePromises: Promise<Buffer>[] = [
      preprocessForBarcodeZoneCrop(imageBuffer),
      preprocessForBarcodeSideCrop(imageBuffer, 'left'),
      preprocessForBarcodeSideCrop(imageBuffer, 'right'),
      preprocessForBarcodeCenterCrop(imageBuffer),
      preprocessForBarcode(imageBuffer),
      preprocessForBarcodeHighContrast(imageBuffer),
      preprocessForBarcodeGamma(imageBuffer),
      sharp(imageBuffer).png().toBuffer(),
      preprocessForBarcodeThreshold(imageBuffer, 128),
      preprocessForBarcodeThreshold(imageBuffer, 160),
    ];

    const lowResPromises: Promise<Buffer>[] = isLowRes
      ? [
        preprocessForBarcodeLowResBoost(imageBuffer, null),
        preprocessForBarcodeLowResBoost(imageBuffer, 110),
        preprocessForBarcodeLowResBoost(imageBuffer, 140),
      ]
      : [];

    const allBuffers = await Promise.all([...basePromises, ...lowResPromises]);
    const [
      barcodeCrop,
      sideLeft,
      sideRight,
      centerCrop,
      standard,
      highContrast,
      gamma,
      raw,
      thresh128,
      thresh160,
      lowResBoost,
      lowResBin110,
      lowResBin140,
    ] = allBuffers;

    const variants: Array<{ label: string; buffer: Buffer | undefined }> = [
      { label: 'barcode-crop', buffer: barcodeCrop },
      { label: 'side-left', buffer: sideLeft },
      { label: 'side-right', buffer: sideRight },
      { label: 'center-crop', buffer: centerCrop },
      { label: 'standard', buffer: standard },
      { label: 'high-contrast', buffer: highContrast },
      { label: 'gamma', buffer: gamma },
      { label: 'raw', buffer: raw },
      { label: 'thresh-128', buffer: thresh128 },
      { label: 'thresh-160', buffer: thresh160 },
      { label: 'lowres-boost', buffer: lowResBoost },
      { label: 'lowres-bin110', buffer: lowResBin110 },
      { label: 'lowres-bin140', buffer: lowResBin140 },
    ];

    for (const { label, buffer } of variants) {
      if (!buffer) continue;
      const decoded = await tryDecodeBarcode(readBarcodes, buffer, readerOptions, label);
      if (decoded) return decoded;
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

function extractOCRCandidates(data: any): string[] {
  const fromText = (data?.text || '')
    .split('\n')
    .map((line: string) => line.trim());

  const fromLines = Array.isArray(data?.lines)
    ? data.lines.map((line: any) => String(line?.text || '').trim())
    : [];

  return Array.from(new Set(
    [...fromLines, ...fromText]
      .map(line => line.toUpperCase().replace(/\s/g, ''))
      .map(line => line.replace(/[«‹＜]/g, '<'))
      .map(line => line.replace(/[^A-Z0-9<]/g, '<'))
      .filter(line => line.length >= 18)
  ));
}

/**
 * Extrae texto MRZ de una imagen usando Tesseract OCR (OCRB model).
 * Intenta recortes superior/inferior/centro y versiones con/sin binarizacion.
 */
async function extractMRZText(imageBuffer: Buffer): Promise<string[]> {
  const worker = await ensureTesseract();
  const allLines: string[] = [];

  const variantSpecs = [
    { label: 'bottom-58-b140', top: 0.58, bottom: 1.0, thresh: 140 as number | null },
    { label: 'top-55-b140', top: 0.00, bottom: 0.55, thresh: 140 as number | null },
    { label: 'full-gray', top: 0.00, bottom: 1.00, thresh: null as number | null },
    { label: 'bottom-50-b120', top: 0.50, bottom: 1.00, thresh: 120 as number | null },
    { label: 'middle-20-90-b130', top: 0.20, bottom: 0.90, thresh: 130 as number | null },
  ];

  for (let i = 0; i < variantSpecs.length; i++) {
    const spec = variantSpecs[i];
    const variant = await preprocessForMRZ(imageBuffer, spec.top, spec.thresh, spec.bottom);
    const { data } = await worker.recognize(variant);
    const lines = extractOCRCandidates(data);

    if (lines.length > 0) {
      console.log(`[scan] MRZ variante ${i} (${spec.label}): ${lines.length} lineas candidatas`);
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
  const td1All = scored.filter(c => c.line.length >= 24 && c.line.length <= 36);
  // Deduplicate by first 10 chars (multiple OCR variants)
  const td1Unique: typeof td1All = [];
  for (const item of td1All) {
    if (!td1Unique.some(u => u.line.substring(0, 10) === item.line.substring(0, 10))) {
      td1Unique.push(item);
    }
  }
  if (td1Unique.length >= 3) {
    const lines = td1Unique.slice(0, 3).map(c => c.line);
    // Requerimos al menos linea de fechas+sexo y linea de nombres para evitar orden incorrecto/falsos positivos
    const hasDateLine = lines.some(looksLikeTD1DateLine);
    const hasNameLine = lines.some(looksLikeTD1NameLine);
    if (hasDateLine && hasNameLine) {
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
  if (/^I[<C]COL/.test(line) || /^IDCOL/.test(line) || /^ICCOL/.test(line)) score += 50;
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
  const remaining = [...lines];

  const pickBest = (scorer: (line: string) => number): string | undefined => {
    let bestIdx = -1;
    let bestScore = 0;
    for (let i = 0; i < remaining.length; i++) {
      const score = scorer(remaining[i]);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    if (bestIdx === -1) return undefined;
    const [picked] = remaining.splice(bestIdx, 1);
    return picked;
  };

  // Extraemos primero las lineas mas distintivas.
  const nameLine = pickBest(line => looksLikeTD1NameLine(line) ? 100 : 0);
  const dateLine = pickBest(line => looksLikeTD1DateLine(line) ? 100 : 0);
  const docLine = pickBest(line => looksLikeTD1DocLine(line) ? 100 : 0);

  const fallback = [...remaining];
  const ordered = [
    docLine || fallback.shift() || '',
    dateLine || fallback.shift() || '',
    nameLine || fallback.shift() || '',
  ];

  return ordered.some(l => !l) ? lines : ordered;
}

function isValidISODate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().startsWith(`${value}T`);
}

function hasReasonableName(data: CedulaData): boolean {
  const fullName = [
    data.primerNombre,
    data.segundoNombre,
    data.primerApellido,
    data.segundoApellido,
    data.nombres,
  ].join(' ').replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/g, '');
  return fullName.length >= 4;
}

function hasReasonableDocNumber(data: CedulaData, format: 'TD1' | 'TD3'): boolean {
  const doc = (data.numeroDocumento || '').trim();
  if (!doc) return false;

  if (format === 'TD1') {
    return /^[0-9]{6,12}$/.test(doc);
  }

  const alnum = doc.replace(/[^A-Za-z0-9]/g, '');
  return alnum.length >= 6;
}

function isPlausibleMRZData(data: CedulaData, format: 'TD1' | 'TD3'): boolean {
  return (
    hasReasonableDocNumber(data, format)
    && isValidISODate(data.fechaNacimiento)
    && hasReasonableName(data)
  );
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

      // Intento 3: MRZ con imagen rotada 90° CCW
      // La cedula digital nueva tiene el MRZ impreso verticalmente;
      // rotar 270° (90° CCW) lo convierte a texto horizontal izq→der
      const rotated270 = await sharp(imageBuffer).rotate(270).toBuffer();
      const mrzResult270 = await tryMRZ(rotated270);
      if (mrzResult270) {
        console.log('[scan] MRZ detectado tras rotacion 270° (MRZ vertical cedula nueva)');
        return { ...mrzResult270, processingTimeMs: Date.now() - startTime };
      }

      // Intento 4: MRZ rotada 90° CW (tarjeta al revés)
      const rotated90 = await sharp(imageBuffer).rotate(90).toBuffer();
      const mrzResult90 = await tryMRZ(rotated90);
      if (mrzResult90) {
        console.log('[scan] MRZ detectado tras rotacion 90°');
        return { ...mrzResult90, processingTimeMs: Date.now() - startTime };
      }

      // Intento 5: MRZ con imagen rotada 180° (documento al reves)
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
      if (!isPlausibleMRZData(data, detection.format)) {
        console.warn(`[scan] MRZ descartado por datos inconsistentes: doc="${data.numeroDocumento}", fechaNacimiento="${data.fechaNacimiento}"`);
        return null;
      }
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

async function tryPDF417Parsed(
  imageBuffer: Buffer,
  tipoDocumento: 'CC' | 'TI',
): Promise<Omit<ProcessingResult, 'processingTimeMs'> | null> {
  const barcodeData = await decodePDF417(imageBuffer);
  if (!barcodeData) return null;

  try {
    const data = parsePDF417(barcodeData, tipoDocumento);
    return {
      data,
      method: 'pdf417',
      rawText: barcodeData.substring(0, 100),
    };
  } catch (e) {
    console.warn(`[scan] PDF417 detectado pero fallo parsing (${tipoDocumento}):`, (e as Error).message);
    return null;
  }
}

// ============================================================
// PIPELINES OPTIMIZADAS (antigua / nueva)
// ============================================================

/**
 * Pipeline optimizada para cedula antigua (PDF417 barcode).
 * 1. Auto-rotar a landscape
 * 2. Intentar PDF417 con todas las variantes
 * 3. Fallback: intentar MRZ como ultimo recurso
 */
export async function processDocumentAntigua(
  imageBuffer: Buffer
): Promise<ProcessingResult> {
  const startTime = Date.now();

  // Normaliza orientacion EXIF antes de rotaciones explicitas.
  imageBuffer = await sharp(imageBuffer).rotate().toBuffer();
  const meta = await sharp(imageBuffer).metadata();
  if (meta.height! > meta.width!) {
    imageBuffer = await sharp(imageBuffer).rotate(90).toBuffer();
    console.log(`[scan/antigua] Imagen rotada a landscape: ${meta.height}x${meta.width}`);
  }

  // Solo PDF417 — intentar multiples orientaciones para mejorar estabilidad en capturas moviles.
  const attempts: Array<{ label: string; buffer: Buffer }> = [
    { label: 'original', buffer: imageBuffer },
    { label: 'rot270', buffer: await sharp(imageBuffer).rotate(270).toBuffer() },
    { label: 'rot90', buffer: await sharp(imageBuffer).rotate(90).toBuffer() },
    { label: 'rot180', buffer: await sharp(imageBuffer).rotate(180).toBuffer() },
  ];

  for (const attempt of attempts) {
    const parsed = await tryPDF417Parsed(attempt.buffer, 'CC');
    if (parsed) {
      if (attempt.label !== 'original') {
        console.log(`[scan/antigua] PDF417 detectado tras ${attempt.label}`);
      }
      return {
        ...parsed,
        processingTimeMs: Date.now() - startTime,
      };
    }
  }

  return {
    data: null,
    method: 'none',
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Pipeline optimizada para cedula nueva (MRZ).
 * 1. Auto-rotar a landscape
 * 2. Intentar MRZ en orientacion original
 * 3. Intentar rotaciones (270, 90, 180) para MRZ vertical/invertido
 * 4. Fallback: intentar PDF417 como ultimo recurso
 */
export async function processDocumentNueva(
  imageBuffer: Buffer
): Promise<ProcessingResult> {
  const startTime = Date.now();

  const meta = await sharp(imageBuffer).metadata();
  if (meta.height! > meta.width!) {
    imageBuffer = await sharp(imageBuffer).rotate(90).toBuffer();
    console.log(`[scan/nueva] Imagen rotada a landscape: ${meta.height}x${meta.width}`);
  }

  // Intento 1: MRZ en orientacion original
  const mrzResult = await tryMRZ(imageBuffer);
  if (mrzResult) {
    return { ...mrzResult, processingTimeMs: Date.now() - startTime };
  }

  // Intento 2: MRZ rotada 270° (MRZ vertical en cedula digital)
  const rotated270 = await sharp(imageBuffer).rotate(270).toBuffer();
  const mrzResult270 = await tryMRZ(rotated270);
  if (mrzResult270) {
    console.log('[scan/nueva] MRZ detectado tras rotacion 270°');
    return { ...mrzResult270, processingTimeMs: Date.now() - startTime };
  }

  // Intento 3: MRZ rotada 90°
  const rotated90 = await sharp(imageBuffer).rotate(90).toBuffer();
  const mrzResult90 = await tryMRZ(rotated90);
  if (mrzResult90) {
    console.log('[scan/nueva] MRZ detectado tras rotacion 90°');
    return { ...mrzResult90, processingTimeMs: Date.now() - startTime };
  }

  // Intento 4: MRZ rotada 180°
  const rotated180 = await sharp(imageBuffer).rotate(180).toBuffer();
  const mrzResult180 = await tryMRZ(rotated180);
  if (mrzResult180) {
    console.log('[scan/nueva] MRZ detectado tras rotacion 180°');
    return { ...mrzResult180, processingTimeMs: Date.now() - startTime };
  }

  // Sin fallback a PDF417 — el usuario eligio cedula nueva
  return {
    data: null,
    method: 'none',
    processingTimeMs: Date.now() - startTime,
  };
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
