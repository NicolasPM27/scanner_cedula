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
          <ion-back-button defaultHref="/verification"></ion-back-button>
        </ion-buttons>
        <ion-title>Contacto</ion-title>
      </ion-toolbar>
      <ion-toolbar>
        <div class="progress-container">
          <div class="progress-info">
            <span class="step-label">PASO 1 DE 4</span>
            <span class="step-title">Contacto</span>
          </div>
          <ion-progress-bar [value]="0.25" color="primary"></ion-progress-bar>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="form-content">
      <div class="form-container">
        
        <!-- Nota informativa -->
        <div class="info-banner">
          <ion-icon name="information-circle-outline"></ion-icon>
          <p>Ingrese cada dato dos veces para verificar.</p>
        </div>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          
          <!-- Correo Electrónico -->
          <ion-card class="form-card">
            <ion-card-header>
              <ion-card-title>
                <ion-icon name="mail-outline"></ion-icon>
                Correo
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                
                <!-- Correo principal -->
                <ion-item [class.valid]="isFieldValid('correoElectronico')">
                  <ion-input
                    formControlName="correoElectronico"
                    label="Correo"
                    labelPlacement="stacked"
                    placeholder="correo@ejemplo.com"
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
                    Campo requerido
                  </ion-note>
                }
                @if (showError('correoElectronico', 'email')) {
                  <ion-note color="danger" class="error-note">
                    Correo inválido
                  </ion-note>
                }
                @if (showError('correoElectronico', 'pattern')) {
                  <ion-note color="danger" class="error-note">
                    Correo inválido
                  </ion-note>
                }

                <!-- Confirmar correo -->
                <ion-item [class.valid]="isConfirmationValid('correoElectronico', 'confirmarCorreo')">
                  <ion-input
                    formControlName="confirmarCorreo"
                    label="Confirmar correo"
                    labelPlacement="stacked"
                    placeholder="Repita su correo"
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
                    Confirme el correo
                  </ion-note>
                }
                @if (showError('confirmarCorreo', 'mismatch')) {
                  <ion-note color="danger" class="error-note">
                    No coinciden
                  </ion-note>
                }

                <!-- Indicador de coincidencia -->
                @if (getFieldValue('correoElectronico') && getFieldValue('confirmarCorreo')) {
                  <div class="match-indicator" [class.match]="emailsMatch()" [class.no-match]="!emailsMatch()">
                    <ion-chip [color]="emailsMatch() ? 'success' : 'danger'">
                      <ion-icon [name]="emailsMatch() ? 'checkmark-circle' : 'close-circle'"></ion-icon>
                      <ion-label>{{ emailsMatch() ? 'Coinciden' : 'No coinciden' }}</ion-label>
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
                Celular
              </ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                
                <!-- Celular principal -->
                <ion-item [class.valid]="isFieldValid('celular')">
                  <ion-input
                    formControlName="celular"
                    label="Celular"
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
                    Campo requerido
                  </ion-note>
                }
                @if (showError('celular', 'pattern')) {
                  <ion-note color="danger" class="error-note">
                    10 dígitos, inicia con 3
                  </ion-note>
                }
                @if (showError('celular', 'minlength') || showError('celular', 'maxlength')) {
                  <ion-note color="danger" class="error-note">
                    Debe tener 10 dígitos
                  </ion-note>
                }

                <!-- Confirmar celular -->
                <ion-item [class.valid]="isConfirmationValid('celular', 'confirmarCelular')">
                  <ion-input
                    formControlName="confirmarCelular"
                    label="Confirmar celular"
                    labelPlacement="stacked"
                    placeholder="Repita el número"
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
                    Confirme el número
                  </ion-note>
                }
                @if (showError('confirmarCelular', 'mismatch')) {
                  <ion-note color="danger" class="error-note">
                    No coinciden
                  </ion-note>
                }

                <!-- Indicador de coincidencia -->
                @if (getFieldValue('celular') && getFieldValue('confirmarCelular')) {
                  <div class="match-indicator" [class.match]="phonesMatch()" [class.no-match]="!phonesMatch()">
                    <ion-chip [color]="phonesMatch() ? 'success' : 'danger'">
                      <ion-icon [name]="phonesMatch() ? 'checkmark-circle' : 'close-circle'"></ion-icon>
                      <ion-label>{{ phonesMatch() ? 'Coinciden' : 'No coinciden' }}</ion-label>
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
                Fijo
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
                    Número inválido (10 dígitos)
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

    ion-item.valid {
      --background: rgba(var(--ion-color-success-rgb), 0.06);
    }

    ion-item:last-child {
      margin-bottom: 0;
    }

    ion-item:focus-within {
      --background: rgba(var(--ion-color-primary-rgb), 0.05);
      box-shadow: 0 0 0 2px rgba(var(--ion-color-primary-rgb), 0.15);
    }

    ion-input {
      --padding-top: var(--sp-sm);
      --padding-bottom: var(--sp-sm);
      font-size: 0.9375rem;
    }

    ion-item ion-icon[slot="end"] {
      font-size: 1.25rem;
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

    /* Match Indicator */
    .match-indicator {
      display: flex;
      justify-content: center;
      padding: var(--sp-xs) 0 var(--sp-sm);
    }

    .match-indicator ion-chip {
      --background: transparent;
      font-size: 0.8125rem;
      font-weight: 500;
    }

    .match-indicator.match ion-chip {
      --background: rgba(var(--ion-color-success-rgb), 0.08);
    }

    .match-indicator.no-match ion-chip {
      --background: rgba(var(--ion-color-danger-rgb), 0.08);
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

      .info-banner p {
        font-size: 0.8125rem;
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

      ion-input {
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
      ion-item {
        transition: none;
      }
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
    await this.router.navigate(['/verification']);
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
