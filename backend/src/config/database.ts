import sql from 'mssql';

const config: sql.config = {
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433'),
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'fomag_poblacion',
  options: {
    encrypt: false, // Para conexiones locales sin SSL
    trustServerCertificate: true, // Necesario para SQL Server local
    enableArithAbort: true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool: sql.ConnectionPool | null = null;

/**
 * Conecta a la base de datos y retorna el pool de conexiones
 */
export async function connectToDatabase(): Promise<sql.ConnectionPool> {
  if (pool) {
    return pool;
  }

  try {
    pool = await sql.connect(config);
    console.log('Conexión a SQL Server establecida');
    return pool;
  } catch (error) {
    console.error('Error al conectar a SQL Server:', error);
    throw error;
  }
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
    console.log('Conexión a SQL Server cerrada');
  }
}

export { sql };
