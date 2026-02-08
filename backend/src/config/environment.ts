import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// ── Resolución del archivo .env ─────────────────────────

/** Localizaciones candidatas para el archivo .env */
const ENV_CANDIDATES = [
  path.resolve(__dirname, '../../../.env'),  // dev: backend/src/config → raíz
  path.resolve(__dirname, '../../../../.env'), // build: backend/dist/config → raíz
  path.resolve(process.cwd(), '.env'),       // cwd fallback
];

/**
 * Carga las variables de entorno desde el primer .env encontrado.
 * En Azure App Service las variables se inyectan directamente,
 * por lo que no es obligatorio que exista un .env.
 */
export function loadEnvironment(): void {
  const envPath = ENV_CANDIDATES.find((p) => fs.existsSync(p));

  if (envPath) {
    dotenv.config({ path: envPath });
    console.log(`📄 Variables de entorno cargadas desde: ${envPath}`);
  } else {
    console.log('📄 .env no encontrado — usando variables del sistema (Azure App Service, Docker, etc.)');
  }
}

// ── Configuración centralizada del ambiente ─────────────

export interface AppEnvironment {
  /** Ambiente actual */
  nodeEnv: 'development' | 'production' | 'staging';
  /** ¿Es ambiente de desarrollo? */
  isDev: boolean;
  /** Puerto del servidor */
  port: number;
  /** Nivel de log */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

/**
 * Obtiene la configuración del ambiente actual.
 * Debe invocarse **después** de `loadEnvironment()`.
 */
export function getAppEnvironment(): AppEnvironment {
  const nodeEnv = (process.env.NODE_ENV as AppEnvironment['nodeEnv']) || 'development';
  const isDev = nodeEnv !== 'production';

  return {
    nodeEnv,
    isDev,
    port: parseInt(process.env.PORT || '3000', 10),
    logLevel: (process.env.LOG_LEVEL as AppEnvironment['logLevel']) || (isDev ? 'debug' : 'info'),
  };
}
