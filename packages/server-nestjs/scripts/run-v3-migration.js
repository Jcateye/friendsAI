const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || 'postgres://friendsai:friendsai@localhost:5432/friendsai_v3_gpt';

const pool = new Pool({ connectionString: databaseUrl });

const runMigration = async () => {
  const migrationFile = 'v3_create_initial_tables.sql';
  const sql = fs.readFileSync(path.resolve(__dirname, '../migrations', migrationFile), 'utf8');

  console.log(`Running migration: ${migrationFile}`);
  console.log(`Database: ${databaseUrl}`);

  try {
    await pool.query('BEGIN');
    await pool.query(sql);
    await pool.query('COMMIT');
    console.log(`Migration completed successfully: ${migrationFile}`);
  } catch (err) {
    await pool.query('ROLLBACK');
    console.error('Migration failed:', err.message);
    throw err;
  }
};

runMigration()
  .then(() => {
    console.log('\nVerifying tables...');
    return pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name IN (
        'relationship_health_snapshot',
        'relationship_debt_item',
        'action_outcome_log',
        'weekly_report_cache'
      )
      ORDER BY table_name;
    `);
  })
  .then((result) => {
    console.log('\nTables created:');
    result.rows.forEach((row) => {
      console.log(`  - ${row.table_name}`);
    });
    return pool.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND indexname LIKE 'idx_%'
      ORDER BY indexname;
    `);
  })
  .then((result) => {
    console.log('\nIndexes created:');
    result.rows.forEach((row) => {
      console.log(`  - ${row.indexname} (on ${row.tablename})`);
    });
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
