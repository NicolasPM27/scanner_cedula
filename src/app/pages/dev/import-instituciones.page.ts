import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import {
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonButton,
  IonButtons,
  IonBackButton,
  IonIcon,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonSpinner,
  IonChip,
  IonProgressBar,
  IonNote,
  IonBadge,
  IonText,
  AlertController,
  ToastController,
} from '@ionic/angular/standalone';
import { addIcons } from 'ionicons';
import {
  cloudUploadOutline,
  documentOutline,
  checkmarkCircleOutline,
  closeCircleOutline,
  alertCircleOutline,
  refreshOutline,
  statsChartOutline,
  timeOutline,
  trashOutline,
  schoolOutline,
  layersOutline,
  businessOutline,
  mapOutline,
  arrowBackOutline,
} from 'ionicons/icons';
import { Subscription } from 'rxjs';
import {
  InstitucionesApiService,
  ImportResult,
  ImportStats,
  UploadProgress,
} from '../../services/instituciones-api.service';

type PageState = 'idle' | 'uploading' | 'success' | 'error';

@Component({
  selector: 'app-import-instituciones',
  standalone: true,
  templateUrl: 'import-instituciones.page.html',
  styleUrls: ['import-instituciones.page.scss'],
  imports: [
    CommonModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButton,
    IonButtons,
    IonBackButton,
    IonIcon,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonList,
    IonItem,
    IonLabel,
    IonSpinner,
    IonChip,
    IonProgressBar,
    IonNote,
    IonBadge,
    IonText,
  ],
})
export class ImportInstitucionesPage implements OnInit, OnDestroy {
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  state: PageState = 'idle';
  selectedFile: File | null = null;
  uploadPercent = 0;
  importResult: ImportResult | null = null;
  errorMessage = '';
  stats: ImportStats | null = null;
  loadingStats = true;

  private uploadSub: Subscription | null = null;

  /** Formatos aceptados por el file input */
  readonly acceptedFormats = '.xlsx,.xls,.csv,.tsv';

  constructor(
    private readonly ieApi: InstitucionesApiService,
    private readonly router: Router,
    private readonly alertCtrl: AlertController,
    private readonly toastCtrl: ToastController,
  ) {
    addIcons({
      cloudUploadOutline,
      documentOutline,
      checkmarkCircleOutline,
      closeCircleOutline,
      alertCircleOutline,
      refreshOutline,
      statsChartOutline,
      timeOutline,
      trashOutline,
      schoolOutline,
      layersOutline,
      businessOutline,
      mapOutline,
      arrowBackOutline,
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadStats();
  }

  ngOnDestroy(): void {
    this.uploadSub?.unsubscribe();
  }

  // ── File Handling ──────────────────────────────────

  /** Abre el diálogo nativo del navegador */
  triggerFileInput(): void {
    this.fileInput.nativeElement.click();
  }

  /** Callback del <input type="file"> */
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    // Validar tamaño (20 MB max)
    if (file.size > 20 * 1024 * 1024) {
      this.showToast('El archivo excede el límite de 20 MB', 'danger');
      return;
    }

    this.selectedFile = file;
    this.state = 'idle';
    this.importResult = null;
    this.errorMessage = '';
  }

  /** Formatea el tamaño del archivo para display */
  get fileSizeFormatted(): string {
    if (!this.selectedFile) return '';
    const kb = this.selectedFile.size / 1024;
    return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(0)} KB`;
  }

  /** Elimina el archivo seleccionado */
  clearFile(): void {
    this.selectedFile = null;
    this.state = 'idle';
    this.importResult = null;
    this.errorMessage = '';
    if (this.fileInput?.nativeElement) {
      this.fileInput.nativeElement.value = '';
    }
  }

  // ── Upload ─────────────────────────────────────────

  /** Confirma y ejecuta la importación */
  async confirmUpload(): Promise<void> {
    if (!this.selectedFile) return;

    const alert = await this.alertCtrl.create({
      header: 'Confirmar importación',
      message: `¿Importar <strong>${this.selectedFile.name}</strong>?<br><br>
        Esto agregará o actualizará instituciones educativas en la base de datos.`,
      buttons: [
        { text: 'Cancelar', role: 'cancel' },
        {
          text: 'Importar',
          handler: () => this.startUpload(),
        },
      ],
    });
    await alert.present();
  }

  /** Ejecuta la subida y procesamiento */
  private startUpload(): void {
    if (!this.selectedFile) return;

    this.state = 'uploading';
    this.uploadPercent = 0;
    this.importResult = null;
    this.errorMessage = '';

    this.uploadSub?.unsubscribe();
    this.uploadSub = this.ieApi.uploadImport(this.selectedFile).subscribe({
      next: (event: UploadProgress) => {
        if (event.type === 'progress') {
          this.uploadPercent = event.percent;
        } else {
          this.importResult = event.result;
          this.state = 'success';
          this.showToast(
            `Importación completada: ${event.result.processed} registros procesados`,
            'success'
          );
          this.loadStats(); // Refrescar estadísticas
        }
      },
      error: (err: any) => {
        this.state = 'error';
        this.errorMessage = err?.error?.error || err?.message || 'Error al importar el archivo';
        this.showToast('Error durante la importación', 'danger');
      },
    });
  }

  // ── Stats ──────────────────────────────────────────

  async loadStats(): Promise<void> {
    this.loadingStats = true;
    try {
      this.stats = await this.ieApi.getStats();
    } catch {
      this.stats = null;
    } finally {
      this.loadingStats = false;
    }
  }

  /** Refresca caché del servidor y estadísticas */
  async refreshAll(): Promise<void> {
    try {
      await this.ieApi.refreshCache();
      await this.loadStats();
      this.showToast('Caché refrescado correctamente', 'success');
    } catch {
      this.showToast('Error al refrescar el caché', 'danger');
    }
  }

  // ── Helpers ────────────────────────────────────────

  private async showToast(message: string, color: 'success' | 'danger' | 'warning'): Promise<void> {
    const toast = await this.toastCtrl.create({
      message,
      color,
      duration: 3000,
      position: 'bottom',
    });
    await toast.present();
  }

  goBack(): void {
    this.router.navigate(['/home']);
  }
}
