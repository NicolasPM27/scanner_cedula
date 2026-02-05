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
  IonInput,
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForward,
  arrowBack,
  briefcaseOutline,
  schoolOutline,
  locationOutline,
  calendarOutline,
  checkmarkCircle,
  informationCircleOutline,
} from 'ionicons/icons';
import { FlujoActualizacionService } from '../../services/flujo-actualizacion.service';
import { InformacionLaboral, TipoAfiliado, TIPOS_AFILIADO } from '../../models/afiliado.model';
import { SECRETARIAS_EDUCACION, INSTITUCIONES_EDUCATIVAS } from '../../data/datos-geograficos';

@Component({
  selector: 'app-laboral-form',
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
    IonInput,
    IonSelect,
    IonSelectOption,
    IonList,
    IonProgressBar,
    IonButtons,
    IonBackButton,
    IonNote,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/forms/contact"></ion-back-button>
        </ion-buttons>
        <ion-title>Información Laboral</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <div class="progress-container">
          <div class="progress-info">
            <span class="step-label">Paso 3 de 4</span>
            <span class="step-title">Datos laborales</span>
          </div>
          <ion-progress-bar [value]="0.75" color="primary"></ion-progress-bar>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="form-content">
      <div class="form-container">
        
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          
          <!-- Tipo de Afiliado -->
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="briefcase-outline"></ion-icon>
                Tipo de Afiliación
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-select
                    formControlName="tipoAfiliado"
                    label="Tipo de afiliado"
                    labelPlacement="stacked"
                    placeholder="Seleccione su tipo de afiliación"
                    interface="action-sheet"
                    (ionChange)="onTipoAfiliadoChange($event)"
                  >
                    @for (tipo of tiposAfiliado; track tipo.value) {
                      <ion-select-option [value]="tipo.value">
                        {{ tipo.label }}
                      </ion-select-option>
                    }
                  </ion-select>
                </ion-item>
                @if (showError('tipoAfiliado')) {
                  <ion-note color="danger" class="error-note">
                    Seleccione su tipo de afiliación
                  </ion-note>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Información para Docentes/Directivos Activos -->
          @if (mostrarSeccionActivos()) {
            <ion-card class="form-card animate-slide-in">
              <ion-card-header>
                <ion-card-title>
                  <ion-icon name="school-outline"></ion-icon>
                  Información Institucional
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-list lines="none">
                  
                  <!-- Secretaría de Educación -->
                  <ion-item>
                    <ion-select
                      formControlName="secretariaEducacion"
                      label="Secretaría de Educación"
                      labelPlacement="stacked"
                      placeholder="Seleccione la secretaría"
                      interface="action-sheet"
                      (ionChange)="onSecretariaChange($event)"
                    >
                      @for (sec of secretarias; track sec.codigo) {
                        <ion-select-option [value]="sec.codigo">
                          {{ sec.nombre }}
                        </ion-select-option>
                      }
                    </ion-select>
                  </ion-item>
                  @if (showError('secretariaEducacion')) {
                    <ion-note color="danger" class="error-note">
                      Seleccione la secretaría de educación
                    </ion-note>
                  }

                  <!-- Institución Educativa -->
                  <ion-item>
                    <ion-select
                      formControlName="institucionEducativa"
                      label="Institución Educativa"
                      labelPlacement="stacked"
                      placeholder="Seleccione la institución"
                      interface="action-sheet"
                      [disabled]="institucionesFiltradas().length === 0"
                    >
                      @for (inst of institucionesFiltradas(); track inst.codigo) {
                        <ion-select-option [value]="inst.codigo">
                          {{ inst.nombre }}
                        </ion-select-option>
                      }
                    </ion-select>
                  </ion-item>
                  @if (showError('institucionEducativa')) {
                    <ion-note color="danger" class="error-note">
                      Seleccione la institución educativa
                    </ion-note>
                  }

                  <!-- Cargo -->
                  <ion-item>
                    <ion-input
                      formControlName="cargo"
                      label="Cargo"
                      labelPlacement="stacked"
                      placeholder="Ej: Docente de Matemáticas"
                      type="text"
                    ></ion-input>
                  </ion-item>
                  @if (showError('cargo')) {
                    <ion-note color="danger" class="error-note">
                      Ingrese su cargo
                    </ion-note>
                  }

                  <!-- Escalafón -->
                  <ion-item>
                    <ion-select
                      formControlName="escalafon"
                      label="Escalafón"
                      labelPlacement="stacked"
                      placeholder="Seleccione el escalafón"
                      interface="action-sheet"
                    >
                      <ion-select-option value="2277">Decreto 2277</ion-select-option>
                      <ion-select-option value="1278">Decreto 1278</ion-select-option>
                    </ion-select>
                  </ion-item>
                  @if (showError('escalafon')) {
                    <ion-note color="danger" class="error-note">
                      Seleccione el escalafón
                    </ion-note>
                  }

                  <!-- Grado Escalafón -->
                  <ion-item>
                    <ion-select
                      formControlName="gradoEscalafon"
                      label="Grado en el escalafón"
                      labelPlacement="stacked"
                      placeholder="Seleccione el grado"
                      interface="action-sheet"
                    >
                      @for (grado of gradosEscalafon(); track grado) {
                        <ion-select-option [value]="grado">
                          {{ grado }}
                        </ion-select-option>
                      }
                    </ion-select>
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>
          }

          <!-- Información para Pensionados -->
          @if (mostrarSeccionPensionados()) {
            <ion-card class="form-card animate-slide-in">
              <ion-card-header>
                <ion-card-title>
                  <ion-icon name="calendar-outline"></ion-icon>
                  Información de Pensión
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                
                <!-- Nota informativa -->
                <div class="info-banner">
                  <ion-icon name="information-circle-outline"></ion-icon>
                  <p>
                    La información laboral es opcional para pensionados.
                    Complete solo si desea actualizar estos datos.
                  </p>
                </div>

                <ion-list lines="none">
                  
                  <!-- Fecha de pensión -->
                  <ion-item>
                    <ion-input
                      formControlName="fechaPension"
                      label="Fecha de pensión"
                      labelPlacement="stacked"
                      placeholder="YYYY-MM-DD"
                      type="date"
                    ></ion-input>
                  </ion-item>

                  <!-- Última secretaría -->
                  <ion-item>
                    <ion-select
                      formControlName="secretariaEducacion"
                      label="Última Secretaría de Educación"
                      labelPlacement="stacked"
                      placeholder="Seleccione la secretaría"
                      interface="action-sheet"
                    >
                      @for (sec of secretarias; track sec.codigo) {
                        <ion-select-option [value]="sec.codigo">
                          {{ sec.nombre }}
                        </ion-select-option>
                      }
                    </ion-select>
                  </ion-item>

                  <!-- Último cargo -->
                  <ion-item>
                    <ion-input
                      formControlName="cargo"
                      label="Último cargo desempeñado"
                      labelPlacement="stacked"
                      placeholder="Ej: Docente de Ciencias"
                      type="text"
                    ></ion-input>
                  </ion-item>
                </ion-list>
              </ion-card-content>
            </ion-card>
          }

          <!-- Mensaje para beneficiarios -->
          @if (esBeneficiario()) {
            <ion-card class="form-card info-card">
              <ion-card-content>
                <div class="beneficiary-info">
                  <ion-icon name="information-circle-outline"></ion-icon>
                  <div>
                    <h3>Información no requerida</h3>
                    <p>
                      Como beneficiario, no es necesario completar información laboral.
                      Puede continuar al siguiente paso.
                    </p>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          }

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
            
            <ion-button 
              type="submit"
              [disabled]="!puedeAvanzar()"
            >
              Continuar
              <ion-icon slot="end" name="arrow-forward"></ion-icon>
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

    ion-select, ion-input {
      --padding-top: var(--space-sm, 12px);
      --padding-bottom: var(--space-sm, 12px);
    }

    .error-note {
      display: block;
      padding: var(--space-xs, 8px) var(--space-md, 16px);
      font-size: 0.75rem;
      margin-top: -8px;
      margin-bottom: var(--space-sm, 12px);
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

    .info-card {
      background: rgba(var(--ion-color-primary-rgb), 0.05);
    }

    .beneficiary-info {
      display: flex;
      gap: var(--space-md, 16px);
      align-items: flex-start;
    }

    .beneficiary-info ion-icon {
      font-size: 2rem;
      color: var(--ion-color-primary);
      flex-shrink: 0;
    }

    .beneficiary-info h3 {
      margin: 0 0 var(--space-xs, 8px);
      font-size: 1rem;
      font-weight: 600;
    }

    .beneficiary-info p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--ion-color-medium);
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
export class LaboralFormPage implements OnInit {
  form!: FormGroup;
  
  tiposAfiliado = TIPOS_AFILIADO;
  secretarias = SECRETARIAS_EDUCACION;
  
  tipoAfiliadoSeleccionado = signal<TipoAfiliado | ''>('');
  institucionesFiltradas = signal<typeof INSTITUCIONES_EDUCATIVAS>([]);
  
  // Grados según el escalafón
  gradosEscalafon = signal<string[]>([]);

  constructor(
    private fb: FormBuilder,
    private flujoService: FlujoActualizacionService,
    private router: Router
  ) {
    addIcons({
      arrowForward,
      arrowBack,
      briefcaseOutline,
      schoolOutline,
      locationOutline,
      calendarOutline,
      checkmarkCircle,
      informationCircleOutline,
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.setupFormListeners();
    this.cargarDatosExistentes();
  }

  private initForm(): void {
    this.form = this.fb.group({
      tipoAfiliado: ['', Validators.required],
      secretariaEducacion: [''],
      institucionEducativa: [''],
      cargo: [''],
      escalafon: [''],
      gradoEscalafon: [''],
      fechaPension: [''],
    });
  }

  private setupFormListeners(): void {
    // Escuchar cambios en escalafón para actualizar grados
    this.form.get('escalafon')?.valueChanges.subscribe(escalafon => {
      this.actualizarGrados(escalafon);
    });
  }

  private cargarDatosExistentes(): void {
    const afiliado = this.flujoService.afiliado();
    if (afiliado?.laboral) {
      const laboral = afiliado.laboral;
      this.form.patchValue({
        tipoAfiliado: laboral.tipoAfiliado,
        secretariaEducacion: laboral.secretariaEducacion,
        institucionEducativa: laboral.institucionEducativa,
        cargo: laboral.cargo,
        escalafon: laboral.escalafon,
        gradoEscalafon: laboral.gradoEscalafon,
        fechaPension: laboral.fechaPension,
      });
      
      this.tipoAfiliadoSeleccionado.set(laboral.tipoAfiliado);
      
      if (laboral.secretariaEducacion) {
        this.actualizarInstituciones(laboral.secretariaEducacion);
      }
      if (laboral.escalafon) {
        this.actualizarGrados(laboral.escalafon);
      }
    }
  }

  onTipoAfiliadoChange(event: any): void {
    const tipo = event.detail.value as TipoAfiliado;
    this.tipoAfiliadoSeleccionado.set(tipo);
    
    // Actualizar validadores según tipo
    this.actualizarValidadores(tipo);
    
    // Limpiar campos si cambia el tipo
    this.form.patchValue({
      secretariaEducacion: '',
      institucionEducativa: '',
      cargo: '',
      escalafon: '',
      gradoEscalafon: '',
      fechaPension: '',
    });
    this.institucionesFiltradas.set([]);
  }

  private actualizarValidadores(tipo: TipoAfiliado): void {
    const secretaria = this.form.get('secretariaEducacion');
    const institucion = this.form.get('institucionEducativa');
    const cargo = this.form.get('cargo');
    const escalafon = this.form.get('escalafon');

    // Reset validators
    secretaria?.clearValidators();
    institucion?.clearValidators();
    cargo?.clearValidators();
    escalafon?.clearValidators();

    // Agregar validators según tipo
    if (tipo === 'docente_activo' || tipo === 'directivo_activo') {
      secretaria?.setValidators([Validators.required]);
      institucion?.setValidators([Validators.required]);
      cargo?.setValidators([Validators.required]);
      escalafon?.setValidators([Validators.required]);
    }

    // Actualizar estado
    secretaria?.updateValueAndValidity();
    institucion?.updateValueAndValidity();
    cargo?.updateValueAndValidity();
    escalafon?.updateValueAndValidity();
  }

  onSecretariaChange(event: any): void {
    const codigoSecretaria = event.detail.value;
    this.actualizarInstituciones(codigoSecretaria);
    
    // Limpiar institución
    this.form.patchValue({ institucionEducativa: '' });
  }

  private actualizarInstituciones(codigoSecretaria: string): void {
    const filtradas = INSTITUCIONES_EDUCATIVAS.filter(
      i => i.codigoSecretaria === codigoSecretaria
    );
    this.institucionesFiltradas.set(filtradas);
  }

  private actualizarGrados(escalafon: string): void {
    if (escalafon === '2277') {
      // Decreto 2277: grados del 1 al 14
      this.gradosEscalafon.set(
        Array.from({ length: 14 }, (_, i) => `Grado ${i + 1}`)
      );
    } else if (escalafon === '1278') {
      // Decreto 1278: categorías
      this.gradosEscalafon.set([
        '1A', '1B', '1C', '1D',
        '2A', '2B', '2C', '2D',
        '3A', '3B', '3C', '3D',
      ]);
    } else {
      this.gradosEscalafon.set([]);
    }
  }

  mostrarSeccionActivos(): boolean {
    const tipo = this.tipoAfiliadoSeleccionado();
    return tipo === 'docente_activo' || tipo === 'directivo_activo';
  }

  mostrarSeccionPensionados(): boolean {
    return this.tipoAfiliadoSeleccionado() === 'pensionado';
  }

  esBeneficiario(): boolean {
    return this.tipoAfiliadoSeleccionado() === 'beneficiario';
  }

  puedeAvanzar(): boolean {
    const tipo = this.tipoAfiliadoSeleccionado();
    
    if (!tipo) return false;
    
    // Beneficiarios siempre pueden avanzar
    if (tipo === 'beneficiario') return true;
    
    // Pensionados pueden avanzar (campos opcionales)
    if (tipo === 'pensionado') return true;
    
    // Docentes/Directivos activos necesitan campos completos
    return this.form.valid;
  }

  showError(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  async volver(): Promise<void> {
    await this.router.navigate(['/forms/contact']);
  }

  async onSubmit(): Promise<void> {
    if (this.puedeAvanzar()) {
      const tipo = this.tipoAfiliadoSeleccionado();
      
      // Construir datos según tipo
      const datos: InformacionLaboral = {
        tipoAfiliado: tipo as TipoAfiliado,
      };

      if (tipo === 'docente_activo' || tipo === 'directivo_activo') {
        datos.secretariaEducacion = this.form.value.secretariaEducacion;
        datos.institucionEducativa = this.form.value.institucionEducativa;
        datos.cargo = this.form.value.cargo;
        datos.escalafon = this.form.value.escalafon;
        datos.gradoEscalafon = this.form.value.gradoEscalafon;
      }

      if (tipo === 'pensionado') {
        datos.fechaPension = this.form.value.fechaPension || undefined;
        datos.secretariaEducacion = this.form.value.secretariaEducacion || undefined;
        datos.cargo = this.form.value.cargo || undefined;
      }

      await this.flujoService.guardarLaboral(datos);
    }
  }
}
