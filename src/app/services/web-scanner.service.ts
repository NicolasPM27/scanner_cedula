import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { Capacitor } from '@capacitor/core';
import { environment } from '../../environments/environment';
import { CedulaData } from '../models/cedula.model';

/**
 * Tipos de documento soportados para escaneo
 */
export type TipoDocumentoScan = 'CC' | 'CE' | 'PA' | 'TI' | 'RC' | 'NIT' | 'NUIP';

export interface ScanResponse {
  success: boolean;
  data?: CedulaData;
  authenticityScore: number;
  checks: { name: string; passed: boolean; score: number; details?: string }[];
  error?: string;
}

/**
 * Servicio de escaneo web para PWA
 *
 * Usa getUserMedia para acceder a la camara en vivo (NO galeria),
 * captura frames y los envia al backend para procesamiento
 * (Sharp + ZXing-WASM + Tesseract).
 *
 * En plataforma nativa, delega al ScannerService existente.
 */
@Injectable({ providedIn: 'root' })
export class WebScannerService {
  private stream: MediaStream | null = null;
  private sharpnessRAF: number | null = null;
  private sharpnessLastTime = 0;
  private sustainedAboveThreshold = 0;

  constructor(private http: HttpClient) {}

  /** True si estamos en PWA/web (no nativo) */
  get isWebPlatform(): boolean {
    return !Capacitor.isNativePlatform();
  }

  /**
   * Abre la camara trasera y la conecta a un elemento <video>
   * Resolucion: 1080p ideal, 480p minimo — compatible con dispositivos de gama baja
   */
  async openCamera(video: HTMLVideoElement): Promise<void> {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920, min: 640 },
        height: { ideal: 1080, min: 480 },
        frameRate: { ideal: 15, max: 24 },
      } as MediaTrackConstraints,
      audio: false,
    };

    // Add focusMode hint if supported (continuous autofocus)
    try {
      (constraints.video as any).focusMode = { ideal: 'continuous' };
    } catch { /* ignore if not supported */ }

    this.stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = this.stream;
    await video.play();
  }

  /**
   * Crops the video frame to the guide-frame region
   */
  private cropToGuideFrame(video: HTMLVideoElement): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const dw = video.clientWidth;
    const dh = video.clientHeight;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    if (dw > 0 && dh > 0) {
      const scale = Math.max(dw / vw, dh / vh);
      const offX = (vw - dw / scale) / 2;
      const offY = (vh - dh / scale) / 2;

      let gw = dw * 0.90;
      let gh = gw / 1.586;
      // Constrain by height when CSS forces landscape on portrait phones
      if (gh > dh * 0.80) {
        gh = dh * 0.80;
        gw = gh * 1.586;
      }
      const gx = (dw - gw) / 2;
      const gy = (dh - gh) / 2;

      const cx = Math.max(0, Math.round(offX + gx / scale));
      const cy = Math.max(0, Math.round(offY + gy / scale));
      const cw = Math.min(vw - cx, Math.round(gw / scale));
      const ch = Math.min(vh - cy, Math.round(gh / scale));

      canvas.width = cw;
      canvas.height = ch;
      ctx.drawImage(video, cx, cy, cw, ch, 0, 0, cw, ch);
    } else {
      canvas.width = vw;
      canvas.height = vh;
      ctx.drawImage(video, 0, 0);
    }

    return { canvas, ctx };
  }

  /**
   * Captura un solo frame recortado al guide-frame
   */
  captureFrame(video: HTMLVideoElement, quality = 0.85): string {
    const { canvas } = this.cropToGuideFrame(video);
    return canvas.toDataURL('image/jpeg', quality).replace(/^data:image\/\w+;base64,/, '');
  }

  /**
   * Captura N frames, calcula nitidez de cada uno y retorna el mas nitido.
   * Esto compensa variaciones de enfoque entre frames.
   */
  async captureBestFrame(video: HTMLVideoElement, numFrames = 4, quality = 0.85): Promise<string> {
    const frames = await this.captureBestFrames(video, numFrames, 1, quality);
    return frames[0];
  }

  /**
   * Captura N frames, calcula nitidez y retorna los top `topN` ordenados
   * por nitidez descendente. Util para enviar frame2 como fallback al backend.
   */
  async captureBestFrames(
    video: HTMLVideoElement,
    numFrames = 5,
    topN = 2,
    quality = 0.85,
  ): Promise<string[]> {
    const captured: { base64: string; sharpness: number }[] = [];

    for (let i = 0; i < numFrames; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 120));

      const { canvas, ctx } = this.cropToGuideFrame(video);
      const sharpness = this.computeSharpness(ctx, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg', quality).replace(/^data:image\/\w+;base64,/, '');
      captured.push({ base64, sharpness });
    }

    captured.sort((a, b) => b.sharpness - a.sharpness);
    return captured.slice(0, topN).map(c => c.base64);
  }

  /**
   * Gradient-magnitude variance — higher = sharper image
   */
  private computeSharpness(ctx: CanvasRenderingContext2D, w: number, h: number): number {
    const s = Math.min(128, w, h);
    const sx = Math.floor((w - s) / 2);
    const sy = Math.floor((h - s) / 2);
    const { data } = ctx.getImageData(sx, sy, s, s);

    let sum = 0, sumSq = 0, n = 0;
    for (let y = 0; y < s - 1; y++) {
      for (let x = 0; x < s - 1; x++) {
        const i = (y * s + x) * 4;
        const ri = (y * s + x + 1) * 4;
        const bi = ((y + 1) * s + x) * 4;
        const g  = data[i]  * 0.3 + data[i + 1]  * 0.59 + data[i + 2]  * 0.11;
        const gr = data[ri] * 0.3 + data[ri + 1] * 0.59 + data[ri + 2] * 0.11;
        const gb = data[bi] * 0.3 + data[bi + 1] * 0.59 + data[bi + 2] * 0.11;
        const dx = gr - g;
        const dy = gb - g;
        const mag = dx * dx + dy * dy;
        sum += mag;
        sumSq += mag * mag;
        n++;
      }
    }
    return n > 0 ? sumSq / n - (sum / n) ** 2 : 0;
  }

  /**
   * Computes a normalized sharpness score (0-100) for a small center patch.
   * Uses a 64x64 region for speed.
   */
  private computeSharpnessScore(video: HTMLVideoElement): number {
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    if (vw === 0 || vh === 0) return 0;

    const patchSize = 64;
    const canvas = document.createElement('canvas');
    canvas.width = patchSize;
    canvas.height = patchSize;
    const ctx = canvas.getContext('2d')!;

    const sx = Math.floor((vw - patchSize) / 2);
    const sy = Math.floor((vh - patchSize) / 2);
    ctx.drawImage(video, sx, sy, patchSize, patchSize, 0, 0, patchSize, patchSize);

    const rawSharpness = this.computeSharpness(ctx, patchSize, patchSize);

    // Normalize to 0-100 range. The raw variance ranges widely depending on content;
    // empirically, values around 50000+ indicate a sharp document scan.
    // We use a log scale for a more useful spread across the range.
    const score = Math.min(100, Math.max(0, Math.round((Math.log1p(rawSharpness) / Math.log1p(80000)) * 100)));
    return score;
  }

  /**
   * Computes a proximity score (0-100) based on high-contrast content coverage.
   *
   * Uses luminance standard deviation per grid cell to distinguish document
   * content (text, barcode = high contrast = high stdDev) from background
   * (desk, fabric = uniform = low stdDev).
   *
   * Additionally requires strong edges (gradient > 40) within each cell —
   * this filters out noise and soft textures that can inflate stdDev
   * (e.g. patterned tablecloths, wood grain).
   *
   * A cell is "active" only if stdDev >= 30 AND strongEdge% >= 12%.
   *
   * Grid: 10x6 = 60 cells on a 200x120 downscaled image.
   */
  computeProximityScore(video: HTMLVideoElement): number {
    const { canvas: fullCanvas } = this.cropToGuideFrame(video);
    if (fullCanvas.width === 0 || fullCanvas.height === 0) return 0;

    // Downscale for speed
    const sw = 200;
    const sh = 120;
    const smallCanvas = document.createElement('canvas');
    smallCanvas.width = sw;
    smallCanvas.height = sh;
    const sCtx = smallCanvas.getContext('2d')!;
    sCtx.drawImage(fullCanvas, 0, 0, sw, sh);

    const { data } = sCtx.getImageData(0, 0, sw, sh);

    // Pre-compute luminance array
    const lum = new Float32Array(sw * sh);
    for (let i = 0; i < sw * sh; i++) {
      const p = i * 4;
      lum[i] = data[p] * 0.299 + data[p + 1] * 0.587 + data[p + 2] * 0.114;
    }

    // Grid: 10 cols x 6 rows = 60 cells
    const cols = 10;
    const rows = 6;
    const cellW = Math.floor(sw / cols);
    const cellH = Math.floor(sh / rows);
    const stdDevThreshold = 30;   // high for document text/barcode, low for background
    const strongEdgeThreshold = 40; // strong gradient — filters soft textures
    const edgeDensityMin = 0.12;  // 12% of pixels must have strong edges

    let activeCells = 0;
    const totalCells = cols * rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x0 = c * cellW;
        const y0 = r * cellH;
        let sumL = 0;
        let sumL2 = 0;
        let n = 0;
        let strongEdges = 0;
        let edgeN = 0;

        for (let y = y0; y < y0 + cellH; y++) {
          for (let x = x0; x < x0 + cellW; x++) {
            const idx = y * sw + x;
            const l = lum[idx];
            sumL += l;
            sumL2 += l * l;
            n++;

            // Strong edge check (within bounds)
            if (x < x0 + cellW - 1 && y < y0 + cellH - 1) {
              const lr = lum[idx + 1];
              const lb = lum[idx + sw];
              const dx = Math.abs(lr - l);
              const dy = Math.abs(lb - l);
              if (dx + dy > strongEdgeThreshold) strongEdges++;
              edgeN++;
            }
          }
        }

        if (n === 0) continue;

        // Standard deviation of luminance
        const mean = sumL / n;
        const variance = sumL2 / n - mean * mean;
        const stdDev = Math.sqrt(Math.max(0, variance));

        // Cell is active only if it has BOTH high contrast AND strong edges
        const hasContrast = stdDev >= stdDevThreshold;
        const hasStrongEdges = edgeN > 0 && (strongEdges / edgeN) >= edgeDensityMin;

        if (hasContrast && hasStrongEdges) {
          activeCells++;
        }
      }
    }

    // Normalize: 70%+ active cells = 100 (document fills the frame completely)
    // Below 25% = 0 (document too far or not present)
    const coverage = activeCells / totalCells;
    const minCoverage = 0.25;
    const maxCoverage = 0.70;
    const score = Math.min(100, Math.max(0,
      Math.round(((coverage - minCoverage) / (maxCoverage - minCoverage)) * 100)
    ));
    return score;
  }

  /**
   * Starts a real-time quality monitoring loop (~5fps).
   * Reports both sharpness (0-100) and proximity (0-100) on each tick.
   * Auto-capture fires when BOTH sharpness and proximity stay above thresholds
   * for `sustainedMs`.
   */
  startSharpnessMonitor(
    video: HTMLVideoElement,
    onScore: (sharpness: number, proximity: number) => void,
    onAutoCapture: () => void,
    sharpnessThreshold = 60,
    proximityThreshold = 65,
    sustainedMs = 1500,
  ): void {
    this.stopSharpnessMonitor();
    this.sustainedAboveThreshold = 0;
    this.sharpnessLastTime = 0;

    const targetInterval = 200; // ~5fps
    let autoCaptured = false;

    const tick = (timestamp: number) => {
      if (timestamp - this.sharpnessLastTime < targetInterval) {
        this.sharpnessRAF = requestAnimationFrame(tick);
        return;
      }
      this.sharpnessLastTime = timestamp;

      const sharpness = this.computeSharpnessScore(video);
      const proximity = this.computeProximityScore(video);
      onScore(sharpness, proximity);

      const bothGood = sharpness >= sharpnessThreshold && proximity >= proximityThreshold;

      if (bothGood) {
        this.sustainedAboveThreshold += targetInterval;
        if (this.sustainedAboveThreshold >= sustainedMs && !autoCaptured) {
          autoCaptured = true;
          onAutoCapture();
          return; // stop the loop after auto-capture
        }
      } else {
        this.sustainedAboveThreshold = 0;
      }

      this.sharpnessRAF = requestAnimationFrame(tick);
    };

    this.sharpnessRAF = requestAnimationFrame(tick);
  }

  /**
   * Stops the sharpness monitoring loop.
   */
  stopSharpnessMonitor(): void {
    if (this.sharpnessRAF !== null) {
      cancelAnimationFrame(this.sharpnessRAF);
      this.sharpnessRAF = null;
    }
    this.sustainedAboveThreshold = 0;
  }

  /**
   * Toggles torch (flashlight) on the active video track.
   * Returns the new torch state, or null if not supported.
   */
  async toggleTorch(forceState?: boolean): Promise<boolean | null> {
    if (!this.stream) return null;
    const track = this.stream.getVideoTracks()[0];
    if (!track) return null;

    try {
      const capabilities = track.getCapabilities() as any;
      if (!capabilities.torch) return null;

      const current = (track.getSettings() as any).torch ?? false;
      const desired = forceState !== undefined ? forceState : !current;
      await track.applyConstraints({ advanced: [{ torch: desired } as any] });
      return desired;
    } catch {
      return null;
    }
  }

  /**
   * Envia frame(s) al backend para procesamiento
   */
  async processOnServer(
    frame1: string,
    tipoDocumento: TipoDocumentoScan,
    frame2?: string
  ): Promise<ScanResponse> {
    const body = {
      frame1,
      frame2,
      tipoDocumento,
      timestamp: new Date().toISOString(),
    };

    return firstValueFrom(
      this.http.post<ScanResponse>(`${environment.apiUrl}/scan/document`, body)
    );
  }

  /**
   * Pipeline completo: captura best frame del video y procesa en backend
   */
  async scanFromVideo(
    video: HTMLVideoElement,
    tipoDocumento: TipoDocumentoScan
  ): Promise<ScanResponse> {
    const frame1 = await this.captureBestFrame(video);
    return this.processOnServer(frame1, tipoDocumento);
  }

  /**
   * Detiene la camara y libera recursos
   */
  stopCamera(): void {
    this.stopSharpnessMonitor();
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
  }

  /**
   * Verifica si getUserMedia esta disponible
   */
  get isCameraSupported(): boolean {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }
}
