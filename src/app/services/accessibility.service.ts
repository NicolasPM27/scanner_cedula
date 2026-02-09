import { Injectable, signal, effect } from '@angular/core';

/**
 * Servicio de accesibilidad para Modo Simple (adultos mayores)
 *
 * Inspirado en el "Modo Simple" de Uber, este servicio gestiona:
 * - Toggle on/off del modo accesible
 * - Persistencia en localStorage
 * - Aplicación de clase CSS global (`body.simple-mode`)
 * - Señales reactivas para binding en templates
 *
 * Principios de diseño del Modo Simple:
 * ──────────────────────────────────────
 * 1. Tipografía agrandada (+30-40% base)
 * 2. Alto contraste (WCAG AAA ratio ≥ 7:1)
 * 3. Botones grandes (min 56px touch target, ideal 72px)
 * 4. Espaciado generoso (min 16px entre elementos)
 * 5. Iconos más grandes y con etiquetas de texto
 * 6. Sin animaciones (prefers-reduced-motion)
 * 7. Colores sólidos, sin gradientes
 * 8. Máximo 1-2 acciones por pantalla
 * 9. Feedback táctil y visual amplificado
 * 10. Navegación simplificada y lineal
 */
@Injectable({
  providedIn: 'root',
})
export class AccessibilityService {
  private static readonly STORAGE_KEY = 'fomag_simple_mode';

  /** Señal reactiva: ¿está activo el modo simple? */
  readonly isSimpleMode = signal<boolean>(this.loadPreference());

  constructor() {
    // Efecto que sincroniza la clase CSS y el localStorage
    effect(() => {
      const active = this.isSimpleMode();
      this.applyBodyClass(active);
      this.persistPreference(active);
    });
  }

  /**
   * Alterna el modo simple on/off
   */
  toggle(): void {
    this.isSimpleMode.set(!this.isSimpleMode());
  }

  /**
   * Activa el modo simple
   */
  enable(): void {
    this.isSimpleMode.set(true);
  }

  /**
   * Desactiva el modo simple
   */
  disable(): void {
    this.isSimpleMode.set(false);
  }

  /**
   * Aplica o remueve la clase CSS global en el body
   */
  private applyBodyClass(active: boolean): void {
    if (typeof document === 'undefined') return;

    const body = document.body;
    if (active) {
      body.classList.add('simple-mode');
      body.setAttribute('data-simple-mode', 'true');
      // Forzar reduced motion para a11y
      body.style.setProperty('--simple-mode-active', '1');
    } else {
      body.classList.remove('simple-mode');
      body.removeAttribute('data-simple-mode');
      body.style.removeProperty('--simple-mode-active');
    }
  }

  /**
   * Lee la preferencia almacenada en localStorage
   */
  private loadPreference(): boolean {
    if (typeof localStorage === 'undefined') return false;
    try {
      return localStorage.getItem(AccessibilityService.STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  }

  /**
   * Persiste la preferencia en localStorage
   */
  private persistPreference(active: boolean): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(AccessibilityService.STORAGE_KEY, String(active));
    } catch {
      // No-op si localStorage no disponible
    }
  }
}
