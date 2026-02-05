import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
  AbstractControl,
  ValidationErrors,
} from '@angular/forms';
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
  IonList,
  IonProgressBar,
  IonText,
  IonButtons,
  IonBackButton,
  IonNote,
  IonChip,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  arrowForward,
  arrowBack,
  mailOutline,
  callOutline,
  checkmarkCircle,
  closeCircle,
  informationCircleOutline,
} from 'ionicons/icons';
import { FlujoActualizacionService } from '../../services/flujo-actualizacion.service';
import { InformacionContacto } from '../../models/afiliado.model';

// Validador personalizado para confirmar campos
function matchValidator(controlName: string, matchingControlName: string) {
  return (formGroup: AbstractControl): ValidationErrors | null => {
    const control = formGroup.get(controlName);
    const matchingControl = formGroup.get(matchingControlName);

    if (!control || !matchingControl) {
      return null;
    }

    if (matchingControl.errors && !matchingControl.errors['mismatch']) {
      return null;
    }

    if (control.value !== matchingControl.value) {
      matchingControl.setErrors({ mismatch: true });
      return { mismatch: true };
    } else {
      matchingControl.setErrors(null);
      return null;
    }
  };
}

@Component({
  selector: 'app-contacto-form',
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
    IonLabel,
    IonInput,
    IonList,
    IonProgressBar,
    IonButtons,
    IonBackButton,
    IonNote,
    IonChip,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/forms/sociodemographic"></ion-back-button>
        </ion-buttons>
        <ion-title>Información de Contacto</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <div class="progress-container">
          <div class="progress-info">
            <span class="step-label">Paso 2 de 4</span>
            <span class="step-title">Datos de contacto</span>
          </div>
          <ion-progress-bar [value]="0.50" color="primary"></ion-progress-bar>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="form-content">
      <div class="form-container">
        
        <!-- Nota informativa -->
        <div class="info-banner">
          <ion-icon name="information-circle-outline"></ion-icon>
          <p>
            Por favor ingrese cada dato dos veces para verificar que la información sea correcta.
            Es importante que estos datos estén actualizados para poder contactarle.
          </p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          
          <!-- Correo Electrónico -->
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="mail-outline"></ion-icon>
                Correo Electrónico
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                
                <!-- Correo principal -->
                <ion-item [class.valid]="isFieldValid('correoElectronico')">
                  <ion-input
                    formControlName="correoElectronico"
                    label="Correo electrónico"
                    labelPlacement="stacked"
                    placeholder="ejemplo@correo.com"
                    type="email"
                    autocomplete="email"
                    inputmode="email"
                  ></ion-input>
                  @if (isFieldValid('correoElectronico')) {
                    <ion-icon name="checkmark-circle" color="success" slot="end"></ion-icon>
                  }
                </ion-item>
                @if (showError('correoElectronico', 'required')) {
                  <ion-note color="danger" class="error-note">
                    El correo electrónico es obligatorio
                  </ion-note>
                }
                @if (showError('correoElectronico', 'email')) {
                  <ion-note color="danger" class="error-note">
                    Ingrese un correo electrónico válido
                  </ion-note>
                }
                @if (showError('correoElectronico', 'pattern')) {
                  <ion-note color="danger" class="error-note">
                    Ingrese un correo electrónico válido
                  </ion-note>
                }

                <!-- Confirmar correo -->
                <ion-item [class.valid]="isConfirmationValid('correoElectronico', 'confirmarCorreo')">
                  <ion-input
                    formControlName="confirmarCorreo"
                    label="Confirmar correo electrónico"
                    labelPlacement="stacked"
                    placeholder="Ingrese nuevamente su correo"
                    type="email"
                    autocomplete="off"
                    inputmode="email"
                    (paste)="preventPaste($event)"
                  ></ion-input>
                  @if (isConfirmationValid('correoElectronico', 'confirmarCorreo')) {
                    <ion-icon name="checkmark-circle" color="success" slot="end"></ion-icon>
                  }
                </ion-item>
                @if (showError('confirmarCorreo', 'required')) {
                  <ion-note color="danger" class="error-note">
                    Confirme su correo electrónico
                  </ion-note>
                }
                @if (showError('confirmarCorreo', 'mismatch')) {
                  <ion-note color="danger" class="error-note">
                    Los correos electrónicos no coinciden
                  </ion-note>
                }

                <!-- Indicador de coincidencia -->
                @if (getFieldValue('correoElectronico') && getFieldValue('confirmarCorreo')) {
                  <div class="match-indicator" [class.match]="emailsMatch()" [class.no-match]="!emailsMatch()">
                    <ion-chip [color]="emailsMatch() ? 'success' : 'danger'">
                      <ion-icon [name]="emailsMatch() ? 'checkmark-circle' : 'close-circle'"></ion-icon>
                      <ion-label>{{ emailsMatch() ? 'Los correos coinciden' : 'Los correos no coinciden' }}</ion-label>
                    </ion-chip>
                  </div>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Teléfono Celular -->
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="call-outline"></ion-icon>
                Teléfono Celular
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                
                <!-- Celular principal -->
                <ion-item [class.valid]="isFieldValid('celular')">
                  <ion-input
                    formControlName="celular"
                    label="Número celular"
                    labelPlacement="stacked"
                    placeholder="3001234567"
                    type="tel"
                    inputmode="numeric"
                    maxlength="10"
                    [counter]="true"
                  ></ion-input>
                  @if (isFieldValid('celular')) {
                    <ion-icon name="checkmark-circle" color="success" slot="end"></ion-icon>
                  }
                </ion-item>
                @if (showError('celular', 'required')) {
                  <ion-note color="danger" class="error-note">
                    El número celular es obligatorio
                  </ion-note>
                }
                @if (showError('celular', 'pattern')) {
                  <ion-note color="danger" class="error-note">
                    Ingrese un número celular válido (10 dígitos, inicia con 3)
                  </ion-note>
                }
                @if (showError('celular', 'minlength') || showError('celular', 'maxlength')) {
                  <ion-note color="danger" class="error-note">
                    El número debe tener 10 dígitos
                  </ion-note>
                }

                <!-- Confirmar celular -->
                <ion-item [class.valid]="isConfirmationValid('celular', 'confirmarCelular')">
                  <ion-input
                    formControlName="confirmarCelular"
                    label="Confirmar número celular"
                    labelPlacement="stacked"
                    placeholder="Ingrese nuevamente su número"
                    type="tel"
                    inputmode="numeric"
                    maxlength="10"
                    (paste)="preventPaste($event)"
                  ></ion-input>
                  @if (isConfirmationValid('celular', 'confirmarCelular')) {
                    <ion-icon name="checkmark-circle" color="success" slot="end"></ion-icon>
                  }
                </ion-item>
                @if (showError('confirmarCelular', 'required')) {
                  <ion-note color="danger" class="error-note">
                    Confirme su número celular
                  </ion-note>
                }
                @if (showError('confirmarCelular', 'mismatch')) {
                  <ion-note color="danger" class="error-note">
                    Los números celulares no coinciden
                  </ion-note>
                }

                <!-- Indicador de coincidencia -->
                @if (getFieldValue('celular') && getFieldValue('confirmarCelular')) {
                  <div class="match-indicator" [class.match]="phonesMatch()" [class.no-match]="!phonesMatch()">
                    <ion-chip [color]="phonesMatch() ? 'success' : 'danger'">
                      <ion-icon [name]="phonesMatch() ? 'checkmark-circle' : 'close-circle'"></ion-icon>
                      <ion-label>{{ phonesMatch() ? 'Los números coinciden' : 'Los números no coinciden' }}</ion-label>
                    </ion-chip>
                  </div>
                }
              </ion-list>
            </ion-card-content>
          </ion-card>

          <!-- Teléfono Fijo (Opcional) -->
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="call-outline"></ion-icon>
                Teléfono Fijo
                <ion-chip color="medium" class="optional-chip">Opcional</ion-chip>
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item [class.valid]="isFieldValid('telefonoFijo')">
                  <ion-input
                    formControlName="telefonoFijo"
                    label="Número fijo"
                    labelPlacement="stacked"
                    placeholder="6011234567"
                    type="tel"
                    inputmode="numeric"
                    maxlength="10"
                    [counter]="true"
                  ></ion-input>
                  @if (isFieldValid('telefonoFijo')) {
                    <ion-icon name="checkmark-circle" color="success" slot="end"></ion-icon>
                  }
                </ion-item>
                @if (showError('telefonoFijo', 'pattern')) {
                  <ion-note color="danger" class="error-note">
                    Ingrese un número fijo válido (10 dígitos con indicativo)
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
      transition: all 0.2s ease;
    }

    ion-item.valid {
      --background: rgba(var(--ion-color-success-rgb), 0.1);
    }

    ion-item:last-child {
      margin-bottom: 0;
    }

    ion-input {
      --padding-top: var(--space-sm, 12px);
      --padding-bottom: var(--space-sm, 12px);
    }

    ion-item ion-icon[slot="end"] {
      font-size: 1.25rem;
    }

    .error-note {
      display: block;
      padding: var(--space-xs, 8px) var(--space-md, 16px);
      font-size: 0.75rem;
      margin-top: -8px;
      margin-bottom: var(--space-sm, 12px);
    }

    .match-indicator {
      display: flex;
      justify-content: center;
      padding: var(--space-sm, 12px) 0;
    }

    .match-indicator ion-chip {
      --background: transparent;
    }

    .match-indicator.match ion-chip {
      --background: rgba(var(--ion-color-success-rgb), 0.1);
    }

    .match-indicator.no-match ion-chip {
      --background: rgba(var(--ion-color-danger-rgb), 0.1);
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
export class ContactoFormPage implements OnInit {
  form!: FormGroup;

  // Regex patterns
  private emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  private celularPattern = /^3[0-9]{9}$/;  // Celular colombiano: 10 dígitos, empieza con 3
  private fijoPattern = /^60[1-8][0-9]{7}$/;  // Fijo colombiano: 10 dígitos con indicativo

  constructor(
    private fb: FormBuilder,
    private flujoService: FlujoActualizacionService,
    private router: Router
  ) {
    addIcons({
      arrowForward,
      arrowBack,
      mailOutline,
      callOutline,
      checkmarkCircle,
      closeCircle,
      informationCircleOutline,
    });
  }

  ngOnInit(): void {
    this.initForm();
    this.cargarDatosExistentes();
  }

  private initForm(): void {
    this.form = this.fb.group({
      correoElectronico: ['', [
        Validators.required,
        Validators.email,
        Validators.pattern(this.emailPattern)
      ]],
      confirmarCorreo: ['', [Validators.required]],
      celular: ['', [
        Validators.required,
        Validators.minLength(10),
        Validators.maxLength(10),
        Validators.pattern(this.celularPattern)
      ]],
      confirmarCelular: ['', [Validators.required]],
      telefonoFijo: ['', [
        Validators.pattern(this.fijoPattern)
      ]],
    }, {
      validators: [
        matchValidator('correoElectronico', 'confirmarCorreo'),
        matchValidator('celular', 'confirmarCelular')
      ]
    });
  }

  private cargarDatosExistentes(): void {
    const afiliado = this.flujoService.afiliado();
    if (afiliado?.contacto) {
      const contacto = afiliado.contacto;
      this.form.patchValue({
        correoElectronico: contacto.correoElectronico,
        confirmarCorreo: contacto.correoElectronico,
        celular: contacto.celular,
        confirmarCelular: contacto.celular,
        telefonoFijo: contacto.telefonoFijo || '',
      });
    }
  }

  preventPaste(event: ClipboardEvent): void {
    event.preventDefault();
    // Opcional: mostrar toast indicando que no se permite pegar
  }

  getFieldValue(field: string): string {
    return this.form.get(field)?.value || '';
  }

  isFieldValid(field: string): boolean {
    const control = this.form.get(field);
    return !!(control && control.valid && control.value && control.dirty);
  }

  isConfirmationValid(originalField: string, confirmField: string): boolean {
    const original = this.form.get(originalField);
    const confirm = this.form.get(confirmField);
    return !!(
      original && confirm &&
      original.valid && confirm.valid &&
      original.value && confirm.value &&
      original.value === confirm.value
    );
  }

  emailsMatch(): boolean {
    return this.form.get('correoElectronico')?.value === this.form.get('confirmarCorreo')?.value;
  }

  phonesMatch(): boolean {
    return this.form.get('celular')?.value === this.form.get('confirmarCelular')?.value;
  }

  showError(field: string, errorType?: string): boolean {
    const control = this.form.get(field);
    if (!control) return false;
    
    const isInvalid = control.invalid && (control.dirty || control.touched);
    
    if (errorType) {
      return isInvalid && control.hasError(errorType);
    }
    
    return isInvalid;
  }

  async volver(): Promise<void> {
    await this.router.navigate(['/forms/sociodemographic']);
  }

  async onSubmit(): Promise<void> {
    if (this.form.valid) {
      const datos: InformacionContacto = {
        correoElectronico: this.form.value.correoElectronico,
        celular: this.form.value.celular,
        telefonoFijo: this.form.value.telefonoFijo || undefined,
      };

      await this.flujoService.guardarContacto(datos);
    } else {
      // Marcar todos los campos como touched para mostrar errores
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
    }
  }
}
