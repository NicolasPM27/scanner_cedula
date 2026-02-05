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
  DEPARTAMENTOS,
  MUNICIPIOS,
  LOCALIDADES_BOGOTA,
  BARRIOS_BOGOTA,
  Municipio,
  Barrio,
} from '../../data/datos-geograficos';

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
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/verification"></ion-back-button>
        </ion-buttons>
        <ion-title>Información Sociodemográfica</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <div class="progress-container">
          <div class="progress-info">
            <span class="step-label">Paso 1 de 4</span>
            <span class="step-title">Datos de residencia</span>
          </div>
          <ion-progress-bar [value]="0.25" color="primary"></ion-progress-bar>
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
                  <ion-select
                    formControlName="departamento"
                    label="Departamento"
                    labelPlacement="stacked"
                    placeholder="Seleccione el departamento"
                    interface="action-sheet"
                    (ionChange)="onDepartamentoChange($event)"
                  >
                    @for (depto of departamentos; track depto.codigo) {
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
                  <ion-select
                    formControlName="municipio"
                    label="Municipio"
                    labelPlacement="stacked"
                    placeholder="Seleccione el municipio"
                    interface="action-sheet"
                    [disabled]="municipiosFiltrados().length === 0"
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
  `]
})
export class SociodemograficoFormPage implements OnInit {
  form!: FormGroup;
  
  // Opciones para selects
  estadosCiviles = ESTADOS_CIVILES;
  zonas = ZONAS;
  estratos = ESTRATOS;
  departamentos = DEPARTAMENTOS;
  localidades = LOCALIDADES_BOGOTA;
  
  // Signals para filtrado dinámico
  municipiosFiltrados = signal<Municipio[]>([]);
  barriosFiltrados = signal<Barrio[]>([]);
  esBogota = signal(false);

  constructor(
    private fb: FormBuilder,
    private flujoService: FlujoActualizacionService,
    private router: Router
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
    this.cargarDatosExistentes();
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

  private cargarDatosExistentes(): void {
    const afiliado = this.flujoService.afiliado();
    if (afiliado?.sociodemografica) {
      const socio = afiliado.sociodemografica;
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

      // Actualizar filtros si hay datos
      if (socio.departamento) {
        this.actualizarMunicipios(socio.departamento);
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

  onDepartamentoChange(event: any): void {
    const codigoDepartamento = event.detail.value;
    this.actualizarMunicipios(codigoDepartamento);
    
    // Limpiar municipio y localidad/barrio
    this.form.patchValue({
      municipio: '',
      localidad: '',
      barrio: '',
    });
    this.esBogota.set(false);
    this.barriosFiltrados.set([]);
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

  private actualizarMunicipios(codigoDepartamento: string): void {
    const filtrados = MUNICIPIOS.filter(m => m.codigoDepartamento === codigoDepartamento);
    this.municipiosFiltrados.set(filtrados);
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
    await this.router.navigate(['/verification']);
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
