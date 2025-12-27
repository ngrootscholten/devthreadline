import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    
    pool = new Pool({
      connectionString,
      // Supabase connection pooler settings
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }
  
  return pool;
}

export async function testConnection(): Promise<{ connected: boolean; error?: string; details?: any }> {
  try {
    const pool = getPool();
    // Run a more explicit test query that requires actual DB connection
    const result = await pool.query('SELECT NOW() as current_time, version() as pg_version');
    
    if (result.rows.length === 0) {
      return { connected: false, error: 'Query returned no rows' };
    }
    
    // Verify we got actual data back
    const row = result.rows[0];
    if (!row.current_time || !row.pg_version) {
      return { connected: false, error: 'Query returned invalid data' };
    }
    
    return { 
      connected: true, 
      details: {
        currentTime: row.current_time,
        pgVersion: row.pg_version.substring(0, 50) // Truncate version string
      }
    };
  } catch (error: any) {
    console.error('Database connection test failed:', error);
    return { 
      connected: false, 
      error: error.message || 'Unknown error',
      details: error.code ? { code: error.code } : undefined
    };
  }
}

