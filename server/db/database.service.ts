/**
 * DatabaseService - ket noi SQL Server (SQLEXPRESS, database SmartHome).
 * Dung mssql/msnodesqlv8 de xac thuc Windows. Pool duoc tai su dung.
 */
import sql from 'mssql/msnodesqlv8';

type SqlConfig = {
  server: string;
  port: number;
  database: string;
  driver: string;
  connectionString: string;
  options: {
    trustedConnection: boolean;
    encrypt: boolean;
  };
};

const server = process.env.SQL_HOST || 'localhost';
const port = Number(process.env.SQL_PORT) || 1433;
const database = process.env.SQL_DB || 'SmartHome';
const driver = process.env.SQL_DRIVER || 'ODBC Driver 17 for SQL Server';
const encrypt = process.env.SQL_ENCRYPT !== 'false';
const trustServerCertificate = process.env.SQL_TRUST_SERVER_CERTIFICATE !== 'false';

const CONFIG: SqlConfig = {
  server,
  port,
  database,
  driver,
  connectionString: [
    `Driver={${driver}}`,
    `Server=${server},${port}`,
    `Database=${database}`,
    'Trusted_Connection=Yes',
    `Encrypt=${encrypt ? 'Yes' : 'No'}`,
    `TrustServerCertificate=${trustServerCertificate ? 'Yes' : 'No'}`,
  ].join(';') + ';',
  options: {
    trustedConnection: true,
    encrypt,
  },
};

let poolPromise: Promise<any | null> | null = null;

function getPool(): Promise<any | null> {
  if (!poolPromise) {
    poolPromise = new (sql as any).ConnectionPool(CONFIG)
      .connect()
      .then((pool) => {
        console.log('[DB] Da ket noi SQL Server:', `${CONFIG.server},${CONFIG.port}`, '/', CONFIG.database, '(Windows Authentication)');
        return pool;
      })
      .catch((err) => {
        console.error('[DB] Loi ket noi SQL Server:', err.message);
        poolPromise = null;
        return null;
      });
  }
  return poolPromise;
}

/** Chay 1 query parametrized, tra ve result. Neu DB loi -> tra null (app van chay). */
export async function query<T extends any = any>(
  statement: string,
  params: Record<string, unknown> = {},
): Promise<T | null> {
  const pool = await getPool();
  if (!pool) return null;
  try {
    const request = pool.request();
    for (const [key, value] of Object.entries(params)) {
      request.input(key, value);
    }
    return (await request.query(statement)) as T;
  } catch (err) {
    console.error('[DB] Loi query:', (err as Error).message);
    return null;
  }
}

export default { query };
