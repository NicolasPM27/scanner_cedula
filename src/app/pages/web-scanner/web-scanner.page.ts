import {
  Component,
  signal,
  viewChild,
  ElementRef,
  OnDestroy,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonLabel,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonList,
  IonItem,
  IonSpinner,
  IonSelect,
  IonSelectOption,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  camera,
  closeCircle,
  checkmarkCircle,
  alertCircle,
  refresh,
  idCard,
  person,
  calendar,
  maleFemale,
  water,
  analytics,
  videocamOutline,
  stopCircleOutline,
} from 'ionicons/icons';
import {
  WebScannerService,
  TipoDocumentoScan,
  ScanResponse,
} from '../../services/web-scanner.service';
import { FlujoActualizacionService } from '../../services/flujo-actualizacion.service';
import { CedulaData } from '../../models/cedula.model';

type PageState = 'idle' | 'camera' | 'processing' | 'result' | 'error';

@Component({
  selector: 'app-web-scanner',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonButton,
    IonIcon,
    IonLabel,
    IonCard,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonList,
    IonItem,
    IonSpinner,
    IonSelect,
    IonSelectOption,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Escanear Documento</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true">
      <div class="scanner-container">

        <!-- ESTADO: IDLE - Seleccionar tipo y abrir camara -->
        @if (state() === 'idle') {
          <ion-card>
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="videocam-outline"></ion-icon>
                Escanear documento
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="instruction-text">
                Seleccione el tipo de documento y presione el boton para abrir la camara.
                Debe tener el documento fisico en mano.
              </p>

              <ion-list>
                <ion-item>
                  <ion-select
                    label="Tipo de documento"
                    [value]="tipoDocumento()"
                    (ionChange)="tipoDocumento.set($any($event).detail.value)">
                    <ion-select-option value="CC">Cedula de Ciudadania</ion-select-option>
                    <ion-select-option value="CE">Cedula de Extranjeria</ion-select-option>
                    <ion-select-option value="PA">Pasaporte</ion-select-option>
                    <ion-select-option value="TI">Tarjeta de Identidad</ion-select-option>
                  </ion-select>
                </ion-item>
              </ion-list>

              @if (!webScanner.isCameraSupported) {
                <div class="error-banner">
                  <ion-icon name="alert-circle" color="danger"></ion-icon>
                  <span>Su navegador no soporta acceso a la camara. Use Chrome o Safari.</span>
                </div>
              } @else {
                <ion-button
                  expand="block"
                  (click)="openCamera()"
                  class="open-camera-btn">
                  <ion-icon slot="start" name="camera"></ion-icon>
                  Abrir camara
                </ion-button>
              }
            </ion-card-content>
          </ion-card>
        }

        <!-- ESTADO: CAMERA - Vista de camara en vivo -->
        @if (state() === 'camera') {
          <div class="camera-wrapper">
            <video
              #videoEl
              autoplay
              playsinline
              muted
              class="camera-feed">
            </video>

            <!-- Guia visual -->
            <div class="camera-overlay">
              <div class="guide-frame">
                <div class="corner tl"></div>
                <div class="corner tr"></div>
                <div class="corner bl"></div>
                <div class="corner br"></div>
              </div>
              <p class="guide-text">
                @if (tipoDocumento() === 'CC') {
                  Ubique la parte posterior de la cedula dentro del recuadro
                } @else {
                  Ubique el documento dentro del recuadro
                }
              </p>
            </div>

            <!-- Botones sobre la camara -->
            <div class="camera-controls">
              <ion-button fill="clear" color="light" (click)="closeCamera()">
                <ion-icon slot="icon-only" name="close-circle"></ion-icon>
              </ion-button>
              <ion-button
                shape="round"
                color="light"
                size="large"
                (click)="captureAndProcess()"
                class="capture-btn">
                <ion-icon slot="icon-only" name="camera"></ion-icon>
              </ion-button>
              <div style="width:48px"></div>
            </div>
          </div>
        }

        <!-- ESTADO: PROCESSING -->
        @if (state() === 'processing') {
          <div class="processing-container">
            <ion-spinner name="crescent" color="primary"></ion-spinner>
            <h3>Procesando documento...</h3>
            <p>Leyendo datos del documento. Esto puede tomar unos segundos.</p>
          </div>
        }

        <!-- ESTADO: ERROR -->
        @if (state() === 'error') {
          <ion-card class="error-card">
            <ion-card-content>
              <div class="error-content">
                <ion-icon name="alert-circle" color="danger" size="large"></ion-icon>
                <h3>No se pudo leer el documento</h3>
                <p>{{ errorMsg() }}</p>
              </div>
              <ion-button expand="block" (click)="retry()">
                <ion-icon slot="start" name="refresh"></ion-icon>
                Intentar de nuevo
              </ion-button>
              <ion-button expand="block" fill="outline" color="medium" (click)="backToIdle()">
                Cambiar tipo de documento
              </ion-button>
            </ion-card-content>
          </ion-card>
        }

        <!-- ESTADO: RESULT - Datos extraidos -->
        @if (state() === 'result' && cedulaData()) {
          <ion-card class="result-card animate-slide-up">
            <div class="result-header">
              <ion-icon name="checkmark-circle"></ion-icon>
              <h3>Documento leido correctamente</h3>
            </div>

            <ion-card-content>
              <!-- Numero de documento -->
              <div class="cedula-number">
                <span class="label">Numero de Documento</span>
                <span class="number">{{ formatCedula(cedulaData()!.numeroDocumento) }}</span>
              </div>

              <!-- Datos personales -->
              <ion-list lines="none" class="data-list">
                <ion-item>
                  <ion-icon name="person" slot="start" color="primary"></ion-icon>
                  <ion-label>
                    <p>Nombre completo</p>
                    <h3>{{ cedulaData()!.primerNombre }} {{ cedulaData()!.segundoNombre }}
                        {{ cedulaData()!.primerApellido }} {{ cedulaData()!.segundoApellido }}</h3>
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-icon name="calendar" slot="start" color="primary"></ion-icon>
                  <ion-label>
                    <p>Fecha de nacimiento</p>
                    <h3>{{ formatDate(cedulaData()!.fechaNacimiento) }}</h3>
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-icon name="male-female" slot="start" color="primary"></ion-icon>
                  <ion-label>
                    <p>Genero</p>
                    <h3>{{ cedulaData()!.genero === 'M' ? 'Masculino' : cedulaData()!.genero === 'F' ? 'Femenino' : 'No especificado' }}</h3>
                  </ion-label>
                </ion-item>
                @if (cedulaData()!.rh !== 'DESCONOCIDO') {
                  <ion-item>
                    <ion-icon name="water" slot="start" color="primary"></ion-icon>
                    <ion-label>
                      <p>RH</p>
                      <h3>{{ cedulaData()!.rh }}</h3>
                    </ion-label>
                  </ion-item>
                }
              </ion-list>

              <!-- Confianza -->
              @if (authenticityScore() > 0) {
                <div class="confidence-bar-container">
                  <div class="confidence-label">
                    <ion-icon name="analytics"></ion-icon>
                    <span>Confianza</span>
                    <strong>{{ authenticityScore() }}%</strong>
                  </div>
                  <div class="confidence-track">
                    <div class="confidence-fill" [style.width.%]="authenticityScore()"></div>
                  </div>
                </div>
              }

              <ion-button
                expand="block"
                color="primary"
                (click)="continuarActualizacion()">
                <ion-icon slot="start" name="checkmark-circle"></ion-icon>
                Continuar con la actualizacion
              </ion-button>

              <ion-button expand="block" fill="outline" color="medium" (click)="retry()">
                <ion-icon slot="start" name="refresh"></ion-icon>
                Escanear de nuevo
              </ion-button>
            </ion-card-content>
          </ion-card>
        }

      </div>
    </ion-content>
  `,
  styles: [`
    .scanner-container {
      padding: 16px;
      max-width: 600px;
      margin: 0 auto;
    }

    .instruction-text {
      color: var(--ion-color-medium);
      margin-bottom: 16px;
      line-height: 1.5;
    }

    .open-camera-btn {
      margin-top: 16px;
      --border-radius: 16px;
      height: 52px;
      font-weight: 600;
    }

    .error-banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: rgba(var(--ion-color-danger-rgb), 0.08);
      border-radius: 12px;
      margin-top: 16px;
      font-size: 0.875rem;
      color: var(--ion-color-danger);
    }

    /* Camera */
    .camera-wrapper {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: #000;
    }

    .camera-feed {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .camera-overlay {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      pointer-events: none;
    }

    .guide-frame {
      position: relative;
      width: min(90vw, calc(80vh * 1.586));
      aspect-ratio: 1.586;
      border: 2px solid rgba(255, 255, 255, 0.4);
      border-radius: 12px;
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.45);
    }

    .corner {
      position: absolute;
      width: 30px;
      height: 30px;
      border: 4px solid #00E676;
    }
    .corner.tl { top: -2px; left: -2px; border-right: none; border-bottom: none; border-top-left-radius: 12px; }
    .corner.tr { top: -2px; right: -2px; border-left: none; border-bottom: none; border-top-right-radius: 12px; }
    .corner.bl { bottom: -2px; left: -2px; border-right: none; border-top: none; border-bottom-left-radius: 12px; }
    .corner.br { bottom: -2px; right: -2px; border-left: none; border-top: none; border-bottom-right-radius: 12px; }

    .guide-text {
      color: #fff;
      text-align: center;
      margin-top: 20px;
      padding: 0 32px;
      font-size: 0.9375rem;
      text-shadow: 0 2px 6px rgba(0, 0, 0, 0.8);
    }

    .camera-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 32px;
      padding-bottom: calc(24px + env(safe-area-inset-bottom, 0px));
      background: linear-gradient(transparent, rgba(0,0,0,0.6));
    }

    .capture-btn {
      --padding-start: 20px;
      --padding-end: 20px;
      width: 72px;
      height: 72px;
      --border-radius: 50%;
      --box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }

    /* Processing */
    .processing-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 80px 32px;
      text-align: center;
    }

    .processing-container ion-spinner {
      width: 56px;
      height: 56px;
      margin-bottom: 24px;
    }

    .processing-container h3 {
      margin: 0 0 8px;
      font-weight: 600;
    }

    .processing-container p {
      color: var(--ion-color-medium);
      max-width: 300px;
    }

    /* Error */
    .error-card {
      border-radius: 24px;
    }

    .error-content {
      text-align: center;
      padding: 24px 0;
    }

    .error-content ion-icon {
      font-size: 3rem;
      margin-bottom: 16px;
    }

    .error-content h3 {
      margin: 0 0 8px;
      font-weight: 600;
    }

    .error-content p {
      color: var(--ion-color-medium);
      margin-bottom: 24px;
      line-height: 1.5;
    }

    /* Result */
    .result-card {
      border-radius: 24px;
      overflow: hidden;
    }

    .result-header {
      background: linear-gradient(135deg, var(--ion-color-success), var(--ion-color-success-shade));
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      color: #fff;
    }

    .result-header ion-icon {
      font-size: 2rem;
    }

    .result-header h3 {
      margin: 0;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .cedula-number {
      text-align: center;
      padding: 20px;
      background: var(--ion-color-light);
      border-radius: 16px;
      margin-bottom: 16px;
    }

    .cedula-number .label {
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ion-color-medium);
      margin-bottom: 6px;
    }

    .cedula-number .number {
      font-size: 1.75rem;
      font-weight: 700;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      color: var(--ion-color-primary);
    }

    .data-list {
      padding: 0;
      background: transparent;
      margin-bottom: 16px;
    }

    .data-list ion-item {
      --background: var(--ion-color-light);
      --padding-start: 16px;
      --min-height: 56px;
      border-radius: 12px;
      margin-bottom: 8px;
    }

    .data-list ion-label p {
      font-size: 0.75rem;
      color: var(--ion-color-medium);
    }

    .data-list ion-label h3 {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
    }

    .confidence-bar-container {
      padding: 16px;
      background: var(--ion-color-light);
      border-radius: 12px;
      margin-bottom: 16px;
    }

    .confidence-label {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.875rem;
      color: var(--ion-color-medium);
      margin-bottom: 10px;
    }

    .confidence-label strong {
      margin-left: auto;
      color: var(--ion-color-primary);
    }

    .confidence-track {
      height: 8px;
      background: var(--ion-color-medium-tint);
      border-radius: 999px;
      overflow: hidden;
    }

    .confidence-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--ion-color-primary), var(--ion-color-success));
      border-radius: 999px;
      transition: width 0.4s ease;
    }

    .animate-slide-up {
      animation: slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes slideUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `],
})
export class WebScannerPage implements OnDestroy {
  private videoRef = viewChild<ElementRef<HTMLVideoElement>>('videoEl');
  private orientationCleanup: (() => void) | null = null;

  state = signal<PageState>('idle');
  tipoDocumento = signal<TipoDocumentoScan>('CC');
  cedulaData = signal<CedulaData | null>(null);
  authenticityScore = signal(0);
  errorMsg = signal('');

  constructor(
    public webScanner: WebScannerService,
    private flujoActualizacion: FlujoActualizacionService,
    private router: Router
  ) {
    addIcons({
      camera,
      closeCircle,
      checkmarkCircle,
      alertCircle,
      refresh,
      idCard,
      person,
      calendar,
      maleFemale,
      water,
      analytics,
      videocamOutline,
      stopCircleOutline,
    });
  }

  ngOnDestroy(): void {
    this.webScanner.stopCamera();
    this.stopOrientationListener();
  }

  async openCamera(): Promise<void> {
    this.state.set('camera');
    // Esperar al siguiente ciclo para que el <video> exista en el DOM
    await new Promise(r => setTimeout(r, 50));

    const videoEl = this.videoRef()?.nativeElement;
    if (!videoEl) {
      this.errorMsg.set('No se pudo inicializar el video.');
      this.state.set('error');
      return;
    }

    try {
      await this.webScanner.openCamera(videoEl);
      this.listenOrientationChanges(videoEl);
    } catch (err: any) {
      const msg = err?.name === 'NotAllowedError'
        ? 'Permiso de camara denegado. Habilite el acceso a la camara en la configuracion del navegador.'
        : err?.name === 'NotFoundError'
          ? 'No se encontro una camara en este dispositivo.'
          : `Error al acceder a la camara: ${err?.message || err}`;
      this.errorMsg.set(msg);
      this.state.set('error');
    }
  }

  closeCamera(): void {
    this.webScanner.stopCamera();
    this.stopOrientationListener();
    this.state.set('idle');
  }

  async captureAndProcess(): Promise<void> {
    const videoEl = this.videoRef()?.nativeElement;
    if (!videoEl) return;

    // Capture best frame (multi-frame + sharpness) BEFORE stopping camera
    const frame1 = await this.webScanner.captureBestFrame(videoEl);

    this.webScanner.stopCamera();
    this.stopOrientationListener();
    this.state.set('processing');

    try {
      const response = await this.webScanner.processOnServer(frame1, this.tipoDocumento());

      if (response.success && response.data) {
        this.cedulaData.set(response.data);
        this.authenticityScore.set(response.authenticityScore);
        this.state.set('result');
      } else {
        this.errorMsg.set(response.error || 'No se pudo leer el documento. Intente con mejor iluminacion.');
        this.state.set('error');
      }
    } catch (err: any) {
      const serverMsg = err?.error?.error;
      this.errorMsg.set(
        serverMsg || 'Error de conexion con el servidor. Verifique su conexion a internet.'
      );
      this.state.set('error');
    }
  }

  retry(): void {
    this.cedulaData.set(null);
    this.authenticityScore.set(0);
    this.errorMsg.set('');
    this.openCamera();
  }

  backToIdle(): void {
    this.webScanner.stopCamera();
    this.stopOrientationListener();
    this.cedulaData.set(null);
    this.state.set('idle');
  }

  private listenOrientationChanges(videoEl: HTMLVideoElement): void {
    const handler = async () => {
      if (this.state() !== 'camera') return;
      // Wait for layout to settle after orientation change
      await new Promise(r => setTimeout(r, 300));
      try {
        this.webScanner.stopCamera();
        await this.webScanner.openCamera(videoEl);
      } catch (err) {
        console.warn('[scanner] Error restarting camera on orientation change:', err);
      }
    };
    const mql = window.matchMedia('(orientation: landscape)');
    mql.addEventListener('change', handler);
    this.orientationCleanup = () => mql.removeEventListener('change', handler);
  }

  private stopOrientationListener(): void {
    this.orientationCleanup?.();
    this.orientationCleanup = null;
  }

  async continuarActualizacion(): Promise<void> {
    const data = this.cedulaData();
    if (!data) return;
    await this.flujoActualizacion.iniciarFlujo(data);
  }

  formatCedula(n: string): string {
    return n ? n.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : '';
  }

  formatDate(fecha: string): string {
    if (!fecha) return 'N/A';
    try {
      return new Date(fecha + 'T12:00:00').toLocaleDateString('es-CO', {
        year: 'numeric', month: 'long', day: 'numeric',
      });
    } catch {
      return fecha;
    }
  }
}
