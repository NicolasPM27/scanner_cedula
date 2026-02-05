import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
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

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private navCtrl: NavController
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
      // Navigate to scanner with replaceUrl so back button skips this auth page
      this.router.navigate(['/scanner'], {
        queryParams: { mode: this.targetMode },
        replaceUrl: true
      });
    }
  }

  cancel(): void {
    this.navCtrl.back();
  }
}
