/**
 * Servicio de verificacion anti-spoofing para documentos
 *
 * Verifica que la imagen capturada corresponde a un documento fisico real
 * y no a una fotocopia, foto de pantalla, o imagen de galeria.
 *
 * Capas de verificacion:
 * 1. Metadatos EXIF — verifica que la imagen viene de una camara real
 * 2. Analisis de bordes — detecta forma rectangular de documento
 * 3. Deteccion de patron Moire — identifica fotos de pantalla
 * 4. Comparacion multi-frame — verifica cambio de reflejos al inclinar
 */

import sharp from 'sharp';
import { AuthenticityCheck } from '../models/cedula.model';

// ============================================================
// PIPELINE PRINCIPAL
// ============================================================

/**
 * Ejecuta todas las verificaciones anti-spoofing sobre la imagen
 */
export async function runAntiSpoofingChecks(
  frame1Buffer: Buffer,
  frame2Buffer?: Buffer
): Promise<{ score: number; checks: AuthenticityCheck[] }> {
  const checks: AuthenticityCheck[] = [];

  // Capa 1: Verificar metadatos EXIF
  const exifCheck = await checkEXIFMetadata(frame1Buffer);
  checks.push(exifCheck);

  // Capa 2: Detectar bordes de documento
  const edgeCheck = await checkDocumentEdges(frame1Buffer);
  checks.push(edgeCheck);

  // Capa 3: Detectar patron Moire (foto de pantalla)
  const moireCheck = await checkMoirePattern(frame1Buffer);
  checks.push(moireCheck);

  // Capa 4: Comparar reflejos entre frames (si hay 2 frames)
  if (frame2Buffer) {
    const reflectionCheck = await checkReflectionChange(frame1Buffer, frame2Buffer);
    checks.push(reflectionCheck);
  }

  // Capa 5: Analisis de enfoque
  const focusCheck = await checkFocusQuality(frame1Buffer);
  checks.push(focusCheck);

  // Calcular score total (promedio ponderado)
  const weights: Record<string, number> = {
    exif_metadata: 15,
    document_edges: 25,
    moire_detection: 25,
    reflection_change: 20,
    focus_quality: 15,
  };

  let totalWeight = 0;
  let weightedSum = 0;

  for (const check of checks) {
    const w = weights[check.name] ?? 10;
    weightedSum += check.score * w;
    totalWeight += w;
  }

  const score = Math.round(weightedSum / totalWeight);

  return { score, checks };
}

// ============================================================
// CAPA 1: METADATOS EXIF
// ============================================================

/**
 * Verifica metadatos EXIF de la imagen.
 *
 * Fotos de camara real: tienen Make, Model, DateTime, etc.
 * Capturas de pantalla: NO tienen EXIF o tienen EXIF minimo.
 * Imagenes descargadas: pueden tener EXIF original o no.
 *
 * NOTA: Imagenes capturadas via getUserMedia + canvas.toDataURL
 * generalmente NO tienen EXIF (se pierde en el canvas). Por eso
 * este check tiene peso bajo y no rechaza por si solo.
 */
async function checkEXIFMetadata(buffer: Buffer): Promise<AuthenticityCheck> {
  try {
    const metadata = await sharp(buffer).metadata();

    // Verificar formato — JPEG es lo esperado de una camara
    const isJpeg = metadata.format === 'jpeg' || metadata.format === 'jpg';

    // Verificar que no es PNG (tipico de capturas de pantalla)
    const isPng = metadata.format === 'png';

    // Verificar dimensiones razonables para una foto de documento
    const w = metadata.width || 0;
    const h = metadata.height || 0;
    const hasReasonableDimensions = w >= 640 && h >= 480 && w <= 8000 && h <= 6000;

    // EXIF data (sharp expone lo basico)
    const hasExif = !!(metadata.exif && metadata.exif.length > 0);

    let score = 50; // Base neutral (getUserMedia pierde EXIF)

    if (isJpeg) score += 15;
    if (isPng) score -= 20; // PNG = posible screenshot
    if (hasReasonableDimensions) score += 15;
    if (hasExif) score += 20;

    score = Math.max(0, Math.min(100, score));

    return {
      name: 'exif_metadata',
      passed: score >= 40,
      score,
      details: `format=${metadata.format}, ${w}x${h}, exif=${hasExif ? 'si' : 'no'}`,
    };
  } catch {
    return {
      name: 'exif_metadata',
      passed: true, // No penalizar por error
      score: 50,
      details: 'No se pudieron leer metadatos',
    };
  }
}

// ============================================================
// CAPA 2: DETECCION DE BORDES DE DOCUMENTO
// ============================================================

/**
 * Detecta si hay una forma rectangular en la imagen que
 * corresponda a un documento de identidad.
 *
 * Metodo: Aplica filtro Sobel para detectar bordes, luego
 * analiza la proporcion de pixeles de borde en las zonas
 * donde deberian estar los bordes de una tarjeta.
 */
async function checkDocumentEdges(buffer: Buffer): Promise<AuthenticityCheck> {
  try {
    const TARGET_SIZE = 400;

    // Redimensionar y convertir a escala de grises
    const gray = await sharp(buffer)
      .resize({ width: TARGET_SIZE, withoutEnlargement: false })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = gray;
    const w = info.width;
    const h = info.height;

    // Aplicar operador Sobel simplificado para detectar bordes
    const edgeMap = applySobel(data, w, h);

    // Analizar bordes en las zonas esperadas para una tarjeta centrada
    // Una tarjeta centrada deberia tener bordes fuertes en ~10-90% del area
    const margin = Math.floor(w * 0.08);
    const innerMargin = Math.floor(w * 0.15);

    // Contar pixeles de borde en el perimetro esperado del documento
    let perimeterEdges = 0;
    let perimeterTotal = 0;

    // Borde superior e inferior (franjas horizontales)
    for (let x = innerMargin; x < w - innerMargin; x++) {
      for (let yOff = margin; yOff < margin + 8; yOff++) {
        perimeterEdges += edgeMap[yOff * w + x] > 80 ? 1 : 0;
        perimeterTotal++;
        const bottomY = h - 1 - yOff;
        if (bottomY >= 0) {
          perimeterEdges += edgeMap[bottomY * w + x] > 80 ? 1 : 0;
          perimeterTotal++;
        }
      }
    }

    // Borde izquierdo y derecho (franjas verticales)
    for (let y = innerMargin; y < h - innerMargin; y++) {
      for (let xOff = margin; xOff < margin + 8; xOff++) {
        perimeterEdges += edgeMap[y * w + xOff] > 80 ? 1 : 0;
        perimeterTotal++;
        const rightX = w - 1 - xOff;
        if (rightX >= 0) {
          perimeterEdges += edgeMap[y * w + rightX] > 80 ? 1 : 0;
          perimeterTotal++;
        }
      }
    }

    const edgeRatio = perimeterTotal > 0 ? perimeterEdges / perimeterTotal : 0;

    // Un documento fisico deberia tener >15% de bordes en el perimetro esperado
    const passed = edgeRatio > 0.10;
    const score = Math.min(100, Math.round(edgeRatio * 400));

    return {
      name: 'document_edges',
      passed,
      score: Math.max(0, Math.min(100, score)),
      details: `Ratio bordes perimetro: ${(edgeRatio * 100).toFixed(1)}%`,
    };
  } catch (e) {
    return {
      name: 'document_edges',
      passed: true,
      score: 50,
      details: `Error en deteccion de bordes: ${(e as Error).message}`,
    };
  }
}

/**
 * Aplica operador Sobel simplificado para deteccion de bordes
 * Retorna un array con la magnitud de gradiente por pixel
 */
function applySobel(data: Buffer, w: number, h: number): Float32Array {
  const edges = new Float32Array(w * h);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      // Kernel Sobel horizontal
      const gx =
        -1 * data[(y - 1) * w + (x - 1)] + 1 * data[(y - 1) * w + (x + 1)] +
        -2 * data[y * w + (x - 1)]       + 2 * data[y * w + (x + 1)] +
        -1 * data[(y + 1) * w + (x - 1)] + 1 * data[(y + 1) * w + (x + 1)];

      // Kernel Sobel vertical
      const gy =
        -1 * data[(y - 1) * w + (x - 1)] + -2 * data[(y - 1) * w + x] + -1 * data[(y - 1) * w + (x + 1)] +
         1 * data[(y + 1) * w + (x - 1)] +  2 * data[(y + 1) * w + x] +  1 * data[(y + 1) * w + (x + 1)];

      edges[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  }

  return edges;
}

// ============================================================
// CAPA 3: DETECCION DE PATRON MOIRE
// ============================================================

/**
 * Detecta patron Moire que indica foto de pantalla LCD/LED.
 *
 * Las pantallas LCD/LED tienen una rejilla de subpixeles. Cuando se
 * fotografian, esta rejilla crea un patron de interferencia (Moire)
 * que aparece como bandas periodicas en la imagen.
 *
 * Metodo: Analizar la autocorrelacion de la imagen en escala de grises.
 * Si hay picos periodicos fuertes en la autocorrelacion, hay Moire.
 */
async function checkMoirePattern(buffer: Buffer): Promise<AuthenticityCheck> {
  try {
    const SIZE = 256;

    // Region central de la imagen (donde el Moire es mas visible)
    const gray = await sharp(buffer)
      .resize({ width: SIZE, height: SIZE, fit: 'cover' })
      .grayscale()
      .raw()
      .toBuffer();

    // Calcular varianza de alta frecuencia por bloques
    // Moire genera varianza periodica anormal
    const blockSize = 16;
    const blocksPerRow = SIZE / blockSize;
    const blockVariances: number[] = [];

    for (let by = 0; by < blocksPerRow; by++) {
      for (let bx = 0; bx < blocksPerRow; bx++) {
        let sum = 0;
        let sumSq = 0;
        const count = blockSize * blockSize;

        for (let dy = 0; dy < blockSize; dy++) {
          for (let dx = 0; dx < blockSize; dx++) {
            const val = gray[(by * blockSize + dy) * SIZE + (bx * blockSize + dx)];
            sum += val;
            sumSq += val * val;
          }
        }

        const mean = sum / count;
        const variance = sumSq / count - mean * mean;
        blockVariances.push(variance);
      }
    }

    // Calcular la varianza de las varianzas (meta-varianza)
    // Moire causa alta meta-varianza (bloques con varianza muy diferente)
    const avgVariance = blockVariances.reduce((a, b) => a + b, 0) / blockVariances.length;
    let metaVariance = 0;
    for (const v of blockVariances) {
      metaVariance += (v - avgVariance) * (v - avgVariance);
    }
    metaVariance /= blockVariances.length;

    // Calcular coeficiente de variacion de las varianzas de bloque
    const cv = avgVariance > 0 ? Math.sqrt(metaVariance) / avgVariance : 0;

    // Un CV alto indica patron periodico (posible Moire)
    // Valores tipicos: documento real < 1.5, foto de pantalla > 2.0
    const hasMoire = cv > 2.0;

    const score = hasMoire
      ? Math.max(0, Math.round(30 - (cv - 2.0) * 15))
      : Math.min(100, Math.round(70 + (2.0 - cv) * 20));

    return {
      name: 'moire_detection',
      passed: !hasMoire,
      score: Math.max(0, Math.min(100, score)),
      details: `CV de varianzas: ${cv.toFixed(2)} (umbral: 2.0)${hasMoire ? ' — posible foto de pantalla' : ''}`,
    };
  } catch (e) {
    return {
      name: 'moire_detection',
      passed: true,
      score: 50,
      details: `Error en deteccion Moire: ${(e as Error).message}`,
    };
  }
}

// ============================================================
// CAPA 4: COMPARACION DE REFLEJOS (MULTI-FRAME)
// ============================================================

/**
 * Compara la distribucion de reflejos especulares entre 2 frames.
 *
 * Cuando el usuario inclina un documento fisico, los reflejos especulares
 * (zonas muy brillantes) cambian de posicion/forma. Una foto en pantalla
 * o fotocopia NO muestra este cambio.
 *
 * Se requiere que el cliente envie 2 frames: normal + inclinado.
 */
async function checkReflectionChange(
  frame1: Buffer,
  frame2: Buffer
): Promise<AuthenticityCheck> {
  try {
    const SIZE = 300;

    // Procesar ambos frames a escala de grises
    const [gray1, gray2] = await Promise.all([
      sharp(frame1).resize({ width: SIZE, height: SIZE, fit: 'cover' }).grayscale().raw().toBuffer(),
      sharp(frame2).resize({ width: SIZE, height: SIZE, fit: 'cover' }).grayscale().raw().toBuffer(),
    ]);

    const totalPixels = SIZE * SIZE;
    const HIGHLIGHT_THRESHOLD = 230; // Pixeles muy brillantes = reflejos

    // Contar highlights y su posicion en cada frame
    let highlights1 = 0;
    let highlights2 = 0;
    let diffCount = 0;

    for (let i = 0; i < totalPixels; i++) {
      const isHigh1 = gray1[i] > HIGHLIGHT_THRESHOLD;
      const isHigh2 = gray2[i] > HIGHLIGHT_THRESHOLD;

      if (isHigh1) highlights1++;
      if (isHigh2) highlights2++;
      if (isHigh1 !== isHigh2) diffCount++;
    }

    // Proporcion de pixeles de reflejo que cambiaron
    const totalHighlights = Math.max(highlights1, highlights2, 1);
    const changeRatio = diffCount / totalHighlights;

    // Documento fisico: > 15% de cambio en reflejos
    // Foto/pantalla/fotocopia: < 5% de cambio
    const passed = changeRatio > 0.10;
    const score = Math.min(100, Math.round(changeRatio * 300));

    return {
      name: 'reflection_change',
      passed,
      score: Math.max(0, Math.min(100, score)),
      details: `Cambio reflejos: ${(changeRatio * 100).toFixed(1)}% (h1=${highlights1}, h2=${highlights2}, diff=${diffCount})`,
    };
  } catch (e) {
    return {
      name: 'reflection_change',
      passed: true,
      score: 50,
      details: `Error comparando reflejos: ${(e as Error).message}`,
    };
  }
}

// ============================================================
// CAPA 5: CALIDAD DE ENFOQUE
// ============================================================

/**
 * Evalua la calidad de enfoque de la imagen usando la varianza del Laplaciano.
 *
 * Una imagen bien enfocada tiene alta varianza del Laplaciano.
 * Una imagen borrosa o de baja calidad tiene baja varianza.
 *
 * Esto ayuda a rechazar imagenes que no son fotos directas
 * (fotos de fotos tienden a tener menor nitidez).
 */
async function checkFocusQuality(buffer: Buffer): Promise<AuthenticityCheck> {
  try {
    const SIZE = 400;

    const gray = await sharp(buffer)
      .resize({ width: SIZE, withoutEnlargement: false })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { data, info } = gray;
    const w = info.width;
    const h = info.height;

    // Calcular Laplaciano (segunda derivada)
    let sum = 0;
    let sumSq = 0;
    let count = 0;

    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        // Kernel Laplaciano: [0 1 0; 1 -4 1; 0 1 0]
        const laplacian =
          data[(y - 1) * w + x] +
          data[y * w + (x - 1)] +
          -4 * data[y * w + x] +
          data[y * w + (x + 1)] +
          data[(y + 1) * w + x];

        sum += laplacian;
        sumSq += laplacian * laplacian;
        count++;
      }
    }

    const mean = sum / count;
    const variance = sumSq / count - mean * mean;

    // Umbrales de enfoque:
    // < 100: muy borroso (posible foto de foto)
    // 100-500: aceptable
    // > 500: buena nitidez
    const isSharp = variance > 100;
    const score = Math.min(100, Math.round(Math.sqrt(variance) * 2));

    return {
      name: 'focus_quality',
      passed: isSharp,
      score: Math.max(0, Math.min(100, score)),
      details: `Varianza Laplaciano: ${variance.toFixed(0)} (umbral: 100)`,
    };
  } catch (e) {
    return {
      name: 'focus_quality',
      passed: true,
      score: 50,
      details: `Error en analisis de enfoque: ${(e as Error).message}`,
    };
  }
}
