import { CorsOptions } from 'cors';

// ── Orígenes permitidos por ambiente ───────────────────────

/** Orígenes de desarrollo local */
const DEV_ORIGINS: string[] = [
  'http://localhost:4200',         // ng serve
  'http://localhost:8100',         // ionic serve
  'http://localhost',              // capacitor android local
  'http://10.0.2.2:4200',         // Android emulator → host
];

/** Orígenes de Capacitor / PWA nativo */
const CAPACITOR_ORIGINS: string[] = [
  'capacitor://localhost',         // iOS Capacitor
  'http://localhost',              // Android Capacitor
  'ionic://localhost',             // Ionic WebView
];

/** Orígenes de Azure (se definen vía CORS_ORIGIN env var) */
const AZURE_ORIGIN_PATTERNS = [
  /^https:\/\/.*\.azurewebsites\.net$/,
  /^https:\/\/.*\.azurestaticapps\.net$/,
  /^https:\/\/.*\.azure-api\.net$/,
];

/**
 * Construye la lista de orígenes permitidos según el ambiente.
 * En producción, solo se permiten orígenes explícitos + Azure patterns.
 */
function buildAllowedOrigins(): string[] {
  const envOrigins = process.env.CORS_ORIGIN
    ?.split(',')
    .map((o) => o.trim())
    .filter(Boolean) ?? [];

  return [...new Set([...envOrigins, ...CAPACITOR_ORIGINS])];
}

/**
 * Valida si un origen coincide con los patrones de Azure.
 */
function matchesAzurePattern(origin: string): boolean {
  return AZURE_ORIGIN_PATTERNS.some((pattern) => pattern.test(origin));
}

/**
 * Genera la configuración CORS apropiada según NODE_ENV.
 *
 * - **development**: Permite todos los orígenes (true) para facilitar debugging
 * - **production**: Lista blanca estricta + patrones Azure + Capacitor
 */
export function createCorsConfig(): CorsOptions {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    return {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      credentials: true,
      maxAge: 600, // Preflight cache: 10 min
    };
  }

  // Producción: validación estricta
  const allowedOrigins = buildAllowedOrigins();

  return {
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, server-to-server, health checks)
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin) || matchesAzurePattern(origin)) {
        return callback(null, true);
      }

      console.warn(`⛔ CORS bloqueado para origen: ${origin}`);
      return callback(new Error(`Origen no permitido por CORS: ${origin}`));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
    maxAge: 86400, // Preflight cache: 24h en producción
  };
}
