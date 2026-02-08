import sql from 'mssql';

/** Lazy config — evaluated at connect time so dotenv has already loaded */
function getConfig(): sql.config {
  return {
    server: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '1433'),
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'fomag_db',
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
}

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

  const config = getConfig();
  const maxRetries = parseInt(process.env.DB_CONNECT_RETRIES || '5');
  const retryDelayMs = parseInt(process.env.DB_CONNECT_RETRY_DELAY || '3000');
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      pool = await sql.connect(config);
      console.log(`Conexión a Azure SQL Edge establecida (intento ${attempt}/${maxRetries})`);
      return pool;
    } catch (error) {
      lastError = error as Error;
      console.warn(
        `Intento ${attempt}/${maxRetries} de conexión fallido: ${lastError.message}`
      );

      if (attempt < maxRetries) {
        const delay = retryDelayMs * attempt; // backoff lineal
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
