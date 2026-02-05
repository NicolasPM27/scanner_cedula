import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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
  IonButtons,
  IonBackButton,
  IonNote,
  IonChip,
  IonAvatar,
  IonText,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForward,
  arrowBack,
  personOutline,
  homeOutline,
  locationOutline,
  callOutline,
  mailOutline,
  saveOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { FlujoActualizacionService } from '../../services/flujo-actualizacion.service';
import {
  Beneficiario,
  InformacionSociodemografica,
  InformacionContacto,
  ESTADOS_CIVILES,
  ZONAS,
  ESTRATOS,
} from '../../models/afiliado.model';
import {
  DEPARTAMENTOS,
  MUNICIPIOS,
  Municipio,
} from '../../data/datos-geograficos';

@Component({
  selector: 'app-beneficiary-detail',
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
    IonButtons,
    IonBackButton,
    IonNote,
    IonChip,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/beneficiaries"></ion-back-button>
        </ion-buttons>
        <ion-title>Actualizar Beneficiario</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="form-content">
      <div class="form-container">
        
        @if (beneficiario()) {
          <!-- Beneficiary Header -->
          <ion-card class="beneficiary-header-card">
            <ion-card-content>
              <div class="beneficiary-header">
                <div class="beneficiary-avatar" [class.adult]="beneficiario()!.edad >= 18">
                  <span>{{ getInitials() }}</span>
                </div>
                <div class="beneficiary-info">
                  <h2>
                    {{ beneficiario()?.primerNombre }} {{ beneficiario()?.segundoNombre }}
                    {{ beneficiario()?.primerApellido }} {{ beneficiario()?.segundoApellido }}
                  </h2>
                  <p>{{ getTipoDocumento() }}: {{ beneficiario()?.numeroDocumento }}</p>
                  <div class="beneficiary-chips">
                    <ion-chip [color]="getParentescoColor()">
                      {{ formatParentesco() }}
                    </ion-chip>
                    <ion-chip color="medium">
                      {{ beneficiario()?.edad }} años
                    </ion-chip>
                  </div>
                </div>
              </div>
            </ion-card-content>
          </ion-card>

          <form [formGroup]="form" (ngSubmit)="onSubmit()">
            
            <!-- Información Sociodemográfica -->
            <ion-card class="form-card">
              <ion-card-header>
                <ion-card-title>
                  <ion-icon name="home-outline"></ion-icon>
                  Información de Residencia
                </ion-card-title>
              </ion-card-header>
              <ion-card-content>
                <ion-list lines="none">
                  
                  <!-- Estado Civil (solo mayores de edad) -->
                  @if (esMayorDeEdad()) {
                    <ion-item>
                      <ion-select
                        formControlName="estadoCivil"
                        label="Estado Civil"
                        labelPlacement="stacked"
                        placeholder="Seleccione estado civil"
                        interface="action-sheet"
                      >
                        @for (estado of estadosCiviles; track estado.value) {
                          <ion-select-option [value]="estado.value">
                            {{ estado.label }}
                          </ion-select-option>
                        }
                      </ion-select>
                    </ion-item>
                  }

                  <!-- Zona -->
                  <ion-item>
                    <ion-select
                      formControlName="zona"
                      label="Zona"
                      labelPlacement="stacked"
                      placeholder="Urbana o Rural"
                      interface="action-sheet"
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

                  <!-- Dirección -->
                  <ion-item>
                    <ion-input
                      formControlName="direccion"
                      label="Dirección de residencia"
                      labelPlacement="stacked"
                      placeholder="Ej: Calle 100 # 15-20"
                      type="text"
                    ></ion-input>
                  </ion-item>
                  @if (showError('direccion')) {
                    <ion-note color="danger" class="error-note">
                      Ingrese la dirección
                    </ion-note>
                  }

                  <!-- Estrato -->
                  <ion-item>
                    <ion-select
                      formControlName="estrato"
                      label="Estrato"
                      labelPlacement="stacked"
                      placeholder="Seleccione el estrato"
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
                      Seleccione el estrato
                    </ion-note>
                  }
                </ion-list>
              </ion-card-content>
            </ion-card>

            <!-- Información de Contacto (solo mayores de edad) -->
            @if (esMayorDeEdad()) {
              <ion-card class="form-card">
                <ion-card-header>
                  <ion-card-title>
                    <ion-icon name="call-outline"></ion-icon>
                    Información de Contacto
                    <ion-chip color="warning" class="required-chip">Requerido</ion-chip>
                  </ion-card-title>
                </ion-card-header>
                <ion-card-content>
                  
                  <!-- Info -->
                  <div class="info-banner">
                    <ion-icon name="information-circle-outline"></ion-icon>
                    <p>
                      Los beneficiarios mayores de 18 años deben proporcionar información de contacto actualizada.
                    </p>
                  </div>

                  <ion-list lines="none">
                    
                    <!-- Correo electrónico -->
                    <ion-item>
                      <ion-input
                        formControlName="correoElectronico"
                        label="Correo electrónico"
                        labelPlacement="stacked"
                        placeholder="ejemplo@correo.com"
                        type="email"
                      ></ion-input>
                    </ion-item>
                    @if (showError('correoElectronico')) {
                      <ion-note color="danger" class="error-note">
                        Ingrese un correo electrónico válido
                      </ion-note>
                    }

                    <!-- Celular -->
                    <ion-item>
                      <ion-input
                        formControlName="celular"
                        label="Número celular"
                        labelPlacement="stacked"
                        placeholder="3001234567"
                        type="tel"
                        maxlength="10"
                      ></ion-input>
                    </ion-item>
                    @if (showError('celular')) {
                      <ion-note color="danger" class="error-note">
                        Ingrese un número celular válido (10 dígitos)
                      </ion-note>
                    }
                  </ion-list>
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
                Cancelar
              </ion-button>
              
              <ion-button 
                type="submit"
                [disabled]="!form.valid"
              >
                <ion-icon slot="start" name="save-outline"></ion-icon>
                Guardar
              </ion-button>
            </div>

          </form>
        } @else {
          <!-- Loading or Error State -->
          <ion-card>
            <ion-card-content>
              <p class="text-center text-muted">Cargando información del beneficiario...</p>
            </ion-card-content>
          </ion-card>
        }

      </div>
    </ion-content>
  `,
  styles: [`
    .form-content {
      --background: var(--ion-background-color);
    }

    .form-container {
      padding: var(--space-md, 16px);
      max-width: 600px;
      margin: 0 auto;
    }

    .beneficiary-header-card {
      border-radius: var(--radius-xl, 24px);
      margin-bottom: var(--space-md, 16px);
    }

    .beneficiary-header {
      display: flex;
      gap: var(--space-md, 16px);
      align-items: center;
    }

    .beneficiary-avatar {
      width: 72px;
      height: 72px;
      border-radius: 50%;
      background: var(--ion-color-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .beneficiary-avatar.adult {
      background: var(--ion-color-tertiary);
    }

    .beneficiary-avatar span {
      color: white;
      font-size: 1.5rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .beneficiary-info {
      flex: 1;
    }

    .beneficiary-info h2 {
      margin: 0 0 var(--space-xs, 4px);
      font-size: 1.125rem;
      font-weight: 600;
    }

    .beneficiary-info p {
      margin: 0 0 var(--space-sm, 8px);
      font-size: 0.875rem;
      color: var(--ion-color-medium);
    }

    .beneficiary-chips {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-xs, 4px);
    }

    .beneficiary-chips ion-chip {
      height: 24px;
      font-size: 0.6875rem;
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

    .required-chip {
      margin-left: auto;
      height: 20px;
      font-size: 0.625rem;
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
      background: rgba(var(--ion-color-warning-rgb), 0.1);
      border-radius: var(--radius-lg, 16px);
      margin-bottom: var(--space-md, 16px);
      align-items: flex-start;
    }

    .info-banner ion-icon {
      font-size: 1.5rem;
      color: var(--ion-color-warning);
      flex-shrink: 0;
      margin-top: 2px;
    }

    .info-banner p {
      margin: 0;
      font-size: 0.875rem;
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

    .text-center {
      text-align: center;
    }
  `]
})
export class BeneficiaryDetailPage implements OnInit {
  form!: FormGroup;
  beneficiario = signal<Beneficiario | undefined>(undefined);
  municipiosFiltrados = signal<Municipio[]>([]);

  // Options
  estadosCiviles = ESTADOS_CIVILES;
  zonas = ZONAS;
  estratos = ESTRATOS;
  departamentos = DEPARTAMENTOS;

  // Regex patterns
  private emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private celularPattern = /^3[0-9]{9}$/;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private flujoService: FlujoActualizacionService
  ) {
    addIcons({
      arrowForward,
      arrowBack,
      personOutline,
      homeOutline,
      locationOutline,
      callOutline,
      mailOutline,
      saveOutline,
      informationCircleOutline,
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.cargarBeneficiario();
  }

  private initForm(): void {
    this.form = this.fb.group({
      // Sociodemográfico
      estadoCivil: [''],
      zona: ['', Validators.required],
      departamento: ['', Validators.required],
      municipio: ['', Validators.required],
      direccion: ['', [Validators.required, Validators.minLength(5)]],
      estrato: ['', Validators.required],
      // Contacto (se agregan validators dinámicamente)
      correoElectronico: [''],
      celular: [''],
    });
  }

  private cargarBeneficiario(): void {
    const id = this.route.snapshot.paramMap.get('id');
    const beneficiarioSeleccionado = this.flujoService.beneficiarioSeleccionado();
    
    if (beneficiarioSeleccionado && id && beneficiarioSeleccionado.id === id) {
      this.beneficiario.set(beneficiarioSeleccionado);
      this.configurarValidadores();
      this.cargarDatosExistentes();
    } else {
      // Buscar en la lista de beneficiarios
      const afiliado = this.flujoService.afiliado();
      const encontrado = afiliado?.beneficiarios?.find(b => b.id === id);
      if (encontrado) {
        this.beneficiario.set(encontrado);
        this.configurarValidadores();
        this.cargarDatosExistentes();
      }
    }
  }

  private configurarValidadores(): void {
    const beneficiario = this.beneficiario();
    if (beneficiario && beneficiario.edad >= 18) {
      // Agregar validators para contacto
      this.form.get('correoElectronico')?.setValidators([
        Validators.required,
        Validators.pattern(this.emailPattern)
      ]);
      this.form.get('celular')?.setValidators([
        Validators.required,
        Validators.pattern(this.celularPattern)
      ]);
      this.form.get('correoElectronico')?.updateValueAndValidity();
      this.form.get('celular')?.updateValueAndValidity();
    }
  }

  private cargarDatosExistentes(): void {
    const beneficiario = this.beneficiario();
    if (beneficiario?.sociodemografica) {
      const socio = beneficiario.sociodemografica;
      this.form.patchValue({
        estadoCivil: socio.estadoCivil,
        zona: socio.zona,
        departamento: socio.departamento,
        municipio: socio.municipio,
        direccion: socio.direccion,
        estrato: socio.estrato,
      });

      if (socio.departamento) {
        this.actualizarMunicipios(socio.departamento);
      }
    }

    if (beneficiario?.contacto) {
      this.form.patchValue({
        correoElectronico: beneficiario.contacto.correoElectronico,
        celular: beneficiario.contacto.celular,
      });
    }
  }

  esMayorDeEdad(): boolean {
    return (this.beneficiario()?.edad ?? 0) >= 18;
  }

  getInitials(): string {
    const b = this.beneficiario();
    if (!b) return '';
    const first = b.primerNombre?.charAt(0) || '';
    const last = b.primerApellido?.charAt(0) || '';
    return `${first}${last}`;
  }

  getTipoDocumento(): string {
    const tipo = this.beneficiario()?.tipoDocumento;
    const tipos: Record<string, string> = {
      'CC': 'C.C.',
      'TI': 'T.I.',
      'RC': 'R.C.',
      'CE': 'C.E.',
      'PA': 'Pasaporte',
    };
    return tipo ? (tipos[tipo] || tipo) : '';
  }

  formatParentesco(): string {
    const parentesco = this.beneficiario()?.parentesco;
    const parentescos: Record<string, string> = {
      'conyuge': 'Cónyuge',
      'hijo': 'Hijo/a',
      'padre': 'Padre',
      'madre': 'Madre',
      'hermano': 'Hermano/a',
    };
    return parentesco ? (parentescos[parentesco] || parentesco) : '';
  }

  getParentescoColor(): string {
    const parentesco = this.beneficiario()?.parentesco;
    const colores: Record<string, string> = {
      'conyuge': 'primary',
      'hijo': 'secondary',
      'padre': 'tertiary',
      'madre': 'tertiary',
      'hermano': 'medium',
    };
    return parentesco ? (colores[parentesco] || 'medium') : 'medium';
  }

  onDepartamentoChange(event: any): void {
    const codigoDepartamento = event.detail.value;
    this.actualizarMunicipios(codigoDepartamento);
    this.form.patchValue({ municipio: '' });
  }

  private actualizarMunicipios(codigoDepartamento: string): void {
    const filtrados = MUNICIPIOS.filter(m => m.codigoDepartamento === codigoDepartamento);
    this.municipiosFiltrados.set(filtrados);
  }

  showError(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.invalid && (control.dirty || control.touched));
  }

  async volver(): Promise<void> {
    await this.router.navigate(['/beneficiaries']);
  }

  async onSubmit(): Promise<void> {
    if (this.form.valid && this.beneficiario()) {
      const sociodemografico: InformacionSociodemografica = {
        estadoCivil: this.form.value.estadoCivil || undefined,
        zona: this.form.value.zona,
        departamento: this.form.value.departamento,
        municipio: this.form.value.municipio,
        direccion: this.form.value.direccion,
        estrato: this.form.value.estrato,
      };

      let contacto: InformacionContacto | undefined;
      if (this.esMayorDeEdad()) {
        contacto = {
          correoElectronico: this.form.value.correoElectronico,
          celular: this.form.value.celular,
        };
      }

      await this.flujoService.guardarDatosBeneficiario(
        this.beneficiario()!.id,
        sociodemografico,
        contacto
      );
    } else {
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
    }
  }
}
