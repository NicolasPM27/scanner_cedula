import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

import { loadEnvironment, getAppEnvironment } from './config/environment';
import { createCorsConfig } from './config/cors.config';
import { createHelmetConfig } from './config/helmet.config';
import { connectToDatabase, closeDatabaseConnection } from './config/database';
import { afiliadoRoutes } from './routes/afiliado.routes';
import { beneficiarioRoutes } from './routes/beneficiario.routes';
import { institucionRoutes } from './routes/institucion.routes';
import { healthRoutes } from './routes/health.routes';
import { errorHandler } from './middleware/error-handler';
import { requestLogger } from './middleware/request-logger';

// ── 1. Cargar variables de entorno ──────────────────────
loadEnvironment();
const env = getAppEnvironment();

// ── 2. Crear aplicación Express ─────────────────────────
const app = express();

// ── 3. Middleware de seguridad ───────────────────────────
app.use(helmet(createHelmetConfig()));
app.use(cors(createCorsConfig()));
app.use(express.json({ limit: '10mb' }));

// ── 4. Logging ──────────────────────────────────────────
app.use(requestLogger);

// ── 5. Rutas ────────────────────────────────────────────
app.use('/api/health', healthRoutes);
app.use('/api/afiliados', afiliadoRoutes);
app.use('/api/beneficiarios', beneficiarioRoutes);
app.use('/api/instituciones', institucionRoutes);

// ── 6. Manejo global de errores ─────────────────────────
app.use(errorHandler);

// ── 7. Inicio del servidor ──────────────────────────────
async function startServer(): Promise<void> {
  try {
    await connectToDatabase();
    console.log('✅ Conexión a base de datos establecida');

    app.listen(env.port, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${env.port}`);
      console.log(`📍 Ambiente: ${env.nodeEnv} | Log level: ${env.logLevel}`);
      console.log(`📍 Health check: http://localhost:${env.port}/api/health`);

      if (env.isDev) {
        console.log(`🔓 CORS: Todos los orígenes permitidos (desarrollo)`);
      } else {
        console.log(`🔒 CORS: Lista blanca activa (producción)`);
      }
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// ── 8. Cierre graceful ──────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} recibido. Cerrando servidor...`);
  await closeDatabaseConnection();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

startServer();
