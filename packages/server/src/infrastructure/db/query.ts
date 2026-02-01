import { pool } from './pool';
import type { QueryResultRow } from 'pg';

export type DbExecutor = { query: typeof pool.query };

export const query = async <T extends QueryResultRow = any>(text: string, params: unknown[] = []) => {
  const result = await pool.query<T>(text, params);
  return result.rows;
};

export const queryOne = async <T extends QueryResultRow = any>(text: string, params: unknown[] = []) => {
  const result = await pool.query<T>(text, params);
  return result.rows[0];
};

export const queryExec = async <T extends QueryResultRow = any>(exec: DbExecutor, text: string, params: unknown[] = []) => {
  const result = await exec.query<T>(text, params);
  return result.rows;
};

export const queryOneExec = async <T extends QueryResultRow = any>(exec: DbExecutor, text: string, params: unknown[] = []) => {
  const result = await exec.query<T>(text, params);
  return result.rows[0];
};
