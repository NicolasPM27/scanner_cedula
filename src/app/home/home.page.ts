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
  cloudUploadOutline,
  schoolOutline,
} from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { ScannerService } from '../services/scanner.service';
import { environment } from '../../environments/environment';

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
  isDev = !environment.production || this.isLocalhost();

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
      cloudUploadOutline,
      schoolOutline,
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
    if (Capacitor.isNativePlatform()) {
      // App nativa: flujo existente con autorizacion + scanner nativo
      this.router.navigate(['/data-authorization'], {
        queryParams: { mode }
      });
    } else {
      // PWA/web: flujo con autorizacion + web scanner (getUserMedia + backend)
      this.router.navigate(['/data-authorization'], {
        queryParams: { mode, platform: 'web' }
      });
    }
  }

  goToVerification(): void {
    this.router.navigate(['/verification']);
  }

  goToImportInstituciones(): void {
    this.router.navigate(['/dev/import-instituciones']);
  }

  private isLocalhost(): boolean {
    if (typeof window === 'undefined') return false;
    const host = window.location.hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
  }
}
