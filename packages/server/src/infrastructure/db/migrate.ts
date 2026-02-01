import fs from 'fs';
import path from 'path';
import { pool } from './pool';

const migrationsDir = path.resolve(__dirname, '../../../migrations');

const ensureMigrationsTable = async () => {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id serial PRIMARY KEY,
      filename text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    );`
  );
};

const getApplied = async () => {
  const result = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((row: { filename: string }) => row.filename));
};

const applyMigration = async (filename: string, sql: string) => {
  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await pool.query('COMMIT');
    // eslint-disable-next-line no-console
    console.log(`Applied migration: ${filename}`);
  } catch (err) {
    await pool.query('ROLLBACK');
    throw err;
  }
};

export const migrate = async () => {
  await ensureMigrationsTable();
  const applied = await getApplied();
  const files = fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    await applyMigration(file, sql);
  }
};

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
      process.exit(1);
    });
}
