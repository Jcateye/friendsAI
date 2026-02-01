import { DbExecutor, query, queryOne, queryOneExec } from '@/infrastructure/db/query';

export interface ToolTaskRecord {
  id: string;
  action_item_id: string;
  type: string;
  payload_json: Record<string, unknown>;
  execute_at: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export const createEvent = async (data: { contactId: string; occurredAt: Date; summary: string; sourceEntryId: string }) => {
  return queryOne(
    `INSERT INTO event (contact_id, occurred_at, summary, source_entry_id)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [data.contactId, data.occurredAt, data.summary, data.sourceEntryId]
  );
};

export const createFact = async (data: { contactId: string; key: string; value: string; confidence: number; sourceEntryId: string }) => {
  return queryOne(
    `INSERT INTO fact (contact_id, key, value, confidence, source_entry_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.contactId, data.key, data.value, data.confidence, data.sourceEntryId]
  );
};

export const createActionItem = async (
  data: { id?: string; contactId: string; dueAt?: Date | null; suggestionReason?: string; sourceEntryId: string },
  exec?: DbExecutor
) => {
  const text = `INSERT INTO action_item (id, contact_id, due_at, suggestion_reason, source_entry_id)
     VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5)
     ON CONFLICT (id) DO UPDATE
       SET due_at = EXCLUDED.due_at,
           suggestion_reason = EXCLUDED.suggestion_reason,
           updated_at = now()
     RETURNING *`;
  const params = [data.id ?? null, data.contactId, data.dueAt ?? null, data.suggestionReason ?? null, data.sourceEntryId];
  return exec ? queryOneExec(exec, text, params) : queryOne(text, params);
};

export const getActionItemForWorkspace = async (workspaceId: string, actionItemId: string) => {
  return queryOne(
    `SELECT ai.*, c.workspace_id, c.name AS contact_name
     FROM action_item ai
     JOIN contact c ON c.id = ai.contact_id
     WHERE ai.id = $2 AND c.workspace_id = $1 AND c.deleted_at IS NULL`,
    [workspaceId, actionItemId]
  );
};

export const updateActionItem = async (id: string, data: { status?: string; dueAt?: Date | null }, exec?: DbExecutor) => {
  const text = `UPDATE action_item
     SET status = COALESCE($2, status),
         due_at = COALESCE($3, due_at),
         updated_at = now()
     WHERE id = $1
     RETURNING *`;
  const params = [id, data.status ?? null, data.dueAt ?? null];
  return exec ? queryOneExec(exec, text, params) : queryOne(text, params);
};

export const updateActionItemForWorkspace = async (
  workspaceId: string,
  id: string,
  data: { status?: string; dueAt?: Date | null }
) => {
  return queryOne(
    `UPDATE action_item ai
     SET status = COALESCE($3, ai.status),
         due_at = COALESCE($4, ai.due_at),
         updated_at = now()
     FROM contact c
     WHERE ai.id = $2 AND ai.contact_id = c.id AND c.workspace_id = $1 AND c.deleted_at IS NULL
     RETURNING ai.*`,
    [workspaceId, id, data.status ?? null, data.dueAt ?? null]
  );
};

export const listOpenActions = async (contactId: string) => {
  return query(
    `SELECT * FROM action_item WHERE contact_id = $1 AND status = 'open' ORDER BY due_at NULLS LAST`,
    [contactId]
  );
};

export const listOpenActionsForWorkspace = async (workspaceId: string, limit = 50) => {
  return query(
    `SELECT ai.*, c.name AS contact_name
     FROM action_item ai
     JOIN contact c ON c.id = ai.contact_id
     WHERE c.workspace_id = $1 AND c.deleted_at IS NULL AND ai.status = 'open'
     ORDER BY ai.due_at NULLS LAST, ai.created_at DESC
     LIMIT $2`,
    [workspaceId, limit]
  );
};

export const listRecentEvents = async (contactId: string, limit = 10) => {
  return query(
    `SELECT * FROM event WHERE contact_id = $1 ORDER BY occurred_at DESC LIMIT $2`,
    [contactId, limit]
  );
};

export const listFacts = async (contactId: string, limit = 20) => {
  return query(
    `SELECT * FROM fact WHERE contact_id = $1 ORDER BY updated_at DESC LIMIT $2`,
    [contactId, limit]
  );
};

export const getBriefSnapshotByHash = async (contactId: string, sourceHash: string) => {
  return queryOne(
    `SELECT * FROM brief_snapshot WHERE contact_id = $1 AND source_hash = $2`,
    [contactId, sourceHash]
  );
};

export const getLatestBriefSnapshot = async (contactId: string) => {
  return queryOne(
    `SELECT * FROM brief_snapshot WHERE contact_id = $1 ORDER BY generated_at DESC LIMIT 1`,
    [contactId]
  );
};

export const createBriefSnapshot = async (contactId: string, content: string, sourceHash: string, generatedAt: Date) => {
  return queryOne(
    `INSERT INTO brief_snapshot (contact_id, content, source_hash, generated_at)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [contactId, content, sourceHash, generatedAt]
  );
};

export const listSimilarHistory = async (contactId: string, vector: number[], limit = 5) => {
  const vectorLiteral = `[${vector.join(',')}]`;
  return query(
    `SELECT je.id, je.created_at, je.raw_text
     FROM embedding e
     JOIN journal_entry je ON je.id = e.ref_id
     JOIN journal_entry_contact jec ON jec.journal_entry_id = je.id
     WHERE e.scope = 'journal_entry' AND jec.contact_id = $1 AND je.deleted_at IS NULL
     ORDER BY e.vector <-> $2::vector
     LIMIT $3`,
    [contactId, vectorLiteral, limit]
  );
};

export const createToolTask = async (data: { actionItemId: string; type: string; payload: unknown; executeAt?: Date | null; status?: string }) => {
  return queryOne(
    `INSERT INTO tool_task (action_item_id, type, payload_json, execute_at, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.actionItemId, data.type, data.payload, data.executeAt ?? null, data.status ?? 'pending']
  );
};

export const confirmToolTaskForWorkspace = async (workspaceId: string, toolTaskId: string) => {
  return queryOne(
    `UPDATE tool_task tt
     SET status = 'confirmed', updated_at = now()
     FROM action_item ai
     JOIN contact c ON c.id = ai.contact_id
     WHERE tt.id = $2 AND tt.action_item_id = ai.id AND c.workspace_id = $1 AND c.deleted_at IS NULL
       AND tt.status IN ('pending')
     RETURNING tt.*`,
    [workspaceId, toolTaskId]
  );
};

export const listPendingToolTasksForWorkspace = async (workspaceId: string, limit = 50) => {
  return query(
    `SELECT tt.*, ai.contact_id, c.name AS contact_name
     FROM tool_task tt
     JOIN action_item ai ON ai.id = tt.action_item_id
     JOIN contact c ON c.id = ai.contact_id
     WHERE c.workspace_id = $1 AND c.deleted_at IS NULL AND tt.status = 'pending'
     ORDER BY tt.execute_at NULLS LAST, tt.created_at ASC
     LIMIT $2`,
    [workspaceId, limit]
  );
};

export const listToolTasksForWorkspace = async (
  workspaceId: string,
  opts: { status?: string; limit?: number } = {}
) => {
  const limit = opts.limit ?? 50;

  const conditions: string[] = [
    `c.workspace_id = $1`,
    `c.deleted_at IS NULL`
  ];
  const params: any[] = [workspaceId];

  if (opts.status && opts.status !== 'all') {
    params.push(opts.status);
    conditions.push(`tt.status = $${params.length}`);
  }

  params.push(limit);

  return query(
    `SELECT tt.*, ai.contact_id, c.name AS contact_name,
            te.status AS last_execution_status,
            te.response_json AS last_execution_response,
            te.created_at AS last_execution_at
     FROM tool_task tt
     JOIN action_item ai ON ai.id = tt.action_item_id
     JOIN contact c ON c.id = ai.contact_id
     LEFT JOIN LATERAL (
       SELECT te.*
       FROM tool_execution te
       WHERE te.tool_task_id = tt.id
       ORDER BY te.created_at DESC
       LIMIT 1
     ) te ON true
     WHERE ${conditions.join(' AND ')}
     ORDER BY tt.updated_at DESC, tt.created_at DESC
     LIMIT $${params.length}`,
    params
  );
};

export const listToolExecutionsForWorkspace = async (workspaceId: string, toolTaskId: string) => {
  return query(
    `SELECT te.*
     FROM tool_execution te
     JOIN tool_task tt ON tt.id = te.tool_task_id
     JOIN action_item ai ON ai.id = tt.action_item_id
     JOIN contact c ON c.id = ai.contact_id
     WHERE c.workspace_id = $1 AND c.deleted_at IS NULL AND tt.id = $2
     ORDER BY te.created_at DESC`,
    [workspaceId, toolTaskId]
  );
};

export const listToolTasksToRun = async () => {
  return query<ToolTaskRecord>(
    `SELECT * FROM tool_task
     WHERE status = 'confirmed'
       AND (execute_at IS NULL OR execute_at <= now())
     ORDER BY created_at ASC
     LIMIT 20`
  );
};

export const claimToolTasksToRun = async (limit = 20) => {
  // Atomic claim to support multiple workers without double execution.
  return query<ToolTaskRecord>(
    `UPDATE tool_task
     SET status = 'running', updated_at = now()
     WHERE id IN (
       SELECT id
       FROM tool_task
       WHERE status = 'confirmed'
         AND (execute_at IS NULL OR execute_at <= now())
       ORDER BY created_at ASC
       LIMIT $1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`,
    [limit]
  );
};

export const markToolTaskDone = async (id: string) => {
  return queryOne(
    `UPDATE tool_task
     SET status = 'done', updated_at = now()
     WHERE id = $1 AND status = 'running'
     RETURNING *`,
    [id]
  );
};

export const markToolTaskFailed = async (id: string) => {
  return queryOne(
    `UPDATE tool_task
     SET status = 'failed', updated_at = now()
     WHERE id = $1 AND status = 'running'
     RETURNING *`,
    [id]
  );
};

export const recordToolExecution = async (data: { toolTaskId: string; provider: string; requestJson: unknown; responseJson: unknown; status: string }) => {
  return queryOne(
    `INSERT INTO tool_execution (tool_task_id, provider, request_json, response_json, status)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.toolTaskId, data.provider, data.requestJson, data.responseJson, data.status]
  );
};
