import { query, queryOne } from '@/infrastructure/db/query';
import { ensureSerializable } from '@/utils/logger';

export const createChatSession = async (data: { workspaceId: string; userId: string; title?: string | null }) => {
  return queryOne(
    `INSERT INTO chat_session (workspace_id, user_id, title)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [data.workspaceId, data.userId, data.title ?? null]
  );
};

export const listChatSessions = async (workspaceId: string, limit = 20) => {
  return query(
    `SELECT * FROM chat_session
     WHERE workspace_id = $1 AND deleted_at IS NULL
     ORDER BY updated_at DESC
     LIMIT $2`,
    [workspaceId, limit]
  );
};

export const getChatSession = async (workspaceId: string, id: string) => {
  return queryOne(
    `SELECT * FROM chat_session
     WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
    [id, workspaceId]
  );
};

export const touchChatSession = async (id: string) => {
  return queryOne(
    `UPDATE chat_session SET updated_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );
};

export const createChatMessage = async (data: { sessionId: string; role: string; content: string; metadata?: Record<string, unknown> }) => {
  return queryOne(
    `INSERT INTO chat_message (session_id, role, content, metadata_json)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.sessionId, data.role, data.content, ensureSerializable(data.metadata ?? {})]
  );
};

export const listChatMessages = async (sessionId: string, limit = 200) => {
  return query(
    `SELECT * FROM chat_message
     WHERE session_id = $1
     ORDER BY created_at ASC
     LIMIT $2`,
    [sessionId, limit]
  );
};

export const updateChatMessage = async (data: { sessionId: string; messageId: string; content?: string | null; metadata?: Record<string, unknown> }) => {
  return queryOne(
    `UPDATE chat_message
     SET content = COALESCE($3, content),
         metadata_json = COALESCE($4, metadata_json)
     WHERE id = $2 AND session_id = $1
     RETURNING *`,
    [data.sessionId, data.messageId, data.content ?? null, data.metadata ?? null]
  );
};
