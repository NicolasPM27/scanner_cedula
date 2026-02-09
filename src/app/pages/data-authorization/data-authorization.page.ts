import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AccessibilityService } from '../../services/accessibility.service';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonCheckbox,
  IonBackButton,
  NavController
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  shieldCheckmarkOutline,
  chevronBackOutline,
  checkmarkCircleOutline
} from 'ionicons/icons';

interface AuthorizationData {
  dataProcessingAgreed: boolean;
  privacyPolicyAgreed: boolean;
}

@Component({
  selector: 'app-data-authorization',
  standalone: true,
  templateUrl: './data-authorization.page.html',
  styleUrls: ['./data-authorization.page.scss'],
  imports: [
    CommonModule,
    FormsModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonCheckbox,
    IonBackButton
  ],
})
export class DataAuthorizationPage implements OnInit {
  authorizationData: AuthorizationData = {
    dataProcessingAgreed: false,
    privacyPolicyAgreed: false,
  };

  targetMode: string = 'auto';
  targetPlatform: string = '';

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private navCtrl: NavController,
    public a11y: AccessibilityService
  ) {
    addIcons({
      shieldCheckmarkOutline,
      chevronBackOutline,
      checkmarkCircleOutline
    });
  }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      this.targetMode = params['mode'] || 'auto';
      this.targetPlatform = params['platform'] || '';
    });
  }

  isFormValid(): boolean {
    return (
      this.authorizationData.dataProcessingAgreed &&
      this.authorizationData.privacyPolicyAgreed
    );
  }

  confirm(): void {
    if (this.isFormValid()) {
      // PWA/web: usar web-scanner; nativo: usar scanner existente
      const route = this.targetPlatform === 'web' ? '/web-scanner' : '/scanner';
      this.router.navigate([route], {
        queryParams: { mode: this.targetMode },
        replaceUrl: true
      });
    }
  }

  cancel(): void {
    this.navCtrl.back();
  }
}
