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
        <ion-title>Caracterización</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <div class="progress-container">
          <div class="progress-info">
            <span class="step-label">Paso 4 de 4</span>
            <span class="step-title">Información adicional</span>
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
          <div>
            <p>
              Esta información nos permite ofrecerle servicios y programas especializados.
              <strong>Todos los campos son opcionales</strong> y la información es confidencial.
            </p>
          </div>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          
          <!-- Discapacidad -->
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="accessibility-outline"></ion-icon>
                Condición de Discapacidad
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
                    ¿Tiene alguna discapacidad?
                  </ion-toggle>
                </ion-item>

                @if (tieneDiscapacidad()) {
                  <ion-item class="animate-slide-in">
                    <ion-select
                      formControlName="tipoDiscapacidad"
                      label="Tipo de discapacidad"
                      labelPlacement="stacked"
                      placeholder="Seleccione el tipo"
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
                      label="Descripción adicional"
                      labelPlacement="stacked"
                      placeholder="Puede agregar detalles sobre su condición (opcional)"
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
                Pertenencia Étnica
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
                    ¿Pertenece a algún grupo étnico?
                  </ion-toggle>
                </ion-item>

                @if (perteneceGrupoEtnico()) {
                  <ion-item class="animate-slide-in">
                    <ion-select
                      formControlName="grupoEtnico"
                      label="Grupo étnico"
                      labelPlacement="stacked"
                      placeholder="Seleccione el grupo"
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
                Diversidad Sexual y de Género
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
                    ¿Se identifica como parte de la población LGBTIQ+?
                  </ion-toggle>
                </ion-item>

                @if (perteneceLGBTIQ()) {
                  <ion-item class="animate-slide-in">
                    <ion-select
                      formControlName="poblacionLGBTIQ"
                      label="Identidad"
                      labelPlacement="stacked"
                      placeholder="Seleccione su identidad"
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
                Observaciones Adicionales
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
                    placeholder="¿Hay algo más que desee que tengamos en cuenta?"
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
    .form-content {
      --background: var(--ion-background-color);
    }

    .progress-container {
      padding: var(--space-sm, 12px) var(--space-md, 16px);
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      margin-bottom: var(--space-xs, 8px);
    }

    .step-label {
      font-size: 0.75rem;
      color: var(--ion-color-primary);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .step-title {
      font-size: 0.875rem;
      color: var(--ion-color-medium);
    }

    ion-progress-bar {
      height: 4px;
      border-radius: var(--radius-full, 9999px);
    }

    .form-container {
      padding: var(--space-md, 16px);
      max-width: 600px;
      margin: 0 auto;
    }

    .info-banner {
      display: flex;
      gap: var(--space-sm, 12px);
      padding: var(--space-md, 16px);
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: var(--radius-lg, 16px);
      margin-bottom: var(--space-md, 16px);
      align-items: flex-start;
    }

    .info-banner ion-icon {
      font-size: 1.5rem;
      color: var(--ion-color-primary);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .info-banner p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--ion-text-color);
      line-height: 1.5;
    }

    .form-card {
      margin-bottom: var(--space-md, 16px);
      border-radius: var(--radius-xl, 24px);
    }

    .form-card ion-card-title {
      display: flex;
      align-items: center;
      gap: var(--space-sm, 12px);
      font-size: 1rem;
      font-weight: 600;
    }

    .form-card ion-card-title ion-icon {
      font-size: 1.25rem;
      color: var(--ion-color-primary);
    }

    .optional-chip {
      --background: var(--surface-container);
      font-size: 0.625rem;
      height: 20px;
      margin-left: auto;
    }

    ion-list {
      background: transparent;
    }

    ion-item {
      --background: var(--surface-container, #f1f5f9);
      --border-radius: var(--radius-md, 12px);
      margin-bottom: var(--space-sm, 12px);
      --padding-start: var(--space-md, 16px);
      --padding-end: var(--space-md, 16px);
    }

    ion-item:last-child {
      margin-bottom: 0;
    }

    .toggle-item {
      --background: transparent;
    }

    .toggle-item ion-toggle {
      --background: var(--surface-container);
      --background-checked: var(--ion-color-primary);
      padding: var(--space-sm, 12px) 0;
    }

    ion-select, ion-textarea {
      --padding-top: var(--space-sm, 12px);
      --padding-bottom: var(--space-sm, 12px);
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
      gap: var(--space-md, 16px);
      margin-top: var(--space-lg, 24px);
      padding-bottom: var(--space-xl, 32px);
    }

    .form-actions ion-button {
      flex: 1;
      --border-radius: var(--radius-md, 12px);
    }

    .form-actions ion-button[fill="outline"] {
      --background: transparent;
    }

    /* Animación */
    .animate-slide-in {
      animation: slideIn 0.3s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
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
