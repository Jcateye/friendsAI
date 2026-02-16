const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const MIGRATIONS_DIR = path.resolve(__dirname, '..', 'migrations');
const DEFAULT_DB_URL =
  process.env.MIGRATION_SMOKE_DATABASE_URL ||
  'postgres://friendsai:friendsai@localhost:5434/friendsai_test';

const ENFORCED = process.env.MIGRATION_SMOKE_ENFORCED !== 'false';
const INCLUDE_231000 = process.env.MIGRATION_SMOKE_HALF_OLD_WITH_231000 === 'true';
const KEEP_DB = process.env.MIGRATION_SMOKE_KEEP_DB === 'true';

const CHECKPOINT_223000 = '20260207223000-MessageCreatedAtMs.sql';
const CHECKPOINT_231000 = '20260207231000-ConvertDatetimeToEpochMs.sql';

function log(message) {
  // eslint-disable-next-line no-console
  console.log(`[migration-smoke] ${message}`);
}

function parseDbUrl(url) {
  try {
    return new URL(url);
  } catch (error) {
    throw new Error(`Invalid database url: ${url}`);
  }
}

function withDbName(url, dbName) {
  const parsed = parseDbUrl(url);
  parsed.pathname = `/${dbName}`;
  return parsed.toString();
}

function sanitizeDbName(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe database name: ${name}`);
  }
  return name;
}

async function recreateDatabase(adminPool, dbName) {
  const safeName = sanitizeDbName(dbName);
  await adminPool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [safeName]);
  await adminPool.query(`DROP DATABASE IF EXISTS "${safeName}"`);
  await adminPool.query(`CREATE DATABASE "${safeName}"`);
}

async function dropDatabase(adminPool, dbName) {
  const safeName = sanitizeDbName(dbName);
  await adminPool.query('SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()', [safeName]);
  await adminPool.query(`DROP DATABASE IF EXISTS "${safeName}"`);
}

async function ensureMigrationsTable(pool) {
  await pool.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
      id serial PRIMARY KEY,
      filename text NOT NULL UNIQUE,
      applied_at timestamptz NOT NULL DEFAULT now()
    );`,
  );
}

async function getApplied(pool) {
  const result = await pool.query('SELECT filename FROM schema_migrations');
  return new Set(result.rows.map((row) => row.filename));
}

function getMigrationFiles() {
  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((file) => file.endsWith('.sql'))
    .sort();
}

async function applyMigration(pool, filename, sql) {
  await pool.query('BEGIN');
  try {
    await pool.query(sql);
    await pool.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [filename]);
    await pool.query('COMMIT');
  } catch (error) {
    await pool.query('ROLLBACK');
    throw new Error(`Failed migration ${filename}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function runMigrations(databaseUrl, options = {}) {
  const pool = new Pool({ connectionString: databaseUrl });
  const { stopAfter } = options;
  try {
    await ensureMigrationsTable(pool);
    const applied = await getApplied(pool);
    const files = getMigrationFiles();

    let seenStopAfter = false;

    for (const file of files) {
      if (applied.has(file)) {
        if (stopAfter && file === stopAfter) {
          seenStopAfter = true;
          break;
        }
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await applyMigration(pool, file, sql);

      if (stopAfter && file === stopAfter) {
        seenStopAfter = true;
        break;
      }
    }

    if (stopAfter && !seenStopAfter) {
      throw new Error(`stopAfter migration not found/applied: ${stopAfter}`);
    }
  } finally {
    await pool.end();
  }
}

async function replayMigrationSql(databaseUrl, filename) {
  const pool = new Pool({ connectionString: databaseUrl });
  try {
    const fullPath = path.join(MIGRATIONS_DIR, filename);
    if (!fs.existsSync(fullPath)) {
      throw new Error(`migration file not found: ${filename}`);
    }

    const sql = fs.readFileSync(fullPath, 'utf8');
    await pool.query('BEGIN');
    try {
      await pool.query(sql);
      await pool.query('COMMIT');
    } catch (error) {
      await pool.query('ROLLBACK');
      throw new Error(`idempotency replay failed for ${filename}: ${error instanceof Error ? error.message : String(error)}`);
    }
  } finally {
    await pool.end();
  }
}

async function runScenario(name, handler) {
  const start = Date.now();
  log(`scenario ${name}: start`);
  await handler();
  log(`scenario ${name}: passed (${Date.now() - start}ms)`);
}

async function main() {
  const parsed = parseDbUrl(DEFAULT_DB_URL);
  const adminDb = process.env.MIGRATION_SMOKE_ADMIN_DB || 'postgres';
  const adminUrl = withDbName(DEFAULT_DB_URL, adminDb);

  log(
    `target host=${parsed.hostname} port=${parsed.port || '5432'} db=${parsed.pathname.replace('/', '')}`,
  );

  const baseName = `friendsai_smoke_${Date.now()}`;
  const dbEmpty = `${baseName}_empty`;
  const dbHalf = `${baseName}_half`;
  const dbLatest = `${baseName}_latest`;

  const adminPool = new Pool({ connectionString: adminUrl });

  try {
    await runScenario('empty', async () => {
      await recreateDatabase(adminPool, dbEmpty);
      await runMigrations(withDbName(DEFAULT_DB_URL, dbEmpty));
    });

    await runScenario('half-old', async () => {
      await recreateDatabase(adminPool, dbHalf);
      const checkpoint = INCLUDE_231000 ? CHECKPOINT_231000 : CHECKPOINT_223000;
      await runMigrations(withDbName(DEFAULT_DB_URL, dbHalf), { stopAfter: checkpoint });
      await runMigrations(withDbName(DEFAULT_DB_URL, dbHalf));

      // Explicit idempotency replay for historically sensitive migrations
      await replayMigrationSql(withDbName(DEFAULT_DB_URL, dbHalf), CHECKPOINT_223000);
      if (INCLUDE_231000) {
        await replayMigrationSql(withDbName(DEFAULT_DB_URL, dbHalf), CHECKPOINT_231000);
      }
    });

    await runScenario('latest', async () => {
      await recreateDatabase(adminPool, dbLatest);
      const latestUrl = withDbName(DEFAULT_DB_URL, dbLatest);
      await runMigrations(latestUrl);
      await runMigrations(latestUrl);
    });

    log('all scenarios passed');
  } finally {
    if (!KEEP_DB) {
      await dropDatabase(adminPool, dbEmpty);
      await dropDatabase(adminPool, dbHalf);
      await dropDatabase(adminPool, dbLatest);
    }
    await adminPool.end();
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error('[migration-smoke] failed:', error instanceof Error ? error.message : String(error));

    if (!ENFORCED) {
      // eslint-disable-next-line no-console
      console.warn('[migration-smoke] MIGRATION_SMOKE_ENFORCED=false, ignore failure');
      process.exit(0);
    }

    process.exit(1);
  });
