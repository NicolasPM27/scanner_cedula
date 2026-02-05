import { Injectable } from '@angular/core';
import { Capacitor } from '@capacitor/core';
import {
  BarcodeScanner,
  Barcode,
  BarcodeFormat,
  LensFacing,
  StartScanOptions
} from '@capacitor-mlkit/barcode-scanning';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { CapacitorPluginMlKitTextRecognition } from '@pantrist/capacitor-plugin-ml-kit-text-recognition';
import {
  CedulaData,
  ScanErrorCode,
  ScannerConfig,
  DEFAULT_SCANNER_CONFIG,
  MRZ_TD1_CONSTANTS
} from '../models/cedula.model';
import { CedulaParserService } from './cedula-parser.service';

// Constantes para la UI del escáner
const SCANNER_UI = {
  // Proporción de una cédula colombiana (85.6mm x 53.98mm = 1.586:1)
  CARD_ASPECT_RATIO: 1.586,
  // Margen del área de escaneo respecto a la pantalla (%)
  SCAN_AREA_MARGIN: 0.1,
  // Tiempo máximo de escaneo antes de timeout (ms)
  SCAN_TIMEOUT: 60000
};

/**
 * Servicio de escaneo que abstrae los plugins nativos de Capacitor
 * para la lectura de cédulas colombianas.
 *
 * Flujo de uso:
 * 1. Verificar permisos con checkPermissions()
 * 2. Solicitar permisos con requestPermissions() si es necesario
 * 3. Usar scanCedula() para escaneo automático (detecta tipo)
 * 4. O usar scanPDF417() / scanMRZ() para tipo específico
 *
 * Plugins utilizados:
 * - @capacitor-mlkit/barcode-scanning (PDF417)
 * - @capacitor-community/image-to-text (OCR para MRZ)
 */
@Injectable({
  providedIn: 'root'
})
export class ScannerService {
  // Flag para controlar si hay un escaneo activo
  private isScanning = false;
  // Referencia al listener activo
  private scanListener: { remove: () => Promise<void> } | null = null;
  // Timeout de escaneo
  private scanTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(private cedulaParser: CedulaParserService) {}

  /**
   * ============================================================
   * SECCIÓN 1: GESTIÓN DE PERMISOS
   * ============================================================
   */

  /**
   * Verifica si los permisos de cámara están concedidos
   * @returns true si los permisos están concedidos
   */
  async checkPermissions(): Promise<boolean> {
    if (!this.isNativePlatform()) {
      console.warn('Scanner: Ejecutando en web, permisos simulados');
      return true;
    }

    try {
      const status = await BarcodeScanner.checkPermissions();
      return status.camera === 'granted';
    } catch (error) {
      console.error('Error verificando permisos:', error);
      return false;
    }
  }

  /**
   * Solicita permisos de cámara al usuario
   * @returns true si los permisos fueron concedidos
   * @throws Error con código PERMISSION_DENIED si el usuario rechaza
   */
  async requestPermissions(): Promise<boolean> {
    if (!this.isNativePlatform()) {
      return true;
    }

    try {
      const status = await BarcodeScanner.requestPermissions();

      if (status.camera === 'granted') {
        return true;
      }

      if (status.camera === 'denied') {
        throw this.createError(
          ScanErrorCode.PERMISSION_DENIED,
          'Permiso de cámara denegado. Por favor, habilítelo en la configuración del dispositivo.'
        );
      }

      return false;
    } catch (error) {
      if (this.isKnownError(error)) {
        throw error;
      }
      throw this.createError(
        ScanErrorCode.PERMISSION_DENIED,
        'Error al solicitar permisos de cámara'
      );
    }
  }

  /**
   * ============================================================
   * SECCIÓN 2: ESCANEO PRINCIPAL
   * ============================================================
   */

  /**
   * Escanea una cédula colombiana (antigua o nueva)
   * Detecta automáticamente el tipo y procesa los datos
   *
   * Estrategia:
   * 1. Primero intenta con PDF417 (cédulas antiguas, más común)
   * 2. Si falla, intenta con OCR para MRZ (cédulas nuevas)
   *
   * @param config - Configuración opcional del escáner
   * @returns Promise con los datos de la cédula procesados
   * @throws Error con código específico si falla
   */
  async scanCedula(config?: Partial<ScannerConfig>): Promise<CedulaData> {
    const mergedConfig = { ...DEFAULT_SCANNER_CONFIG, ...config };

    // Verificar permisos
    const hasPermission = await this.checkPermissions();
    if (!hasPermission) {
      const granted = await this.requestPermissions();
      if (!granted) {
        throw this.createError(
          ScanErrorCode.PERMISSION_DENIED,
          'Se requieren permisos de cámara para escanear'
        );
      }
    }

    // Primero intentar con código de barras PDF417 (más común)
    try {
      const barcodeResult = await this.scanPDF417(mergedConfig);
      return barcodeResult;
    } catch (barcodeError) {
      // Si el error es de cancelación, propagarlo
      if (this.isKnownError(barcodeError) &&
          (barcodeError as any).code === ScanErrorCode.SCAN_CANCELLED) {
        throw barcodeError;
      }
      console.log('PDF417 no detectado, intentando MRZ...');
    }

    // Intentar con OCR (MRZ)
    try {
      const mrzResult = await this.scanMRZ(mergedConfig);
      return mrzResult;
    } catch (mrzError) {
      throw this.createError(
        ScanErrorCode.INVALID_FORMAT,
        'No se pudo detectar una cédula válida. Asegúrese de enfocar correctamente el código de barras (cédula antigua) o la zona MRZ (cédula nueva).'
      );
    }
  }

  /**
   * Escanea específicamente un código PDF417 (cédula antigua)
   *
   * El PDF417 está ubicado en la parte posterior de las cédulas
   * colombianas antiguas (amarillas). Contiene 530 bytes de datos
   * codificados en latin-1.
   *
   * IMPORTANTE: Usa startScan() con UI personalizada en lugar de scan()
   * para proporcionar una mejor experiencia con el formato de cédula colombiana.
   *
   * @param config - Configuración opcional
   * @returns Promise con los datos parseados
   */
  async scanPDF417(config?: Partial<ScannerConfig>): Promise<CedulaData> {
    const mergedConfig = { ...DEFAULT_SCANNER_CONFIG, ...config };

    if (!this.isNativePlatform()) {
      throw this.createError(
        ScanErrorCode.PLUGIN_NOT_AVAILABLE,
        'El escaneo de código de barras solo está disponible en dispositivos móviles'
      );
    }

    // Prevenir múltiples escaneos simultáneos
    if (this.isScanning) {
      throw this.createError(
        ScanErrorCode.UNKNOWN_ERROR,
        'Ya hay un escaneo en progreso'
      );
    }

    try {
      this.isScanning = true;
      console.log('🔍 Iniciando scanPDF417 con captura de foto...');

      // Capturar foto del código de barras
      const barcode = await this.scanWithPhotoCapture();

      console.log('📦 Barcode recibido:', barcode ? JSON.stringify({
        format: barcode.format,
        rawValueLength: barcode.rawValue?.length,
        bytesLength: barcode.bytes?.length,
        displayValue: barcode.displayValue?.substring(0, 50)
      }) : 'null');

      if (!barcode) {
        throw this.createError(
          ScanErrorCode.SCAN_CANCELLED,
          'No se detectó código de barras en la imagen. Intente de nuevo con mejor iluminación.'
        );
      }

      // Verificar que sea PDF417
      if (barcode.format !== 'PDF_417') {
        console.warn('⚠️ Código detectado no es PDF417:', barcode.format);
        throw this.createError(
          ScanErrorCode.INVALID_FORMAT,
          `Se detectó un código ${barcode.format}, pero se esperaba PDF417 de cédula colombiana`
        );
      }

      // Obtener datos crudos del código de barras
      // Priorizar bytes para PDF417 (mejor manejo de latin-1)
      let rawData: string;
      
      if (barcode.bytes && barcode.bytes.length > 0) {
        // Decodificar bytes como latin-1
        rawData = this.decodeLatin1Bytes(barcode.bytes);
        console.log('PDF417: Usando bytes decodificados, longitud:', rawData.length);
      } else {
        rawData = barcode.rawValue || barcode.displayValue || '';
        console.log('PDF417: Usando rawValue/displayValue, longitud:', rawData.length);
      }

      if (!rawData || rawData.length === 0) {
        throw this.createError(
          ScanErrorCode.INVALID_FORMAT,
          'El código de barras no contiene datos válidos'
        );
      }

      // Parsear los datos
      try {
        const cedulaData = this.cedulaParser.parsePDF417(rawData);
        return cedulaData;
      } catch (parseError) {
        console.error('Error parseando PDF417:', parseError);
        throw this.createError(
          ScanErrorCode.PARSE_ERROR,
          `Error al interpretar los datos del código: ${(parseError as Error).message}`
        );
      }

    } catch (error) {
      if (this.isKnownError(error)) {
        throw error;
      }

      const errorMessage = this.extractErrorMessage(error);
      console.error('ERROR MESSAGE: ', errorMessage);

      if (errorMessage.includes('cancelled') || errorMessage.includes('canceled') || errorMessage.includes('User cancelled')) {
        throw this.createError(ScanErrorCode.SCAN_CANCELLED, 'Escaneo cancelado por el usuario');
      }

      if (errorMessage.includes('camera') || errorMessage.includes('Camera')) {
        throw this.createError(ScanErrorCode.CAMERA_UNAVAILABLE, 'La cámara no está disponible');
      }

      throw this.createError(ScanErrorCode.UNKNOWN_ERROR, `Error de escaneo: ${errorMessage}`);
    } finally {
      this.isScanning = false;
    }
  }

  /**
   * Escanea un código de barras capturando una foto y analizándola
   * Este método es más confiable en iOS que el escaneo en tiempo real
   */
  private async scanWithPhotoCapture(): Promise<Barcode | null> {
    console.log('📸 Capturando foto para análisis...');
    
    // Capturar foto con la cámara
    const image = await Camera.getPhoto({
      quality: 100,
      allowEditing: false,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      correctOrientation: true
    });

    if (!image.path) {
      console.log('❌ No se capturó imagen o no hay path');
      return null;
    }

    console.log('📸 Imagen capturada en:', image.path);

    // Analizar la imagen con ML Kit Barcode Scanner
    const result = await BarcodeScanner.readBarcodesFromImage({
      path: image.path,
      formats: [BarcodeFormat.Pdf417]
    });

    console.log('🔍 Resultado del análisis:', JSON.stringify(result));

    if (result.barcodes && result.barcodes.length > 0) {
      return result.barcodes[0];
    }

    return null;
  }

  /**
   * Decodifica un array de bytes como latin-1 (ISO-8859-1)
   * Esto es importante para PDF417 colombiano que usa esta codificación
   */
  private decodeLatin1Bytes(bytes: number[]): string {
    return bytes.map(byte => String.fromCharCode(byte)).join('');
  }

  // Callback para rechazar la promesa de escaneo (usado para cancelación)
  private scanRejectCallback: ((error: Error) => void) | null = null;
  // Flag para evitar cancelaciones durante el setup
  private scanSetupComplete = false;

  /**
   * Realiza un escaneo con UI personalizada usando startScan()
   * La cámara se muestra detrás del WebView, permitiendo UI personalizada
   */
  private async performCustomScan(formats: BarcodeFormat[]): Promise<Barcode | null> {
    return new Promise(async (resolve, reject) => {
      // Guardar referencia al reject para poder cancelar desde el botón
      this.scanRejectCallback = reject;
      this.scanSetupComplete = false;

      try {
        console.log('📷 Iniciando escaneo con formatos:', formats);

        // Primero hacer el fondo transparente
        this.setWebViewTransparent(true);
        document.body.classList.add('barcode-scanner-active');

        // Agregar listener para cuando se detecte un código
        console.log('📡 Agregando listener barcodesScanned...');
        this.scanListener = await BarcodeScanner.addListener(
          'barcodesScanned',
          async (event) => {
            console.log('🎯 Evento barcodesScanned recibido:', JSON.stringify(event));
            if (event.barcodes && event.barcodes.length > 0) {
              const barcode = event.barcodes[0];
              console.log('✅ Código detectado:', barcode?.format, 'valor:', barcode?.rawValue?.substring(0, 50) + '...');
              this.scanRejectCallback = null;
              await this.cleanupScan();
              resolve(barcode);
            }
          }
        );
        console.log('✅ Listener barcodesScanned agregado');

        // Agregar listener para errores
        console.log('📡 Agregando listener scanError...');
        await BarcodeScanner.addListener(
          'scanError',
          async (error) => {
            console.error('❌ Error de escaneo:', error);
            this.scanRejectCallback = null;
            await this.cleanupScan();
            reject(this.createError(
              ScanErrorCode.UNKNOWN_ERROR,
              error.message || 'Error durante el escaneo'
            ));
          }
        );
        console.log('✅ Listener scanError agregado');

        // Iniciar el escaneo con la cámara trasera
        const options: StartScanOptions = {
          formats: formats,
          lensFacing: LensFacing.Back
        };

        console.log('🚀 Llamando BarcodeScanner.startScan con opciones:', JSON.stringify(options));
        await BarcodeScanner.startScan(options);
        console.log('✅ BarcodeScanner.startScan iniciado correctamente');

        // Ahora que el escaneo inició, mostrar el overlay
        // Usar setTimeout para dar tiempo a la cámara de iniciar
        setTimeout(() => {
          this.createScannerOverlay();
          this.scanSetupComplete = true;
          console.log('✅ Overlay creado y setup completado');
        }, 100);

        // Configurar timeout
        this.scanTimeout = setTimeout(async () => {
          console.log('⏰ Timeout de escaneo alcanzado');
          await this.cleanupScan();
          reject(this.createError(
            ScanErrorCode.SCAN_CANCELLED,
            'Tiempo de escaneo agotado'
          ));
        }, SCANNER_UI.SCAN_TIMEOUT);

      } catch (error) {
        console.error('❌ Error en performCustomScan:', error);
        this.scanRejectCallback = null;
        await this.cleanupScan();
        reject(error);
      }
    });
  }

  /**
   * Configura la transparencia del WebView
   * En iOS, esto es necesario para que la cámara sea visible detrás del WebView
   */
  private setWebViewTransparent(transparent: boolean): void {
    const html = document.documentElement;
    const body = document.body;
    
    if (transparent) {
      // Guardar estilos originales
      html.dataset['originalBg'] = html.style.backgroundColor || '';
      body.dataset['originalBg'] = body.style.backgroundColor || '';
      
      // Hacer todo transparente
      html.style.backgroundColor = 'transparent';
      body.style.backgroundColor = 'transparent';
      
      // Para Ionic
      const ionApp = document.querySelector('ion-app');
      if (ionApp) {
        (ionApp as HTMLElement).style.setProperty('--ion-background-color', 'transparent');
        (ionApp as HTMLElement).style.backgroundColor = 'transparent';
      }
      
      // Estilo inline crítico para iOS
      const styleEl = document.createElement('style');
      styleEl.id = 'scanner-transparency-style';
      styleEl.textContent = `
        html, body, ion-app, ion-router-outlet, ion-content, .ion-page {
          background: transparent !important;
          --background: transparent !important;
          --ion-background-color: transparent !important;
        }
      `;
      document.head.appendChild(styleEl);
    } else {
      // Restaurar estilos originales
      html.style.backgroundColor = html.dataset['originalBg'] || '';
      body.style.backgroundColor = body.dataset['originalBg'] || '';
      
      // Restaurar Ionic
      const ionApp = document.querySelector('ion-app');
      if (ionApp) {
        (ionApp as HTMLElement).style.removeProperty('--ion-background-color');
        (ionApp as HTMLElement).style.backgroundColor = '';
      }
      
      // Remover estilo de transparencia
      const styleEl = document.getElementById('scanner-transparency-style');
      if (styleEl) {
        styleEl.remove();
      }
    }
  }

  /**
   * Crea un overlay con guía visual para escanear la cédula
   */
  private createScannerOverlay(): void {
    // Remover overlay existente si hay uno
    const existingOverlay = document.getElementById('cedula-scanner-overlay');
    const existingStyles = document.getElementById('cedula-scanner-styles');
    if (existingOverlay) existingOverlay.remove();
    if (existingStyles) existingStyles.remove();

    const overlay = document.createElement('div');
    overlay.id = 'cedula-scanner-overlay';
    overlay.innerHTML = `
      <div class="scanner-overlay-content">
        <div class="scanner-header">
          <h2>Escanear Cédula</h2>
          <p>Ubique el código de barras dentro del recuadro</p>
        </div>
        
        <div class="scanner-viewfinder">
          <div class="viewfinder-border">
            <div class="corner top-left"></div>
            <div class="corner top-right"></div>
            <div class="corner bottom-left"></div>
            <div class="corner bottom-right"></div>
          </div>
          <div class="scan-line"></div>
        </div>
        
        <div class="scanner-footer">
          <button id="scanner-cancel-btn" class="cancel-button">
            Cancelar
          </button>
          <p class="scanner-hint">Asegúrese de tener buena iluminación</p>
        </div>
      </div>
    `;

    // Agregar estilos - NO usar visibility:hidden ya que causa problemas
    const style = document.createElement('style');
    style.id = 'cedula-scanner-styles';
    style.textContent = `
      #cedula-scanner-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        z-index: 999999 !important;
        display: flex !important;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        background: transparent !important;
        pointer-events: auto;
      }
      
      #cedula-scanner-overlay .scanner-overlay-content {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: space-between;
        padding: 20px;
        padding-top: calc(20px + env(safe-area-inset-top, 0px));
        padding-bottom: calc(20px + env(safe-area-inset-bottom, 0px));
        box-sizing: border-box;
        background: transparent;
      }
      
      #cedula-scanner-overlay .scanner-header {
        text-align: center;
        color: white;
        text-shadow: 0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5);
        z-index: 10;
      }
      
      #cedula-scanner-overlay .scanner-header h2 {
        margin: 0 0 8px 0;
        font-size: 24px;
        font-weight: 600;
      }
      
      #cedula-scanner-overlay .scanner-header p {
        margin: 0;
        font-size: 14px;
        opacity: 0.9;
      }
      
      #cedula-scanner-overlay .scanner-viewfinder {
        position: relative;
        width: 95%;
        height: 70%;
        max-height: 500px;
        background: transparent;
      }
      
      #cedula-scanner-overlay .viewfinder-border {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        border: 2px solid rgba(255,255,255,0.6);
        border-radius: 12px;
        box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.5);
      }
      
      #cedula-scanner-overlay .corner {
        position: absolute;
        width: 35px;
        height: 35px;
        border: 5px solid #00E676;
      }
      
      #cedula-scanner-overlay .corner.top-left {
        top: -3px;
        left: -3px;
        border-right: none;
        border-bottom: none;
        border-top-left-radius: 12px;
      }
      
      #cedula-scanner-overlay .corner.top-right {
        top: -3px;
        right: -3px;
        border-left: none;
        border-bottom: none;
        border-top-right-radius: 12px;
      }
      
      #cedula-scanner-overlay .corner.bottom-left {
        bottom: -3px;
        left: -3px;
        border-right: none;
        border-top: none;
        border-bottom-left-radius: 12px;
      }
      
      #cedula-scanner-overlay .corner.bottom-right {
        bottom: -3px;
        right: -3px;
        border-left: none;
        border-top: none;
        border-bottom-right-radius: 12px;
      }
      
      #cedula-scanner-overlay .scan-line {
        position: absolute;
        left: 15px;
        right: 15px;
        height: 3px;
        background: linear-gradient(90deg, transparent, #00E676, #00E676, transparent);
        animation: scanner-line-move 2s ease-in-out infinite;
        border-radius: 2px;
        box-shadow: 0 0 10px #00E676;
      }
      
      @keyframes scanner-line-move {
        0%, 100% { top: 15px; opacity: 1; }
        50% { top: calc(100% - 18px); opacity: 1; }
      }
      
      #cedula-scanner-overlay .scanner-footer {
        text-align: center;
        z-index: 10;
      }
      
      #cedula-scanner-overlay .cancel-button {
        background: rgba(255, 255, 255, 0.15);
        border: 2px solid rgba(255, 255, 255, 0.8);
        color: white;
        padding: 16px 50px;
        border-radius: 30px;
        font-size: 17px;
        font-weight: 600;
        cursor: pointer;
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
        transition: all 0.2s ease;
        text-shadow: 0 1px 3px rgba(0,0,0,0.5);
      }
      
      #cedula-scanner-overlay .cancel-button:active {
        background: rgba(255, 255, 255, 0.3);
        transform: scale(0.97);
      }
      
      #cedula-scanner-overlay .scanner-hint {
        color: white;
        font-size: 13px;
        margin-top: 16px;
        opacity: 0.85;
        text-shadow: 0 1px 4px rgba(0,0,0,0.7);
      }
    `;

    document.head.appendChild(style);
    document.body.appendChild(overlay);

    // Configurar botón de cancelar con debounce para evitar clicks accidentales
    const cancelBtn = document.getElementById('scanner-cancel-btn');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        console.log('🔴 Botón cancelar presionado, setupComplete:', this.scanSetupComplete);
        if (this.scanSetupComplete) {
          this.cancelCurrentScan();
        }
      });
    }
  }

  /**
   * Cancela el escaneo actual
   */
  private async cancelCurrentScan(): Promise<void> {
    console.log('🛑 cancelCurrentScan llamado');
    
    // Evitar múltiples cancelaciones
    if (!this.isScanning) {
      console.log('⚠️ No hay escaneo activo, ignorando cancelación');
      return;
    }
    
    const rejectCallback = this.scanRejectCallback;
    this.scanRejectCallback = null;
    this.isScanning = false;
    this.scanSetupComplete = false;
    
    await this.cleanupScan();
    
    // Rechazar la promesa de escaneo
    if (rejectCallback) {
      rejectCallback(this.createError(
        ScanErrorCode.SCAN_CANCELLED,
        'Escaneo cancelado por el usuario'
      ));
    }
  }

  /**
   * Remueve el overlay del escáner
   */
  private removeScannerOverlay(): void {
    const overlay = document.getElementById('cedula-scanner-overlay');
    const styles = document.getElementById('cedula-scanner-styles');
    
    if (overlay) overlay.remove();
    if (styles) styles.remove();
    
    // Restaurar transparencia del WebView
    this.setWebViewTransparent(false);
    
    document.body.classList.remove('barcode-scanner-active');
  }

  /**
   * Limpia recursos del escaneo
   */
  private async cleanupScan(): Promise<void> {
    // Limpiar timeout
    if (this.scanTimeout) {
      clearTimeout(this.scanTimeout);
      this.scanTimeout = null;
    }

    // Remover listeners
    if (this.scanListener) {
      await this.scanListener.remove();
      this.scanListener = null;
    }

    // Remover todos los listeners por seguridad
    try {
      await BarcodeScanner.removeAllListeners();
    } catch {
      // Ignorar errores
    }

    // Detener escaneo
    try {
      await BarcodeScanner.stopScan();
    } catch {
      // Ignorar errores
    }

    // Remover overlay
    this.removeScannerOverlay();
  }

  /**
   * Escanea específicamente la zona MRZ (cédula nueva)
   * Usa OCR para leer las 3 líneas de texto
   *
   * El MRZ está ubicado en la parte posterior de las cédulas
   * colombianas nuevas (holográficas). Formato TD1: 3 líneas de 30 caracteres.
   *
   * @param config - Configuración opcional
   * @returns Promise con los datos parseados
   */
  async scanMRZ(config?: Partial<ScannerConfig>): Promise<CedulaData> {
    if (!this.isNativePlatform()) {
      throw this.createError(
        ScanErrorCode.PLUGIN_NOT_AVAILABLE,
        'El reconocimiento de texto solo está disponible en dispositivos móviles'
      );
    }

    try {
      // Capturar imagen y procesar OCR
      const textResult = await this.performOCRScan();

      // Extraer líneas MRZ del texto reconocido
      const mrzLines = this.extractMRZLines(textResult);

      if (mrzLines.length < MRZ_TD1_CONSTANTS.LINE_COUNT) {
        throw this.createError(
          ScanErrorCode.INVALID_FORMAT,
          `Se detectaron ${mrzLines.length} líneas MRZ, se requieren ${MRZ_TD1_CONSTANTS.LINE_COUNT}. Asegúrese de que la zona MRZ sea completamente visible.`
        );
      }

      // Parsear las líneas MRZ
      try {
        const cedulaData = this.cedulaParser.parseMRZ(mrzLines);
        return cedulaData;
      } catch (parseError) {
        throw this.createError(
          ScanErrorCode.PARSE_ERROR,
          `Error al interpretar MRZ: ${(parseError as Error).message}`
        );
      }

    } catch (error) {
      if (this.isKnownError(error)) {
        throw error;
      }

      throw this.createError(
        ScanErrorCode.UNKNOWN_ERROR,
        `Error en OCR: ${this.extractErrorMessage(error)}`
      );
    }
  }

  /**
   * ============================================================
   * SECCIÓN 3: FUNCIONES AUXILIARES INTERNAS
   * ============================================================
   */

  /**
   * Verifica si estamos en una plataforma nativa (iOS/Android)
   */
  private isNativePlatform(): boolean {
    return Capacitor.isNativePlatform();
  }

  /**
   * Asegura que el módulo de Google Barcode Scanner esté instalado
   * En algunos dispositivos Android se descarga bajo demanda
   * 
   * Nota: Este método es específico de Android. En iOS, ML Kit está
   * integrado y no requiere descarga de módulos adicionales.
   */
  private async ensureGoogleBarcodeModule(): Promise<void> {
    // En iOS, ML Kit está siempre disponible, no necesita verificación
    if (Capacitor.getPlatform() === 'ios') {
      return;
    }

    // Solo para Android: verificar e instalar módulo de Google
    try {
      const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();

      if (!available) {
        // Instalar módulo (descarga bajo demanda)
        await BarcodeScanner.installGoogleBarcodeScannerModule();

        // Esperar a que se instale (con timeout)
        let attempts = 0;
        const maxAttempts = 30; // 30 segundos máximo

        while (attempts < maxAttempts) {
          const check = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
          if (check.available) {
            return;
          }
          await this.delay(1000);
          attempts++;
        }

        throw new Error('Timeout esperando módulo de escáner');
      }
    } catch (error) {
      // Si falla la verificación, continuar de todos modos
      // Algunos dispositivos no soportan esta verificación
      console.warn('No se pudo verificar módulo de Google:', error);
    }
  }

  /**
   * Realiza el escaneo OCR usando ML Kit Text Recognition
   * Captura una imagen con la cámara y luego aplica OCR
   * @returns Texto reconocido de la imagen
   */
  private async performOCRScan(): Promise<string> {
    // Capturar imagen con la cámara
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: CameraSource.Camera,
      correctOrientation: true
    });

    if (!image.base64String) {
      throw this.createError(
        ScanErrorCode.INVALID_FORMAT,
        'No se pudo capturar la imagen'
      );
    }

    // Aplicar OCR a la imagen capturada
    const result = await CapacitorPluginMlKitTextRecognition.detectText({
      base64Image: image.base64String
    });

    if (!result.text || result.text.trim().length === 0) {
      throw this.createError(
        ScanErrorCode.INVALID_FORMAT,
        'No se detectó texto en la imagen'
      );
    }

    return result.text;
  }

  /**
   * Extrae las líneas MRZ del texto OCR completo
   *
   * Criterios de detección de líneas MRZ:
   * - Longitud entre 28-32 caracteres (nominalmente 30)
   * - Contienen principalmente: A-Z, 0-9, <
   * - Al menos un carácter '<' (relleno MRZ)
   * - Patrones típicos: empieza con "I<COL", "IDCOL", etc.
   */
  private extractMRZLines(ocrText: string): string[] {
    const lines = ocrText.split('\n');
    const candidateLines: { line: string; score: number }[] = [];

    for (const line of lines) {
      const cleaned = this.cleanMRZCandidate(line);
      const score = this.scoreMRZLine(cleaned);

      if (score > 0) {
        candidateLines.push({ line: cleaned, score });
      }
    }

    // Ordenar por puntuación descendente
    candidateLines.sort((a, b) => b.score - a.score);

    // Tomar las mejores 3 líneas que cumplan longitud mínima
    const mrzLines = candidateLines
      .filter(c => c.line.length >= MRZ_TD1_CONSTANTS.LINE_LENGTH - 2)
      .slice(0, MRZ_TD1_CONSTANTS.LINE_COUNT)
      .map(c => c.line);

    // Intentar ordenar las líneas en el orden correcto (L1, L2, L3)
    return this.orderMRZLines(mrzLines);
  }

  /**
   * Limpia una línea candidata a MRZ
   */
  private cleanMRZCandidate(line: string): string {
    let cleaned = line.toUpperCase().replace(/\s/g, '');

    // Normalizar caracteres similares
    cleaned = cleaned
      .replace(/[«‹‹＜]/g, '<')  // Variantes de '<'
      .replace(/[^A-Z0-9<]/g, '<'); // Caracteres inválidos -> relleno

    return cleaned;
  }

  /**
   * Puntúa qué tan probable es que una línea sea MRZ
   * Mayor puntuación = más probable
   */
  private scoreMRZLine(line: string): number {
    if (line.length < 20) return 0;

    let score = 0;

    // Longitud cercana a 30 caracteres
    const lengthDiff = Math.abs(line.length - MRZ_TD1_CONSTANTS.LINE_LENGTH);
    if (lengthDiff <= 2) score += 30;
    else if (lengthDiff <= 5) score += 15;

    // Contiene '<' (característica distintiva del MRZ)
    const fillCount = (line.match(/</g) || []).length;
    if (fillCount >= 1) score += 20;
    if (fillCount >= 3) score += 10;

    // Proporción de caracteres válidos (A-Z, 0-9, <)
    const validChars = (line.match(/[A-Z0-9<]/g) || []).length;
    const validRatio = validChars / line.length;
    if (validRatio >= 0.95) score += 25;
    else if (validRatio >= 0.9) score += 15;

    // Patrones específicos de línea 1 colombiana
    if (/^I[<C]COL/.test(line) || /^IDCOL/.test(line)) {
      score += 50;
    }

    // Patrones de línea 2 (fecha + sexo)
    if (/^\d{6}\d[MF<]\d{6}/.test(line)) {
      score += 40;
    }

    // Patrón de línea 3 (apellidos<<nombres)
    if (/^[A-Z]+<<[A-Z]+/.test(line) || /[A-Z]+<[A-Z]+<</.test(line)) {
      score += 40;
    }

    return score;
  }

  /**
   * Ordena las líneas MRZ en el orden correcto (L1, L2, L3)
   * basándose en patrones característicos de cada línea
   */
  private orderMRZLines(lines: string[]): string[] {
    if (lines.length < 3) return lines;

    const ordered: string[] = ['', '', ''];

    for (const line of lines) {
      // Línea 1: Empieza con tipo de documento + país
      if (/^I[<C]COL|^IDCOL/.test(line) && !ordered[0]) {
        ordered[0] = line;
      }
      // Línea 2: Empieza con fecha (6 dígitos)
      else if (/^\d{6}/.test(line) && !ordered[1]) {
        ordered[1] = line;
      }
      // Línea 3: Contiene << (separador apellidos/nombres)
      else if (/<</.test(line) && !/^\d{6}/.test(line) && !ordered[2]) {
        ordered[2] = line;
      }
    }

    // Si no se pudo ordenar, devolver en el orden original
    if (ordered.some(l => !l)) {
      return lines;
    }

    return ordered;
  }

  /**
   * Crea un objeto Error estructurado con código
   */
  private createError(code: ScanErrorCode, message: string): Error & { code: ScanErrorCode } {
    const error = new Error(message) as Error & { code: ScanErrorCode };
    error.code = code;
    error.name = 'ScannerError';
    return error;
  }

  /**
   * Verifica si un error es uno de nuestros errores conocidos
   */
  private isKnownError(error: unknown): error is Error & { code: ScanErrorCode } {
    return (
      error instanceof Error &&
      'code' in error &&
      Object.values(ScanErrorCode).includes((error as any).code)
    );
  }

  /**
   * Extrae el mensaje de error de cualquier tipo de error
   */
  private extractErrorMessage(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    if (typeof error === 'string') {
      return error;
    }
    if (typeof error === 'object' && error !== null) {
      return JSON.stringify(error);
    }
    return 'Error desconocido';
  }

  /**
   * Utilidad para esperar un tiempo determinado
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * ============================================================
   * SECCIÓN 4: UTILIDADES PÚBLICAS
   * ============================================================
   */

  /**
   * Abre la configuración del dispositivo para habilitar permisos
   * Útil cuando el usuario ha denegado permisos permanentemente
   */
  async openSettings(): Promise<void> {
    if (!this.isNativePlatform()) {
      console.warn('openSettings solo disponible en dispositivos móviles');
      return;
    }

    try {
      await BarcodeScanner.openSettings();
    } catch (error) {
      console.error('Error abriendo configuración:', error);
    }
  }

  /**
   * Detiene cualquier escaneo en progreso y limpia recursos
   */
  async stopScan(): Promise<void> {
    if (!this.isNativePlatform()) {
      return;
    }

    this.isScanning = false;
    await this.cleanupScan();
  }

  /**
   * Verifica si el dispositivo soporta el escaneo
   */
  async isSupported(): Promise<boolean> {
    if (!this.isNativePlatform()) {
      return false;
    }

    try {
      const { supported } = await BarcodeScanner.isSupported();
      return supported;
    } catch {
      return false;
    }
  }

  /**
   * Habilita o deshabilita la linterna/flash
   * 
   * Nota: Los métodos enableTorch/disableTorch no están disponibles en la versión
   * actual de @capacitor-mlkit/barcode-scanning. Esta funcionalidad puede ser
   * agregada en el futuro.
   */
  async toggleTorch(enabled: boolean): Promise<void> {
    if (!this.isNativePlatform()) {
      return;
    }

    console.warn('toggleTorch no está implementado en la versión actual del plugin');
    // TODO: Implementar cuando el plugin soporte enableTorch/disableTorch
    // try {
    //   if (enabled) {
    //     await BarcodeScanner.enableTorch();
    //   } else {
    //     await BarcodeScanner.disableTorch();
    //   }
    // } catch (error) {
    //   console.warn('Error controlando linterna:', error);
    // }
  }

  /**
   * Obtiene información sobre las capacidades del escáner
   */
  async getCapabilities(): Promise<{
    isNative: boolean;
    isSupported: boolean;
    hasTorch: boolean;
    hasPermissions: boolean;
  }> {
    try {
      const isNative = this.isNativePlatform();
      console.log('📱 isNative:', isNative);

      if (!isNative) {
        return {
          isNative: false,
          isSupported: false,
          hasTorch: false,
          hasPermissions: false
        };
      }

      console.log('🔍 Verificando isSupported...');
      const isSupported = await this.isSupported();
      console.log('✅ isSupported:', isSupported);

      console.log('🔍 Verificando checkPermissions...');
      const hasPermissions = await this.checkPermissions();
      console.log('✅ hasPermissions:', hasPermissions);

      // La linterna generalmente está disponible si el escaneo está soportado
      const hasTorch = isSupported;

      return {
        isNative,
        isSupported,
        hasTorch,
        hasPermissions
      };
    } catch (error) {
      console.error('❌ Error en getCapabilities:', error);
      // Devolver valores por defecto en caso de error
      return {
        isNative: this.isNativePlatform(),
        isSupported: false,
        hasTorch: false,
        hasPermissions: false
      };
    }
  }

  /**
   * Método de prueba que usa la UI nativa de Google Code Scanner
   * Útil para verificar que ML Kit funciona correctamente
   * 
   * Este método usa scan() que muestra la UI de Google, a diferencia
   * de startScan() que permite UI personalizada.
   * 
   * @returns Los datos crudos del código escaneado
   */
  async testNativeScan(): Promise<{ format: string; value: string } | null> {
    if (!this.isNativePlatform()) {
      throw this.createError(
        ScanErrorCode.PLUGIN_NOT_AVAILABLE,
        'Solo disponible en dispositivos móviles'
      );
    }

    try {
      console.log('🧪 Iniciando escaneo de prueba capturando foto...');
      
      // Usamos Camera para capturar una foto y luego analizamos con ML Kit
      // Usamos Uri para obtener la ruta del archivo (requerido por readBarcodesFromImage)
      const image = await Camera.getPhoto({
        quality: 100,
        allowEditing: false,
        resultType: CameraResultType.Uri,
        source: CameraSource.Camera,
        correctOrientation: true
      });

      if (!image.path) {
        console.log('❌ No se capturó imagen o no hay path');
        return null;
      }

      console.log('📸 Imagen capturada en:', image.path);

      // Analizar la imagen con ML Kit Barcode Scanner
      // El path debe ser la ruta del archivo
      const result = await BarcodeScanner.readBarcodesFromImage({
        path: image.path
      });

      console.log('🧪 Resultado del análisis:', JSON.stringify(result));

      if (result.barcodes && result.barcodes.length > 0) {
        const barcode = result.barcodes[0];
        return {
          format: barcode.format || 'UNKNOWN',
          value: barcode.rawValue || barcode.displayValue || ''
        };
      }

      console.log('⚠️ No se detectó ningún código en la imagen');
      return null;
    } catch (error) {
      console.error('🧪 Error en escaneo nativo:', error);
      throw error;
    }
  }
}
