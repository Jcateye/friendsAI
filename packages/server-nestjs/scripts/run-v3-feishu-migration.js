const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const databaseUrl = process.env.DATABASE_URL || 'postgres://friendsai:friendsai@localhost:5432/friendsai_v3_gpt';

const pool = new Pool({ connectionString: databaseUrl });

const runMigration = async () => {
  const migrationFile = 'v3_create_feishu_tokens.sql';
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
    console.log('\nVerifying table...');
    return pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'feishu_tokens'
      ORDER BY table_name;
    `);
  })
  .then((result) => {
    if (result.rows.length > 0) {
      console.log('\nTable created:');
      result.rows.forEach((row) => {
        console.log(`  - ${row.table_name}`);
      });

      return pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'feishu_tokens'
        ORDER BY ordinal_position;
      `);
    } else {
      console.log('\nTable feishu_tokens not found!');
      return pool.query('SELECT 1 WHERE 1=0');
    }
  })
  .then((result) => {
    if (result.rows.length > 0) {
      console.log('\nColumns:');
      result.rows.forEach((row) => {
        console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
    }

    return pool.query(`
      SELECT indexname, tablename
      FROM pg_indexes
      WHERE schemaname = 'public'
      AND tablename = 'feishu_tokens'
      ORDER BY indexname;
    `);
  })
  .then((result) => {
    if (result.rows.length > 0) {
      console.log('\nIndexes created:');
      result.rows.forEach((row) => {
        console.log(`  - ${row.indexname} (on ${row.tablename})`);
      });
    }

    return pool.query(`
      SELECT trigger_name, event_manipulation, event_object_table
      FROM information_schema.triggers
      WHERE event_object_schema = 'public'
      AND event_object_table = 'feishu_tokens'
      ORDER BY trigger_name;
    `);
  })
  .then((result) => {
    if (result.rows.length > 0) {
      console.log('\nTriggers created:');
      result.rows.forEach((row) => {
        console.log(`  - ${row.trigger_name} (${row.event_manipulation} on ${row.event_object_table})`);
      });
    }
  })
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => pool.end());
