import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpRequest } from '@angular/common/http';
import { firstValueFrom, Observable, filter, map } from 'rxjs';
import { environment } from '../../environments/environment';

// ═══════════════════════════════════════════════════════════
// TIPOS DE RESPUESTA DE LA API
// ═══════════════════════════════════════════════════════════

export interface Departamento {
  codigoDepartamento: number;
  nombre: string;
}

export interface Municipio {
  codigoMunicipio: number;
  nombre: string;
}

export interface Secretaria {
  id: number;
  nombre: string;
}

export interface Establecimiento {
  codigoEstablecimiento: number;
  nombre: string;
  secretaria?: string;
}

export interface Sede {
  codigoSede: number;
  nombre: string;
  zona: 'URBANA' | 'RURAL';
  direccion: string | null;
  telefono: string | null;
  estado: string;
}

export interface DetalleSede {
  sede: Sede;
  niveles: Array<{ id: number; nombre: string }>;
  modelos: Array<{ id: number; nombre: string }>;
  grados: Array<{ id: number; nombre: string; codigo: string }>;
}

export interface ImportResult {
  totalRows: number;
  processed: number;
  errors: Array<{ row: number; message: string }>;
  duration: string;
  archivo?: string;
  stats: {
    departamentos: number;
    municipios: number;
    secretarias: number;
    establecimientos: number;
    sedes: number;
    niveles: number;
    modelos: number;
  };
}

export interface ImportStats {
  departamentos: number;
  municipios: number;
  secretarias: number;
  establecimientos: number;
  sedes: number;
  niveles: number;
  modelos: number;
  grados: number;
}

/** Progreso de subida (0–100) o resultado final */
export type UploadProgress = { type: 'progress'; percent: number } | { type: 'done'; result: ImportResult };

interface ApiResponse<T> {
  success: boolean;
  count?: number;
  data: T;
}

// ═══════════════════════════════════════════════════════════
// SERVICIO
// ═══════════════════════════════════════════════════════════

/**
 * Servicio Angular para consumir la API REST de instituciones educativas.
 *
 * Endpoints correspondientes:
 *   GET /api/instituciones/departamentos
 *   GET /api/instituciones/municipios/:codigoDepartamento
 *   GET /api/instituciones/secretarias
 *   GET /api/instituciones/establecimientos?municipio=X&secretaria=Y
 *   GET /api/instituciones/sedes/:codigoEstablecimiento
 *   GET /api/instituciones/sede/:codigoSede/detalle
 *
 * Cache del lado del servidor: TTL 1h para datos estáticos.
 */
@Injectable({
  providedIn: 'root',
})
export class InstitucionesApiService {
  private readonly baseUrl = `${environment.apiUrl}/instituciones`;

  constructor(private readonly http: HttpClient) {}

  // ── Departamentos ──────────────────────────────────

  /** Lista todos los departamentos ordenados por nombre */
  async getDepartamentos(): Promise<Departamento[]> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<Departamento[]>>(`${this.baseUrl}/departamentos`)
    );
    return res.data;
  }

  // ── Municipios ─────────────────────────────────────

  /** Lista municipios de un departamento */
  async getMunicipios(codigoDepartamento: number): Promise<Municipio[]> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<Municipio[]>>(
        `${this.baseUrl}/municipios/${codigoDepartamento}`
      )
    );
    return res.data;
  }

  // ── Secretarías ────────────────────────────────────

  /** Lista todas las secretarías de educación */
  async getSecretarias(): Promise<Secretaria[]> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<Secretaria[]>>(`${this.baseUrl}/secretarias`)
    );
    return res.data;
  }

  // ── Establecimientos ───────────────────────────────

  /**
   * Lista establecimientos filtrados.
   * @param codigoMunicipio - Requerido
   * @param secretariaId - Opcional: filtra por secretaría
   */
  async getEstablecimientos(
    codigoMunicipio: number,
    secretariaId?: number
  ): Promise<Establecimiento[]> {
    let url = `${this.baseUrl}/establecimientos?municipio=${codigoMunicipio}`;
    if (secretariaId !== undefined) {
      url += `&secretaria=${secretariaId}`;
    }
    const res = await firstValueFrom(
      this.http.get<ApiResponse<Establecimiento[]>>(url)
    );
    return res.data;
  }

  // ── Sedes ──────────────────────────────────────────

  /** Lista sedes de un establecimiento */
  async getSedes(codigoEstablecimiento: number): Promise<Sede[]> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<Sede[]>>(
        `${this.baseUrl}/sedes/${codigoEstablecimiento}`
      )
    );
    return res.data;
  }

  // ── Detalle de Sede ────────────────────────────────

  /** Obtiene detalle completo de una sede (niveles, modelos, grados) */
  async getDetalleSede(codigoSede: number): Promise<DetalleSede> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<DetalleSede>>(
        `${this.baseUrl}/sede/${codigoSede}/detalle`
      )
    );
    return res.data;
  }

  // ── Importación (dev) ──────────────────────────────

  /**
   * Sube un archivo Excel/CSV y ejecuta la importación.
   * Retorna un Observable con progreso de upload y resultado final.
   */
  uploadImport(file: File): Observable<UploadProgress> {
    const formData = new FormData();
    formData.append('file', file, file.name);

    const req = new HttpRequest('POST', `${this.baseUrl}/importar/upload`, formData, {
      reportProgress: true,
    });

    return this.http.request(req).pipe(
      filter((event) => {
        return event.type === HttpEventType.UploadProgress
            || event.type === HttpEventType.Response;
      }),
      map((event) => {
        if (event.type === HttpEventType.UploadProgress) {
          const percent = event.total
            ? Math.round((100 * event.loaded) / event.total)
            : 0;
          return { type: 'progress' as const, percent };
        }
        // HttpEventType.Response
        const body = (event as any).body as ApiResponse<ImportResult>;
        return { type: 'done' as const, result: body.data };
      })
    );
  }

  // ── Estadísticas ───────────────────────────────────

  /** Obtiene estadísticas del catálogo de instituciones */
  async getStats(): Promise<ImportStats> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<ImportStats>>(`${this.baseUrl}/stats`)
    );
    return res.data;
  }

  /** Invalida caché del servidor */
  async refreshCache(): Promise<void> {
    await firstValueFrom(
      this.http.post<ApiResponse<void>>(`${this.baseUrl}/cache/refresh`, {})
    );
  }
}
