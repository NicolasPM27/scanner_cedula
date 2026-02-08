import { Request, Response, NextFunction } from 'express';

/**
 * Middleware de logging HTTP.
 *
 * - **development**: Log detallado (origin, user-agent, duración)
 * - **production**: Log compacto (método, ruta, status, duración)
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const isDev = process.env.NODE_ENV !== 'production';
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;

    if (isDev) {
      console.log(
        `📥 ${req.method} ${req.originalUrl} → ${status} (${duration}ms) | Origin: ${req.get('origin') || 'N/A'}`
      );
    } else {
      // Producción: solo warnings y errores, o requests lentos
      if (status >= 400 || duration > 1000) {
        console.log(
          `${status >= 500 ? '🔴' : '🟡'} ${req.method} ${req.originalUrl} → ${status} (${duration}ms)`
        );
      }
    }
  });

  next();
}
