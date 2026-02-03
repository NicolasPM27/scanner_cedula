import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonButton,
  IonIcon,
  IonChip,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  camera,
  sync,
  closeCircle,
  checkmarkCircle,
  shieldCheckmark,
  warning,
  alertCircle,
  settingsOutline,
  idCard,
  fingerPrint,
  person,
  informationCircle,
  calendar,
  maleFemale,
  water,
  time,
  location,
  businessOutline,
  mapOutline,
  codeWorking,
  analytics,
  refresh,
  helpCircle,
  documentOutline,
  cardOutline,
  sunnyOutline,
  handLeftOutline,
  barcodeOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { ScannerService } from '../services/scanner.service';
import { CedulaData, ScanErrorCode } from '../models/cedula.model';

/**
 * Componente de ejemplo para escanear cédulas colombianas
 * Demuestra el uso correcto del ScannerService
 *
 * Características:
 * - Escaneo automático (detecta PDF417 o MRZ)
 * - Escaneo específico por tipo
 * - Manejo completo de errores
 * - Visualización de todos los campos extraídos
 */
@Component({
  selector: 'app-scan-cedula',
  standalone: true,
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
    IonChip,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/home"></ion-back-button>
        </ion-buttons>
        <ion-title>Escáner de Cédula</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="scanner-content">
      <ion-header collapse="condense">
        <ion-toolbar>
          <ion-title size="large">Escáner de Cédula</ion-title>
        </ion-toolbar>
      </ion-header>

      <div class="scanner-container">
        <!-- Estado del dispositivo -->
        @if (deviceInfo()) {
          <div class="device-status">
            <ion-chip [color]="deviceInfo()?.isSupported ? 'success' : 'medium'">
              <ion-icon [name]="deviceInfo()?.isSupported ? 'checkmark-circle' : 'close-circle'"></ion-icon>
              <ion-label>{{ deviceInfo()?.isSupported ? 'Compatible' : 'No compatible' }}</ion-label>
            </ion-chip>
            <ion-chip [color]="deviceInfo()?.hasPermissions ? 'success' : 'warning'">
              <ion-icon [name]="deviceInfo()?.hasPermissions ? 'shield-checkmark' : 'warning'"></ion-icon>
              <ion-label>{{ deviceInfo()?.hasPermissions ? 'Permisos OK' : 'Sin permisos' }}</ion-label>
            </ion-chip>
          </div>
        }

        <!-- Botones de acción -->
        <div class="action-section">
          <ion-button
            expand="block"
            size="large"
            class="scan-button-primary"
            (click)="scanCedula()"
            [disabled]="isScanning()">
            <ion-icon slot="start" [name]="isScanning() ? 'sync' : 'camera'"></ion-icon>
            {{ isScanning() ? 'Escaneando...' : 'Escanear Cédula' }}
          </ion-button>

          <div class="button-row">
            <ion-button
              expand="block"
              fill="outline"
              (click)="scanPDF417Only()"
              [disabled]="isScanning()">
              <ion-icon slot="start" name="barcode-outline"></ion-icon>
              PDF417
            </ion-button>

            <ion-button
              expand="block"
              fill="outline"
              (click)="scanMRZOnly()"
              [disabled]="isScanning()">
              <ion-icon slot="start" name="document-text-outline"></ion-icon>
              MRZ
            </ion-button>
          </div>

          @if (isScanning()) {
            <ion-button expand="block" fill="clear" color="danger" (click)="cancelScan()">
              <ion-icon slot="start" name="close-circle"></ion-icon>
              Cancelar escaneo
            </ion-button>
          }
        </div>

        <!-- Mensaje de error -->
        @if (errorMessage()) {
          <ion-card class="error-card">
            <ion-card-content>
              <div class="error-content">
                <ion-icon name="alert-circle" color="danger"></ion-icon>
                <div class="error-text">
                  <strong>Error</strong>
                  <p>{{ errorMessage() }}</p>
                </div>
              </div>
              @if (showSettingsButton()) {
                <ion-button fill="clear" size="small" (click)="openSettings()">
                  <ion-icon slot="start" name="settings-outline"></ion-icon>
                  Abrir Configuración
                </ion-button>
              }
            </ion-card-content>
          </ion-card>
        }

        <!-- Datos escaneados -->
        @if (cedulaData()) {
          <ion-card class="cedula-card animate-slide-up">
            <div class="card-header-custom">
              <div class="header-info">
                <ion-icon name="id-card"></ion-icon>
                <h3>Datos de la Cédula</h3>
              </div>
              <ion-chip [color]="cedulaData()?.tipoDocumento === 'ANTIGUA' ? 'warning' : 'primary'" class="tipo-chip">
                <ion-label>{{ cedulaData()?.tipoDocumento === 'ANTIGUA' ? 'Antigua' : 'Nueva' }}</ion-label>
              </ion-chip>
            </div>

            <ion-card-content>
              <!-- Número de cédula destacado -->
              <div class="cedula-number">
                <span class="label">Número de Cédula</span>
                <span class="number">{{ formatCedula(cedulaData()?.numeroDocumento) }}</span>
              </div>

              @if (cedulaData()?.nuip) {
                <div class="nuip-badge">
                  <ion-icon name="finger-print"></ion-icon>
                  <span>NUIP: {{ cedulaData()?.nuip }}</span>
                </div>
              }

              <!-- Información personal -->
              <div class="info-section">
                <h4>
                  <ion-icon name="person"></ion-icon>
                  Datos Personales
                </h4>
                
                <ion-list lines="none" class="data-list">
                  <ion-item>
                    <ion-label>
                      <p>Primer Apellido</p>
                      <h3>{{ cedulaData()?.primerApellido }}</h3>
                    </ion-label>
                  </ion-item>
                  <ion-item>
                    <ion-label>
                      <p>Segundo Apellido</p>
                      <h3>{{ cedulaData()?.segundoApellido || '—' }}</h3>
                    </ion-label>
                  </ion-item>
                  <ion-item>
                    <ion-label>
                      <p>Primer Nombre</p>
                      <h3>{{ cedulaData()?.primerNombre }}</h3>
                    </ion-label>
                  </ion-item>
                  <ion-item>
                    <ion-label>
                      <p>Segundo Nombre</p>
                      <h3>{{ cedulaData()?.segundoNombre || '—' }}</h3>
                    </ion-label>
                  </ion-item>
                </ion-list>

                @if (cedulaData()?.nombresTruncados) {
                  <div class="warning-chip">
                    <ion-icon name="warning"></ion-icon>
                    <span>Nombres posiblemente truncados en MRZ</span>
                  </div>
                }
              </div>

              <!-- Información adicional -->
              <div class="info-section">
                <h4>
                  <ion-icon name="information-circle"></ion-icon>
                  Información Adicional
                </h4>

                <div class="info-grid">
                  <div class="info-item">
                    <ion-icon name="calendar"></ion-icon>
                    <span class="info-label">Nacimiento</span>
                    <span class="info-value">{{ formatDate(cedulaData()?.fechaNacimiento) }}</span>
                  </div>

                  <div class="info-item">
                    <ion-icon name="male-female"></ion-icon>
                    <span class="info-label">Género</span>
                    <span class="info-value">{{ formatGenero(cedulaData()?.genero) }}</span>
                  </div>

                  <div class="info-item rh-item">
                    <ion-icon name="water"></ion-icon>
                    <span class="info-label">RH</span>
                    <span class="info-value rh-value">{{ cedulaData()?.rh || 'N/A' }}</span>
                  </div>

                  @if (cedulaData()?.fechaExpiracion) {
                    <div class="info-item">
                      <ion-icon name="time"></ion-icon>
                      <span class="info-label">Vencimiento</span>
                      <span class="info-value">{{ formatDate(cedulaData()?.fechaExpiracion) }}</span>
                    </div>
                  }
                </div>
              </div>

              <!-- Ubicación -->
              @if (cedulaData()?.ubicacion?.municipio) {
                <div class="info-section">
                  <h4>
                    <ion-icon name="location"></ion-icon>
                    Lugar de Expedición
                  </h4>

                  <ion-list lines="none" class="data-list">
                    <ion-item>
                      <ion-icon name="business-outline" slot="start" color="medium"></ion-icon>
                      <ion-label>
                        <p>Municipio</p>
                        <h3>{{ cedulaData()?.ubicacion?.municipio }}</h3>
                      </ion-label>
                    </ion-item>
                    <ion-item>
                      <ion-icon name="map-outline" slot="start" color="medium"></ion-icon>
                      <ion-label>
                        <p>Departamento</p>
                        <h3>{{ cedulaData()?.ubicacion?.departamento }}</h3>
                      </ion-label>
                    </ion-item>
                  </ion-list>
                </div>
              }

              <!-- Datos técnicos -->
              @if (cedulaData()?.documentoInfo?.codigoAfis) {
                <div class="info-section technical">
                  <h4>
                    <ion-icon name="code-working"></ion-icon>
                    Datos Técnicos
                  </h4>
                  
                  <div class="tech-data">
                    <div class="tech-item">
                      <span class="tech-label">AFIS</span>
                      <code>{{ cedulaData()?.documentoInfo?.codigoAfis }}</code>
                    </div>
                    @if (cedulaData()?.documentoInfo?.tarjetaDactilar) {
                      <div class="tech-item">
                        <span class="tech-label">Tarjeta Dactilar</span>
                        <code>{{ cedulaData()?.documentoInfo?.tarjetaDactilar }}</code>
                      </div>
                    }
                  </div>
                </div>
              }

              <!-- Barra de confianza -->
              @if (cedulaData()?.confianza !== undefined) {
                <div class="confidence-section">
                  <div class="confidence-header">
                    <ion-icon name="analytics"></ion-icon>
                    <span>Confianza del escaneo</span>
                    <strong>{{ cedulaData()?.confianza }}%</strong>
                  </div>
                  <div class="confidence-bar">
                    <div class="confidence-fill" [style.width.%]="cedulaData()?.confianza"></div>
                  </div>
                </div>
              }

              <ion-button expand="block" fill="outline" color="medium" (click)="clearData()">
                <ion-icon slot="start" name="refresh"></ion-icon>
                Limpiar y escanear de nuevo
              </ion-button>
            </ion-card-content>
          </ion-card>
        }

        <!-- Instrucciones -->
        @if (!cedulaData() && !isScanning()) {
          <ion-card class="instructions-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="help-circle"></ion-icon>
                Instrucciones
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none" class="instructions-list">
                <ion-item>
                  <ion-icon name="document-outline" slot="start" color="warning"></ion-icon>
                  <ion-label class="ion-text-wrap">
                    <strong>Cédula Antigua (amarilla)</strong>
                    <p>Enfoque el código de barras en la parte posterior</p>
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-icon name="card-outline" slot="start" color="primary"></ion-icon>
                  <ion-label class="ion-text-wrap">
                    <strong>Cédula Nueva (holográfica)</strong>
                    <p>Enfoque las 3 líneas de texto en la parte posterior (zona MRZ)</p>
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-icon name="sunny-outline" slot="start" color="tertiary"></ion-icon>
                  <ion-label class="ion-text-wrap">
                    <p>Asegúrese de tener buena iluminación</p>
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-icon name="hand-left-outline" slot="start" color="medium"></ion-icon>
                  <ion-label class="ion-text-wrap">
                    <p>Mantenga el documento estable mientras escanea</p>
                  </ion-label>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>
        }
      </div>
    </ion-content>
  `,
  styles: [`
    /* ============================================
       SCANNER COMPONENT - Material Design 3 Styles
       ============================================ */

    .scanner-content {
      --background: var(--ion-background-color);
    }

    .scanner-container {
      padding: var(--space-md, 16px);
      max-width: 600px;
      margin: 0 auto;
    }

    /* Device Status */
    .device-status {
      display: flex;
      justify-content: center;
      gap: var(--space-xs, 8px);
      margin-bottom: var(--space-lg, 24px);
      flex-wrap: wrap;
    }

    /* Action Section */
    .action-section {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm, 12px);
      margin-bottom: var(--space-lg, 24px);
    }

    .scan-button-primary {
      --background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-tertiary) 100%);
      --box-shadow: 0 4px 16px rgba(var(--ion-color-primary-rgb), 0.3);
      --border-radius: var(--radius-md, 12px);
      height: 56px;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .scan-button-primary:hover {
      --box-shadow: 0 6px 20px rgba(var(--ion-color-primary-rgb), 0.4);
    }

    .scan-button-primary ion-icon {
      font-size: 1.4rem;
    }

    .button-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--space-sm, 12px);
    }

    .button-row ion-button {
      --border-radius: var(--radius-md, 12px);
      height: 48px;
      font-size: 0.9rem;
    }

    /* Error Card */
    .error-card {
      --background: rgba(var(--ion-color-danger-rgb), 0.08);
      border-left: 4px solid var(--ion-color-danger);
      margin-bottom: var(--space-lg, 24px);
    }

    .error-content {
      display: flex;
      gap: var(--space-md, 16px);
      align-items: flex-start;
    }

    .error-content ion-icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .error-text strong {
      color: var(--ion-color-danger);
      font-size: 1rem;
    }

    .error-text p {
      margin: var(--space-xs, 8px) 0 0;
      color: var(--ion-color-danger-shade);
    }

    /* Cedula Card */
    .cedula-card {
      border-radius: var(--radius-xl, 24px);
      overflow: hidden;
      margin-bottom: var(--space-lg, 24px);
    }

    .card-header-custom {
      background: linear-gradient(135deg, var(--ion-color-primary) 0%, var(--ion-color-tertiary) 100%);
      padding: var(--space-lg, 24px);
      display: flex;
      justify-content: space-between;
      align-items: center;
      color: white;
    }

    .header-info {
      display: flex;
      align-items: center;
      gap: var(--space-sm, 12px);
    }

    .header-info ion-icon {
      font-size: 1.75rem;
    }

    .header-info h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 600;
      font-family: var(--ion-heading-font-family);
    }

    .tipo-chip {
      --padding-start: var(--space-sm, 12px);
      --padding-end: var(--space-sm, 12px);
    }

    /* Cedula Number Highlight */
    .cedula-number {
      text-align: center;
      padding: var(--space-lg, 24px);
      background: var(--surface-container, #f1f5f9);
      border-radius: var(--radius-lg, 16px);
      margin-bottom: var(--space-md, 16px);
    }

    .cedula-number .label {
      display: block;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--ion-color-medium);
      margin-bottom: var(--space-xs, 8px);
    }

    .cedula-number .number {
      font-size: 1.75rem;
      font-weight: 700;
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      color: var(--ion-color-primary);
      letter-spacing: 0.02em;
    }

    .nuip-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--space-xs, 8px);
      padding: var(--space-sm, 12px);
      background: rgba(var(--ion-color-tertiary-rgb), 0.1);
      border-radius: var(--radius-md, 12px);
      margin-bottom: var(--space-md, 16px);
      font-size: 0.875rem;
      color: var(--ion-color-tertiary);
      font-weight: 500;
    }

    /* Info Sections */
    .info-section {
      margin-bottom: var(--space-lg, 24px);
      padding-bottom: var(--space-md, 16px);
      border-bottom: 1px solid var(--ion-border-color, #e2e8f0);
    }

    .info-section:last-of-type {
      border-bottom: none;
      margin-bottom: var(--space-md, 16px);
    }

    .info-section h4 {
      display: flex;
      align-items: center;
      gap: var(--space-xs, 8px);
      margin: 0 0 var(--space-md, 16px);
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--ion-color-primary);
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }

    .info-section h4 ion-icon {
      font-size: 1.1rem;
    }

    .info-section.technical {
      background: var(--surface-container, #f1f5f9);
      margin: 0 calc(-1 * var(--space-md, 16px));
      padding: var(--space-md, 16px);
      border-radius: 0;
      border-bottom: none;
    }

    /* Data List */
    .data-list {
      padding: 0;
      background: transparent;
    }

    .data-list ion-item {
      --background: var(--surface-container-low, #f8fafc);
      --padding-start: var(--space-md, 16px);
      --padding-end: var(--space-md, 16px);
      --inner-padding-end: 0;
      --min-height: 56px;
      border-radius: var(--radius-md, 12px);
      margin-bottom: var(--space-xs, 8px);
    }

    .data-list ion-item:last-child {
      margin-bottom: 0;
    }

    .data-list ion-label p {
      font-size: 0.75rem;
      color: var(--ion-color-medium);
      margin-bottom: 2px;
    }

    .data-list ion-label h3 {
      font-size: 1rem;
      font-weight: 600;
      color: var(--ion-text-color);
      margin: 0;
    }

    /* Info Grid */
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: var(--space-sm, 12px);
    }

    .info-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: var(--space-md, 16px);
      background: var(--surface-container-low, #f8fafc);
      border-radius: var(--radius-md, 12px);
      text-align: center;
    }

    .info-item ion-icon {
      font-size: 1.5rem;
      color: var(--ion-color-primary);
      margin-bottom: var(--space-xs, 8px);
    }

    .info-item .info-label {
      font-size: 0.7rem;
      text-transform: uppercase;
      letter-spacing: 0.03em;
      color: var(--ion-color-medium);
      margin-bottom: 4px;
    }

    .info-item .info-value {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--ion-text-color);
    }

    .info-item.rh-item .info-value.rh-value {
      background: rgba(var(--ion-color-secondary-rgb), 0.15);
      color: var(--ion-color-secondary);
      padding: 4px 12px;
      border-radius: var(--radius-sm, 8px);
      font-weight: 700;
    }

    /* Warning Chip */
    .warning-chip {
      display: flex;
      align-items: center;
      gap: var(--space-xs, 8px);
      padding: var(--space-sm, 12px);
      background: rgba(var(--ion-color-warning-rgb), 0.12);
      border-radius: var(--radius-md, 12px);
      margin-top: var(--space-sm, 12px);
      font-size: 0.8125rem;
      color: var(--ion-color-warning-shade);
    }

    .warning-chip ion-icon {
      font-size: 1.1rem;
      color: var(--ion-color-warning);
    }

    /* Technical Data */
    .tech-data {
      display: flex;
      flex-direction: column;
      gap: var(--space-sm, 12px);
    }

    .tech-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: var(--space-sm, 12px);
      background: var(--surface-container-high, #e2e8f0);
      border-radius: var(--radius-sm, 8px);
    }

    .tech-label {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--ion-color-medium);
      text-transform: uppercase;
    }

    .tech-item code {
      font-family: 'SF Mono', Monaco, 'Courier New', monospace;
      font-size: 0.75rem;
      color: var(--ion-text-color);
      background: var(--surface-container-highest, #cbd5e1);
      padding: 4px 8px;
      border-radius: var(--radius-xs, 4px);
    }

    /* Confidence Section */
    .confidence-section {
      padding: var(--space-md, 16px);
      background: var(--surface-container, #f1f5f9);
      border-radius: var(--radius-md, 12px);
      margin-bottom: var(--space-md, 16px);
    }

    .confidence-header {
      display: flex;
      align-items: center;
      gap: var(--space-xs, 8px);
      margin-bottom: var(--space-sm, 12px);
      font-size: 0.875rem;
      color: var(--ion-color-medium);
    }

    .confidence-header ion-icon {
      color: var(--ion-color-primary);
    }

    .confidence-header strong {
      margin-left: auto;
      color: var(--ion-color-primary);
      font-size: 1rem;
    }

    .confidence-bar {
      height: 8px;
      background: var(--surface-container-high, #e2e8f0);
      border-radius: var(--radius-full, 9999px);
      overflow: hidden;
    }

    .confidence-fill {
      height: 100%;
      background: linear-gradient(90deg, var(--ion-color-primary), var(--ion-color-tertiary));
      border-radius: var(--radius-full, 9999px);
      transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    }

    /* Instructions Card */
    .instructions-card {
      border-radius: var(--radius-xl, 24px);
      background: rgba(var(--ion-color-primary-rgb), 0.05);
    }

    .instructions-card ion-card-header {
      padding-bottom: var(--space-xs, 8px);
    }

    .instructions-card ion-card-title {
      display: flex;
      align-items: center;
      gap: var(--space-xs, 8px);
      font-size: 1.125rem;
      color: var(--ion-color-primary);
    }

    .instructions-card ion-card-title ion-icon {
      font-size: 1.25rem;
    }

    .instructions-list {
      padding: 0;
      background: transparent;
    }

    .instructions-list ion-item {
      --background: transparent;
      --padding-start: 0;
      --inner-padding-end: 0;
      --min-height: 48px;
    }

    .instructions-list ion-item ion-icon {
      font-size: 1.25rem;
      margin-right: var(--space-sm, 12px);
    }

    .instructions-list ion-label strong {
      font-size: 0.9375rem;
      color: var(--ion-text-color);
    }

    .instructions-list ion-label p {
      font-size: 0.8125rem;
      color: var(--ion-color-medium);
      margin-top: 2px;
    }

    /* Animation */
    .animate-slide-up {
      animation: slideUp 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class ScanCedulaComponent implements OnInit {
  // Estado del componente usando signals (Angular 17+)
  isScanning = signal(false);
  errorMessage = signal<string | null>(null);
  showSettingsButton = signal(false);
  cedulaData = signal<CedulaData | null>(null);
  deviceInfo = signal<{
    isNative: boolean;
    isSupported: boolean;
    hasTorch: boolean;
    hasPermissions: boolean;
  } | null>(null);

  constructor(
    private scannerService: ScannerService,
    private route: ActivatedRoute
  ) {
    addIcons({
      camera,
      sync,
      closeCircle,
      checkmarkCircle,
      shieldCheckmark,
      warning,
      alertCircle,
      settingsOutline,
      idCard,
      fingerPrint,
      person,
      informationCircle,
      calendar,
      maleFemale,
      water,
      time,
      location,
      businessOutline,
      mapOutline,
      codeWorking,
      analytics,
      refresh,
      helpCircle,
      documentOutline,
      cardOutline,
      sunnyOutline,
      handLeftOutline,
      barcodeOutline,
      documentTextOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    // Obtener información del dispositivo al iniciar
    try {
      console.log('🔍 Inicializando componente de scanner...');
      const info = await this.scannerService.getCapabilities();
      console.log('✅ Capacidades obtenidas:', info);
      this.deviceInfo.set(info);
      await this.handleRouteAction();
    } catch (error) {
      console.error('❌ Error obteniendo información del dispositivo:', error);
    }
  }

  private async handleRouteAction(): Promise<void> {
    const mode = this.route.snapshot.queryParamMap.get('mode');
    if (!mode || this.isScanning()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));

    if (mode === 'auto') {
      await this.scanCedula();
      return;
    }

    if (mode === 'pdf417') {
      await this.scanPDF417Only();
      return;
    }

    if (mode === 'mrz') {
      await this.scanMRZOnly();
      return;
    }

    if (mode === 'test') {
      await this.testNativeScan();
    }
  }

  /**
   * Escanea cualquier tipo de cédula (detección automática)
   */
  async scanCedula(): Promise<void> {
    await this.performScan(() => this.scannerService.scanCedula());
  }

  /**
   * Escanea solo cédulas antiguas (PDF417)
   */
  async scanPDF417Only(): Promise<void> {
    await this.performScan(() => this.scannerService.scanPDF417());
  }

  /**
   * Escanea solo cédulas nuevas (MRZ)
   */
  async scanMRZOnly(): Promise<void> {
    await this.performScan(() => this.scannerService.scanMRZ());
  }

  /**
   * Prueba el escáner nativo de Google para verificar que ML Kit funciona
   */
  async testNativeScan(): Promise<void> {
    this.isScanning.set(true);
    this.errorMessage.set(null);
    
    try {
      const result = await this.scannerService.testNativeScan();
      if (result) {
        alert(`✅ Escáner funciona!\n\nFormato: ${result.format}\nValor: ${result.value.substring(0, 100)}...`);
      } else {
        alert('No se detectó ningún código');
      }
    } catch (error: any) {
      const message = error?.message || JSON.stringify(error);
      alert(`❌ Error: ${message}`);
      console.error('Error en test nativo:', error);
    } finally {
      this.isScanning.set(false);
    }
  }

  /**
   * Cancela el escaneo actual
   */
  async cancelScan(): Promise<void> {
    await this.scannerService.stopScan();
    this.isScanning.set(false);
  }

  /**
   * Lógica común de escaneo con manejo de errores
   */
  private async performScan(scanFn: () => Promise<CedulaData>): Promise<void> {
    this.isScanning.set(true);
    this.errorMessage.set(null);
    this.showSettingsButton.set(false);
    this.cedulaData.set(null);

    try {
      const data = await scanFn();
      this.cedulaData.set(data);
    } catch (error: any) {
      this.handleScanError(error);
    } finally {
      this.isScanning.set(false);
    }
  }

  /**
   * Maneja errores del escáner
   */
  private handleScanError(error: any): void {
    const code = error.code as ScanErrorCode;
    const message = error.message || 'Error desconocido';

    this.errorMessage.set(message);

    // Mostrar botón de configuración si es problema de permisos
    if (code === ScanErrorCode.PERMISSION_DENIED) {
      this.showSettingsButton.set(true);
    }

    console.error('Error de escaneo:', { code, message });
  }

  /**
   * Abre la configuración del dispositivo
   */
  async openSettings(): Promise<void> {
    await this.scannerService.openSettings();
  }

  /**
   * Limpia los datos escaneados
   */
  clearData(): void {
    this.cedulaData.set(null);
    this.errorMessage.set(null);
  }

  /**
   * Formatea el número de cédula con puntos de miles
   */
  formatCedula(numero: string | undefined): string {
    if (!numero) return '';
    return numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /**
   * Formatea fecha ISO a formato legible
   */
  formatDate(fecha: string | undefined): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return fecha;
    }
  }

  /**
   * Formatea el género
   */
  formatGenero(genero: string | undefined): string {
    if (genero === 'M') return 'Masculino';
    if (genero === 'F') return 'Femenino';
    return 'No especificado';
  }
}
