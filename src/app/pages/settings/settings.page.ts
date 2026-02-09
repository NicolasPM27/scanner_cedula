import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
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
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  accessibilityOutline,
  textOutline,
  contrastOutline,
  handLeftOutline,
  informationCircleOutline,
  checkmarkCircleOutline,
} from 'ionicons/icons';
import { AccessibilityService } from '../../services/accessibility.service';

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
  ],
})
export class SettingsPage {
  constructor(public a11y: AccessibilityService) {
    addIcons({
      accessibilityOutline,
      textOutline,
      contrastOutline,
      handLeftOutline,
      informationCircleOutline,
      checkmarkCircleOutline,
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
}
