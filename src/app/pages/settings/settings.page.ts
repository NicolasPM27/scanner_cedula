import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButtons,
  IonBackButton,
  IonList,
  IonItem,
  IonLabel,
  IonToggle,
  IonIcon,
  IonNote,
  IonCard,
  IonCardContent,
  IonButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  accessibilityOutline,
  textOutline,
  contrastOutline,
  handLeftOutline,
  informationCircleOutline,
  checkmarkCircleOutline,
  lockClosedOutline,
  logInOutline,
  logOutOutline,
  shieldCheckmarkOutline,
  openOutline,
} from 'ionicons/icons';
import { AccessibilityService } from '../../services/accessibility.service';
import { AuthService, AuthUserInfo } from '../../auth/auth.service';

/**
 * Página de Configuración
 *
 * Permite activar/desactivar el Modo Simple para adultos mayores.
 * Diseño limpio con explicación clara de los cambios que aplica.
 */
@Component({
  selector: 'app-settings',
  standalone: true,
  templateUrl: 'settings.page.html',
  styleUrls: ['settings.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonBackButton,
    IonList,
    IonItem,
    IonLabel,
    IonToggle,
    IonIcon,
    IonNote,
    IonCard,
    IonCardContent,
    IonButton,
  ],
})
export class SettingsPage {
  constructor(
    public a11y: AccessibilityService,
    public auth: AuthService,
    private readonly router: Router
  ) {
    addIcons({
      accessibilityOutline,
      textOutline,
      contrastOutline,
      handLeftOutline,
      informationCircleOutline,
      checkmarkCircleOutline,
      lockClosedOutline,
      logInOutline,
      logOutOutline,
      shieldCheckmarkOutline,
      openOutline,
    });
  }

  /** Maneja el toggle del modo simple */
  onToggleChange(event: CustomEvent): void {
    const enabled = event.detail.checked;
    if (enabled) {
      this.a11y.enable();
    } else {
      this.a11y.disable();
    }
  }

  get userInfo(): AuthUserInfo | null {
    return this.auth.getUserInfo();
  }

  async loginAdmin(): Promise<void> {
    await this.auth.login('/settings');
  }

  async logout(): Promise<void> {
    await this.auth.logout();
  }

  async irPanelAdmin(): Promise<void> {
    await this.router.navigate(['/admin/afiliados']);
  }
}
