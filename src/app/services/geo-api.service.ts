import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface GeoDepartamento {
  codigo: string;
  nombre: string;
}

export interface GeoMunicipio {
  codigo: string;
  nombre: string;
  codigoDepartamento: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
}

@Injectable({
  providedIn: 'root',
})
export class GeoApiService {
  private readonly baseUrl = `${environment.apiUrl}/geo`;

  constructor(private readonly http: HttpClient) {}

  async getDepartamentos(): Promise<GeoDepartamento[]> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<GeoDepartamento[]>>(`${this.baseUrl}/departamentos`)
    );
    return res.data;
  }

  async getMunicipios(codigoDepartamento: string): Promise<GeoMunicipio[]> {
    const res = await firstValueFrom(
      this.http.get<ApiResponse<GeoMunicipio[]>>(
        `${this.baseUrl}/municipios/${codigoDepartamento}`
      )
    );
    return res.data;
  }
}
