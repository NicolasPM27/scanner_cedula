import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonIcon } from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  helpCircleOutline,
  logoWhatsapp,
  mailOutline,
  closeOutline,
} from 'ionicons/icons';

/**
 * Botón flotante de ayuda (FAB) que ofrece opciones de contacto
 * mediante WhatsApp y correo electrónico (Mock).
 *
 * Se posiciona en la esquina inferior derecha con un diseño extendido
 * que incluye el texto "Ayuda" para mayor claridad e intuitividad.
 *
 * Características de accesibilidad:
 * - Touch target mínimo de 56px (WCAG)
 * - Contraste mejorado con gradientes
 * - Labels descriptivos y ARIA labels
 * - Soporte para Simple Mode con tamaños aumentados
 * - Respeta `prefers-reduced-motion`
 *
 * Uso: Agregado globalmente en app.component.html
 */
@Component({
  selector: 'app-help-fab',
  standalone: true,
  imports: [CommonModule, IonIcon],
  template: `
    <div class="help-fab-container">
      <!-- Botón principal de ayuda -->
      <button
        class="help-fab-main"
        [class.fab-open]="isOpen()"
        (click)="toggle()"
        [attr.aria-label]="isOpen() ? 'Cerrar menú de ayuda' : 'Abrir menú de ayuda'"
        [attr.aria-expanded]="isOpen()"
      >
        <div class="fab-icon-wrapper">
          <ion-icon [name]="isOpen() ? 'close-outline' : 'help-circle-outline'"></ion-icon>
        </div>
        
        <!-- Label siempre visible para mayor claridad -->
        @if (!isOpen()) {
          <span class="fab-label">Ayuda</span>
          <div class="pulse-ring"></div>
        }
      </button>

      <!-- Opciones expandibles -->
      @if (isOpen()) {
        <div class="help-options">
          <!-- WhatsApp -->
          <button
            class="help-option whatsapp"
            (click)="contactarWhatsApp()"
            aria-label="Contactar por WhatsApp con soporte FOMAG"
          >
            <div class="option-icon">
              <ion-icon name="logo-whatsapp"></ion-icon>
            </div>
            <div class="option-content">
              <span class="option-title">WhatsApp</span>
              <span class="option-desc">Chat en vivo</span>
            </div>
          </button>

          <!-- Email -->
          <button
            class="help-option email"
            (click)="contactarEmail()"
            aria-label="Contactar por correo electrónico con soporte FOMAG"
          >
            <div class="option-icon">
              <ion-icon name="mail-outline"></ion-icon>
            </div>
            <div class="option-content">
              <span class="option-title">Email</span>
              <span class="option-desc">Soporte escrito</span>
            </div>
          </button>
        </div>
      }

      <!-- Backdrop para cerrar -->
      @if (isOpen()) {
        <div class="help-backdrop" (click)="toggle()" aria-hidden="true"></div>
      }
    </div>
  `,
  styles: [`
    :host {
      --fab-size: 56px;
      --fab-extended-width: auto;
      z-index: 998;
    }

    /* ── Contenedor principal ── */
    .help-fab-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 998;
    }

    /* ── Botón principal (FAB extendido con label) ── */
    .help-fab-main {
      position: relative;
      display: flex;
      align-items: center;
      gap: 10px;
      min-height: var(--fab-size);
      padding: 0 20px 0 16px;
      border: none;
      border-radius: 28px;
      background: linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%);
      color: #ffffff;
      font-family: 'Inter', sans-serif;
      font-size: 15px;
      font-weight: 600;
      letter-spacing: 0.3px;
      box-shadow: 0 6px 24px rgba(139, 92, 246, 0.4),
                  0 2px 8px rgba(0, 0, 0, 0.15);
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      -webkit-tap-highlight-color: transparent;
      /* WCAG touch target mínimo 48x48 */
      min-width: 48px;
    }

    .help-fab-main:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 32px rgba(139, 92, 246, 0.5),
                  0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .help-fab-main:active {
      transform: translateY(0) scale(0.97);
      box-shadow: 0 4px 16px rgba(139, 92, 246, 0.35);
    }

    .help-fab-main.fab-open {
      background: linear-gradient(135deg, #6366F1 0%, #4F46E5 100%);
      padding: 0;
      width: var(--fab-size);
      min-width: var(--fab-size);
      border-radius: 50%;
      transform: rotate(90deg);
    }

    .fab-icon-wrapper {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 28px;
      min-height: 28px;
    }

    .help-fab-main ion-icon {
      font-size: 28px;
      transition: transform 0.25s ease;
    }

    .fab-label {
      white-space: nowrap;
      transition: opacity 0.2s ease;
    }

    .help-fab-main.fab-open .fab-label {
      display: none;
    }

    /* ── Anillo de pulso ── */
    .pulse-ring {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 100%;
      height: 100%;
      border-radius: 28px;
      pointer-events: none;
      animation: pulseRing 2.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }

    @keyframes pulseRing {
      0%, 100% {
        box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.5);
      }
      50% {
        box-shadow: 0 0 0 12px rgba(139, 92, 246, 0);
      }
    }

    /* ── Opciones expandibles ── */
    .help-options {
      position: absolute;
      bottom: calc(var(--fab-size) + 16px);
      right: 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
      animation: fadeSlideUp 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      min-width: 200px;
    }

    .help-option {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px 18px;
      border: none;
      border-radius: 16px;
      cursor: pointer;
      font-family: 'Inter', sans-serif;
      box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15),
                  0 2px 8px rgba(0, 0, 0, 0.1);
      transition: all 0.25s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      -webkit-tap-highlight-color: transparent;
      /* WCAG touch target */
      min-height: 56px;
    }

    .help-option:hover {
      transform: translateY(-3px) scale(1.02);
    }

    .help-option:active {
      transform: translateY(0) scale(0.98);
    }

    .option-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 32px;
      min-height: 32px;
    }

    .help-option ion-icon {
      font-size: 26px;
      flex-shrink: 0;
    }

    .option-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
      text-align: left;
    }

    .option-title {
      font-size: 15px;
      font-weight: 700;
      line-height: 1.2;
    }

    .option-desc {
      font-size: 11px;
      font-weight: 500;
      opacity: 0.85;
      line-height: 1.2;
    }

    .help-option.whatsapp {
      background: #25D366;
      color: #ffffff;
    }

    .help-option.whatsapp:hover {
      background: #1EBE57;
      box-shadow: 0 8px 32px rgba(37, 211, 102, 0.4),
                  0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .help-option.email {
      background: var(--ion-color-primary, #4F46E5);
      color: #ffffff;
    }

    .help-option.email:hover {
      background: #4338CA;
      box-shadow: 0 8px 32px rgba(79, 70, 229, 0.4),
                  0 4px 12px rgba(0, 0, 0, 0.15);
    }

    /* ── Backdrop ── */
    .help-backdrop {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.2);
      z-index: -1;
      animation: fadeIn 0.25s ease;
      -webkit-backdrop-filter: blur(3px);
      backdrop-filter: blur(3px);
    }

    /* ── Animations ── */
    @keyframes fadeSlideUp {
      0% {
        opacity: 0;
        transform: translateY(16px) scale(0.92);
      }
      100% {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    /* ── Dark mode ── */
    @media (prefers-color-scheme: dark) {
      .help-fab-main {
        box-shadow: 0 6px 24px rgba(139, 92, 246, 0.5),
                    0 2px 8px rgba(0, 0, 0, 0.3);
      }

      .help-option {
        box-shadow: 0 6px 24px rgba(0, 0, 0, 0.35),
                    0 2px 8px rgba(0, 0, 0, 0.25);
      }

      .help-backdrop {
        background: rgba(0, 0, 0, 0.45);
      }
    }

    /* ── Simple mode (Accessibility) ── */
    :host-context(body.simple-mode) {
      --fab-size: 64px;
    }

    :host-context(body.simple-mode) .help-fab-main {
      min-height: 64px;
      padding: 0 24px 0 20px;
      font-size: 18px;
      border-radius: 32px;
    }

    :host-context(body.simple-mode) .help-fab-main ion-icon {
      font-size: 32px;
    }

    :host-context(body.simple-mode) .help-option {
      min-height: 72px;
      padding: 18px 22px;
      gap: 16px;
    }

    :host-context(body.simple-mode) .option-icon {
      min-width: 36px;
      min-height: 36px;
    }

    :host-context(body.simple-mode) .help-option ion-icon {
      font-size: 30px;
    }

    :host-context(body.simple-mode) .option-title {
      font-size: 18px;
    }

    :host-context(body.simple-mode) .option-desc {
      font-size: 14px;
    }

    :host-context(body.simple-mode) .pulse-ring {
      animation: none;
    }

    /* Reduce motion para usuarios con preferencia de accesibilidad */
    @media (prefers-reduced-motion: reduce) {
      .help-fab-main,
      .help-option,
      .pulse-ring {
        animation: none !important;
        transition: none !important;
      }
    }
  `],
})
export class HelpFabComponent {
  /** Estado del menú (abierto/cerrado) */
  isOpen = signal(false);

  /** Número de WhatsApp mock de FOMAG */
  private readonly WHATSAPP_NUMBER = '573001234567';
  private readonly WHATSAPP_MESSAGE = '¡Hola! Necesito ayuda con la actualización de mis datos en FOMAG.';
  private readonly SUPPORT_EMAIL = 'soporte@fomag.gov.co';

  constructor() {
    addIcons({ helpCircleOutline, logoWhatsapp, mailOutline, closeOutline });
  }

  /** Alterna el estado del menú */
  toggle(): void {
    this.isOpen.update(v => !v);
  }

  /**
   * Abre WhatsApp con un mensaje pre-definido (Mock).
   * En producción apuntaría al número real de soporte FOMAG.
   */
  contactarWhatsApp(): void {
    const url = `https://wa.me/${this.WHATSAPP_NUMBER}?text=${encodeURIComponent(this.WHATSAPP_MESSAGE)}`;
    window.open(url, '_blank');
    this.isOpen.set(false);
  }

  /**
   * Abre el cliente de correo con un email pre-llenado (Mock).
   * En producción apuntaría al correo real de soporte FOMAG.
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
    this.isOpen.set(false);
  }
}
