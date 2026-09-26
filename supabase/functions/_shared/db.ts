// supabase/functions/_shared/db.ts
import pg from 'npm:pg@8.13.3';
const { Client } = pg;

export function getDbClient() {
  const connectionString =
    (typeof Deno !== 'undefined' ? (Deno.env.get('SUPABASE_DB_URL') || Deno.env.get('DATABASE_URL')) : null) ||
    (typeof process !== 'undefined' ? (process.env.SUPABASE_DATABASE_URL || process.env.SUPABASE_DB_URL || process.env.DATABASE_URL) : null);

  if (!connectionString) {
    throw new Error('Database connection string is missing from environment (SUPABASE_DB_URL)');
  }

  return new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000
  });
}

export async function withTransaction<T>(
  callback: (client: any) => Promise<T>
): Promise<T> {
  const client = getDbClient();
  await client.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error during rollback:', rollbackError);
    }
    throw error;
  } finally {
    try {
      await client.end();
    } catch {
      // Ignore cleanup error
    }
  }
}
