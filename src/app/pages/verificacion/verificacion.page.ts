import { Component, OnInit, signal } from '@angular/core';
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
  IonSpinner,
  IonProgressBar,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  checkmarkCircle,
  closeCircle,
  personCircle,
  documentText,
  cloudDownload,
  shieldCheckmark,
  alertCircle,
  refresh,
  arrowForward,
  arrowBack,
  createOutline,
  peopleOutline,
  callOutline,
} from 'ionicons/icons';
import { FlujoActualizacionService } from '../../services/flujo-actualizacion.service';
import { DatosAfiliado, Beneficiario } from '../../models/afiliado.model';

type EstadoVerificacion = 'verificando' | 'encontrado' | 'no_encontrado' | 'error';

@Component({
  selector: 'app-verificacion',
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
    IonSpinner,
    IonProgressBar,
    IonLabel,
    IonChip,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-title>Verificación</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="verificacion-content">
      <div class="verificacion-container">
        
        <!-- Estado: Verificando -->
        @if (estadoVerificacion() === 'verificando') {
          <div class="loading-section animate-fade-in">
            <div class="loading-icon">
              <ion-spinner name="crescent" color="primary"></ion-spinner>
            </div>
            <h2 class="headline-medium">Verificando datos</h2>
            <p class="body-large text-muted">Estamos consultando su información en nuestra base de datos...</p>
            
            <div class="progress-steps">
              <div class="step" [class.active]="pasoVerificacion() >= 1" [class.completed]="pasoVerificacion() > 1">
                <ion-icon [name]="pasoVerificacion() > 1 ? 'checkmark-circle' : 'document-text'"></ion-icon>
                <span>Validando documento</span>
              </div>
              <div class="step" [class.active]="pasoVerificacion() >= 2" [class.completed]="pasoVerificacion() > 2">
                <ion-icon [name]="pasoVerificacion() > 2 ? 'checkmark-circle' : 'cloud-download'"></ion-icon>
                <span>Consultando base de datos</span>
              </div>
              <div class="step" [class.active]="pasoVerificacion() >= 3" [class.completed]="pasoVerificacion() > 3">
                <ion-icon [name]="pasoVerificacion() > 3 ? 'checkmark-circle' : 'shield-checkmark'"></ion-icon>
                <span>Verificando afiliación</span>
              </div>
            </div>

            <ion-progress-bar [value]="progreso()" color="primary"></ion-progress-bar>
          </div>
        }

        <!-- Estado: Usuario encontrado (existente) -->
        @if (estadoVerificacion() === 'encontrado') {
          <div class="result-section animate-slide-up">
            <div class="result-icon success">
              <ion-icon name="person-circle"></ion-icon>
            </div>
            <h2 class="headline-medium">¡Bienvenido de nuevo!</h2>
            <p class="body-large text-muted">Hemos encontrado un registro previo asociado a su cédula.</p>

            <!-- Información del afiliado -->
            <ion-card class="afiliado-card">
              <ion-card-header>
                <ion-card-title>
                  {{ afiliado()?.primerNombre }} {{ afiliado()?.segundoNombre }}
                  {{ afiliado()?.primerApellido }} {{ afiliado()?.segundoApellido }}
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="info-row">
                  <span class="label">Cédula:</span>
                  <span class="value">{{ formatCedula(afiliado()?.numeroDocumento) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Última actualización:</span>
                  <span class="value">{{ afiliado()?.fechaUltimaActualizacion }}</span>
                </div>
                @if (afiliado()?.contacto?.correoElectronico) {
                  <div class="info-row">
                    <span class="label">Correo registrado:</span>
                    <span class="value">{{ afiliado()?.contacto?.correoElectronico }}</span>
                  </div>
                }
                @if (beneficiarios().length > 0) {
                  <div class="beneficiarios-badge">
                    <ion-chip color="secondary">
                      <ion-icon name="people-outline"></ion-icon>
                      <ion-label>{{ beneficiarios().length }} beneficiario(s) registrado(s)</ion-label>
                    </ion-chip>
                  </div>
                }
              </ion-card-content>
            </ion-card>

            <!-- Opciones -->
            <div class="options-section">
              <p class="body-medium">¿Qué desea hacer?</p>
              
              <ion-button expand="block" (click)="corregirInformacion()">
                <ion-icon slot="start" name="create-outline"></ion-icon>
                Corregir mi información
              </ion-button>

              @if (beneficiarios().length > 0) {
                <ion-button expand="block" fill="outline" (click)="actualizarBeneficiario()">
                  <ion-icon slot="start" name="people-outline"></ion-icon>
                  Actualizar beneficiario
                </ion-button>
              }
            </div>
          </div>
        }

        <!-- Estado: Usuario no encontrado -->
        @if (estadoVerificacion() === 'no_encontrado') {
          <div class="result-section animate-slide-up">
            <div class="result-icon error">
              <ion-icon name="alert-circle"></ion-icon>
            </div>
            <h2 class="headline-medium">No registrado</h2>
            <p class="body-large text-muted">No se encuentra registrado en el maestro de afiliados de FOMAG.</p>

            <!-- Datos escaneados -->
            <ion-card class="afiliado-card">
              <ion-card-header>
                <ion-card-title>Datos escaneados</ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <div class="info-row">
                  <span class="label">Nombre:</span>
                  <span class="value">
                    {{ afiliado()?.primerNombre }} {{ afiliado()?.segundoNombre }}
                    {{ afiliado()?.primerApellido }} {{ afiliado()?.segundoApellido }}
                  </span>
                </div>
                <div class="info-row">
                  <span class="label">Cédula:</span>
                  <span class="value">{{ formatCedula(afiliado()?.numeroDocumento) }}</span>
                </div>
                <div class="info-row">
                  <span class="label">Fecha de nacimiento:</span>
                  <span class="value">{{ formatDate(afiliado()?.fechaNacimiento) }}</span>
                </div>
              </ion-card-content>
            </ion-card>

            <div class="options-section">
              <p class="body-medium">Si cree que esto es un error, por favor contacte a soporte.</p>
              
              <ion-button expand="block" (click)="volverAlInicio()">
                <ion-icon slot="start" name="arrow-back"></ion-icon>
                Volver al inicio
              </ion-button>

              <ion-button expand="block" fill="outline" (click)="contactarSoporte()">
                <ion-icon slot="start" name="call-outline"></ion-icon>
                Contactar soporte
              </ion-button>
            </div>
          </div>
        }

        <!-- Estado: Error -->
        @if (estadoVerificacion() === 'error') {
          <div class="result-section animate-slide-up">
            <div class="result-icon error">
              <ion-icon name="alert-circle"></ion-icon>
            </div>
            <h2 class="headline-medium">Error de conexión</h2>
            <p class="body-large text-muted">No pudimos verificar su información. Por favor, intente de nuevo.</p>

            <ion-button expand="block" (click)="reintentar()">
              <ion-icon slot="start" name="refresh"></ion-icon>
              Reintentar
            </ion-button>
          </div>
        }

      </div>
    </ion-content>
  `,
  styles: [`
    .verificacion-content {
      --background: var(--ion-background-color);
    }

    .verificacion-container {
      padding: var(--space-lg, 24px);
      max-width: 500px;
      margin: 0 auto;
      min-height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    /* Loading Section */
    .loading-section {
      text-align: center;
    }

    .loading-icon {
      width: 96px;
      height: 96px;
      margin: 0 auto var(--space-lg, 24px);
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: 50%;
    }

    .loading-icon ion-spinner {
      width: 48px;
      height: 48px;
    }

    .loading-section h2 {
      margin: 0 0 var(--space-xs, 8px);
      color: var(--ion-text-color);
    }

    .loading-section p {
      margin: 0 0 var(--space-xl, 32px);
    }

    /* Progress Steps */
    .progress-steps {
      display: flex;
      flex-direction: column;
      gap: var(--space-md, 16px);
      margin-bottom: var(--space-lg, 24px);
    }

    .step {
      display: flex;
      align-items: center;
      gap: var(--space-sm, 12px);
      padding: var(--space-sm, 12px) var(--space-md, 16px);
      background: var(--surface-container, #f1f5f9);
      border-radius: var(--radius-md, 12px);
      opacity: 0.5;
      transition: all 0.3s ease;
    }

    .step.active {
      opacity: 1;
      background: rgba(var(--ion-color-primary-rgb), 0.1);
    }

    .step.completed {
      background: rgba(var(--ion-color-success-rgb), 0.1);
    }

    .step.completed ion-icon {
      color: var(--ion-color-success);
    }

    .step ion-icon {
      font-size: 1.5rem;
      color: var(--ion-color-primary);
    }

    .step span {
      font-size: 0.9375rem;
      font-weight: 500;
    }

    ion-progress-bar {
      height: 6px;
      border-radius: var(--radius-full, 9999px);
    }

    /* Result Section */
    .result-section {
      text-align: center;
    }

    .result-icon {
      width: 96px;
      height: 96px;
      margin: 0 auto var(--space-lg, 24px);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
    }

    .result-icon ion-icon {
      font-size: 64px;
    }

    .result-icon.success {
      background: rgba(var(--ion-color-success-rgb), 0.1);
    }

    .result-icon.success ion-icon {
      color: var(--ion-color-success);
    }

    .result-icon.new-user {
      background: rgba(var(--ion-color-primary-rgb), 0.1);
    }

    .result-icon.new-user ion-icon {
      color: var(--ion-color-primary);
    }

    .result-icon.error {
      background: rgba(var(--ion-color-danger-rgb), 0.1);
    }

    .result-icon.error ion-icon {
      color: var(--ion-color-danger);
    }

    .result-section h2 {
      margin: 0 0 var(--space-xs, 8px);
      color: var(--ion-text-color);
    }

    .result-section > p {
      margin: 0 0 var(--space-lg, 24px);
    }

    /* Afiliado Card */
    .afiliado-card {
      text-align: left;
      margin-bottom: var(--space-lg, 24px);
      border-radius: var(--radius-xl, 24px);
    }

    .afiliado-card ion-card-title {
      font-size: 1.125rem;
      font-weight: 600;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: var(--space-xs, 8px) 0;
      border-bottom: 1px solid var(--ion-border-color, #e2e8f0);
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-row .label {
      font-size: 0.875rem;
      color: var(--ion-color-medium);
    }

    .info-row .value {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--ion-text-color);
    }

    .beneficiarios-badge {
      margin-top: var(--space-md, 16px);
    }

    /* Options Section */
    .options-section {
      margin-top: var(--space-md, 16px);
    }

    .options-section p {
      margin-bottom: var(--space-md, 16px);
      color: var(--ion-color-medium);
    }

    .options-section ion-button {
      margin-bottom: var(--space-sm, 12px);
      --border-radius: var(--radius-md, 12px);
    }

    /* Animations */
    .animate-fade-in {
      animation: fadeIn 0.4s ease-out;
    }

    .animate-slide-up {
      animation: slideUp 0.4s ease-out;
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
export class VerificacionPage implements OnInit {
  estadoVerificacion = signal<EstadoVerificacion>('verificando');
  pasoVerificacion = signal(0);
  progreso = signal(0);
  afiliado = signal<DatosAfiliado | undefined>(undefined);
  beneficiarios = signal<Beneficiario[]>([]);

  constructor(
    private flujoService: FlujoActualizacionService,
    private router: Router
  ) {
    addIcons({
      checkmarkCircle,
      closeCircle,
      personCircle,
      documentText,
      cloudDownload,
      shieldCheckmark,
      alertCircle,
      refresh,
      arrowForward,
      arrowBack,
      createOutline,
      peopleOutline,
      callOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.iniciarVerificacion();
  }

  async iniciarVerificacion(): Promise<void> {
    this.estadoVerificacion.set('verificando');
    this.pasoVerificacion.set(0);
    this.progreso.set(0);

    try {
      // Simular pasos de verificación
      await this.animarPaso(1, 0.33);
      await this.animarPaso(2, 0.66);
      await this.animarPaso(3, 0.9);

      // Consultar base de datos
      const resultado = await this.flujoService.verificarEnBaseDatos();

      this.progreso.set(1);
      await this.delay(300);

      // Actualizar estado según resultado
      this.afiliado.set(this.flujoService.afiliado());
      
      if (resultado.existe) {
        this.beneficiarios.set(resultado.beneficiarios || []);
        this.estadoVerificacion.set('encontrado');
      } else {
        this.estadoVerificacion.set('no_encontrado');
      }
    } catch (error) {
      console.error('Error en verificación:', error);
      this.estadoVerificacion.set('error');
    }
  }

  private async animarPaso(paso: number, progreso: number): Promise<void> {
    this.pasoVerificacion.set(paso);
    
    // Animar progreso suavemente
    const progresoActual = this.progreso();
    const pasos = 10;
    const incremento = (progreso - progresoActual) / pasos;
    
    for (let i = 0; i < pasos; i++) {
      await this.delay(50);
      this.progreso.update(p => Math.min(p + incremento, progreso));
    }
    
    await this.delay(400);
  }

  async corregirInformacion(): Promise<void> {
    await this.flujoService.manejarUsuarioExistente('corregir');
  }

  async actualizarBeneficiario(): Promise<void> {
    await this.flujoService.manejarUsuarioExistente('beneficiario');
  }

  volverAlInicio(): void {
    this.flujoService.reiniciarFlujo();
  }

  contactarSoporte(): void {
    // Abrir enlace de contacto o modal de soporte
    window.open('tel:+576013415000', '_system');
  }

  async reintentar(): Promise<void> {
    await this.iniciarVerificacion();
  }

  formatCedula(numero: string | undefined): string {
    if (!numero) return '';
    return numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

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

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
