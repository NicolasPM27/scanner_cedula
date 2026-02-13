/**
 * Controlador de escaneo de documentos
 *
 * POST /api/scan/document
 *   Recibe imagen(es) en base64, procesa server-side y retorna datos extraidos
 */

import { Request, Response } from 'express';
import {
  ScanRequest,
  ScanResponse,
  TipoDocumentoScan,
} from '../models/cedula.model';
import {
  decodeAndValidateImage,
  processDocument,
} from '../services/image-processor.service';
import { runAntiSpoofingChecks } from '../services/anti-spoofing.service';

const VALID_TIPOS: TipoDocumentoScan[] = ['CC', 'CE', 'PA', 'TI', 'RC', 'NIT', 'NUIP'];

/**
 * POST /api/scan/document
 * Body: { frame1: string (base64), frame2?: string, tipoDocumento: string, timestamp: string }
 */
export async function scanDocument(req: Request, res: Response): Promise<void> {
  const startTime = Date.now();

  try {
    const { frame1, frame2, tipoDocumento, timestamp } = req.body as ScanRequest;

    // ── Validaciones ──────────────────────────────────────
    if (!frame1) {
      res.status(400).json({
        success: false,
        error: 'Se requiere al menos una imagen (frame1)',
        authenticityScore: 0,
        checks: [],
      } satisfies ScanResponse);
      return;
    }

    if (!tipoDocumento || !VALID_TIPOS.includes(tipoDocumento)) {
      res.status(400).json({
        success: false,
        error: `Tipo de documento invalido. Valores permitidos: ${VALID_TIPOS.join(', ')}`,
        authenticityScore: 0,
        checks: [],
      } satisfies ScanResponse);
      return;
    }

    if (!timestamp) {
      res.status(400).json({
        success: false,
        error: 'Se requiere timestamp de captura',
        authenticityScore: 0,
        checks: [],
      } satisfies ScanResponse);
      return;
    }

    // Validar que el timestamp no sea muy viejo (max 5 min)
    const captureTime = new Date(timestamp).getTime();
    const now = Date.now();
    if (isNaN(captureTime) || Math.abs(now - captureTime) > 5 * 60 * 1000) {
      res.status(400).json({
        success: false,
        error: 'Timestamp de captura invalido o expirado (max 5 minutos)',
        authenticityScore: 0,
        checks: [],
      } satisfies ScanResponse);
      return;
    }

    // ── Decodificar y validar imagen ─────────────────────
    console.log(`[scan] Procesando documento tipo=${tipoDocumento}`);

    const { buffer: imageBuffer, metadata } = await decodeAndValidateImage(frame1);
    console.log(`[scan] Imagen: ${metadata.width}x${metadata.height}, ${metadata.format}, ${imageBuffer.length} bytes`);

    // Validar dimensiones minimas (320x240 — imagenes pequenas se procesan con enhancement agresivo)
    if (metadata.width! < 320 || metadata.height! < 240) {
      res.status(400).json({
        success: false,
        error: 'Imagen demasiado pequena. Se requiere minimo 320x240 pixeles.',
        authenticityScore: 0,
        checks: [],
      } satisfies ScanResponse);
      return;
    }

    // ── Anti-spoofing (en paralelo con el procesamiento) ──
    let frame2Buffer: Buffer | undefined;
    if (frame2) {
      try {
        const decoded2 = await decodeAndValidateImage(frame2);
        frame2Buffer = decoded2.buffer;
      } catch {
        // Si el frame2 es invalido, continuamos sin el
        console.warn('[scan] frame2 invalido, continuando sin anti-spoofing multi-frame');
      }
    }

    // Ejecutar procesamiento de documento y anti-spoofing en paralelo
    const [result, spoofResult] = await Promise.all([
      processDocument(imageBuffer, tipoDocumento),
      runAntiSpoofingChecks(imageBuffer, frame2Buffer),
    ]);

    if (!result.data) {
      const totalMs = Date.now() - startTime;
      console.log(`[scan] No se pudo extraer datos (${totalMs}ms)`);

      res.status(422).json({
        success: false,
        error: getFailureMessage(tipoDocumento),
        authenticityScore: spoofResult.score,
        checks: spoofResult.checks,
      } satisfies ScanResponse);
      return;
    }

    // ── Respuesta exitosa ────────────────────────────────
    const totalMs = Date.now() - startTime;

    // Combinar score de parsing con score de anti-spoofing
    const parsingScore = result.data.confianza ?? 85;
    const combinedScore = Math.round((parsingScore * 0.6) + (spoofResult.score * 0.4));

    console.log(`[scan] Exito: metodo=${result.method}, parsing=${parsingScore}, spoofing=${spoofResult.score}, combined=${combinedScore}, tiempo=${totalMs}ms`);

    const allChecks = [
      {
        name: 'document_readable',
        passed: true,
        score: parsingScore,
        details: `Documento leido via ${result.method} en ${result.processingTimeMs}ms`,
      },
      ...spoofResult.checks,
    ];

    const response: ScanResponse = {
      success: true,
      data: result.data,
      authenticityScore: combinedScore,
      checks: allChecks,
    };

    res.json(response);

  } catch (error) {
    const totalMs = Date.now() - startTime;
    console.error(`[scan] Error (${totalMs}ms):`, error);

    res.status(500).json({
      success: false,
      error: 'Error interno procesando el documento',
      authenticityScore: 0,
      checks: [],
    } satisfies ScanResponse);
  }
}

function getFailureMessage(tipo: TipoDocumentoScan): string {
  switch (tipo) {
    case 'CC':
      return 'No se pudo leer la cedula. Asegurese de que el codigo de barras (cedula antigua) o la zona MRZ (cedula nueva) sea visible y este bien iluminado.';
    case 'CE':
    case 'PA':
      return 'No se pudo leer la zona MRZ del documento. Asegurese de que las lineas de texto en la parte inferior sean visibles.';
    case 'TI':
      return 'No se pudo leer el codigo de barras de la tarjeta de identidad.';
    default:
      return 'No se pudo procesar el documento. Intente con mejor iluminacion y enfoque.';
  }
}
