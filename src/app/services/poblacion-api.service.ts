import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

/**
 * Respuesta de búsqueda de afiliado
 */
export interface BuscarAfiliadoResponse {
  existe: boolean;
  afiliado?: Record<string, any>;
}

/**
 * Respuesta de obtener beneficiarios
 */
export interface ObtenerBeneficiariosResponse {
  beneficiarios: Record<string, any>[];
}

/**
 * Respuesta de búsqueda admin de afiliados
 */
export interface BuscarAfiliadosAdminResponse {
  afiliados: Record<string, any>[];
}

/**
 * Respuesta de operaciones de actualización
 */
export interface ActualizarResponse {
  success: boolean;
  mensaje: string;
}

/**
 * Servicio para comunicación con la API de poblacion
 */
@Injectable({
  providedIn: 'root'
})
export class PoblacionApiService {
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log('🔧 PoblacionApiService initialized');
    console.log('🌐 Base URL:', this.baseUrl);
    console.log('🌐 Environment:', environment);
  }

  /**
   * Busca un afiliado (cotizante) por número de documento
   */
  async buscarAfiliado(numeroDocumento: string): Promise<BuscarAfiliadoResponse> {
    const url = `${this.baseUrl}/afiliados/buscar/${encodeURIComponent(numeroDocumento)}`;
    console.log('📡 API Call - Full URL:', url);
    console.log('📡 Base URL usado:', this.baseUrl);
    
    try {
      const response = await firstValueFrom(this.http.get<BuscarAfiliadoResponse>(url));
      console.log('✅ API Response STATUS:', response);
      console.log('✅ API Response TYPE:', typeof response);
      console.log('✅ API Response KEYS:', Object.keys(response || {}));
      return response;
    } catch (error) {
      console.error('❌ API Error completo:', JSON.stringify(error, null, 2));
      console.error('❌ API Error type:', typeof error);
      console.error('❌ API Error constructor:', error?.constructor?.name);
      throw error;
    }
  }

  /**
   * Busca afiliados para panel admin (documento o nombre)
   */
  async buscarAfiliadosAdmin(query: string): Promise<BuscarAfiliadosAdminResponse> {
    const url = `${this.baseUrl}/afiliados/admin/buscar?q=${encodeURIComponent(query)}`;
    return firstValueFrom(this.http.get<BuscarAfiliadosAdminResponse>(url));
  }

  /**
   * Obtiene los beneficiarios de un cotizante
   */
  async obtenerBeneficiarios(numeroDocumentoCotizante: string): Promise<ObtenerBeneficiariosResponse> {
    const url = `${this.baseUrl}/beneficiarios/cotizante/${encodeURIComponent(numeroDocumentoCotizante)}`;
    return firstValueFrom(this.http.get<ObtenerBeneficiariosResponse>(url));
  }

  /**
   * Actualiza los datos de un afiliado
   */
  async actualizarAfiliado(id: string, datos: Record<string, any>): Promise<ActualizarResponse> {
    const url = `${this.baseUrl}/afiliados/${encodeURIComponent(id)}`;
    console.log('📤 API Call - Actualizando afiliado:', id);
    console.log('📤 API Call - URL:', url);
    console.log('📤 API Call - Payload:', JSON.stringify(datos, null, 2));
    
    try {
      const response = await firstValueFrom(this.http.put<ActualizarResponse>(url, datos));
      console.log('✅ API Response - Afiliado actualizado:', JSON.stringify(response));
      return response;
    } catch (error: any) {
      console.error('❌ Error actualizando afiliado:', {
        message: error?.message,
        status: error?.statusCode || error?.status,
        mensajeOriginal: error?.mensajeOriginal,
        name: error?.name,
        fullError: error
      });
      throw error;
    }
  }

  /**
   * Crea un afiliado nuevo
   */
  async crearAfiliado(datos: Record<string, any>): Promise<ActualizarResponse> {
    const url = `${this.baseUrl}/afiliados`;
    console.log('📤 API Call - Creando afiliado');
    console.log('📤 API Call - URL:', url);
    console.log('📤 API Call - Payload:', JSON.stringify(datos, null, 2));

    try {
      const response = await firstValueFrom(this.http.post<ActualizarResponse>(url, datos));
      console.log('✅ API Response - Afiliado creado:', JSON.stringify(response));
      return response;
    } catch (error: any) {
      console.error('❌ Error creando afiliado:', {
        message: error?.message,
        status: error?.statusCode || error?.status,
        mensajeOriginal: error?.mensajeOriginal,
        name: error?.name,
        fullError: error
      });
      throw error;
    }
  }

  /**
   * Actualiza los datos de un beneficiario
   */
  async actualizarBeneficiario(id: string, datos: Record<string, any>): Promise<ActualizarResponse> {
    const url = `${this.baseUrl}/beneficiarios/${encodeURIComponent(id)}`;
    console.log('📤 API Call - Actualizando beneficiario:', id);
    console.log('📤 API Call - URL:', url);
    console.log('📤 API Call - Payload:', JSON.stringify(datos, null, 2));
    
    try {
      const response = await firstValueFrom(this.http.put<ActualizarResponse>(url, datos));
      console.log('✅ API Response - Beneficiario actualizado:', JSON.stringify(response));
      return response;
    } catch (error: any) {
      console.error('❌ Error actualizando beneficiario:', {
        message: error?.message,
        status: error?.statusCode || error?.status,
        mensajeOriginal: error?.mensajeOriginal,
        name: error?.name,
        fullError: error
      });
      throw error;
    }
  }

  /**
   * Verifica el estado de la API
   */
  async verificarConexion(): Promise<boolean> {
    try {
      const url = `${this.baseUrl}/health`;
      const response = await firstValueFrom(this.http.get<{ status: string }>(url));
      return response.status === 'ok';
    } catch {
      return false;
    }
  }
}
