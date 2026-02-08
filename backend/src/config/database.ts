import sql from 'mssql';

const config: sql.config = {
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || process.env.SA_PASSWORD || '',
  database: process.env.DB_NAME || 'fomag_poblacion',
  options: {
    encrypt: process.env.DB_ENCRYPT === 'true',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE !== 'false',
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
  connectionTimeout: 30000,
  requestTimeout: parseInt(process.env.DB_REQUEST_TIMEOUT || '60000'),
};

/** Reintentos máximos y delay base para conexión inicial */
const MAX_RETRIES = parseInt(process.env.DB_CONNECT_RETRIES || '5');
const RETRY_DELAY_MS = parseInt(process.env.DB_CONNECT_RETRY_DELAY || '3000');

let pool: sql.ConnectionPool | null = null;

/**
 * Conecta a la base de datos con reintentos automáticos.
 * Ideal para entornos Docker donde el servicio de BD
 * puede tardar unos segundos en aceptar conexiones.
 */
export async function connectToDatabase(): Promise<sql.ConnectionPool> {
  if (pool) {
    return pool;
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      pool = await sql.connect(config);
      console.log(`Conexión a Azure SQL Edge establecida (intento ${attempt}/${MAX_RETRIES})`);
      return pool;
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `Intento ${attempt}/${MAX_RETRIES} de conexión fallido: ${lastError.message}`
      );

      if (attempt < MAX_RETRIES) {
        const delay = RETRY_DELAY_MS * attempt; // backoff lineal
        console.log(`Reintentando en ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  console.error('Error al conectar a Azure SQL Edge tras todos los reintentos:', lastError);
  throw lastError;
}

/**
 * Obtiene el pool de conexiones existente o crea uno nuevo
 */
export async function getPool(): Promise<sql.ConnectionPool> {
  if (!pool) {
    return connectToDatabase();
  }
  return pool;
}

/**
 * Cierra la conexión a la base de datos
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('Conexión a Azure SQL Edge cerrada');
  }
}

export { sql };
