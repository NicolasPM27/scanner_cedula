import { Component, OnInit, signal, computed } from '@angular/core';
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
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  IonButtons,
  IonBackButton,
  IonAvatar,
  IonBadge,
  IonNote,
  IonFab,
  IonFabButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  personOutline,
  peopleOutline,
  checkmarkCircle,
  alertCircle,
  chevronForward,
  addOutline,
  arrowForward,
  arrowBack,
  createOutline,
  callOutline,
  informationCircleOutline,
} from 'ionicons/icons';
import { FlujoActualizacionService } from '../../services/flujo-actualizacion.service';
import { Beneficiario } from '../../models/afiliado.model';

@Component({
  selector: 'app-beneficiaries-list',
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
    IonCardContent,
    IonList,
    IonLabel,
    IonChip,
    IonButtons,
    IonBackButton,
    IonNote,
  ],
  template: `
    <ion-header [translucent]="true">
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button defaultHref="/forms/characterization"></ion-back-button>
        </ion-buttons>
        <ion-title>Beneficiarios</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="true" class="beneficiaries-content">
      <div class="content-container">
        
        <!-- Header Section -->
        <div class="header-section">
          <div class="header-icon">
            <ion-icon name="people-outline"></ion-icon>
          </div>
          <h1 class="headline-medium">Beneficiarios</h1>
          <p class="body-large text-muted">
            Revise y actualice sus beneficiarios.
          </p>
        </div>

        @if (beneficiarios().length === 0) {
          <!-- Empty State -->
          <ion-card class="empty-card">
            <ion-card-content>
              <div class="empty-state">
                <ion-icon name="people-outline"></ion-icon>
                <h3>Sin beneficiarios</h3>
                <p>No tiene beneficiarios registrados.</p>
              </div>
            </ion-card-content>
          </ion-card>
        } @else {
          <!-- Info Banner -->
          <div class="info-banner">
            <ion-icon name="information-circle-outline"></ion-icon>
            <p>
              @if (requierenActualizacion() > 0) {
                <strong>{{ requierenActualizacion() }} beneficiario(s)</strong> requieren actualización de datos.
              } @else {
                Todos los beneficiarios están actualizados.
              }
            </p>
          </div>

          <!-- Beneficiaries List -->
          <ion-list class="beneficiaries-list">
            @for (beneficiario of beneficiarios(); track beneficiario.id) {
              <ion-card 
                class="beneficiary-card" 
                [class.needs-update]="!beneficiario.actualizado"
                (click)="seleccionarBeneficiario(beneficiario)"
              >
                <ion-card-content>
                  <div class="beneficiary-row">
                    
                    <!-- Avatar -->
                    <div class="beneficiary-avatar" [class.adult]="beneficiario.edad >= 18">
                      <span>{{ getInitials(beneficiario) }}</span>
                    </div>
                    
                    <!-- Info -->
                    <div class="beneficiary-info">
                      <h3 class="beneficiary-name">
                        {{ beneficiario.primerNombre }} {{ beneficiario.segundoNombre }}
                        {{ beneficiario.primerApellido }} {{ beneficiario.segundoApellido }}
                      </h3>
                      <p class="beneficiary-details">
                        {{ getTipoDocumento(beneficiario.tipoDocumento) }}: {{ beneficiario.numeroDocumento }}
                      </p>
                      <div class="beneficiary-chips">
                        <ion-chip [color]="getParentescoColor(beneficiario.parentesco)">
                          {{ formatParentesco(beneficiario.parentesco) }}
                        </ion-chip>
                        <ion-chip color="medium">
                          {{ beneficiario.edad }} años
                        </ion-chip>
                        @if (beneficiario.edad >= 18) {
                          <ion-chip color="tertiary">
                            <ion-icon name="call-outline"></ion-icon>
                            <ion-label>Requiere contacto</ion-label>
                          </ion-chip>
                        }
                      </div>
                    </div>

                    <!-- Status & Action -->
                    <div class="beneficiary-action">
                      @if (beneficiario.actualizado) {
                        <ion-icon name="checkmark-circle" color="success" class="status-icon"></ion-icon>
                      } @else {
                        <ion-icon name="alert-circle" color="warning" class="status-icon"></ion-icon>
                      }
                      <ion-icon name="chevron-forward" class="chevron-icon"></ion-icon>
                    </div>
                  </div>
                </ion-card-content>
              </ion-card>
            }
          </ion-list>
        }

        <!-- Actions -->
        <div class="form-actions">
          <ion-button 
            fill="outline" 
            (click)="volver()"
          >
            <ion-icon slot="start" name="arrow-back"></ion-icon>
            Volver
          </ion-button>
          
          <ion-button 
            (click)="finalizar()"
            [disabled]="requierenActualizacion() > 0"
          >
            Finalizar
            <ion-icon slot="end" name="arrow-forward"></ion-icon>
          </ion-button>
        </div>

        @if (requierenActualizacion() > 0) {
          <ion-note color="warning" class="update-note">
            Actualice beneficiarios pendientes para continuar
          </ion-note>
        }

      </div>
    </ion-content>
  `,
  styles: [`
    .beneficiaries-content {
      --background: var(--ion-background-color);
    }

    .content-container {
      padding: var(--space-md, 16px);
      max-width: 600px;
      margin: 0 auto;
    }

    .header-section {
      text-align: center;
      padding: var(--space-md, 16px) 0;
    }

    .header-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto var(--space-sm, 12px);
      display: flex;
      align-items: center;
      justify-content: center;
      background: rgba(var(--ion-color-primary-rgb), 0.1);
      border-radius: 50%;
    }

    .header-icon ion-icon {
      font-size: 32px;
      color: var(--ion-color-primary);
    }

    .header-section h1 {
      margin: 0 0 var(--space-xs, 4px);
      font-size: 1.5rem;
      font-weight: 700;
    }

    .header-section p {
      margin: 0;
      font-size: 0.875rem;
      max-width: 280px;
      margin-inline: auto;
    }

    .info-banner {
      display: flex;
      gap: var(--space-sm, 12px);
      padding: var(--space-md, 16px);
      background: rgba(var(--ion-color-warning-rgb), 0.1);
      border-radius: var(--radius-lg, 16px);
      margin-bottom: var(--space-md, 16px);
      align-items: center;
    }

    .info-banner ion-icon {
      font-size: 1.5rem;
      color: var(--ion-color-warning);
      flex-shrink: 0;
    }

    .info-banner p {
      margin: 0;
      font-size: 0.875rem;
    }

    .empty-card {
      border-radius: var(--radius-xl, 24px);
    }

    .empty-state {
      text-align: center;
      padding: var(--space-lg, 24px) var(--space-md, 16px);
    }

    .empty-state ion-icon {
      font-size: 48px;
      color: var(--ion-color-medium);
      margin-bottom: var(--space-sm, 12px);
    }

    .empty-state h3 {
      margin: 0 0 var(--space-xs, 4px);
      font-size: 1.125rem;
      font-weight: 700;
    }

    .empty-state p {
      margin: 0 0 var(--space-md, 16px);
      color: var(--ion-color-medium);
      font-size: 0.875rem;
    }

    .beneficiaries-list {
      background: transparent;
    }

    .beneficiary-card {
      margin-bottom: var(--space-sm, 12px);
      border-radius: var(--radius-xl, 24px);
      cursor: pointer;
      transition: all 0.2s ease;
    }

    .beneficiary-card:hover {
      transform: translateY(-2px);
      box-shadow: var(--elevation-2);
    }

    .beneficiary-card.needs-update {
      border-left: 4px solid var(--ion-color-warning);
    }

    .beneficiary-row {
      display: flex;
      align-items: center;
      gap: var(--space-md, 16px);
    }

    .beneficiary-avatar {
      width: 44px;
      height: 44px;
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
      font-size: 1.25rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .beneficiary-info {
      flex: 1;
      min-width: 0;
    }

    .beneficiary-name {
      margin: 0 0 2px;
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--ion-text-color);
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      white-space: normal;
      line-height: 1.3;
    }

    .beneficiary-details {
      margin: 0 0 var(--space-xs, 8px);
      font-size: 0.8125rem;
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

    .beneficiary-action {
      display: flex;
      align-items: center;
      gap: var(--space-xs, 8px);
    }

    .status-icon {
      font-size: 1.5rem;
    }

    .chevron-icon {
      font-size: 1.25rem;
      color: var(--ion-color-medium);
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
      gap: var(--space-sm, 12px);
      margin-top: var(--space-lg, 24px);
      padding-bottom: calc(var(--space-lg, 24px) + env(safe-area-inset-bottom, 0px));
    }

    .form-actions ion-button {
      flex: 1;
      --border-radius: var(--radius-md, 12px);
      min-height: 3rem;
      font-weight: 600;
      font-size: 0.9375rem;
      --padding-start: 0.75rem;
      --padding-end: 0.75rem;
    }

    /* Small phones */
    @media (max-width: 380px) {
      .header-section h1 {
        font-size: 1.25rem;
      }

      .beneficiary-row {
        gap: var(--space-sm, 12px);
      }

      .beneficiary-avatar {
        width: 38px;
        height: 38px;
      }

      .beneficiary-avatar span {
        font-size: 1rem;
      }

      .form-actions ion-button {
        min-height: 2.75rem;
        font-size: 0.875rem;
        --padding-start: 0.5rem;
        --padding-end: 0.5rem;
      }
    }

    .update-note {
      display: block;
      text-align: center;
      margin-top: var(--space-md, 16px);
      font-size: 0.8125rem;
    }
  `]
})
export class BeneficiariesListPage implements OnInit {
  beneficiarios = signal<Beneficiario[]>([]);
  
  requierenActualizacion = computed(() => 
    this.beneficiarios().filter(b => !b.actualizado).length
  );

  constructor(
    private flujoService: FlujoActualizacionService,
    private router: Router
  ) {
    addIcons({
      personOutline,
      peopleOutline,
      checkmarkCircle,
      alertCircle,
      chevronForward,
      addOutline,
      arrowForward,
      arrowBack,
      createOutline,
      callOutline,
      informationCircleOutline,
    });
  }

  ngOnInit(): void {
    this.cargarBeneficiarios();
  }

  ionViewWillEnter(): void {
    this.cargarBeneficiarios();
  }

  private cargarBeneficiarios(): void {
    const afiliado = this.flujoService.afiliado();
    if (afiliado?.beneficiarios) {
      this.beneficiarios.set(afiliado.beneficiarios);
    }
  }

  getInitials(beneficiario: Beneficiario): string {
    const first = beneficiario.primerNombre?.charAt(0) || '';
    const last = beneficiario.primerApellido?.charAt(0) || '';
    return `${first}${last}`;
  }

  getTipoDocumento(tipo: string): string {
    const tipos: Record<string, string> = {
      'CC': 'C.C.',
      'TI': 'T.I.',
      'RC': 'R.C.',
      'CE': 'C.E.',
      'PA': 'Pasaporte',
    };
    return tipos[tipo] || tipo;
  }

  formatParentesco(parentesco: string): string {
    const parentescos: Record<string, string> = {
      'conyuge': 'Cónyuge',
      'hijo': 'Hijo/a',
      'padre': 'Padre',
      'madre': 'Madre',
      'hermano': 'Hermano/a',
    };
    return parentescos[parentesco] || parentesco;
  }

  getParentescoColor(parentesco: string): string {
    const colores: Record<string, string> = {
      'conyuge': 'primary',
      'hijo': 'secondary',
      'padre': 'tertiary',
      'madre': 'tertiary',
      'hermano': 'medium',
    };
    return colores[parentesco] || 'medium';
  }

  async seleccionarBeneficiario(beneficiario: Beneficiario): Promise<void> {
    await this.flujoService.seleccionarBeneficiario(beneficiario);
  }

  async volver(): Promise<void> {
    await this.router.navigate(['/forms/characterization']);
  }

  async finalizar(): Promise<void> {
    try {
      console.log('🚀 Iniciando finalización de actualización...');
      await this.flujoService.finalizarActualizacion();
      console.log('✅ Actualización finalizada exitosamente');
    } catch (error: any) {
      console.error('❌ Error en finalizar():', {
        message: error?.message,
        status: error?.statusCode || error?.status,
        mensajeOriginal: error?.mensajeOriginal,
        name: error?.name,
        stack: error?.stack,
      });
      // TODO: Mostrar alerta al usuario con el error
      alert(`Error al guardar: ${error?.message || error?.mensajeOriginal || 'Error desconocido'}`);
    }
  }
}
