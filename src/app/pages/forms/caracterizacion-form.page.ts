import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
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
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonList,
  IonProgressBar,
  IonText,
  IonButtons,
  IonBackButton,
  IonNote,
  IonChip,
  IonToggle,
  IonTextarea,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForward,
  arrowBack,
  accessibilityOutline,
  peopleOutline,
  heartOutline,
  checkmarkCircle,
  informationCircleOutline,
} from 'ionicons/icons';
import { FlujoActualizacionService } from '../../services/flujo-actualizacion.service';
import {
  InformacionCaracterizacion,
  TIPOS_DISCAPACIDAD,
  GRUPOS_ETNICOS,
  POBLACIONES_LGBTIQ,
} from '../../models/afiliado.model';

@Component({
  selector: 'app-caracterizacion-form',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
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
    IonItem,
    IonSelect,
    IonSelectOption,
    IonList,
    IonProgressBar,
    IonButtons,
    IonBackButton,
    IonChip,
    IonToggle,
    IonTextarea,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/forms/employment"></ion-back-button>
        </ion-buttons>
        <ion-title>Enfoque de Diversidad</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <div class="progress-container">
          <div class="progress-info">
            <span class="step-label">PASO 4 DE 4</span>
            <span class="step-title">Enfoque de Diversidad</span>
          </div>
          <ion-progress-bar [value]="1" color="primary"></ion-progress-bar>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="form-content">
      <div class="form-container">
        
        <!-- Nota informativa -->
        <div class="info-banner">
          <ion-icon name="information-circle-outline"></ion-icon>
          <p><strong>Todos los campos son opcionales</strong> y confidenciales.</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          
          <!-- Discapacidad -->
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="accessibility-outline"></ion-icon>
                Discapacidad
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                
                <!-- Toggle discapacidad -->
                <ion-item class="toggle-item">
                  <ion-toggle 
                    formControlName="tieneDiscapacidad"
                    (ionChange)="onDiscapacidadChange($event)"
                  >
                    ¿Tiene discapacidad?
                  </ion-toggle>
                </ion-item>

                @if (tieneDiscapacidad()) {
                  <ion-item class="animate-slide-in">
                    <ion-select
                      formControlName="tipoDiscapacidad"
                      label="Tipo"
                      labelPlacement="stacked"
                      interface="action-sheet"
                      [multiple]="true"
                    >
                      @for (tipo of tiposDiscapacidad; track tipo.value) {
                        <ion-select-option [value]="tipo.value">
                          {{ tipo.label }}
                        </ion-select-option>
                      }
                    </ion-select>
                  </ion-item>

                  <ion-item class="animate-slide-in">
                    <ion-textarea
                      formControlName="detalleDiscapacidad"
                      label="Detalle (opcional)"
                      labelPlacement="stacked"
                      placeholder="Detalles adicionales"
                      [autoGrow]="true"
                      [rows]="2"
                      [maxlength]="500"
                      [counter]="true"
                    ></ion-textarea>
                  </ion-item>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Grupo Étnico -->
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="people-outline"></ion-icon>
                Grupo Étnico
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                
                <!-- Toggle grupo étnico -->
                <ion-item class="toggle-item">
                  <ion-toggle 
                    formControlName="perteneceGrupoEtnico"
                    (ionChange)="onGrupoEtnicoChange($event)"
                  >
                    ¿Pertenece a grupo étnico?
                  </ion-toggle>
                </ion-item>

                @if (perteneceGrupoEtnico()) {
                  <ion-item class="animate-slide-in">
                    <ion-select
                      formControlName="grupoEtnico"
                      label="Grupo étnico"
                      labelPlacement="stacked"
                      interface="action-sheet"
                    >
                      @for (grupo of gruposEtnicos; track grupo.value) {
                        <ion-select-option [value]="grupo.value">
                          {{ grupo.label }}
                        </ion-select-option>
                      }
                    </ion-select>
                  </ion-item>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Población LGBTIQ+ -->
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="heart-outline"></ion-icon>
                Diversidad
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                
                <!-- Toggle LGBTIQ+ -->
                <ion-item class="toggle-item">
                  <ion-toggle 
                    formControlName="perteneceLGBTIQ"
                    (ionChange)="onLGBTIQChange($event)"
                  >
                    ¿Se identifica como LGBTIQ+?
                  </ion-toggle>
                </ion-item>

                @if (perteneceLGBTIQ()) {
                  <ion-item class="animate-slide-in">
                    <ion-select
                      formControlName="poblacionLGBTIQ"
                      label="Identidad"
                      labelPlacement="stacked"
                      interface="action-sheet"
                    >
                      @for (poblacion of poblacionesLGBTIQ; track poblacion.value) {
                        <ion-select-option [value]="poblacion.value">
                          {{ poblacion.label }}
                        </ion-select-option>
                      }
                    </ion-select>
                  </ion-item>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Observaciones -->
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="information-circle-outline"></ion-icon>
                Observaciones
                <ion-chip color="medium" class="optional-chip">Opcional</ion-chip>
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-textarea
                    formControlName="observaciones"
                    label="Observaciones"
                    labelPlacement="stacked"
                    placeholder="Notas adicionales"
                    [autoGrow]="true"
                    [rows]="3"
                    [maxlength]="1000"
                    [counter]="true"
                  ></ion-textarea>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Botones de navegación -->
          <div class="form-actions">
            <ion-button 
              fill="outline" 
              (click)="volver()"
              type="button"
            >
              <ion-icon slot="start" name="arrow-back"></ion-icon>
              Volver
            </ion-button>
            
            <ion-button type="submit">
              Finalizar
              <ion-icon slot="end" name="checkmark-circle"></ion-icon>
            </ion-button>
          </div>

        </form>

      </div>
    </ion-content>
  `,
  styles: [`
    /* ===========================================
       FORM STYLES — Modern Responsive Design
       =========================================== */

    :host {
      --form-max-width: 600px;
      --sp-xs: 0.5rem;
      --sp-sm: 0.75rem;
      --sp-md: 1rem;
      --sp-lg: 1.5rem;
      --sp-xl: 2rem;
      --radius-sm: 0.75rem;
      --radius-md: 1rem;
      --radius-lg: 1.5rem;
    }

    .form-content {
      --background: var(--ion-background-color);
    }

    /* Progress Indicator */
    .progress-container {
      padding: var(--sp-sm) var(--sp-md);
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: var(--sp-xs);
    }

    .step-label {
      font-size: 0.8125rem;
      color: var(--ion-color-primary);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .step-title {
      font-size: 0.875rem;
      color: var(--ion-color-medium);
      font-weight: 500;
    }

    ion-progress-bar {
      height: 0.375rem;
      border-radius: 9999px;
      --buffer-background: rgba(var(--ion-color-primary-rgb), 0.08);
    }

    /* Form Container */
    .form-container {
      padding: var(--sp-md);
      max-width: var(--form-max-width);
      margin: 0 auto;
      padding-bottom: calc(var(--sp-md) + env(safe-area-inset-bottom, 0px));
    }

    /* Info Banner */
    .info-banner {
      display: flex;
      gap: var(--sp-sm);
      padding: var(--sp-md);
      background: rgba(var(--ion-color-primary-rgb), 0.06);
      border-radius: var(--radius-md);
      margin-bottom: var(--sp-lg);
      align-items: flex-start;
      border: 1px solid rgba(var(--ion-color-primary-rgb), 0.1);
    }

    .info-banner ion-icon {
      font-size: 1.375rem;
      color: var(--ion-color-primary);
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .info-banner p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--ion-text-color);
      line-height: 1.6;
    }

    /* Cards */
    .form-card {
      margin-bottom: var(--sp-md);
      border-radius: var(--radius-lg);
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.08);
    }

    .form-card ion-card-header {
      padding-bottom: var(--sp-xs);
    }

    .form-card ion-card-title {
      display: flex;
      align-items: center;
      gap: var(--sp-sm);
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.3;
    }

    .form-card ion-card-title ion-icon {
      font-size: 1.25rem;
      color: var(--ion-color-primary);
      flex-shrink: 0;
    }

    .optional-chip {
      --background: var(--ion-color-light);
      font-size: 0.6875rem;
      height: 1.375rem;
      margin-left: auto;
      flex-shrink: 0;
    }

    /* Lists & Items */
    ion-list {
      background: transparent;
    }

    ion-item {
      --background: var(--ion-color-light);
      --border-radius: var(--radius-md);
      --min-height: 3.5rem;
      margin-bottom: var(--sp-sm);
      --padding-start: var(--sp-md);
      --padding-end: var(--sp-md);
      transition: background-color 0.2s ease, box-shadow 0.2s ease;
    }

    ion-item:last-child {
      margin-bottom: 0;
    }

    ion-item:focus-within {
      --background: rgba(var(--ion-color-primary-rgb), 0.05);
      box-shadow: 0 0 0 2px rgba(var(--ion-color-primary-rgb), 0.15);
    }

    /* Toggle Items */
    .toggle-item {
      --background: transparent;
    }

    .toggle-item ion-toggle {
      --background: var(--ion-color-light-shade);
      --background-checked: var(--ion-color-primary);
      padding: var(--sp-sm) 0;
    }

    ion-select, ion-textarea {
      --padding-top: var(--sp-sm);
      --padding-bottom: var(--sp-sm);
      font-size: 0.9375rem;
    }

    ion-select::part(text) {
      white-space: normal;
      overflow: visible;
      text-overflow: unset;
    }

    ion-select::part(placeholder) {
      opacity: 0.5;
      font-size: 0.875rem;
    }

    /* Error Notes */
    .error-note {
      display: block;
      padding: var(--sp-xs) var(--sp-md);
      font-size: 0.8125rem;
      font-weight: 500;
      margin-top: -0.25rem;
      margin-bottom: var(--sp-sm);
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      justify-content: space-between;
      gap: var(--sp-md);
      margin-top: var(--sp-xl);
      padding-bottom: calc(var(--sp-lg) + env(safe-area-inset-bottom, 0px));
    }

    .form-actions ion-button {
      flex: 1;
      --border-radius: var(--radius-md);
      min-height: 3rem;
      font-weight: 600;
      font-size: 0.9375rem;
      --padding-start: 0.75rem;
      --padding-end: 0.75rem;
    }

    .form-actions ion-button[fill="outline"] {
      --background: transparent;
      --border-width: 1.5px;
    }

    /* Animation */
    .animate-slide-in {
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-0.625rem);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    /* Dark mode */
    @media (prefers-color-scheme: dark) {
      .form-card {
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
    }

    /* Small phones */
    @media (max-width: 380px) {
      .form-card ion-card-title {
        font-size: 1.125rem;
      }

      .form-actions {
        gap: var(--sp-sm);
      }

      .form-actions ion-button {
        min-height: 2.75rem;
        font-size: 0.875rem;
        --padding-start: 0.5rem;
        --padding-end: 0.5rem;
      }

      ion-select, ion-textarea {
        font-size: 0.875rem;
      }

      .toggle-item ion-toggle {
        font-size: 0.875rem;
      }
    }

    /* Responsive: tablets+ */
    @media (min-width: 768px) {
      .form-container {
        padding: var(--sp-lg);
      }

      .form-card ion-card-title {
        font-size: 1.375rem;
      }
    }

    /* Reduced motion */
    @media (prefers-reduced-motion: reduce) {
      ion-item,
      .animate-slide-in {
        transition: none;
        animation: none;
      }
    }
  `]
})
export class CaracterizacionFormPage implements OnInit {
  form!: FormGroup;
  
  tiposDiscapacidad = TIPOS_DISCAPACIDAD;
  gruposEtnicos = GRUPOS_ETNICOS;
  poblacionesLGBTIQ = POBLACIONES_LGBTIQ;
  
  tieneDiscapacidad = signal(false);
  perteneceGrupoEtnico = signal(false);
  perteneceLGBTIQ = signal(false);

  constructor(
    private fb: FormBuilder,
    private flujoService: FlujoActualizacionService,
    private router: Router
  ) {
    addIcons({
      arrowForward,
      arrowBack,
      accessibilityOutline,
      peopleOutline,
      heartOutline,
      checkmarkCircle,
      informationCircleOutline,
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.cargarDatosExistentes();
  }

  private initForm(): void {
    this.form = this.fb.group({
      tieneDiscapacidad: [false],
      tipoDiscapacidad: [[]],
      detalleDiscapacidad: [''],
      perteneceGrupoEtnico: [false],
      grupoEtnico: [''],
      perteneceLGBTIQ: [false],
      poblacionLGBTIQ: [''],
      observaciones: [''],
    });
  }

  private cargarDatosExistentes(): void {
    const afiliado = this.flujoService.afiliado();
    if (afiliado?.caracterizacion) {
      const caract = afiliado.caracterizacion;
      
      const tieneDisc = caract.tipoDiscapacidad && caract.tipoDiscapacidad.length > 0;
      const tieneGrupo = !!caract.grupoEtnico;
      const tieneLGBTIQ = !!caract.poblacionLGBTIQ;

      this.form.patchValue({
        tieneDiscapacidad: tieneDisc,
        tipoDiscapacidad: caract.tipoDiscapacidad || [],
        detalleDiscapacidad: caract.detalleDiscapacidad || '',
        perteneceGrupoEtnico: tieneGrupo,
        grupoEtnico: caract.grupoEtnico || '',
        perteneceLGBTIQ: tieneLGBTIQ,
        poblacionLGBTIQ: caract.poblacionLGBTIQ || '',
        observaciones: caract.observaciones || '',
      });

      this.tieneDiscapacidad.set(tieneDisc ?? false);
      this.perteneceGrupoEtnico.set(tieneGrupo ?? false);
      this.perteneceLGBTIQ.set(tieneLGBTIQ ?? false);
    }
  }

  onDiscapacidadChange(event: any): void {
    const checked = event.detail.checked;
    this.tieneDiscapacidad.set(checked);
    
    if (!checked) {
      this.form.patchValue({
        tipoDiscapacidad: [],
        detalleDiscapacidad: '',
      });
    }
  }

  onGrupoEtnicoChange(event: any): void {
    const checked = event.detail.checked;
    this.perteneceGrupoEtnico.set(checked);
    
    if (!checked) {
      this.form.patchValue({
        grupoEtnico: '',
      });
    }
  }

  onLGBTIQChange(event: any): void {
    const checked = event.detail.checked;
    this.perteneceLGBTIQ.set(checked);
    
    if (!checked) {
      this.form.patchValue({
        poblacionLGBTIQ: '',
      });
    }
  }

  async volver(): Promise<void> {
    await this.router.navigate(['/forms/employment']);
  }

  async onSubmit(): Promise<void> {
    const datos: InformacionCaracterizacion = {};

    if (this.tieneDiscapacidad()) {
      datos.tipoDiscapacidad = this.form.value.tipoDiscapacidad;
      datos.detalleDiscapacidad = this.form.value.detalleDiscapacidad || undefined;
    }

    if (this.perteneceGrupoEtnico()) {
      datos.grupoEtnico = this.form.value.grupoEtnico;
    }

    if (this.perteneceLGBTIQ()) {
      datos.poblacionLGBTIQ = this.form.value.poblacionLGBTIQ;
    }

    if (this.form.value.observaciones) {
      datos.observaciones = this.form.value.observaciones;
    }

    await this.flujoService.guardarCaracterizacion(datos);
  }
}
