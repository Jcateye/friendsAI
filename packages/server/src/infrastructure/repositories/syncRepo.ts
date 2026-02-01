import { DbExecutor, query, queryOne, queryOneExec } from '@/infrastructure/db/query';

export interface SyncChangeLogRecord {
  id: string;
  workspace_id: string;
  entity: string;
  entity_id: string;
  op: string;
  data: unknown;
  version: number;
  client_id?: string | null;
  client_change_id?: string | null;
  created_at: string;
}

export const appendChangeLog = async (data: {
  workspaceId: string;
  clientId?: string;
  clientChangeId?: string;
  entity: string;
  entityId: string;
  op: string;
  payload: unknown;
  version: number;
}, exec?: DbExecutor) => {
  const text = `INSERT INTO sync_change_log (workspace_id, client_id, client_change_id, entity, entity_id, op, data, version)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (workspace_id, client_id, client_change_id) DO NOTHING
     RETURNING *`;
  const params = [
    data.workspaceId,
    data.clientId ?? null,
    data.clientChangeId ?? null,
    data.entity,
    data.entityId,
    data.op,
    data.payload,
    data.version
  ];
  return exec ? queryOneExec(exec, text, params) : queryOne(text, params);
};

export const listChangesSince = async (workspaceId: string, since?: string) => {
  // Cursor format: "<created_at>|<id>" (both are strings).
  const parseCursor = (cursor: string) => {
    const idx = cursor.lastIndexOf('|');
    if (idx === -1) return null;
    const createdAt = cursor.slice(0, idx);
    const id = cursor.slice(idx + 1);
    if (!createdAt || !id) return null;
    return { createdAt, id };
  };

  if (!since) {
    return query<SyncChangeLogRecord>(
      `SELECT * FROM sync_change_log
       WHERE workspace_id = $1
       ORDER BY created_at ASC, id ASC
       LIMIT 200`,
      [workspaceId]
    );
  }
  const cursor = parseCursor(since);
  if (cursor) {
    return query<SyncChangeLogRecord>(
      `SELECT * FROM sync_change_log
       WHERE workspace_id = $1
         AND (created_at, id) > ($2::timestamptz, $3::uuid)
       ORDER BY created_at ASC, id ASC
       LIMIT 200`,
      [workspaceId, cursor.createdAt, cursor.id]
    );
  }
  return query<SyncChangeLogRecord>(
    `SELECT * FROM sync_change_log
     WHERE workspace_id = $1 AND created_at > $2
     ORDER BY created_at ASC, id ASC
     LIMIT 200`,
    [workspaceId, since]
  );
};

export const updateSyncState = async (data: { workspaceId: string; userId: string; clientId: string; lastCursor: string }) => {
  return queryOne(
    `INSERT INTO sync_state (workspace_id, user_id, client_id, last_cursor, updated_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (workspace_id, user_id, client_id)
     DO UPDATE SET last_cursor = EXCLUDED.last_cursor, updated_at = now()
     RETURNING *`,
    [data.workspaceId, data.userId, data.clientId, data.lastCursor]
  );
};

export const getSyncState = async (workspaceId: string, userId: string, clientId: string) => {
  return queryOne(
    `SELECT * FROM sync_state WHERE workspace_id = $1 AND user_id = $2 AND client_id = $3`,
    [workspaceId, userId, clientId]
  );
};
