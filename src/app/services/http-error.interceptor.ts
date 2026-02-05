import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

/**
 * Error personalizado con mensaje amigable
 */
export class ApiHttpError extends Error {
  readonly statusCode: number;
  readonly mensajeOriginal: string;

  constructor(statusCode: number, mensajeAmigable: string, mensajeOriginal: string) {
    super(mensajeAmigable);
    this.statusCode = statusCode;
    this.mensajeOriginal = mensajeOriginal;
    this.name = 'ApiHttpError';
  }
}

/**
 * Interceptor funcional para manejar errores HTTP
 * Transforma errores en mensajes amigables en español
 */
export const httpErrorInterceptor: HttpInterceptorFn = (req, next) => {
  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.log('🔍 Interceptor - Error capturado:', error);
      console.log('🔍 Interceptor - Status:', error.status);
      console.log('🔍 Interceptor - Error.error:', error.error);
      console.log('🔍 Interceptor - Error type:', typeof error.error);
      
      let mensajeAmigable: string;

      switch (error.status) {
        case 0:
          mensajeAmigable = 'No se pudo conectar con el servidor. Por favor, verifique su conexión a internet.';
          break;
        case 400:
          mensajeAmigable = 'Los datos enviados no son válidos. Por favor, revise la información.';
          break;
        case 401:
          mensajeAmigable = 'No tiene autorización para realizar esta acción.';
          break;
        case 403:
          mensajeAmigable = 'Acceso denegado.';
          break;
        case 404:
          mensajeAmigable = 'El recurso solicitado no fue encontrado.';
          break;
        case 500:
          mensajeAmigable = 'Error interno del servidor. Por favor, intente más tarde.';
          break;
        case 503:
          mensajeAmigable = 'El servicio no está disponible en este momento. Por favor, intente más tarde.';
          break;
        default:
          mensajeAmigable = `Error inesperado (${error.status}). Por favor, intente nuevamente.`;
      }

      // Si el servidor envió un mensaje específico, usarlo
      const mensajeServidor = error.error?.error || error.error?.mensaje || error.message;

      console.error('Error HTTP:', {
        status: error.status,
        mensaje: mensajeServidor,
        url: req.url,
        errorCompleto: error,
      });

      return throwError(() => new ApiHttpError(error.status, mensajeAmigable, mensajeServidor));
    })
  );
};
