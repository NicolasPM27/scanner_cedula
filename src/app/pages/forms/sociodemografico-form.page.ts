import { Component, OnInit, signal, computed } from '@angular/core';
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
  IonSpinner,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForward,
  arrowBack,
  homeOutline,
  locationOutline,
  businessOutline,
  checkmarkCircle,
} from 'ionicons/icons';
import { FlujoActualizacionService } from '../../services/flujo-actualizacion.service';
import {
  ESTADOS_CIVILES,
  ZONAS,
  ESTRATOS,
  InformacionSociodemografica,
} from '../../models/afiliado.model';
import {
  LOCALIDADES_BOGOTA,
  BARRIOS_BOGOTA,
  Barrio,
} from '../../data/datos-geograficos';
import { GeoApiService, GeoDepartamento, GeoMunicipio } from '../../services/geo-api.service';

@Component({
  selector: 'app-sociodemografico-form',
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
        <ion-title>Información Sociodemográfica</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <div class="progress-container">
          <div class="progress-info">
            <span class="step-label">Paso 2 de 4</span>
            <span class="step-title">Datos de residencia</span>
          </div>
          <ion-progress-bar [value]="0.5" color="primary"></ion-progress-bar>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="form-content">
      <div class="form-container">
        
        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          
          <!-- Estado Civil -->
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="home-outline"></ion-icon>
                Estado Civil
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-select
                    formControlName="estadoCivil"
                    label="Estado Civil"
                    labelPlacement="stacked"
                    placeholder="Seleccione su estado civil"
                    interface="action-sheet"
                  >
                    @for (estado of estadosCiviles; track estado.value) {
                      <ion-select-option [value]="estado.value">
                        {{ estado.label }}
                      </ion-select-option>
                    }
                  </ion-select>
                </ion-item>
                @if (showError('estadoCivil')) {
                  <ion-note color="danger" class="error-note">
                    Seleccione su estado civil
                  </ion-note>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Ubicación -->
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="location-outline"></ion-icon>
                Ubicación de Residencia
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                
                <!-- Zona -->
                <ion-item>
                  <ion-select
                    formControlName="zona"
                    label="Zona"
                    labelPlacement="stacked"
                    placeholder="Urbana o Rural"
                    interface="action-sheet"
                    (ionChange)="onZonaChange($event)"
                  >
                    @for (zona of zonas; track zona.value) {
                      <ion-select-option [value]="zona.value">
                        {{ zona.label }}
                      </ion-select-option>
                    }
                  </ion-select>
                </ion-item>
                @if (showError('zona')) {
                  <ion-note color="danger" class="error-note">
                    Seleccione la zona
                  </ion-note>
                }

                <!-- Departamento -->
                <ion-item>
                  @if (loadingDepartamentos()) {
                    <ion-spinner name="crescent" class="select-spinner"></ion-spinner>
                  }
                  <ion-select
                    formControlName="departamento"
                    label="Departamento"
                    labelPlacement="stacked"
                    placeholder="Seleccione el departamento"
                    interface="action-sheet"
                    [disabled]="loadingDepartamentos() || departamentos().length === 0"
                    (ionChange)="onDepartamentoChange($event)"
                  >
                    @for (depto of departamentos(); track depto.codigo) {
                      <ion-select-option [value]="depto.codigo">
                        {{ depto.nombre }}
                      </ion-select-option>
                    }
                  </ion-select>
                </ion-item>
                @if (showError('departamento')) {
                  <ion-note color="danger" class="error-note">
                    Seleccione el departamento
                  </ion-note>
                }

                <!-- Municipio -->
                <ion-item>
                  @if (loadingMunicipios()) {
                    <ion-spinner name="crescent" class="select-spinner"></ion-spinner>
                  }
                  <ion-select
                    formControlName="municipio"
                    label="Municipio"
                    labelPlacement="stacked"
                    placeholder="Seleccione el municipio"
                    interface="action-sheet"
                    [disabled]="loadingMunicipios() || municipiosFiltrados().length === 0"
                    (ionChange)="onMunicipioChange($event)"
                  >
                    @for (mun of municipiosFiltrados(); track mun.codigo) {
                      <ion-select-option [value]="mun.codigo">
                        {{ mun.nombre }}
                      </ion-select-option>
                    }
                  </ion-select>
                </ion-item>
                @if (showError('municipio')) {
                  <ion-note color="danger" class="error-note">
                    Seleccione el municipio
                  </ion-note>
                }

                <!-- Localidad (Solo Bogotá) -->
                @if (esBogota()) {
                  <ion-item>
                    <ion-select
                      formControlName="localidad"
                      label="Localidad"
                      labelPlacement="stacked"
                      placeholder="Seleccione la localidad"
                      interface="action-sheet"
                      (ionChange)="onLocalidadChange($event)"
                    >
                      @for (loc of localidades; track loc.codigo) {
                        <ion-select-option [value]="loc.codigo">
                          {{ loc.nombre }}
                        </ion-select-option>
                      }
                    </ion-select>
                  </ion-item>
                }

                <!-- Barrio -->
                @if (esBogota()) {
                  <ion-item>
                    <ion-select
                      formControlName="barrio"
                      label="Barrio"
                      labelPlacement="stacked"
                      placeholder="Seleccione el barrio"
                      interface="action-sheet"
                      [disabled]="barriosFiltrados().length === 0"
                    >
                      @for (barrio of barriosFiltrados(); track barrio.codigo) {
                        <ion-select-option [value]="barrio.codigo">
                          {{ barrio.nombre }}
                        </ion-select-option>
                      }
                    </ion-select>
                  </ion-item>
                }

                <!-- Dirección -->
                <ion-item>
                  <ion-input
                    formControlName="direccion"
                    label="Dirección de residencia"
                    labelPlacement="stacked"
                    placeholder="Ej: Calle 100 # 15-20 Apto 301"
                    type="text"
                    [counter]="true"
                    maxlength="200"
                  ></ion-input>
                </ion-item>
                @if (showError('direccion')) {
                  <ion-note color="danger" class="error-note">
                    Ingrese su dirección de residencia
                  </ion-note>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Estrato -->
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="business-outline"></ion-icon>
                Estrato Socioeconómico
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-select
                    formControlName="estrato"
                    label="Estrato"
                    labelPlacement="stacked"
                    placeholder="Seleccione su estrato"
                    interface="action-sheet"
                  >
                    @for (estrato of estratos; track estrato.value) {
                      <ion-select-option [value]="estrato.value">
                        {{ estrato.label }}
                      </ion-select-option>
                    }
                  </ion-select>
                </ion-item>
                @if (showError('estrato')) {
                  <ion-note color="danger" class="error-note">
                    Seleccione su estrato
                  </ion-note>
                }
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
            
            <ion-button 
              type="submit"
              [disabled]="!form.valid"
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
    /* ==================================
       SHARED FORM STYLES - MD3
       ================================== */

    :host {
      --form-max-width: 600px;
      --form-padding: var(--space-md, 16px);
    }

    .form-content {
      --background: var(--ion-background-color);
    }

    /* Progress Indicator */
    .progress-container {
      padding: var(--space-sm, 12px) var(--space-md, 16px);
    }

    .progress-info {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: var(--space-xs, 8px);
    }

    .step-label {
      font-size: 0.75rem;
      color: var(--ion-color-primary);
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .step-title {
      font-size: 0.8125rem;
      color: var(--ion-color-medium-shade);
      font-weight: 500;
    }

    ion-progress-bar {
      height: 6px;
      border-radius: var(--radius-full, 9999px);
      --buffer-background: rgba(var(--ion-color-primary-rgb), 0.08);
    }

    /* Form Container */
    .form-container {
      padding: var(--form-padding);
      max-width: var(--form-max-width);
      margin: 0 auto;
      padding-bottom: env(safe-area-inset-bottom, 0);
    }

    /* Cards */
    .form-card {
      margin-bottom: var(--space-md, 16px);
      border-radius: var(--radius-lg, 16px);
      box-shadow: var(--elevation-1, 0 1px 2px rgba(0,0,0,0.05), 0 1px 3px rgba(0,0,0,0.1));
    }

    .form-card ion-card-header {
      padding-bottom: var(--space-xs, 8px);
    }

    .form-card ion-card-title {
      display: flex;
      align-items: center;
      gap: var(--space-sm, 12px);
      font-size: 1rem;
      font-weight: 600;
      line-height: 1.3;
    }

    .form-card ion-card-title ion-icon {
      font-size: 1.25rem;
      color: var(--ion-color-primary);
      flex-shrink: 0;
    }

    /* Lists & Items */
    ion-list {
      background: transparent;
    }

    ion-item {
      --background: var(--surface-container, #f1f5f9);
      --border-radius: var(--radius-md, 12px);
      --min-height: 56px;
      margin-bottom: var(--space-sm, 12px);
      --padding-start: var(--space-md, 16px);
      --padding-end: var(--space-md, 16px);
      transition: background-color 0.2s ease, box-shadow 0.2s ease;
    }

    ion-item:last-child {
      margin-bottom: 0;
    }

    ion-item:focus-within {
      --background: rgba(var(--ion-color-primary-rgb), 0.06);
      box-shadow: 0 0 0 2px rgba(var(--ion-color-primary-rgb), 0.2);
    }

    ion-select, ion-input {
      --padding-top: var(--space-sm, 12px);
      --padding-bottom: var(--space-sm, 12px);
    }

    /* Error Notes */
    .error-note {
      display: block;
      padding: var(--space-xs, 8px) var(--space-md, 16px);
      font-size: 0.75rem;
      font-weight: 500;
      margin-top: -4px;
      margin-bottom: var(--space-sm, 12px);
    }

    /* Form Actions */
    .form-actions {
      display: flex;
      justify-content: space-between;
      gap: var(--space-md, 16px);
      margin-top: var(--space-xl, 32px);
      padding-bottom: calc(var(--space-xl, 32px) + env(safe-area-inset-bottom, 0));
    }

    .form-actions ion-button {
      flex: 1;
      --border-radius: var(--radius-lg, 16px);
      min-height: 52px;
      font-weight: 600;
      font-size: 0.9375rem;
    }

    .form-actions ion-button[fill="outline"] {
      --background: transparent;
      --border-width: 1.5px;
    }

    .select-spinner {
      position: absolute;
      right: 16px;
      top: 50%;
      transform: translateY(-50%);
      width: 20px;
      height: 20px;
      z-index: 1;
    }
  `]
})
export class SociodemograficoFormPage implements OnInit {
  form!: FormGroup;
  
  // Opciones para selects
  estadosCiviles = ESTADOS_CIVILES;
  zonas = ZONAS;
  estratos = ESTRATOS;
  localidades = LOCALIDADES_BOGOTA;

  // Signals para datos geográficos dinámicos
  departamentos = signal<GeoDepartamento[]>([]);
  municipiosFiltrados = signal<GeoMunicipio[]>([]);
  barriosFiltrados = signal<Barrio[]>([]);
  esBogota = signal(false);
  loadingDepartamentos = signal(false);
  loadingMunicipios = signal(false);

  constructor(
    private fb: FormBuilder,
    private flujoService: FlujoActualizacionService,
    private router: Router,
    private geoService: GeoApiService
  ) {
    addIcons({
      arrowForward,
      arrowBack,
      homeOutline,
      locationOutline,
      businessOutline,
      checkmarkCircle,
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.cargarDepartamentos();
  }

  private initForm(): void {
    this.form = this.fb.group({
      estadoCivil: ['', Validators.required],
      zona: ['', Validators.required],
      departamento: ['', Validators.required],
      municipio: ['', Validators.required],
      localidad: [''],
      barrio: [''],
      direccion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(200)]],
      estrato: ['', Validators.required],
    });
  }

  private async cargarDepartamentos(): Promise<void> {
    this.loadingDepartamentos.set(true);
    try {
      const deptos = await this.geoService.getDepartamentos();
      this.departamentos.set(deptos);
    } catch (error) {
      console.error('Error cargando departamentos:', error);
    } finally {
      this.loadingDepartamentos.set(false);
    }
    await this.cargarDatosExistentes();
  }

  private async cargarDatosExistentes(): Promise<void> {
    const afiliado = this.flujoService.afiliado();
    if (afiliado?.sociodemografica) {
      const socio = afiliado.sociodemografica;

      // Cargar municipios antes de patchear para que el select tenga opciones
      if (socio.departamento) {
        await this.actualizarMunicipios(socio.departamento);
      }

      this.form.patchValue({
        estadoCivil: socio.estadoCivil,
        zona: socio.zona,
        departamento: socio.departamento,
        municipio: socio.municipio,
        localidad: socio.localidad,
        barrio: socio.barrio,
        direccion: socio.direccion,
        estrato: socio.estrato,
      });

      if (socio.municipio) {
        this.verificarBogota(socio.municipio);
      }
      if (socio.localidad) {
        this.actualizarBarrios(socio.localidad);
      }
    }
  }

  onZonaChange(event: any): void {
    // Si cambia a rural, limpiar localidad y barrio
    if (event.detail.value === 'rural') {
      this.form.patchValue({
        localidad: '',
        barrio: '',
      });
    }
  }

  async onDepartamentoChange(event: any): Promise<void> {
    const codigoDepartamento = event.detail.value;

    // Limpiar municipio y localidad/barrio
    this.form.patchValue({
      municipio: '',
      localidad: '',
      barrio: '',
    });
    this.esBogota.set(false);
    this.barriosFiltrados.set([]);

    await this.actualizarMunicipios(codigoDepartamento);
  }

  onMunicipioChange(event: any): void {
    const codigoMunicipio = event.detail.value;
    this.verificarBogota(codigoMunicipio);
    
    // Limpiar localidad y barrio
    this.form.patchValue({
      localidad: '',
      barrio: '',
    });
    this.barriosFiltrados.set([]);
  }

  onLocalidadChange(event: any): void {
    const codigoLocalidad = event.detail.value;
    this.actualizarBarrios(codigoLocalidad);
    
    // Limpiar barrio
    this.form.patchValue({
      barrio: '',
    });
  }

  private async actualizarMunicipios(codigoDepartamento: string): Promise<void> {
    this.loadingMunicipios.set(true);
    try {
      const municipios = await this.geoService.getMunicipios(codigoDepartamento);
      this.municipiosFiltrados.set(municipios);
    } catch (error) {
      console.error('Error cargando municipios:', error);
      this.municipiosFiltrados.set([]);
    } finally {
      this.loadingMunicipios.set(false);
    }
  }

  private verificarBogota(codigoMunicipio: string): void {
    // Bogotá tiene código 11001
    this.esBogota.set(codigoMunicipio === '11001');
  }

  private actualizarBarrios(codigoLocalidad: string): void {
    const filtrados = BARRIOS_BOGOTA.filter(b => b.codigoLocalidad === codigoLocalidad);
    this.barriosFiltrados.set(filtrados);
  }

  showError(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  async volver(): Promise<void> {
    await this.router.navigate(['/forms/contact']);
  }

  async onSubmit(): Promise<void> {
    if (this.form.valid) {
      const datos: InformacionSociodemografica = {
        estadoCivil: this.form.value.estadoCivil,
        zona: this.form.value.zona,
        departamento: this.form.value.departamento,
        municipio: this.form.value.municipio,
        localidad: this.form.value.localidad || undefined,
        barrio: this.form.value.barrio || undefined,
        direccion: this.form.value.direccion,
        estrato: this.form.value.estrato,
      };

      await this.flujoService.guardarSociodemografico(datos);
    } else {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
    }
  }
}
