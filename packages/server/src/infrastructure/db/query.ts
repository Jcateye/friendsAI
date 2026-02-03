import { pool } from './pool';
import type { QueryResultRow } from 'pg';
import { logger } from '@/utils/logger';

export type DbExecutor = { query: typeof pool.query };

const logDbError = (error: unknown, text: string, params: unknown[]) => {
  const err = error as Error;
  logger.error('db_query_error', {
    message: err.message,
    sql: text.substring(0, 200), // 截断以避免日志过长
    paramCount: params.length,
    stack: err.stack
  });
};

export const query = async <T extends QueryResultRow = any>(text: string, params: unknown[] = []) => {
  try {
    const result = await pool.query<T>(text, params);
    return result.rows;
  } catch (error) {
    logDbError(error, text, params);
    throw error;
  }
};

export const queryOne = async <T extends QueryResultRow = any>(text: string, params: unknown[] = []) => {
  try {
    const result = await pool.query<T>(text, params);
    return result.rows[0];
  } catch (error) {
    logDbError(error, text, params);
    throw error;
  }
};

export const queryExec = async <T extends QueryResultRow = any>(exec: DbExecutor, text: string, params: unknown[] = []) => {
  try {
    const result = await exec.query<T>(text, params);
    return result.rows;
  } catch (error) {
    logDbError(error, text, params);
    throw error;
  }
};

export const queryOneExec = async <T extends QueryResultRow = any>(exec: DbExecutor, text: string, params: unknown[] = []) => {
  try {
    const result = await exec.query<T>(text, params);
    return result.rows[0];
  } catch (error) {
    logDbError(error, text, params);
    throw error;
  }
};
