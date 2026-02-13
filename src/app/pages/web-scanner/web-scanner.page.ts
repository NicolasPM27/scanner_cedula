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
  flashlight,
  flashlightOutline,
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

    <ion-content [fullscreen]="true" class="ion-padding">
      <div class="scanner-container">

        <!-- ESTADO: IDLE - Seleccionar tipo y abrir camara -->
        @if (state() === 'idle') {
          <ion-card class="scanner-card">
            <ion-card-header>
              <div class="card-icon-container">
                <ion-icon name="videocam-outline" color="primary"></ion-icon>
              </div>
              <ion-card-title>Escanear documento</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="instruction-text">
                Seleccione el tipo de documento y presione el botón para abrir la cámara.
                Debe tener el documento físico en mano.
              </p>

              @if (tipoDocumento() === 'CC') {
                <div class="document-guide-section">
                  <span class="document-side-badge">PARTE POSTERIOR</span>

                  <!-- Two CC back variants side by side -->
                  <div class="cc-variants-row">
                    <!-- Old CC: PDF417 barcode -->
                    <div class="cc-variant">
                      <svg class="cc-back-diagram" viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1" y="1" width="158" height="98" rx="8" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1.5"/>
                        <rect x="10" y="10" width="90" height="5" rx="2" fill="#dee2e6"/>
                        <rect x="10" y="20" width="70" height="4" rx="2" fill="#e9ecef"/>
                        <rect x="8" y="50" width="144" height="40" rx="4"
                              fill="rgba(var(--ion-color-primary-rgb), 0.06)"
                              stroke="var(--ion-color-primary)"
                              stroke-width="1.5" stroke-dasharray="4 3"/>
                        <g transform="translate(20, 56)">
                          @for (i of [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19]; track i) {
                            <rect [attr.x]="i * 6" y="0" width="3" height="28" rx="0.5"
                                  fill="var(--ion-color-primary)" opacity="0.4"/>
                          }
                        </g>
                      </svg>
                      <span class="cc-variant-label">Cédula antigua</span>
                      <span class="cc-variant-detail">Código de barras</span>
                    </div>

                    <!-- New CC: MRZ + QR -->
                    <div class="cc-variant">
                      <svg class="cc-back-diagram" viewBox="0 0 160 100" xmlns="http://www.w3.org/2000/svg">
                        <rect x="1" y="1" width="158" height="98" rx="8" fill="#f8f9fa" stroke="#dee2e6" stroke-width="1.5"/>
                        <!-- MRZ lines highlighted -->
                        <rect x="8" y="8" width="90" height="84" rx="4"
                              fill="rgba(var(--ion-color-primary-rgb), 0.06)"
                              stroke="var(--ion-color-primary)"
                              stroke-width="1.5" stroke-dasharray="4 3"/>
                        <rect x="14" y="14" width="78" height="4" rx="1.5" fill="var(--ion-color-primary)" opacity="0.35"/>
                        <rect x="14" y="22" width="78" height="4" rx="1.5" fill="var(--ion-color-primary)" opacity="0.35"/>
                        <rect x="14" y="30" width="78" height="4" rx="1.5" fill="var(--ion-color-primary)" opacity="0.35"/>
                        <!-- QR code -->
                        <rect x="112" y="52" width="36" height="36" rx="3" fill="#e9ecef" stroke="#dee2e6" stroke-width="1"/>
                        <rect x="117" y="57" width="8" height="8" rx="1" fill="#bbb"/>
                        <rect x="135" y="57" width="8" height="8" rx="1" fill="#bbb"/>
                        <rect x="117" y="75" width="8" height="8" rx="1" fill="#bbb"/>
                        <rect x="128" y="68" width="4" height="4" fill="#ccc"/>
                      </svg>
                      <span class="cc-variant-label">Cédula nueva</span>
                      <span class="cc-variant-detail">Texto MRZ + QR</span>
                    </div>
                  </div>

                  <ol class="instruction-steps">
                    <li class="step-item">
                      <span class="step-number">1</span>
                      <span>Voltee la cédula (parte de atrás)</span>
                    </li>
                    <li class="step-item">
                      <span class="step-number">2</span>
                      <span>Asegúrese de que todo el texto sea visible</span>
                    </li>
                    <li class="step-item">
                      <span class="step-number">3</span>
                      <span>Acerque la cámara hasta que llene el recuadro</span>
                    </li>
                  </ol>
                </div>
              }

              <ion-list class="document-type-list" lines="none">
                <ion-item class="select-item">
                  <ion-select
                    label="Tipo de documento"
                    labelPlacement="stacked"
                    [value]="tipoDocumento()"
                    (ionChange)="tipoDocumento.set($any($event).detail.value)"
                    interface="action-sheet">
                    <ion-select-option value="CC">Cédula de Ciudadanía</ion-select-option>
                    <ion-select-option value="CE">Cédula de Extranjería</ion-select-option>
                    <ion-select-option value="PA">Pasaporte</ion-select-option>
                    <ion-select-option value="TI">Tarjeta de Identidad</ion-select-option>
                  </ion-select>
                </ion-item>
              </ion-list>

              @if (!webScanner.isCameraSupported) {
                <div class="error-banner">
                  <ion-icon name="alert-circle" color="danger"></ion-icon>
                  <span>Su navegador no soporta acceso a la cámara. Use Chrome o Safari.</span>
                </div>
              } @else {
                <ion-button
                  expand="block"
                  size="large"
                  (click)="openCamera()"
                  class="primary-action-btn">
                  <ion-icon slot="start" name="camera"></ion-icon>
                  Abrir cámara
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
              @if (tipoDocumento() === 'CC') {
                <div class="camera-top-label">
                  <span class="persistent-badge">PARTE POSTERIOR</span>
                </div>
              }
              <div class="guide-frame" [class.guide-frame-ready]="isReadyToCapture()">
                <div class="corner corner-tl" [class.corner-ready]="isReadyToCapture()"></div>
                <div class="corner corner-tr" [class.corner-ready]="isReadyToCapture()"></div>
                <div class="corner corner-bl" [class.corner-ready]="isReadyToCapture()"></div>
                <div class="corner corner-br" [class.corner-ready]="isReadyToCapture()"></div>
                @if (tipoDocumento() === 'CC') {
                  <div class="barcode-zone-indicator">
                    <svg class="barcode-icon" viewBox="0 0 24 16" xmlns="http://www.w3.org/2000/svg">
                      <rect x="2" y="1" width="20" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="1.5"/>
                      <rect x="5" y="4" width="14" height="2" rx="0.5" fill="currentColor" opacity="0.6"/>
                      <rect x="5" y="7.5" width="14" height="2" rx="0.5" fill="currentColor" opacity="0.6"/>
                      <rect x="5" y="11" width="10" height="2" rx="0.5" fill="currentColor" opacity="0.6"/>
                    </svg>
                    <span>Parte posterior dentro del recuadro</span>
                  </div>
                }
              </div>

              <!-- Quality indicator -->
              <div class="sharpness-container">
                <div class="sharpness-bar-track">
                  <div
                    class="sharpness-bar-fill"
                    [style.width.%]="proximityScore()"
                    [style.background]="qualityColor()">
                  </div>
                </div>
                <span class="sharpness-label" [style.color]="qualityColor()">
                  {{ qualityText() }}
                </span>
              </div>

              <div class="guide-text-container">
                <p class="guide-text">
                  @if (proximityScore() < 45) {
                    Acerque más el documento hasta que llene el recuadro
                  } @else if (sharpnessScore() < 60) {
                    Mantenga firme, enfocando...
                  } @else if (tipoDocumento() === 'CC') {
                    Ubique la parte posterior de la cédula dentro del recuadro
                  } @else {
                    Ubique el documento dentro del recuadro
                  }
                </p>
              </div>
            </div>

            <!-- Botones sobre la camara -->
            <div class="camera-controls">
              <ion-button fill="clear" color="light" (click)="closeCamera()" class="control-btn">
                <ion-icon slot="icon-only" name="close-circle"></ion-icon>
              </ion-button>
              <ion-button
                shape="round"
                [color]="isReadyToCapture() ? 'light' : 'medium'"
                size="large"
                (click)="captureAndProcess()"
                [disabled]="!isReadyToCapture()"
                class="capture-btn"
                [class.capture-btn-disabled]="!isReadyToCapture()">
                <ion-icon slot="icon-only" name="camera"></ion-icon>
              </ion-button>
              <ion-button fill="clear" color="light" (click)="toggleTorch()" class="control-btn">
                <ion-icon slot="icon-only" [name]="torchOn() ? 'flashlight' : 'flashlight-outline'"></ion-icon>
              </ion-button>
            </div>
          </div>
        }

        <!-- ESTADO: PROCESSING -->
        @if (state() === 'processing') {
          <div class="processing-container">
            <div class="processing-content">
              <ion-spinner name="crescent" color="primary"></ion-spinner>
              <h3 class="processing-title">Procesando documento...</h3>
              <p class="processing-text">Leyendo datos del documento. Esto puede tomar unos segundos.</p>
            </div>
          </div>
        }

        <!-- ESTADO: ERROR -->
        @if (state() === 'error') {
          <ion-card class="error-card">
            <ion-card-content>
              <div class="error-content">
                <div class="error-icon-container">
                  <ion-icon name="alert-circle" color="danger"></ion-icon>
                </div>
                <h3 class="error-title">No se pudo leer el documento</h3>
                <p class="error-message">{{ errorMsg() }}</p>
              </div>
              <div class="error-actions">
                <ion-button expand="block" size="large" (click)="retry()" class="primary-action-btn">
                  <ion-icon slot="start" name="refresh"></ion-icon>
                  Intentar de nuevo
                </ion-button>
                <ion-button expand="block" fill="outline" color="medium" (click)="backToIdle()">
                  Cambiar tipo de documento
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        }

        <!-- ESTADO: RESULT - Datos extraidos -->
        @if (state() === 'result' && cedulaData()) {
          <ion-card class="result-card animate-slide-up">
            <div class="result-header">
              <ion-icon name="checkmark-circle" color="light"></ion-icon>
              <h3>Documento leído correctamente</h3>
            </div>

            <ion-card-content>
              <!-- Numero de documento -->
              <div class="cedula-number-card">
                <span class="cedula-label">Número de Documento</span>
                <span class="cedula-value">{{ formatCedula(cedulaData()!.numeroDocumento) }}</span>
              </div>

              <!-- Datos personales -->
              <div class="data-section">
                <ion-list lines="none" class="data-list">
                  <ion-item class="data-item">
                    <ion-icon name="person" slot="start" color="primary"></ion-icon>
                    <ion-label>
                      <p class="data-label">Nombre completo</p>
                      <h3 class="data-value">{{ cedulaData()!.primerNombre }} {{ cedulaData()!.segundoNombre }}
                          {{ cedulaData()!.primerApellido }} {{ cedulaData()!.segundoApellido }}</h3>
                    </ion-label>
                  </ion-item>
                  <ion-item class="data-item">
                    <ion-icon name="calendar" slot="start" color="primary"></ion-icon>
                    <ion-label>
                      <p class="data-label">Fecha de nacimiento</p>
                      <h3 class="data-value">{{ formatDate(cedulaData()!.fechaNacimiento) }}</h3>
                    </ion-label>
                  </ion-item>
                  <ion-item class="data-item">
                    <ion-icon name="male-female" slot="start" color="primary"></ion-icon>
                    <ion-label>
                      <p class="data-label">Género</p>
                      <h3 class="data-value">{{ cedulaData()!.genero === 'M' ? 'Masculino' : cedulaData()!.genero === 'F' ? 'Femenino' : 'No especificado' }}</h3>
                    </ion-label>
                  </ion-item>
                  @if (cedulaData()!.rh !== 'DESCONOCIDO') {
                    <ion-item class="data-item">
                      <ion-icon name="water" slot="start" color="primary"></ion-icon>
                      <ion-label>
                        <p class="data-label">RH</p>
                        <h3 class="data-value">{{ cedulaData()!.rh }}</h3>
                      </ion-label>
                    </ion-item>
                  }
                </ion-list>
              </div>

              <!-- Confianza -->
              @if (authenticityScore() > 0) {
                <div class="confidence-container">
                  <div class="confidence-header">
                    <ion-icon name="analytics" color="primary"></ion-icon>
                    <span class="confidence-text">Confianza</span>
                    <strong class="confidence-value">{{ authenticityScore() }}%</strong>
                  </div>
                  <div class="confidence-track">
                    <div class="confidence-fill" [style.width.%]="authenticityScore()"></div>
                  </div>
                </div>
              }

              <div class="result-actions">
                <ion-button
                  expand="block"
                  size="large"
                  color="primary"
                  (click)="continuarActualizacion()"
                  class="primary-action-btn">
                  <ion-icon slot="start" name="checkmark-circle"></ion-icon>
                  Continuar con la actualización
                </ion-button>

                <ion-button expand="block" fill="outline" color="medium" (click)="retry()">
                  <ion-icon slot="start" name="refresh"></ion-icon>
                  Escanear de nuevo
                </ion-button>
              </div>
            </ion-card-content>
          </ion-card>
        }

      </div>
    </ion-content>
  `,
  styles: [`
    :host {
      --scanner-max-width: 600px;
      --spacing-xs: 0.5rem;
      --spacing-sm: 0.75rem;
      --spacing-md: 1rem;
      --spacing-lg: 1.5rem;
      --spacing-xl: 2rem;
      --spacing-2xl: 2.5rem;
      --border-radius-sm: 0.75rem;
      --border-radius-md: 1rem;
      --border-radius-lg: 1.5rem;
      --border-radius-xl: 2rem;
    }

    /* Container principal */
    .scanner-container {
      max-width: var(--scanner-max-width);
      margin: 0 auto;
      width: 100%;
    }

    /* Cards generales */
    .scanner-card,
    .error-card,
    .result-card {
      border-radius: var(--border-radius-xl);
      margin-bottom: var(--spacing-md);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    .scanner-card ion-card-header,
    .error-card ion-card-header,
    .result-card ion-card-header {
      padding: var(--spacing-lg);
    }

    .scanner-card ion-card-content,
    .error-card ion-card-content,
    .result-card ion-card-content {
      padding: var(--spacing-lg);
    }

    /* Card icon container */
    .card-icon-container {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 3.5rem;
      height: 3.5rem;
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: var(--border-radius-md);
      margin-bottom: var(--spacing-md);
    }

    .card-icon-container ion-icon {
      font-size: 1.75rem;
    }

    ion-card-title {
      font-size: 1.375rem;
      font-weight: 600;
      line-height: 1.3;
      color: var(--ion-text-color);
    }

    /* Instruction text */
    .instruction-text {
      color: var(--ion-color-medium);
      margin: 0 0 var(--spacing-lg);
      line-height: 1.6;
      font-size: 0.9375rem;
    }

    /* Document type selector */
    .document-type-list {
      padding: 0;
      margin-bottom: var(--spacing-lg);
    }

    .select-item {
      --background: var(--ion-color-light);
      --padding-start: var(--spacing-md);
      --padding-end: var(--spacing-md);
      --min-height: 3.5rem;
      border-radius: var(--border-radius-md);
      margin-bottom: var(--spacing-sm);
    }

    .select-item ion-select {
      width: 100%;
      font-size: 1rem;
    }

    /* Error banner */
    .error-banner {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-md);
      background: rgba(var(--ion-color-danger-rgb), 0.08);
      border: 1px solid rgba(var(--ion-color-danger-rgb), 0.2);
      border-radius: var(--border-radius-md);
      margin-top: var(--spacing-lg);
      font-size: 0.875rem;
      color: var(--ion-color-danger);
      line-height: 1.5;
    }

    .error-banner ion-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    /* Primary action button */
    .primary-action-btn {
      margin-top: var(--spacing-md);
      --border-radius: var(--border-radius-md);
      height: 3.25rem;
      font-weight: 600;
      font-size: 1rem;
      --box-shadow: 0 2px 8px rgba(var(--ion-color-primary-rgb), 0.3);
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
      border-radius: var(--border-radius-md);
      box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      transition: border-color 0.3s ease;
    }

    .guide-frame-ready {
      border-color: #00E676;
    }

    .corner {
      position: absolute;
      width: 2rem;
      height: 2rem;
      border: 4px solid #00E676;
      transition: border-color 0.3s ease, box-shadow 0.3s ease;
    }

    .corner-ready {
      box-shadow: 0 0 8px rgba(0, 230, 118, 0.6);
    }

    .corner-tl {
      top: -2px;
      left: -2px;
      border-right: none;
      border-bottom: none;
      border-top-left-radius: var(--border-radius-md);
    }

    .corner-tr {
      top: -2px;
      right: -2px;
      border-left: none;
      border-bottom: none;
      border-top-right-radius: var(--border-radius-md);
    }

    .corner-bl {
      bottom: -2px;
      left: -2px;
      border-right: none;
      border-top: none;
      border-bottom-left-radius: var(--border-radius-md);
    }

    .corner-br {
      bottom: -2px;
      right: -2px;
      border-left: none;
      border-top: none;
      border-bottom-right-radius: var(--border-radius-md);
    }

    /* Sharpness indicator */
    .sharpness-container {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      margin-top: var(--spacing-md);
      padding: 0 var(--spacing-xl);
      width: min(90vw, calc(80vh * 1.586));
    }

    .sharpness-bar-track {
      flex: 1;
      height: 6px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
      overflow: hidden;
    }

    .sharpness-bar-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.2s ease, background 0.3s ease;
    }

    .sharpness-label {
      font-size: 0.8125rem;
      font-weight: 600;
      text-shadow: 0 1px 4px rgba(0, 0, 0, 0.8);
      min-width: 5.5rem;
      text-align: right;
    }

    .guide-text-container {
      margin-top: var(--spacing-lg);
      padding: 0 var(--spacing-xl);
    }

    .guide-text {
      color: #fff;
      text-align: center;
      margin: 0;
      font-size: 1rem;
      line-height: 1.5;
      text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);
      font-weight: 500;
    }

    .camera-controls {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--spacing-lg) var(--spacing-xl);
      padding-bottom: calc(var(--spacing-lg) + env(safe-area-inset-bottom, 0px));
      background: linear-gradient(to top, rgba(0,0,0,0.7), transparent);
    }

    .control-btn {
      width: 3rem;
      height: 3rem;
      --padding-start: 0;
      --padding-end: 0;
    }

    .control-btn ion-icon {
      font-size: 2rem;
    }

    .capture-btn {
      width: 4.5rem;
      height: 4.5rem;
      --padding-start: 0;
      --padding-end: 0;
      --box-shadow: 0 4px 16px rgba(0,0,0,0.4);
    }

    .capture-btn ion-icon {
      font-size: 2rem;
    }

    .capture-btn-disabled {
      opacity: 0.4;
      --box-shadow: none;
    }

    /* Processing state */
    .processing-container {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 50vh;
      padding: var(--spacing-xl);
    }

    .processing-content {
      text-align: center;
      max-width: 20rem;
    }

    .processing-content ion-spinner {
      width: 3.5rem;
      height: 3.5rem;
      margin-bottom: var(--spacing-lg);
    }

    .processing-title {
      margin: 0 0 var(--spacing-sm);
      font-weight: 600;
      font-size: 1.25rem;
      color: var(--ion-text-color);
    }

    .processing-text {
      color: var(--ion-color-medium);
      margin: 0;
      line-height: 1.6;
      font-size: 0.9375rem;
    }

    /* Error state */
    .error-content {
      text-align: center;
      padding: var(--spacing-xl) 0;
    }

    .error-icon-container {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 4rem;
      height: 4rem;
      background: rgba(var(--ion-color-danger-rgb), 0.1);
      border-radius: 50%;
      margin-bottom: var(--spacing-lg);
    }

    .error-icon-container ion-icon {
      font-size: 2.25rem;
    }

    .error-title {
      margin: 0 0 var(--spacing-sm);
      font-weight: 600;
      font-size: 1.25rem;
      color: var(--ion-text-color);
    }

    .error-message {
      color: var(--ion-color-medium);
      margin: 0 0 var(--spacing-xl);
      line-height: 1.6;
      font-size: 0.9375rem;
    }

    .error-actions {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    /* Result state */
    .result-header {
      background: linear-gradient(135deg, var(--ion-color-success), var(--ion-color-success-shade));
      padding: var(--spacing-lg) var(--spacing-lg);
      display: flex;
      align-items: center;
      gap: var(--spacing-md);
      color: #fff;
    }

    .result-header ion-icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .result-header h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      line-height: 1.4;
    }

    .cedula-number-card {
      text-align: center;
      padding: var(--spacing-lg);
      background: var(--ion-color-light);
      border-radius: var(--border-radius-md);
      margin-bottom: var(--spacing-lg);
    }

    .cedula-label {
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ion-color-medium);
      margin-bottom: var(--spacing-xs);
      font-weight: 600;
    }

    .cedula-value {
      font-size: 1.875rem;
      font-weight: 700;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      color: var(--ion-color-primary);
      line-height: 1;
    }

    /* Data section */
    .data-section {
      margin-bottom: var(--spacing-lg);
    }

    .data-list {
      padding: 0;
      background: transparent;
    }

    .data-item {
      --background: var(--ion-color-light);
      --color: var(--ion-text-color);
      --padding-start: var(--spacing-md);
      --padding-end: var(--spacing-md);
      --min-height: 4rem;
      border-radius: var(--border-radius-md);
      margin-bottom: var(--spacing-sm);
    }

    .data-item ion-icon {
      font-size: 1.5rem;
      margin-right: var(--spacing-sm);
    }

    .data-label {
      font-size: 0.8125rem;
      color: var(--ion-color-medium) !important;
      margin: 0 0 0.25rem;
      font-weight: 500;
    }

    .data-value {
      font-size: 1rem;
      font-weight: 600;
      margin: 0;
      color: var(--ion-text-color) !important;
      line-height: 1.4;
    }

    /* Confidence bar */
    .confidence-container {
      padding: var(--spacing-md);
      background: var(--ion-color-light);
      border-radius: var(--border-radius-md);
      margin-bottom: var(--spacing-lg);
    }

    .confidence-header {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      font-size: 0.875rem;
      color: var(--ion-color-medium);
      margin-bottom: var(--spacing-sm);
      font-weight: 500;
    }

    .confidence-header ion-icon {
      font-size: 1.125rem;
    }

    .confidence-text {
      flex: 1;
    }

    .confidence-value {
      color: var(--ion-color-primary);
      font-weight: 700;
      font-size: 1rem;
    }

    .confidence-track {
      height: 0.5rem;
      background: rgba(var(--ion-color-medium-rgb), 0.15);
      border-radius: 999px;
      overflow: hidden;
    }

    .confidence-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--ion-color-primary), var(--ion-color-success));
      border-radius: 999px;
      transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
    }

    .result-actions {
      display: flex;
      flex-direction: column;
      gap: var(--spacing-sm);
    }

    /* Animations */
    .animate-slide-up {
      animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(1.5rem);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Responsive adjustments */
    @media (min-width: 768px) {
      .scanner-container {
        padding: var(--spacing-lg);
      }

      .processing-title {
        font-size: 1.5rem;
      }

      .error-title {
        font-size: 1.5rem;
      }

      .cedula-value {
        font-size: 2.25rem;
      }
    }

    /* CC back-side guide (IDLE) */
    .document-guide-section {
      margin-bottom: var(--spacing-lg);
      text-align: center;
    }

    .document-side-badge {
      display: inline-block;
      background: var(--ion-color-primary);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.3rem 1rem;
      border-radius: 999px;
      margin-bottom: var(--spacing-md);
    }

    .cc-variants-row {
      display: flex;
      gap: var(--spacing-md);
      justify-content: center;
      margin-bottom: var(--spacing-md);
    }

    .cc-variant {
      display: flex;
      flex-direction: column;
      align-items: center;
      flex: 1;
      max-width: 160px;
    }

    .cc-variant-label {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--ion-color-dark);
      margin-top: var(--spacing-xs);
    }

    .cc-variant-detail {
      font-size: 0.75rem;
      color: var(--ion-color-medium);
    }

    .cc-back-diagram {
      display: block;
      width: 100%;
    }

    .instruction-steps {
      list-style: none;
      padding: 0;
      margin: 0;
      text-align: left;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: var(--spacing-sm);
      padding: var(--spacing-xs) 0;
      font-size: 0.9375rem;
      color: var(--ion-text-color);
      line-height: 1.5;
    }

    .step-number {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 1.75rem;
      height: 1.75rem;
      min-width: 1.75rem;
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      color: var(--ion-color-primary);
      border-radius: 50%;
      font-size: 0.8125rem;
      font-weight: 700;
    }

    /* Camera overlay: CC badge + barcode indicator */
    .camera-top-label {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      padding: calc(var(--spacing-md) + env(safe-area-inset-top, 0px)) var(--spacing-md) var(--spacing-md);
      pointer-events: none;
      z-index: 1;
    }

    .persistent-badge {
      display: inline-block;
      background: rgba(var(--ion-color-primary-rgb), 0.85);
      color: #fff;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      padding: 0.35rem 1rem;
      border-radius: 999px;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }

    .barcode-zone-indicator {
      position: absolute;
      bottom: 8%;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      align-items: center;
      gap: 0.4rem;
      padding: 0.3rem 0.75rem;
      background: rgba(0, 0, 0, 0.5);
      border-radius: 999px;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }

    .barcode-icon {
      width: 1.5rem;
      height: 1rem;
      color: rgba(255, 255, 255, 0.85);
      flex-shrink: 0;
    }

    .barcode-zone-indicator span {
      font-size: 0.6875rem;
      color: rgba(255, 255, 255, 0.9);
      white-space: nowrap;
      font-weight: 500;
    }

    /* Dark mode support */
    @media (prefers-color-scheme: dark) {
      .scanner-card,
      .error-card,
      .result-card {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
    }
  `],
})
export class WebScannerPage implements OnDestroy {
  private videoRef = viewChild<ElementRef<HTMLVideoElement>>('videoEl');
  private orientationCleanup: (() => void) | null = null;
  private autoCapturing = false;

  state = signal<PageState>('idle');
  tipoDocumento = signal<TipoDocumentoScan>('CC');
  cedulaData = signal<CedulaData | null>(null);
  authenticityScore = signal(0);
  errorMsg = signal('');
  sharpnessScore = signal(0);
  proximityScore = signal(0);
  torchOn = signal(false);

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
      flashlight,
      flashlightOutline,
    });
  }

  /** True when both proximity and sharpness are good enough to capture */
  isReadyToCapture(): boolean {
    return this.proximityScore() >= 45 && this.sharpnessScore() >= 50;
  }

  /** Color based on the weakest metric (proximity first, then sharpness) */
  qualityColor(): string {
    const p = this.proximityScore();
    const s = this.sharpnessScore();
    if (p < 25) return '#FF5252';         // red - too far
    if (p < 45) return '#FFD740';         // yellow - getting closer
    if (s < 30) return '#FFD740';         // yellow - close but blurry
    if (s < 50) return '#B2FF59';         // light green - almost there
    return '#00E676';                     // green - ready
  }

  /** Descriptive label: prioritizes proximity feedback */
  qualityText(): string {
    const p = this.proximityScore();
    const s = this.sharpnessScore();
    if (p < 25) return 'Muy lejos';
    if (p < 45) return 'Acérquese';
    if (s < 30) return 'Borroso';
    if (s < 50) return 'Enfocando...';
    return 'Listo';
  }

  ngOnDestroy(): void {
    this.webScanner.stopCamera();
    this.stopOrientationListener();
  }

  async openCamera(): Promise<void> {
    this.state.set('camera');
    this.sharpnessScore.set(0);
    this.proximityScore.set(0);
    this.torchOn.set(false);
    this.autoCapturing = false;
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
      this.startSharpnessMonitor(videoEl);
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

  private startSharpnessMonitor(videoEl: HTMLVideoElement): void {
    this.webScanner.startSharpnessMonitor(
      videoEl,
      (sharpness, proximity) => {
        this.sharpnessScore.set(sharpness);
        this.proximityScore.set(proximity);
      },
      () => {
        if (!this.autoCapturing && this.state() === 'camera') {
          this.autoCapturing = true;
          this.captureAndProcess();
        }
      },
    );
  }

  closeCamera(): void {
    this.webScanner.stopCamera();
    this.stopOrientationListener();
    this.state.set('idle');
  }

  async toggleTorch(): Promise<void> {
    const result = await this.webScanner.toggleTorch();
    if (result !== null) {
      this.torchOn.set(result);
    }
  }

  async captureAndProcess(): Promise<void> {
    const videoEl = this.videoRef()?.nativeElement;
    if (!videoEl) return;

    // Capture top 2 frames by sharpness BEFORE stopping camera
    const frames = await this.webScanner.captureBestFrames(videoEl, 5, 2);
    const frame1 = frames[0];
    const frame2 = frames.length > 1 ? frames[1] : undefined;

    this.webScanner.stopCamera();
    this.stopOrientationListener();
    this.state.set('processing');

    try {
      const response = await this.webScanner.processOnServer(frame1, this.tipoDocumento(), frame2);

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
        this.startSharpnessMonitor(videoEl);
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
