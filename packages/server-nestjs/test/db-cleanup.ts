import { DataSource } from 'typeorm';

const orderedTables = [
  'messages',
  'conversation_archives',
  'tool_confirmations',
  'events',
  'contact_facts',
  'contact_todos',
  'contact_briefs',
  'conversations',
  'contacts',
  'auth_sessions',
  'connector_tokens',
  'users',
];

export async function cleanupDatabase(dataSource: DataSource): Promise<void> {
  const rows = await dataSource.query(`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
  `) as Array<{ tablename: string }>;
  const existingTables = new Set(rows.map(row => row.tablename));

  await dataSource.transaction(async manager => {
    for (const table of orderedTables) {
      if (!existingTables.has(table)) {
        continue;
      }
      await manager.query(`DELETE FROM "${table}"`);
    }
  });
}
