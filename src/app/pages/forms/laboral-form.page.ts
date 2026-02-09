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
  IonSpinner,
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
import {
  InstitucionesApiService,
  Departamento,
  Municipio,
  Secretaria,
  Establecimiento,
  Sede,
} from '../../services/instituciones-api.service';

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
    IonSpinner,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/forms/contact"></ion-back-button>
        </ion-buttons>
        <ion-title>Datos Laborales</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <div class="progress-container">
          <div class="progress-info">
            <span class="step-label">PASO 3 DE 4</span>
            <span class="step-title">Laboral</span>
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
                Afiliación
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-select
                    formControlName="tipoAfiliado"
                    label="Tipo de afiliado"
                    labelPlacement="stacked"
                    placeholder="Seleccione"
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
                    Campo requerido
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
                  
                  <!-- Departamento -->
                  <ion-item>
                    <ion-select
                      formControlName="departamento"
                      label="Departamento"
                      labelPlacement="stacked"
                      interface="action-sheet"
                      (ionChange)="onDepartamentoChange($event)"
                      aria-label="Departamento"
                    >
                      @for (dep of departamentos(); track dep.codigoDepartamento) {
                        <ion-select-option [value]="dep.codigoDepartamento">
                          {{ dep.nombre }}
                        </ion-select-option>
                      }
                    </ion-select>
                    @if (loadingDepartamentos()) {
                      <ion-spinner slot="end" name="crescent" color="primary"></ion-spinner>
                    }
                  </ion-item>
                  @if (showError('departamento')) {
                    <ion-note color="danger" class="error-note">
                      Seleccione el departamento
                    </ion-note>
                  }

                  <!-- Municipio -->
                  <ion-item>
                    <ion-select
                      formControlName="municipio"
                      label="Municipio"
                      labelPlacement="stacked"
                      interface="action-sheet"
                      [disabled]="!form.get('departamento')?.value"
                      (ionChange)="onMunicipioChange($event)"
                      aria-label="Municipio"
                    >
                      @if (municipios().length === 0 && form.get('departamento')?.value) {
                        <ion-select-option value="" disabled>
                          No hay municipios disponibles
                        </ion-select-option>
                      }
                      @for (mun of municipios(); track mun.codigoMunicipio) {
                        <ion-select-option [value]="mun.codigoMunicipio">
                          {{ mun.nombre }}
                        </ion-select-option>
                      }
                    </ion-select>
                    @if (loadingMunicipios()) {
                      <ion-spinner slot="end" name="crescent" color="primary"></ion-spinner>
                    }
                  </ion-item>
                  @if (showError('municipio')) {
                    <ion-note color="danger" class="error-note">
                      Campo requerido
                    </ion-note>
                  }

                  <!-- Secretaría de Educación -->
                  <ion-item>
                    <ion-select
                      formControlName="secretariaEducacion"
                      label="Secretaría"
                      labelPlacement="stacked"
                      interface="action-sheet"
                      (ionChange)="onSecretariaChange($event)"
                      aria-label="Secretaría de educación"
                    >
                      @for (sec of secretarias(); track sec.id) {
                        <ion-select-option [value]="sec.id">
                          {{ sec.nombre }}
                        </ion-select-option>
                      }
                    </ion-select>
                    @if (loadingSecretarias()) {
                      <ion-spinner slot="end" name="crescent" color="primary"></ion-spinner>
                    }
                  </ion-item>
                  @if (showError('secretariaEducacion')) {
                    <ion-note color="danger" class="error-note">
                      Campo requerido
                    </ion-note>
                  }

                  <!-- Institución Educativa (Establecimiento) -->
                  <ion-item>
                    <ion-select
                      formControlName="institucionEducativa"
                      label="Institución"
                      labelPlacement="stacked"
                      interface="action-sheet"
                      [disabled]="!puedeCargarEstablecimientos()"
                      (ionChange)="onEstablecimientoChange($event)"
                      aria-label="Institución educativa"
                    >
                      @if (establecimientos().length === 0 && puedeCargarEstablecimientos()) {
                        <ion-select-option value="" disabled>
                          No hay instituciones disponibles
                        </ion-select-option>
                      }
                      @for (est of establecimientos(); track est.codigoEstablecimiento) {
                        <ion-select-option [value]="est.codigoEstablecimiento">
                          {{ est.nombre }}
                        </ion-select-option>
                      }
                    </ion-select>
                    @if (loadingEstablecimientos()) {
                      <ion-spinner slot="end" name="crescent" color="primary"></ion-spinner>
                    }
                  </ion-item>
                  <ion-item>
                    <ion-select
                      formControlName="sede"
                      label="Sede"
                      labelPlacement="stacked"
                      interface="action-sheet"
                      [disabled]="!form.get('institucionEducativa')?.value"
                      aria-label="Sede educativa"
                    >
                      @if (sedes().length === 0 && form.get('institucionEducativa')?.value && !loadingSedes()) {
                        <ion-select-option value="" disabled>
                          Sin sedes
                        </ion-select-option>
                      }
                      @for (s of sedes(); track s.codigoSede) {
                        <ion-select-option [value]="s.codigoSede">
                          {{ s.nombre }} <span class="zone-badge">({{ s.zona }})</span>
                        </ion-select-option>
                      }
                    </ion-select>
                    @if (loadingSedes()) {
                      <ion-spinner slot="end" name="crescent" color="primary"></ion-spinner>
                    }
                  </ion-item>
                
                  <!-- Cargo -->
                  <ion-item>
                    <ion-input
                      formControlName="cargo"
                      label="Cargo"
                      labelPlacement="stacked"
                      placeholder="Ej: Docente"
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
                      label="Grado escalafón"
                      labelPlacement="stacked"
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
                  Pensión
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                
                <!-- Nota informativa -->
                <div class="info-banner">
                  <ion-icon name="information-circle-outline"></ion-icon>
                  <p>Campos opcionales para pensionados.</p>
                </div>

                <ion-list lines="none">
                  
                  <!-- Última secretaría -->
                  <ion-item>
                    <ion-select
                      formControlName="secretariaEducacion"
                      label="Última secretaría"
                      labelPlacement="stacked"
                      interface="action-sheet"
                    >
                      @for (sec of secretarias(); track sec.id) {
                        <ion-select-option [value]="sec.id">
                          {{ sec.nombre }}
                        </ion-select-option>
                      }
                    </ion-select>
                    @if (loadingSecretarias()) {
                      <ion-spinner slot="end" name="crescent" color="primary"></ion-spinner>
                    }
                  </ion-item>

                  <!-- Último cargo -->
                  <ion-item>
                    <ion-input
                      formControlName="cargo"
                      label="Último cargo"
                      labelPlacement="stacked"
                      placeholder="Ej: Docente"
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
                    <h3>No requerido</h3>
                    <p>Como beneficiario, puede continuar al siguiente paso.</p>
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

    /* Info Card & Beneficiary */
    .info-card {
      background: rgba(var(--ion-color-primary-rgb), 0.04);
    }

    .beneficiary-info {
      display: flex;
      gap: var(--sp-md);
      align-items: flex-start;
    }

    .beneficiary-info ion-icon {
      font-size: 2rem;
      color: var(--ion-color-primary);
      flex-shrink: 0;
    }

    .beneficiary-info h3 {
      margin: 0 0 var(--sp-xs);
      font-size: 1rem;
      font-weight: 600;
    }

    .beneficiary-info p {
      margin: 0;
      font-size: 0.875rem;
      color: var(--ion-color-medium);
      line-height: 1.5;
    }

    /* Lists & Items */
    ion-list {
      background: transparent;
    }

    ion-item {
      --background: var(--ion-color-light);
      --border-radius: var(--radius-md);
      --border-width: 0;
      --min-height: 3.5rem;
      --padding-start: var(--sp-md);
      --padding-end: var(--sp-md);
      margin-bottom: var(--sp-sm);
      transition: background-color 0.2s ease, box-shadow 0.2s ease;
    }

    ion-item:last-child {
      margin-bottom: 0;
    }

    ion-item:focus-within {
      --background: rgba(var(--ion-color-primary-rgb), 0.05);
      box-shadow: 0 0 0 2px rgba(var(--ion-color-primary-rgb), 0.15);
    }

    ion-select, ion-input {
      --padding-top: var(--sp-sm);
      --padding-bottom: var(--sp-sm);
      font-size: 0.9375rem;
    }

    /* Prevent select text truncation */
    ion-select::part(text) {
      white-space: normal;
      overflow: visible;
      text-overflow: unset;
      font-size: 0.9375rem;
    }

    ion-select::part(placeholder) {
      opacity: 0.5;
      font-size: 0.875rem;
    }

    /* Error & Hint Notes */
    .error-note {
      display: block;
      padding: var(--sp-xs) var(--sp-md);
      font-size: 0.8125rem;
      font-weight: 500;
      margin-top: -0.25rem;
      margin-bottom: var(--sp-sm);
    }

    .hint-note {
      display: flex;
      align-items: center;
      gap: var(--sp-xs);
      padding: var(--sp-xs) var(--sp-md);
      font-size: 0.8125rem;
      font-style: italic;
      margin-top: -0.25rem;
      margin-bottom: var(--sp-sm);
      opacity: 0.75;
    }

    .hint-note::before {
      content: "ⓘ";
      font-style: normal;
      font-size: 0.875rem;
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

      ion-select, ion-input {
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
export class LaboralFormPage implements OnInit {
  form!: FormGroup;
  
  tiposAfiliado = TIPOS_AFILIADO;
  
  // ── Datos de dropdowns (desde API) ──────────────
  departamentos = signal<Departamento[]>([]);
  municipios = signal<Municipio[]>([]);
  secretarias = signal<Secretaria[]>([]);
  establecimientos = signal<Establecimiento[]>([]);
  sedes = signal<Sede[]>([]);
  
  // ── Loading states ──────────────────────────────
  loadingDepartamentos = signal(false);
  loadingMunicipios = signal(false);
  loadingSecretarias = signal(false);
  loadingEstablecimientos = signal(false);
  loadingSedes = signal(false);
  
  tipoAfiliadoSeleccionado = signal<TipoAfiliado | ''>('');
  
  // Grados según el escalafón
  gradosEscalafon = signal<string[]>([]);

  constructor(
    private fb: FormBuilder,
    private flujoService: FlujoActualizacionService,
    private institucionesService: InstitucionesApiService,
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
    this.cargarCatalogosIniciales();
    this.cargarDatosExistentes();
  }

  private initForm(): void {
    this.form = this.fb.group({
      tipoAfiliado: ['', Validators.required],
      departamento: [''],
      municipio: [''],
      secretariaEducacion: [''],
      institucionEducativa: [''],
      sede: [''],
      cargo: [''],
      escalafon: [''],
      gradoEscalafon: [''],
    });
  }

  private setupFormListeners(): void {
    // Escuchar cambios en escalafón para actualizar grados
    this.form.get('escalafon')?.valueChanges.subscribe(escalafon => {
      this.actualizarGrados(escalafon);
    });
  }

  /** Carga departamentos y secretarías iniciales desde la API */
  private async cargarCatalogosIniciales(): Promise<void> {
    this.loadingDepartamentos.set(true);
    this.loadingSecretarias.set(true);

    try {
      const [deps, secs] = await Promise.all([
        this.institucionesService.getDepartamentos(),
        this.institucionesService.getSecretarias(),
      ]);
      this.departamentos.set(deps);
      this.secretarias.set(secs);
    } catch (err) {
      console.error('Error cargando catálogos iniciales:', err);
    } finally {
      this.loadingDepartamentos.set(false);
      this.loadingSecretarias.set(false);
    }
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
      departamento: '',
      municipio: '',
      secretariaEducacion: '',
      institucionEducativa: '',
      sede: '',
      cargo: '',
      escalafon: '',
      gradoEscalafon: '',
    });
    this.municipios.set([]);
    this.establecimientos.set([]);
    this.sedes.set([]);
  }

  private actualizarValidadores(tipo: TipoAfiliado): void {
    const secretaria = this.form.get('secretariaEducacion');
    const institucion = this.form.get('institucionEducativa');
    const cargo = this.form.get('cargo');
    const escalafon = this.form.get('escalafon');
    const departamento = this.form.get('departamento');
    const municipio = this.form.get('municipio');

    // Reset validators
    secretaria?.clearValidators();
    institucion?.clearValidators();
    cargo?.clearValidators();
    escalafon?.clearValidators();
    departamento?.clearValidators();
    municipio?.clearValidators();

    // Agregar validators según tipo
    if (tipo === 'docente_activo' || tipo === 'directivo_activo') {
      departamento?.setValidators([Validators.required]);
      municipio?.setValidators([Validators.required]);
      secretaria?.setValidators([Validators.required]);
      institucion?.setValidators([Validators.required]);
      cargo?.setValidators([Validators.required]);
      escalafon?.setValidators([Validators.required]);
    }

    // Actualizar estado
    departamento?.updateValueAndValidity();
    municipio?.updateValueAndValidity();
    secretaria?.updateValueAndValidity();
    institucion?.updateValueAndValidity();
    cargo?.updateValueAndValidity();
    escalafon?.updateValueAndValidity();
  }

  // ── Eventos de cascada ─────────────────────────

  async onDepartamentoChange(event: any): Promise<void> {
    const codigoDept = event.detail.value;
    
    // Limpiar cascada inferior
    this.form.patchValue({ municipio: '', institucionEducativa: '', sede: '' });
    this.municipios.set([]);
    this.establecimientos.set([]);
    this.sedes.set([]);

    if (!codigoDept) return;

    this.loadingMunicipios.set(true);
    try {
      const munis = await this.institucionesService.getMunicipios(codigoDept);
      this.municipios.set(munis);
    } catch (err) {
      console.error('Error cargando municipios:', err);
    } finally {
      this.loadingMunicipios.set(false);
    }
  }

  async onMunicipioChange(event: any): Promise<void> {
    const codigoMuni = event.detail.value;
    
    // Limpiar cascada inferior
    this.form.patchValue({ institucionEducativa: '', sede: '' });
    this.establecimientos.set([]);
    this.sedes.set([]);

    if (!codigoMuni) return;

    // Cargar establecimientos solo si ya hay secretaría seleccionada
    const secId = this.form.get('secretariaEducacion')?.value;
    if (secId) {
      await this.cargarEstablecimientos(codigoMuni, secId);
    }
  }

  async onSecretariaChange(event: any): Promise<void> {
    const secId = event.detail.value;
    
    // Limpiar cascada inferior
    this.form.patchValue({ institucionEducativa: '', sede: '' });
    this.establecimientos.set([]);
    this.sedes.set([]);

    if (!secId) return;

    // Cargar establecimientos solo si ya hay municipio seleccionado
    const codigoMuni = this.form.get('municipio')?.value;
    if (codigoMuni) {
      await this.cargarEstablecimientos(codigoMuni, secId);
    }
  }

  async onEstablecimientoChange(event: any): Promise<void> {
    const codigoEstab = event.detail.value;
    
    this.form.patchValue({ sede: '' });
    this.sedes.set([]);

    if (!codigoEstab) return;

    this.loadingSedes.set(true);
    try {
      const sedes = await this.institucionesService.getSedes(codigoEstab);
      this.sedes.set(sedes);
    } catch (err) {
      console.error('Error cargando sedes:', err);
    } finally {
      this.loadingSedes.set(false);
    }
  }

  private async cargarEstablecimientos(codigoMunicipio: number, secretariaId: number): Promise<void> {
    this.loadingEstablecimientos.set(true);
    try {
      const estabs = await this.institucionesService.getEstablecimientos(codigoMunicipio, secretariaId);
      this.establecimientos.set(estabs);
    } catch (err) {
      console.error('Error cargando establecimientos:', err);
      this.establecimientos.set([]);
    } finally {
      this.loadingEstablecimientos.set(false);
    }
  }

  puedeCargarEstablecimientos(): boolean {
    const municipio = this.form.get('municipio')?.value;
    const secretaria = this.form.get('secretariaEducacion')?.value;
    return !!(municipio && secretaria);
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
    if (!this.puedeAvanzar()) {
      return;
    }

    const tipo = this.tipoAfiliadoSeleccionado();
    if (!tipo) return;
    
    const datos: InformacionLaboral = {
      tipoAfiliado: tipo as TipoAfiliado,
    };

    const formValue = this.form.getRawValue();

    if (tipo === 'docente_activo' || tipo === 'directivo_activo') {
      datos.secretariaEducacion = formValue.secretariaEducacion?.toString();
      datos.institucionEducativa = formValue.institucionEducativa?.toString();
      datos.cargo = formValue.cargo || '';
      datos.escalafon = formValue.escalafon || '';
      datos.gradoEscalafon = formValue.gradoEscalafon || '';
    }

    if (tipo === 'pensionado') {
      datos.secretariaEducacion = formValue.secretariaEducacion?.toString();
      datos.cargo = formValue.cargo;
    }

    await this.flujoService.guardarLaboral(datos);
  }
}
