import pg from 'pg';
import { env } from '../config/env.ts';

export type DbClient = pg.PoolClient;

export const pool = new pg.Pool({
  connectionString: env.databaseUrl,
  ssl: env.pgSsl ? { rejectUnauthorized: false } : undefined,
  max: 10,
});

/** Run a query and return all rows. */
export async function q<T = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool.query(text, params as any[]);
  return r.rows as T[];
}

/** Run a query and return the first row (or undefined). */
export async function q1<T = any>(text: string, params: unknown[] = []): Promise<T | undefined> {
  return (await q<T>(text, params))[0];
}

/** Run `fn` inside a transaction (BEGIN/COMMIT, ROLLBACK on error). */
export async function tx<T>(fn: (c: DbClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
}

/** Next readable id from a sequence, e.g. `emp-1001`. */
export async function nextId(prefix: string, seq = 'entity_seq') {
  return `${prefix}${(await q1(`select nextval('${seq}') as n`))!.n}`;
}
