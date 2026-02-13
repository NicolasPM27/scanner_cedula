import { CommonModule } from '@angular/common';
import { Component, Input, signal } from '@angular/core';
import {
  IonBackButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonProgressBar,
  IonToolbar,
  IonIcon,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import { helpCircleOutline, logoWhatsapp, mailOutline } from 'ionicons/icons';

addIcons({ helpCircleOutline, logoWhatsapp, mailOutline });

@Component({
  selector: 'app-simple-form-layout',
  standalone: true,
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonButtons,
    IonBackButton,
    IonProgressBar,
    IonContent,
    IonIcon,
    IonButton,
  ],
  template: `
    @if (helpMenuOpen()) {
      <div class="help-menu-backdrop" (click)="toggleHelpMenu()"></div>
    }

    <ion-header [translucent]="false">
      <ion-toolbar class="main-toolbar">
        <ion-buttons slot="start">
          <ion-back-button [defaultHref]="backHref"></ion-back-button>
        </ion-buttons>
        <div class="toolbar-title" [title]="title">{{ title }}</div>
        <ion-buttons slot="end">
          <div class="help-wrapper">
            <ion-button 
              class="help-button" 
              fill="clear" 
              (click)="toggleHelpMenu()"
              aria-label="Obtener ayuda"
              [attr.aria-expanded]="helpMenuOpen()"
            >
              <ion-icon name="help-circle-outline" aria-hidden="true"></ion-icon>
              <span class="help-button-label">Ayuda</span>
            </ion-button>
            @if (helpMenuOpen()) {
              <div class="help-menu">
                <button class="help-menu-item whatsapp" (click)="contactarWhatsApp()" aria-label="Contactar por WhatsApp">
                  <ion-icon name="logo-whatsapp"></ion-icon>
                  <span>WhatsApp</span>
                </button>
                <button class="help-menu-item email" (click)="contactarEmail()" aria-label="Contactar por correo">
                  <ion-icon name="mail-outline"></ion-icon>
                  <span>Email</span>
                </button>
              </div>
            }
          </div>
        </ion-buttons>
      </ion-toolbar>
      <ion-toolbar>
        <div class="progress-container simple-shell-progress">
          <div class="progress-info simple-shell-progress-info">
            <span class="step-label">PASO {{ currentStep }} DE {{ totalSteps }}</span>
            <span class="step-title">{{ stepTitle }}</span>
          </div>
          <ion-progress-bar [value]="progressValue" color="primary"></ion-progress-bar>
        </div>
      </ion-toolbar>
    </ion-header>

    <ion-content [fullscreen]="false" class="form-content simple-shell-content">
      <div class="form-container simple-shell-container">
        <ng-content></ng-content>
      </div>
    </ion-content>
  `,
  styles: [
    `
      :host {
        display: flex;
        flex-direction: column;
        flex: 1;
        height: 100%;
        min-height: 0;
        overflow: hidden;
      }

      .help-button {
        --icon-font-size: 1.5rem;
        --padding-start: 8px;
        --padding-end: 8px;
        --min-width: 44px;
        --min-height: 44px;
        --color: var(--ion-color-primary);
        color: var(--ion-color-primary);
      }

      .help-button ion-icon {
        font-size: 1.5rem;
      }

      .main-toolbar {
        --padding-start: 0.5rem;
        --padding-end: 0.5rem;
      }

      .toolbar-title {
        flex: 1;
        min-width: 0;
        padding: 0 0.5rem;
        font-size: clamp(1.05rem, 4vw, 1.25rem);
        font-weight: 700;
        letter-spacing: -0.01em;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }

      .main-toolbar ion-buttons {
        min-width: 48px;
      }

      .main-toolbar ion-buttons[slot="end"] {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        min-width: max-content;
      }

      .help-button-label {
        font-size: 0.875rem;
        font-weight: 600;
        margin-left: 0.25rem;
      }

      .help-button:hover {
        opacity: 0.8;
      }

      /* Simple mode styles */
      body.simple-mode .help-button {
        --icon-font-size: 1.75rem;
        --min-width: 56px;
        --min-height: 56px;
      }

      body.simple-mode .help-button-label {
        font-size: 1rem;
      }

      /* Help wrapper — positioning context for dropdown */
      .help-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      /* Help menu backdrop */
      .help-menu-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 998;
      }

      .help-menu {
        position: absolute;
        top: 100%;
        right: 0;
        background: var(--ion-background-color, #ffffff);
        border-radius: 12px;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
        z-index: 999;
        display: flex;
        flex-direction: column;
        min-width: 160px;
        margin-top: 4px;
        overflow: hidden;
      }

      .help-menu-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px 16px;
        border: none;
        background: transparent;
        cursor: pointer;
        color: inherit;
        font-size: 14px;
        font-weight: 500;
        transition: background-color 0.2s ease;
      }

      .help-menu-item:not(:last-child) {
        border-bottom: 1px solid var(--ion-border-color, #e8e8e8);
      }

      .help-menu-item:hover {
        background-color: var(--surface-container-high, rgba(0, 0, 0, 0.05));
      }

      .help-menu-item ion-icon {
        font-size: 20px;
        flex-shrink: 0;
      }

      .help-menu-item.whatsapp {
        color: #25D366;
      }

      .help-menu-item.email {
        color: var(--ion-color-primary, #4F46E5);
      }

      /* Simple mode menu adjustments */
      body.simple-mode .help-menu {
        min-width: 180px;
        border-radius: 16px;
      }

      body.simple-mode .help-menu-item {
        padding: 14px 18px;
        font-size: 16px;
        min-height: 52px;
      }

      body.simple-mode .help-menu-item ion-icon {
        font-size: 22px;
      }

      .simple-shell-progress {
        padding: 0.875rem 1rem;
        border: 1px solid var(--ion-border-color);
        border-radius: 1.25rem;
        background: var(--surface-container-low, var(--ion-color-light));
      }

      .simple-shell-progress-info {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 0.75rem;
        margin-bottom: 0.375rem;
      }

      .step-label {
        font-size: 0.9375rem;
        font-weight: 700;
        letter-spacing: 0.04em;
        text-transform: uppercase;
        color: var(--ion-color-primary);
      }

      .step-title {
        font-size: 1rem;
        font-weight: 600;
        color: var(--ion-color-medium);
      }

      ion-progress-bar {
        height: 0.375rem;
        border-radius: 999px;
        --buffer-background: rgba(var(--ion-color-primary-rgb), 0.1);
      }

      .simple-shell-content {
        --background: var(--ion-background-color);
      }

      .simple-shell-container {
        width: min(100%, 920px);
        margin: 0 auto;
        padding: 1.125rem;
        padding-top: 1.375rem;
        padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
      }

      @media (min-width: 768px) {
        .simple-shell-container {
          padding: 1.75rem;
          padding-top: 2rem;
        }
      }

      body.simple-mode .toolbar-title {
        font-size: clamp(1rem, 3.6vw, 1.2rem) !important;
        padding-right: 0.25rem;
      }

      @media (max-width: 420px) {
        .help-button-label {
          display: none;
        }
      }
    `,
  ],
})
export class SimpleFormLayoutComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) stepTitle!: string;
  @Input({ required: true }) currentStep!: number;
  @Input({ required: true }) totalSteps!: number;
  @Input({ required: true }) progressValue!: number;
  @Input() backHref = '/home';

  // Help menu state
  helpMenuOpen = signal(false);

  /** Número de WhatsApp mock de FOMAG */
  private readonly WHATSAPP_NUMBER = '573001234567';
  private readonly WHATSAPP_MESSAGE = '¡Hola! Necesito ayuda con la actualización de mis datos en FOMAG.';
  private readonly SUPPORT_EMAIL = 'soporte@fomag.gov.co';

  /** Alterna el estado del menú de ayuda */
  toggleHelpMenu(): void {
    this.helpMenuOpen.update(v => !v);
  }

  /**
   * Abre WhatsApp con un mensaje pre-definido
   */
  contactarWhatsApp(): void {
    const url = `https://wa.me/${this.WHATSAPP_NUMBER}?text=${encodeURIComponent(this.WHATSAPP_MESSAGE)}`;
    window.open(url, '_blank');
    this.helpMenuOpen.set(false);
  }

  /**
   * Abre el cliente de correo con un email pre-llenado
   */
  contactarEmail(): void {
    const subject = encodeURIComponent('Solicitud de ayuda — Actualización de datos FOMAG');
    const body = encodeURIComponent(
      'Estimado equipo de soporte FOMAG,\n\n' +
      'Necesito asistencia con la actualización de mis datos personales.\n\n' +
      'Número de documento: \n' +
      'Descripción del problema: \n\n' +
      'Gracias.'
    );
    window.open(`mailto:${this.SUPPORT_EMAIL}?subject=${subject}&body=${body}`, '_self');
    this.helpMenuOpen.set(false);
  }
}
