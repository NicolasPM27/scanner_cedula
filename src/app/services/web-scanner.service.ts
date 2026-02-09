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

  constructor(private http: HttpClient) {}

  /** True si estamos en PWA/web (no nativo) */
  get isWebPlatform(): boolean {
    return !Capacitor.isNativePlatform();
  }

  /**
   * Abre la camara trasera y la conecta a un elemento <video>
   */
  async openCamera(video: HTMLVideoElement): Promise<void> {
    const constraints: MediaStreamConstraints = {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 3840, min: 1280 },
        height: { ideal: 2160, min: 720 },
        frameRate: { ideal: 15, max: 24 },
      },
      audio: false,
    };

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
  captureFrame(video: HTMLVideoElement, quality = 0.95): string {
    const { canvas } = this.cropToGuideFrame(video);
    return canvas.toDataURL('image/jpeg', quality).replace(/^data:image\/\w+;base64,/, '');
  }

  /**
   * Captura N frames, calcula nitidez de cada uno y retorna el mas nitido.
   * Esto compensa variaciones de enfoque entre frames.
   */
  async captureBestFrame(video: HTMLVideoElement, numFrames = 4, quality = 0.95): Promise<string> {
    let bestBase64 = '';
    let bestSharpness = -1;

    for (let i = 0; i < numFrames; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 120));

      const { canvas, ctx } = this.cropToGuideFrame(video);
      const sharpness = this.computeSharpness(ctx, canvas.width, canvas.height);

      if (sharpness > bestSharpness) {
        bestSharpness = sharpness;
        bestBase64 = canvas.toDataURL('image/jpeg', quality).replace(/^data:image\/\w+;base64,/, '');
      }
    }

    return bestBase64;
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
   * Pipeline completo: captura frame del video y procesa en backend
   */
  async scanFromVideo(
    video: HTMLVideoElement,
    tipoDocumento: TipoDocumentoScan
  ): Promise<ScanResponse> {
    const frame1 = this.captureFrame(video);
    return this.processOnServer(frame1, tipoDocumento);
  }

  /**
   * Detiene la camara y libera recursos
   */
  stopCamera(): void {
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
