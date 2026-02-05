import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonCheckbox,
  IonList,
  IonItem,
  IonLabel,
  ModalController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  closeOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons';

interface AuthorizationData {
  dataProcessingAgreed: boolean;
  privacyPolicyAgreed: boolean;
}

@Component({
  selector: 'app-data-authorization-modal',
  standalone: true,
  templateUrl: './data-authorization-modal.component.html',
  styleUrls: ['./data-authorization-modal.component.scss'],
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
    IonLabel,
  ],
})
export class DataAuthorizationModalComponent {
  authorizationData: AuthorizationData = {
    dataProcessingAgreed: false,
    privacyPolicyAgreed: false,
  };

  constructor(private modalController: ModalController) {
    addIcons({
      closeOutline,
      shieldCheckmarkOutline,
    });
  }

  isFormValid(): boolean {
    return (
      this.authorizationData.dataProcessingAgreed &&
      this.authorizationData.privacyPolicyAgreed
    );
  }

  async confirm(): Promise<void> {
    if (this.isFormValid()) {
      await this.modalController.dismiss(this.authorizationData, 'confirm');
    }
  }

  async cancel(): Promise<void> {
    await this.modalController.dismiss(null, 'cancel');
  }
}
