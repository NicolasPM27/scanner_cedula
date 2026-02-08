import { HelmetOptions } from 'helmet';

/**
 * Genera la configuración de Helmet según el ambiente.
 *
 * - **development**: Políticas relajadas para facilitar debugging
 * - **production**: Seguridad completa con CSP para Azure + PWA
 */
export function createHelmetConfig(): HelmetOptions {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    return {
      crossOriginResourcePolicy: false,
      contentSecurityPolicy: false,
    };
  }

  return {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginEmbedderPolicy: false,   // Necesario para Capacitor
    crossOriginResourcePolicy: { policy: 'cross-origin' }, // Permitir recursos cross-origin para PWA
    hsts: {
      maxAge: 31536000,   // 1 año
      includeSubDomains: true,
      preload: true,
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  };
}
