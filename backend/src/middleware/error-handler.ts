import { Request, Response, NextFunction } from 'express';

/**
 * Error personalizado de la API
 */
export class ApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
    this.name = 'ApiError';
  }
}

/**
 * Middleware de manejo global de errores
 */
export function errorHandler(
  err: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  console.error('Error:', err);

  // Error de API personalizado
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Errores de SQL Server
  if (err.name === 'RequestError' || err.name === 'ConnectionError') {
    res.status(503).json({
      success: false,
      error: 'Error de conexión con la base de datos',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
    return;
  }

  // Error genérico
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}
