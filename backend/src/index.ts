import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

import { connectToDatabase, closeDatabaseConnection } from './config/database';
import { afiliadoRoutes } from './routes/afiliado.routes';
import { beneficiarioRoutes } from './routes/beneficiario.routes';
import { healthRoutes } from './routes/health.routes';
import { errorHandler } from './middleware/error-handler';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// En desarrollo, permitir cualquier origen desde red local
const isDevelopment = process.env.NODE_ENV !== 'production';

// Middleware de seguridad - más permisivo en desarrollo
if (isDevelopment) {
  // Desarrollo: deshabilitar políticas restrictivas
  app.use(helmet({
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  }));
} else {
  // Producción: seguridad completa
  app.use(helmet());
}

// Configurar CORS
const corsOrigins = process.env.CORS_ORIGIN?.split(',') || [
  'http://localhost:4200',
  'http://localhost:8100',
  'capacitor://localhost',
  'http://localhost',
];

app.use(cors({
  origin: isDevelopment ? true : corsOrigins,  // true = permite todos los orígenes en dev
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Parsear JSON
app.use(express.json());

// Middleware de logging para debugging
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`📥 [${timestamp}] ${req.method} ${req.url}`);
  console.log(`   Origin: ${req.get('origin') || 'N/A'}`);
  console.log(`   User-Agent: ${req.get('user-agent') || 'N/A'}`);
  next();
});

// Rutas
app.use('/api/health', healthRoutes);
app.use('/api/afiliados', afiliadoRoutes);
app.use('/api/beneficiarios', beneficiarioRoutes);

// Manejador de errores global
app.use(errorHandler);

// Iniciar servidor
async function startServer() {
  try {
    // Conectar a la base de datos
    await connectToDatabase();
    console.log('✅ Conexión a base de datos establecida');

    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📍 Health check: http://localhost:${PORT}/api/health`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

// Manejar cierre graceful
process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido. Cerrando servidor...');
  await closeDatabaseConnection();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recibido. Cerrando servidor...');
  await closeDatabaseConnection();
  process.exit(0);
});

startServer();
