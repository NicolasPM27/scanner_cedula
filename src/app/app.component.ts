import { Component } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AccessibilityService } from './services/accessibility.service';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet],
})
export class AppComponent {
  /**
   * Se inyecta AccessibilityService en el root para que el efecto
   * que aplica body.simple-mode se ejecute desde el arranque de la app.
   */
  constructor(private a11y: AccessibilityService) {}
}
