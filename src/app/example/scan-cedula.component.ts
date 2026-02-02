import { Component, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScannerService } from '../services/scanner.service';
import { CedulaData, ScanErrorCode } from '../models/cedula.model';

/**
 * Componente de ejemplo para escanear cédulas colombianas
 * Demuestra el uso correcto del ScannerService
 *
 * Características:
 * - Escaneo automático (detecta PDF417 o MRZ)
 * - Escaneo específico por tipo
 * - Manejo completo de errores
 * - Visualización de todos los campos extraídos
 */
@Component({
  selector: 'app-scan-cedula',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scanner-container">
      <h2>Escáner de Cédula Colombiana</h2>

      <!-- Estado del dispositivo -->
      @if (deviceInfo()) {
        <div class="device-info">
          <span class="status-badge" [class.active]="deviceInfo()?.isSupported">
            {{ deviceInfo()?.isSupported ? '✓ Dispositivo compatible' : '✗ No compatible' }}
          </span>
          <span class="status-badge" [class.active]="deviceInfo()?.hasPermissions">
            {{ deviceInfo()?.hasPermissions ? '✓ Permisos OK' : '✗ Sin permisos' }}
          </span>
        </div>
      }

      <!-- Botones de acción -->
      <div class="actions">
        <button
          (click)="scanCedula()"
          [disabled]="isScanning()"
          class="btn-primary">
          {{ isScanning() ? 'Escaneando...' : '📷 Escanear Cédula' }}
        </button>

        <div class="btn-group">
          <button
            (click)="scanPDF417Only()"
            [disabled]="isScanning()"
            class="btn-secondary">
            Cédula Antigua (PDF417)
          </button>

          <button
            (click)="scanMRZOnly()"
            [disabled]="isScanning()"
            class="btn-secondary">
            Cédula Nueva (MRZ)
          </button>
        </div>

        @if (isScanning()) {
          <button (click)="cancelScan()" class="btn-danger">
            Cancelar
          </button>
        }
      </div>

      <!-- Mensaje de error -->
      @if (errorMessage()) {
        <div class="error-message">
          <strong>Error:</strong>
          <p>{{ errorMessage() }}</p>
          @if (showSettingsButton()) {
            <button (click)="openSettings()" class="btn-link">
              Abrir Configuración del Dispositivo
            </button>
          }
        </div>
      }

      <!-- Datos escaneados -->
      @if (cedulaData()) {
        <div class="cedula-card">
          <div class="card-header">
            <h3>Datos de la Cédula</h3>
            <span class="tipo-badge" [class.antigua]="cedulaData()?.tipoDocumento === 'ANTIGUA'">
              {{ cedulaData()?.tipoDocumento === 'ANTIGUA' ? '🟡 Cédula Antigua' : '🔵 Cédula Nueva' }}
            </span>
          </div>

          <!-- Información principal -->
          <div class="card-section">
            <h4>Identificación</h4>

            <div class="data-row">
              <span class="label">Número de Cédula:</span>
              <span class="value highlight">{{ formatCedula(cedulaData()?.numeroDocumento) }}</span>
            </div>

            @if (cedulaData()?.nuip) {
              <div class="data-row">
                <span class="label">NUIP:</span>
                <span class="value">{{ cedulaData()?.nuip }}</span>
              </div>
            }
          </div>

          <!-- Nombres -->
          <div class="card-section">
            <h4>Datos Personales</h4>

            <div class="data-row">
              <span class="label">Primer Apellido:</span>
              <span class="value">{{ cedulaData()?.primerApellido }}</span>
            </div>

            <div class="data-row">
              <span class="label">Segundo Apellido:</span>
              <span class="value">{{ cedulaData()?.segundoApellido || '—' }}</span>
            </div>

            <div class="data-row">
              <span class="label">Primer Nombre:</span>
              <span class="value">{{ cedulaData()?.primerNombre }}</span>
            </div>

            <div class="data-row">
              <span class="label">Segundo Nombre:</span>
              <span class="value">{{ cedulaData()?.segundoNombre || '—' }}</span>
            </div>

            @if (cedulaData()?.nombresTruncados) {
              <div class="warning-badge">
                ⚠️ Nombres posiblemente truncados en MRZ
              </div>
            }
          </div>

          <!-- Datos demográficos -->
          <div class="card-section">
            <h4>Información Adicional</h4>

            <div class="data-grid">
              <div class="data-item">
                <span class="label">Fecha Nacimiento</span>
                <span class="value">{{ formatDate(cedulaData()?.fechaNacimiento) }}</span>
              </div>

              <div class="data-item">
                <span class="label">Género</span>
                <span class="value">{{ formatGenero(cedulaData()?.genero) }}</span>
              </div>

              <div class="data-item">
                <span class="label">Tipo de Sangre</span>
                <span class="value rh">{{ cedulaData()?.rh || 'N/A' }}</span>
              </div>

              @if (cedulaData()?.fechaExpiracion) {
                <div class="data-item">
                  <span class="label">Vencimiento</span>
                  <span class="value">{{ formatDate(cedulaData()?.fechaExpiracion) }}</span>
                </div>
              }
            </div>
          </div>

          <!-- Ubicación -->
          @if (cedulaData()?.ubicacion?.municipio) {
            <div class="card-section">
              <h4>Lugar de Expedición</h4>

              <div class="data-row">
                <span class="label">Municipio:</span>
                <span class="value">{{ cedulaData()?.ubicacion?.municipio }}</span>
              </div>

              <div class="data-row">
                <span class="label">Departamento:</span>
                <span class="value">{{ cedulaData()?.ubicacion?.departamento }}</span>
              </div>

              <div class="data-row subtle">
                <span class="label">Código DIVIPOLA:</span>
                <span class="value">{{ cedulaData()?.ubicacion?.codigoMunicipio }}-{{ cedulaData()?.ubicacion?.codigoDepartamento }}</span>
              </div>
            </div>
          }

          <!-- Información técnica (solo cédulas antiguas) -->
          @if (cedulaData()?.documentoInfo?.codigoAfis) {
            <div class="card-section technical">
              <h4>Datos Técnicos</h4>

              <div class="data-row">
                <span class="label">Código AFIS:</span>
                <span class="value mono">{{ cedulaData()?.documentoInfo?.codigoAfis }}</span>
              </div>

              @if (cedulaData()?.documentoInfo?.tarjetaDactilar) {
                <div class="data-row">
                  <span class="label">Tarjeta Dactilar:</span>
                  <span class="value mono">{{ cedulaData()?.documentoInfo?.tarjetaDactilar }}</span>
                </div>
              }
            </div>
          }

          <!-- Nivel de confianza -->
          @if (cedulaData()?.confianza !== undefined) {
            <div class="confidence-bar">
              <span>Confianza del escaneo:</span>
              <div class="bar">
                <div class="fill" [style.width.%]="cedulaData()?.confianza"></div>
              </div>
              <span>{{ cedulaData()?.confianza }}%</span>
            </div>
          }

          <button (click)="clearData()" class="btn-clear">
            Limpiar datos
          </button>
        </div>
      }

      <!-- Instrucciones -->
      @if (!cedulaData() && !isScanning()) {
        <div class="instructions">
          <h4>Instrucciones</h4>
          <ul>
            <li><strong>Cédula Antigua (amarilla):</strong> Enfoque el código de barras en la parte posterior</li>
            <li><strong>Cédula Nueva (holográfica):</strong> Enfoque las 3 líneas de texto en la parte posterior (zona MRZ)</li>
            <li>Asegúrese de tener buena iluminación</li>
            <li>Mantenga el documento estable mientras escanea</li>
          </ul>
        </div>
      }
    </div>
  `,
  styles: [`
    .scanner-container {
      padding: 16px;
      max-width: 600px;
      margin: 0 auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    h2 {
      text-align: center;
      color: #1a1a2e;
      margin-bottom: 16px;
    }

    .device-info {
      display: flex;
      justify-content: center;
      gap: 12px;
      margin-bottom: 20px;
    }

    .status-badge {
      font-size: 12px;
      padding: 4px 10px;
      border-radius: 12px;
      background: #f0f0f0;
      color: #666;
    }

    .status-badge.active {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 24px;
    }

    .btn-group {
      display: flex;
      gap: 8px;
    }

    button {
      padding: 14px 20px;
      border-radius: 10px;
      font-size: 16px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }

    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-primary {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      font-size: 18px;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
    }

    .btn-secondary {
      background: #f5f5f5;
      color: #333;
      flex: 1;
      font-size: 14px;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #e8e8e8;
    }

    .btn-danger {
      background: #ef5350;
      color: white;
    }

    .btn-link {
      background: transparent;
      color: #667eea;
      text-decoration: underline;
      padding: 8px;
    }

    .btn-clear {
      background: #ff7043;
      color: white;
      width: 100%;
      margin-top: 16px;
    }

    .btn-test {
      background: #ff9800;
      color: white;
      width: 100%;
      margin-top: 8px;
      font-size: 14px;
    }

    .btn-test:hover:not(:disabled) {
      background: #f57c00;
    }

    .error-message {
      background: #ffebee;
      border-left: 4px solid #ef5350;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 24px;
    }

    .error-message strong {
      color: #c62828;
    }

    .error-message p {
      color: #b71c1c;
      margin: 8px 0;
    }

    .cedula-card {
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      overflow: hidden;
    }

    .card-header {
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: white;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .card-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .tipo-badge {
      background: rgba(255,255,255,0.2);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
    }

    .tipo-badge.antigua {
      background: rgba(255, 193, 7, 0.3);
    }

    .card-section {
      padding: 16px 20px;
      border-bottom: 1px solid #f0f0f0;
    }

    .card-section:last-of-type {
      border-bottom: none;
    }

    .card-section h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      color: #667eea;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-section.technical {
      background: #fafafa;
    }

    .data-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #f5f5f5;
    }

    .data-row:last-child {
      border-bottom: none;
    }

    .data-row.subtle {
      opacity: 0.7;
      font-size: 13px;
    }

    .label {
      color: #666;
      font-size: 14px;
    }

    .value {
      color: #1a1a2e;
      font-weight: 600;
      font-size: 14px;
    }

    .value.highlight {
      color: #667eea;
      font-size: 18px;
      font-family: 'SF Mono', Monaco, monospace;
    }

    .value.mono {
      font-family: 'SF Mono', Monaco, monospace;
      font-size: 12px;
    }

    .value.rh {
      background: #e3f2fd;
      color: #1565c0;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .data-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
    }

    .data-item {
      text-align: center;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .data-item .label {
      display: block;
      font-size: 12px;
      margin-bottom: 4px;
    }

    .data-item .value {
      display: block;
      font-size: 16px;
    }

    .warning-badge {
      background: #fff3e0;
      color: #e65100;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      margin-top: 8px;
    }

    .confidence-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px 20px;
      background: #f8f9fa;
      font-size: 13px;
      color: #666;
    }

    .confidence-bar .bar {
      flex: 1;
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .confidence-bar .fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea, #764ba2);
      border-radius: 4px;
      transition: width 0.3s;
    }

    .instructions {
      background: #e3f2fd;
      border-radius: 12px;
      padding: 20px;
      margin-top: 24px;
    }

    .instructions h4 {
      margin: 0 0 12px 0;
      color: #1565c0;
    }

    .instructions ul {
      margin: 0;
      padding-left: 20px;
    }

    .instructions li {
      margin: 8px 0;
      color: #333;
      line-height: 1.5;
    }
  `]
})
export class ScanCedulaComponent implements OnInit {
  // Estado del componente usando signals (Angular 17+)
  isScanning = signal(false);
  errorMessage = signal<string | null>(null);
  showSettingsButton = signal(false);
  cedulaData = signal<CedulaData | null>(null);
  deviceInfo = signal<{
    isNative: boolean;
    isSupported: boolean;
    hasTorch: boolean;
    hasPermissions: boolean;
  } | null>(null);

  constructor(private scannerService: ScannerService) {}

  async ngOnInit(): Promise<void> {
    // Obtener información del dispositivo al iniciar
    try {
      console.log('🔍 Inicializando componente de scanner...');
      const info = await this.scannerService.getCapabilities();
      console.log('✅ Capacidades obtenidas:', info);
      this.deviceInfo.set(info);
    } catch (error) {
      console.error('❌ Error obteniendo información del dispositivo:', error);
    }
  }

  /**
   * Escanea cualquier tipo de cédula (detección automática)
   */
  async scanCedula(): Promise<void> {
    await this.performScan(() => this.scannerService.scanCedula());
  }

  /**
   * Escanea solo cédulas antiguas (PDF417)
   */
  async scanPDF417Only(): Promise<void> {
    await this.performScan(() => this.scannerService.scanPDF417());
  }

  /**
   * Escanea solo cédulas nuevas (MRZ)
   */
  async scanMRZOnly(): Promise<void> {
    await this.performScan(() => this.scannerService.scanMRZ());
  }

  /**
   * Prueba el escáner nativo de Google para verificar que ML Kit funciona
   */
  async testNativeScan(): Promise<void> {
    this.isScanning.set(true);
    this.errorMessage.set(null);
    
    try {
      const result = await this.scannerService.testNativeScan();
      if (result) {
        alert(`✅ Escáner funciona!\n\nFormato: ${result.format}\nValor: ${result.value.substring(0, 100)}...`);
      } else {
        alert('No se detectó ningún código');
      }
    } catch (error: any) {
      const message = error?.message || JSON.stringify(error);
      alert(`❌ Error: ${message}`);
      console.error('Error en test nativo:', error);
    } finally {
      this.isScanning.set(false);
    }
  }

  /**
   * Cancela el escaneo actual
   */
  async cancelScan(): Promise<void> {
    await this.scannerService.stopScan();
    this.isScanning.set(false);
  }

  /**
   * Lógica común de escaneo con manejo de errores
   */
  private async performScan(scanFn: () => Promise<CedulaData>): Promise<void> {
    this.isScanning.set(true);
    this.errorMessage.set(null);
    this.showSettingsButton.set(false);
    this.cedulaData.set(null);

    try {
      const data = await scanFn();
      this.cedulaData.set(data);
    } catch (error: any) {
      this.handleScanError(error);
    } finally {
      this.isScanning.set(false);
    }
  }

  /**
   * Maneja errores del escáner
   */
  private handleScanError(error: any): void {
    const code = error.code as ScanErrorCode;
    const message = error.message || 'Error desconocido';

    this.errorMessage.set(message);

    // Mostrar botón de configuración si es problema de permisos
    if (code === ScanErrorCode.PERMISSION_DENIED) {
      this.showSettingsButton.set(true);
    }

    console.error('Error de escaneo:', { code, message });
  }

  /**
   * Abre la configuración del dispositivo
   */
  async openSettings(): Promise<void> {
    await this.scannerService.openSettings();
  }

  /**
   * Limpia los datos escaneados
   */
  clearData(): void {
    this.cedulaData.set(null);
    this.errorMessage.set(null);
  }

  /**
   * Formatea el número de cédula con puntos de miles
   */
  formatCedula(numero: string | undefined): string {
    if (!numero) return '';
    return numero.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }

  /**
   * Formatea fecha ISO a formato legible
   */
  formatDate(fecha: string | undefined): string {
    if (!fecha) return 'N/A';
    try {
      const date = new Date(fecha);
      return date.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return fecha;
    }
  }

  /**
   * Formatea el género
   */
  formatGenero(genero: string | undefined): string {
    if (genero === 'M') return 'Masculino';
    if (genero === 'F') return 'Femenino';
    return 'No especificado';
  }
}
