import pg from 'pg';

const { Pool } = pg;

let pool;

export function getPool() {
  if (pool) return pool;
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
  pool.on('error', (err) => {
    console.error('[DB] Unexpected pool error:', err.message);
  });
  return pool;
}

export async function query(text, params) {
  const client = await getPool().connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
}
