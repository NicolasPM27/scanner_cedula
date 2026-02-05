import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonIcon,
  IonChip,
  IonLabel,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonFab,
  IonFabButton,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  scanOutline,
  scan,
  settingsOutline,
  cameraOutline,
  imagesOutline,
  flashOutline,
  shieldCheckmarkOutline,
  sparklesOutline,
  documentTextOutline,
} from 'ionicons/icons';
import { ScannerService } from '../services/scanner.service';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonIcon,
    IonChip,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonFab,
    IonFabButton,
  ],
})
export class HomePage implements OnInit {
  deviceInfo: {
    isNative: boolean;
    isSupported: boolean;
    hasTorch: boolean;
    hasPermissions: boolean;
  } | null = null;

  constructor(
    private router: Router,
    private scannerService: ScannerService
  ) {
    addIcons({
      scanOutline,
      scan,
      settingsOutline,
      cameraOutline,
      imagesOutline,
      flashOutline,
      shieldCheckmarkOutline,
      sparklesOutline,
      documentTextOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    try {
      this.deviceInfo = await this.scannerService.getCapabilities();
    } catch {
      this.deviceInfo = null;
    }
  }

  goToScanner(mode: 'auto' | 'pdf417' | 'mrz' | 'test' = 'auto'): void {
    this.router.navigate(['/scanner'], {
      queryParams: { mode }
    });
  }
}
