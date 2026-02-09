import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonSpinner,
  IonToast,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  homeOutline,
  documentTextOutline,
  downloadOutline,
  shareOutline,
  sparkles,
  personCircleOutline,
  mailOutline,
  callOutline,
  locationOutline,
  briefcaseOutline,
  peopleOutline,
  notificationsOutline,
  checkmarkDoneOutline,
} from 'ionicons/icons';
import { FlujoActualizacionService } from '../../services/flujo-actualizacion.service';
import { ComprobantePdfService } from '../../services/comprobante-pdf.service';
import { NotificacionService } from '../../services/notificacion.service';
import { DatosAfiliado } from '../../models/afiliado.model';

@Component({
  selector: 'app-confirmation',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonChip,
    IonSpinner,
    IonToast,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-title>Confirmación</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="confirmation-content">
      <div class="confirmation-container">
        
        <!-- Success Animation -->
        <div class="success-section animate-pop">
          <div class="success-icon">
            <ion-icon name="checkmark-circle"></ion-icon>
          </div>
          <div class="sparkles">
            <ion-icon name="sparkles" class="sparkle s1"></ion-icon>
            <ion-icon name="sparkles" class="sparkle s2"></ion-icon>
            <ion-icon name="sparkles" class="sparkle s3"></ion-icon>
          </div>
        </div>

        <h1 class="headline-large text-center animate-fade-in">¡Actualización Exitosa!</h1>
        <p class="body-large text-muted text-center animate-fade-in">
          Sus datos han sido actualizados correctamente en nuestro sistema.
        </p>

        <!-- Notification Status Banner -->
        @if (notificacionEnviada()) {
          <div class="notification-banner animate-slide-up">
            <ion-icon name="checkmark-done-outline"></ion-icon>
            <span>Notificación enviada a {{ destinatariosNotificacion().join(', ') }}</span>
          </div>
        }
        @if (notificacionError()) {
          <div class="notification-banner notification-warn animate-slide-up">
            <ion-icon name="notifications-outline"></ion-icon>
            <span>No se pudo enviar la notificación por correo. Su actualización fue registrada correctamente.</span>
          </div>
        }

        <!-- Summary Card -->
        <ion-card class="summary-card animate-slide-up">
          <ion-card-header>
            <ion-card-title>
              <ion-icon name="document-text-outline"></ion-icon>
              Resumen de Actualización
            </ion-card-title>
          </ion-card-header>
          <ion-card-content>
            
            @if (afiliado()) {
              <!-- Datos personales -->
              <div class="summary-section">
                <div class="section-header">
                  <ion-icon name="person-circle-outline"></ion-icon>
                  <h3>Datos Personales</h3>
                </div>
                <ion-list lines="none" class="summary-list">
                  <ion-item>
                    <ion-label>
                      <p>Nombre completo</p>
                      <h4>
                        {{ afiliado()?.primerNombre }} {{ afiliado()?.segundoNombre }}
                        {{ afiliado()?.primerApellido }} {{ afiliado()?.segundoApellido }}
                      </h4>
                    </ion-label>
                    <ion-icon name="checkmark-circle" color="success" slot="end"></ion-icon>
                  </ion-item>
                  <ion-item>
                    <ion-label>
                      <p>Número de cédula</p>
                      <h4>{{ formatCedula(afiliado()?.numeroDocumento) }}</h4>
                    </ion-label>
                    <ion-icon name="checkmark-circle" color="success" slot="end"></ion-icon>
                  </ion-item>
                </ion-list>
              </div>

              <!-- Contacto -->
              @if (afiliado()?.contacto) {
                <div class="summary-section">
                  <div class="section-header">
                    <ion-icon name="call-outline"></ion-icon>
                    <h3>Información de Contacto</h3>
                  </div>
                  <ion-list lines="none" class="summary-list">
                    <ion-item>
                      <ion-icon name="mail-outline" slot="start" color="primary"></ion-icon>
                      <ion-label>
                        <p>Correo electrónico</p>
                        <h4>{{ afiliado()?.contacto?.correoElectronico }}</h4>
                      </ion-label>
                      <ion-icon name="checkmark-circle" color="success" slot="end"></ion-icon>
                    </ion-item>
                    <ion-item>
                      <ion-icon name="call-outline" slot="start" color="primary"></ion-icon>
                      <ion-label>
                        <p>Teléfono celular</p>
                        <h4>{{ afiliado()?.contacto?.celular }}</h4>
                      </ion-label>
                      <ion-icon name="checkmark-circle" color="success" slot="end"></ion-icon>
                    </ion-item>
                  </ion-list>
                </div>
              }

              <!-- Ubicación -->
              @if (afiliado()?.sociodemografica) {
                <div class="summary-section">
                  <div class="section-header">
                    <ion-icon name="location-outline"></ion-icon>
                    <h3>Ubicación</h3>
                  </div>
                  <ion-list lines="none" class="summary-list">
                    <ion-item>
                      <ion-label>
                        <p>Dirección</p>
                        <h4>{{ afiliado()?.sociodemografica?.direccion }}</h4>
                      </ion-label>
                      <ion-icon name="checkmark-circle" color="success" slot="end"></ion-icon>
                    </ion-item>
                  </ion-list>
                </div>
              }

              <!-- Beneficiarios -->
              @if (beneficiariosActualizados() > 0) {
                <div class="summary-section">
                  <div class="section-header">
                    <ion-icon name="people-outline"></ion-icon>
                    <h3>Beneficiarios</h3>
                  </div>
                  <ion-chip color="success">
                    <ion-icon name="checkmark-circle"></ion-icon>
                    <ion-label>{{ beneficiariosActualizados() }} beneficiario(s) actualizado(s)</ion-label>
                  </ion-chip>
                </div>
              }
            }

            <!-- Timestamp -->
            <div class="timestamp">
              <p>Fecha de actualización: <strong>{{ fechaActual }}</strong></p>
              <p>Folio: <strong>{{ folioGenerado }}</strong></p>
            </div>

          </ion-card-content>
        </ion-card>

        <!-- Actions -->
        <div class="actions-section">
          <ion-button expand="block" (click)="irAlInicio()">
            <ion-icon slot="start" name="home-outline"></ion-icon>
            Volver al Inicio
          </ion-button>
          
          <ion-button
            expand="block"
            fill="outline"
            (click)="descargarComprobante()"
            [disabled]="generandoPdf()"
          >
            @if (generandoPdf()) {
              <ion-spinner name="crescent" slot="start"></ion-spinner>
              Generando...
            } @else {
              <ion-icon slot="start" name="download-outline"></ion-icon>
              Descargar Comprobante
            }
          </ion-button>
          
          <ion-button expand="block" fill="clear" (click)="compartir()">
            <ion-icon slot="start" name="share-outline"></ion-icon>
            Compartir
          </ion-button>
        </div>

      </div>

    </ion-content>

    <!-- Toast de éxito PDF -->
    <ion-toast
      [isOpen]="showToastPdf()"
      message="Comprobante PDF descargado correctamente"
      duration="3000"
      position="bottom"
      color="success"
      (didDismiss)="showToastPdf.set(false)"
    ></ion-toast>

    <!-- Toast de error PDF -->
    <ion-toast
      [isOpen]="showToastPdfError()"
      message="Error al generar el comprobante. Intente nuevamente."
      duration="4000"
      position="bottom"
      color="danger"
      (didDismiss)="showToastPdfError.set(false)"
    ></ion-toast>
  `,
  styles: [`
    .confirmation-content {
      --background: var(--ion-background-color);
    }

    .confirmation-container {
      padding: var(--space-lg, 24px);
      max-width: 600px;
      margin: 0 auto;
    }

    /* Success Animation */
    .success-section {
      position: relative;
      display: flex;
      justify-content: center;
      margin-bottom: var(--space-lg, 24px);
      padding-top: var(--space-xl, 32px);
    }

    .success-icon {
      width: 120px;
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(var(--ion-color-success-rgb), 0.15);
      border-radius: 50%;
      position: relative;
      z-index: 1;
    }

    .success-icon ion-icon {
      font-size: 72px;
      color: var(--ion-color-success);
    }

    .sparkles {
      position: absolute;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      width: 200px;
      height: 200px;
    }

    .sparkle {
      position: absolute;
      font-size: 24px;
      color: var(--ion-color-warning);
      animation: sparkle 2s ease-in-out infinite;
    }

    .sparkle.s1 {
      top: 0;
      left: 20%;
      animation-delay: 0s;
    }

    .sparkle.s2 {
      top: 20%;
      right: 10%;
      animation-delay: 0.5s;
    }

    .sparkle.s3 {
      bottom: 30%;
      left: 5%;
      animation-delay: 1s;
    }

    @keyframes sparkle {
      0%, 100% {
        opacity: 0;
        transform: scale(0.5);
      }
      50% {
        opacity: 1;
        transform: scale(1);
      }
    }

    h1 {
      margin: 0 0 var(--space-sm, 12px);
      color: var(--ion-color-success);
    }

    .confirmation-container > p {
      margin: 0 0 var(--space-md, 16px);
    }

    /* Notification Banner */
    .notification-banner {
      display: flex;
      align-items: center;
      gap: var(--space-sm, 12px);
      padding: var(--space-sm, 12px) var(--space-md, 16px);
      background: rgba(var(--ion-color-success-rgb), 0.1);
      border: 1px solid rgba(var(--ion-color-success-rgb), 0.25);
      border-radius: var(--radius-md, 12px);
      margin-bottom: var(--space-lg, 24px);
      font-size: 0.8125rem;
      color: var(--ion-color-success-shade, #059669);
      line-height: 1.4;
    }

    .notification-banner ion-icon {
      font-size: 1.25rem;
      flex-shrink: 0;
    }

    .notification-banner.notification-warn {
      background: rgba(var(--ion-color-warning-rgb), 0.1);
      border-color: rgba(var(--ion-color-warning-rgb), 0.25);
      color: var(--ion-color-warning-shade, #B45309);
    }

    .text-center {
      text-align: center;
    }

    /* Summary Card */
    .summary-card {
      border-radius: var(--radius-xl, 24px);
      margin-bottom: var(--space-lg, 24px);
    }

    .summary-card ion-card-title {
      display: flex;
      align-items: center;
      gap: var(--space-sm, 12px);
      font-size: 1rem;
      font-weight: 600;
    }

    .summary-card ion-card-title ion-icon {
      font-size: 1.25rem;
      color: var(--ion-color-primary);
    }

    .summary-section {
      margin-bottom: var(--space-lg, 24px);
    }

    .summary-section:last-of-type {
      margin-bottom: var(--space-md, 16px);
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: var(--space-sm, 12px);
      margin-bottom: var(--space-sm, 12px);
    }

    .section-header ion-icon {
      font-size: 1.25rem;
      color: var(--ion-color-primary);
    }

    .section-header h3 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--ion-color-primary);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .summary-list {
      background: transparent;
    }

    .summary-list ion-item {
      --background: var(--surface-container, #f1f5f9);
      --border-radius: var(--radius-md, 12px);
      margin-bottom: var(--space-xs, 8px);
      --padding-start: var(--space-md, 16px);
      --padding-end: var(--space-md, 16px);
    }

    .summary-list ion-item:last-child {
      margin-bottom: 0;
    }

    .summary-list ion-label p {
      font-size: 0.75rem;
      color: var(--ion-color-medium);
      margin-bottom: var(--space-xs, 4px);
    }

    .summary-list ion-label h4 {
      margin: 0;
      font-size: 0.9375rem;
      font-weight: 500;
    }

    .summary-list ion-icon[slot="start"] {
      margin-right: var(--space-sm, 12px);
    }

    .summary-list ion-icon[slot="end"] {
      font-size: 1.25rem;
    }

    .timestamp {
      padding-top: var(--space-md, 16px);
      border-top: 1px solid var(--ion-border-color, #e2e8f0);
      text-align: center;
    }

    .timestamp p {
      margin: 0;
      font-size: 0.8125rem;
      color: var(--ion-color-medium);
      line-height: 1.6;
    }

    .timestamp strong {
      color: var(--ion-text-color);
    }

    /* Actions */
    .actions-section {
      padding-bottom: var(--space-xl, 32px);
    }

    .actions-section ion-button {
      margin-bottom: var(--space-sm, 12px);
      --border-radius: var(--radius-md, 12px);
    }

    .actions-section ion-button:last-child {
      margin-bottom: 0;
    }

    /* Animations */
    .animate-pop {
      animation: pop 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    }

    .animate-fade-in {
      animation: fadeIn 0.6s ease-out;
      animation-delay: 0.3s;
      animation-fill-mode: both;
    }

    .animate-slide-up {
      animation: slideUp 0.6s ease-out;
      animation-delay: 0.5s;
      animation-fill-mode: both;
    }

    @keyframes pop {
      0% {
        opacity: 0;
        transform: scale(0.5);
      }
      100% {
        opacity: 1;
        transform: scale(1);
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(24px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
  `]
})
export class ConfirmationPage implements OnInit {
  afiliado = signal<DatosAfiliado | undefined>(undefined);
  fechaActual = '';
  folioGenerado = '';

  // Estado UI
  generandoPdf = signal(false);
  showToastPdf = signal(false);
  showToastPdfError = signal(false);
  notificacionEnviada = signal(false);
  notificacionError = signal(false);
  destinatariosNotificacion = signal<string[]>([]);

  // Correo anterior (capturado desde verificación) para notificar cambio
  private correoAnterior?: string;

  // Servicios inyectados
  private readonly pdfService = inject(ComprobantePdfService);
  private readonly notificacionService = inject(NotificacionService);

  constructor(
    private flujoService: FlujoActualizacionService,
    private router: Router
  ) {
    addIcons({
      checkmarkCircle,
      homeOutline,
      documentTextOutline,
      downloadOutline,
      shareOutline,
      sparkles,
      personCircleOutline,
      mailOutline,
      callOutline,
      locationOutline,
      briefcaseOutline,
      peopleOutline,
      notificationsOutline,
      checkmarkDoneOutline,
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
    this.generarMetadatos();
    this.enviarNotificacionEmail();
  }

  private cargarDatos(): void {
    const afiliadoData = this.flujoService.afiliado();
    this.afiliado.set(afiliadoData);

    // Capturar correo anterior si se conoce (del estado de verificación)
    // En una implementación completa, este valor vendría del flujo al iniciar
    // la actualización (correo que ya estaba registrado en la BD).
    this.correoAnterior = afiliadoData?.contacto?.correoElectronico;
  }

  private generarMetadatos(): void {
    // Fecha actual formateada
    this.fechaActual = new Date().toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // Generar folio aleatorio
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.folioGenerado = `ACT-${timestamp}-${random}`;
  }

  /**
   * Envía notificación por correo electrónico de manera asíncrona.
   * No bloquea la UI; el resultado se muestra como un banner informativo.
   */
  private async enviarNotificacionEmail(): Promise<void> {
    const afiliadoData = this.afiliado();
    if (!afiliadoData?.contacto?.correoElectronico) return;

    try {
      const resp = await this.notificacionService.notificarActualizacion(
        afiliadoData,
        this.correoAnterior,
        this.folioGenerado,
        this.fechaActual
      );
      if (resp.success) {
        this.notificacionEnviada.set(true);
        this.destinatariosNotificacion.set(resp.destinatarios);
      } else {
        this.notificacionError.set(true);
      }
    } catch {
      // No mostrar error crítico — la actualización ya fue exitosa
      this.notificacionError.set(true);
    }
  }

  beneficiariosActualizados(): number {
    return this.afiliado()?.beneficiarios?.filter(b => b.actualizado).length || 0;
  }

  formatCedula(numero: string | undefined): string {
    if (!numero) return '';
    return numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  async irAlInicio(): Promise<void> {
    this.flujoService.reiniciarFlujo();
  }

  /**
   * Genera y descarga el comprobante PDF usando jsPDF
   */
  async descargarComprobante(): Promise<void> {
    const afiliadoData = this.afiliado();
    if (!afiliadoData) return;

    this.generandoPdf.set(true);

    try {
      await this.pdfService.generarComprobante(
        afiliadoData,
        this.folioGenerado,
        this.fechaActual
      );
      this.showToastPdf.set(true);
    } catch (error) {
      console.error('Error al generar PDF:', error);
      this.showToastPdfError.set(true);
    } finally {
      this.generandoPdf.set(false);
    }
  }

  /**
   * Comparte el resultado usando Web Share API (con fallback)
   */
  async compartir(): Promise<void> {
    const text = `Actualización de datos FOMAG realizada exitosamente.\nFolio: ${this.folioGenerado}\nFecha: ${this.fechaActual}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Comprobante FOMAG',
          text,
        });
      } catch {
        // Usuario canceló el diálogo de compartir
      }
    } else {
      // Fallback: copiar al portapapeles
      try {
        await navigator.clipboard.writeText(text);
        this.showToastPdf.set(true); // Reutilizar toast de éxito
      } catch {
        console.warn('No se pudo copiar al portapapeles');
      }
    }
  }
}
