import { Request, Response, NextFunction } from 'express';

/**
 * Error personalizado de la API con código de estado HTTP.
 */
export class ApiError extends Error {
  readonly statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }

  /** Atajo para 400 Bad Request */
  static badRequest(message: string): ApiError {
    return new ApiError(400, message);
  }

  /** Atajo para 404 Not Found */
  static notFound(message: string): ApiError {
    return new ApiError(404, message);
  }

  /** Atajo para 409 Conflict */
  static conflict(message: string): ApiError {
    return new ApiError(409, message);
  }
}

/**
 * Middleware de manejo global de errores.
 * En desarrollo incluye detalles del error; en producción los oculta.
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  const isDev = process.env.NODE_ENV !== 'production';

  // Error de API personalizado
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Error CORS
  if (err.message?.startsWith('Origen no permitido por CORS')) {
    res.status(403).json({
      success: false,
      error: 'Acceso no permitido',
    });
    return;
  }

  // Errores de SQL Server
  if (err.name === 'RequestError' || err.name === 'ConnectionError') {
    console.error('🔴 Error de base de datos:', err.message);
    res.status(503).json({
      success: false,
      error: 'Error de conexión con la base de datos',
      ...(isDev && { details: err.message }),
    });
    return;
  }

  // Error genérico
  console.error('🔴 Error no controlado:', err);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    ...(isDev && { details: err.message, stack: err.stack }),
  });
}
