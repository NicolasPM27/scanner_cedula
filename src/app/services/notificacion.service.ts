import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { DatosAfiliado } from '../models/afiliado.model';

/**
 * Payload para solicitar notificación de actualización de datos por email
 */
export interface NotificacionEmailPayload {
  /** Nombre completo del afiliado */
  nombreCompleto: string;
  /** Número de documento */
  numeroDocumento: string;
  /** Correo electrónico actual (nuevo) */
  correoActual: string;
  /** Correo electrónico anterior (si difiere del actual) */
  correoAnterior?: string;
  /** Folio del comprobante de actualización */
  folio: string;
  /** Fecha de actualización formateada */
  fechaActualizacion: string;
  /** Resumen de secciones actualizadas */
  seccionesActualizadas: string[];
}

/**
 * Respuesta del endpoint de notificación
 */
export interface NotificacionEmailResponse {
  success: boolean;
  mensaje: string;
  /** Correos a los que se envió (para UI) */
  destinatarios: string[];
}

/**
 * Servicio para solicitar el envío de notificaciones por email
 * al backend tras la actualización de datos.
 *
 * Envía una petición POST al endpoint `/api/afiliados/notificar-actualizacion`
 * que se encarga del envío real del correo.
 */
@Injectable({
  providedIn: 'root',
})
export class NotificacionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${environment.apiUrl}/afiliados`;

  /**
   * Envía la notificación de actualización al correo actual y al anterior (si existe).
   *
   * @param afiliado - Datos completos del afiliado
   * @param correoAnterior - Email previo (antes de la actualización) si difiere
   * @param folio - Número de folio del comprobante
   * @param fecha - Fecha formateada de la actualización
   * @returns Respuesta con el estado y los correos notificados
   */
  async notificarActualizacion(
    afiliado: DatosAfiliado,
    correoAnterior: string | undefined,
    folio: string,
    fecha: string
  ): Promise<NotificacionEmailResponse> {
    const nombreCompleto = [
      afiliado.primerNombre,
      afiliado.segundoNombre,
      afiliado.primerApellido,
      afiliado.segundoApellido,
    ]
      .filter(Boolean)
      .join(' ');

    // Determinar qué secciones se actualizaron
    const seccionesActualizadas: string[] = [];
    if (afiliado.contacto) seccionesActualizadas.push('Información de contacto');
    if (afiliado.sociodemografica) seccionesActualizadas.push('Información sociodemográfica');
    if (afiliado.laboral) seccionesActualizadas.push('Información laboral');
    if (afiliado.caracterizacion) seccionesActualizadas.push('Caracterización');
    if (afiliado.beneficiarios?.some(b => b.actualizado)) {
      seccionesActualizadas.push('Beneficiarios');
    }

    const payload: NotificacionEmailPayload = {
      nombreCompleto,
      numeroDocumento: afiliado.numeroDocumento,
      correoActual: afiliado.contacto?.correoElectronico || '',
      correoAnterior:
        correoAnterior && correoAnterior !== afiliado.contacto?.correoElectronico
          ? correoAnterior
          : undefined,
      folio,
      fechaActualizacion: fecha,
      seccionesActualizadas,
    };

    return firstValueFrom(
      this.http.post<NotificacionEmailResponse>(
        `${this.baseUrl}/notificar-actualizacion`,
        payload
      )
    );
  }
}
