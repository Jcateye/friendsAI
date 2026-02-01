import { DbExecutor, query, queryOne, queryOneExec } from '@/infrastructure/db/query';

export const createJournalEntry = async (data: {
  id?: string;
  workspaceId: string;
  authorId: string;
  rawText: string;
  createdAt?: Date;
  clientId?: string;
  clientChangeId?: string;
}, exec?: DbExecutor) => {
  const text = `INSERT INTO journal_entry (id, workspace_id, author_id, raw_text, created_at, client_id, client_change_id)
     VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, COALESCE($5, now()), $6, $7)
     ON CONFLICT (id) DO UPDATE
       SET raw_text = EXCLUDED.raw_text,
           client_id = COALESCE(EXCLUDED.client_id, journal_entry.client_id),
           client_change_id = COALESCE(EXCLUDED.client_change_id, journal_entry.client_change_id),
           updated_at = now()
       WHERE journal_entry.workspace_id = $2
     RETURNING *`;
  const params = [
    data.id ?? null,
    data.workspaceId,
    data.authorId,
    data.rawText,
    data.createdAt ?? null,
    data.clientId ?? null,
    data.clientChangeId ?? null
  ];
  return exec ? queryOneExec(exec, text, params) : queryOne(text, params);
};

export const listJournalEntries = async (workspaceId: string, limit = 20) => {
  return query(
    `SELECT * FROM journal_entry
     WHERE workspace_id = $1 AND deleted_at IS NULL
     ORDER BY created_at DESC
     LIMIT $2`,
    [workspaceId, limit]
  );
};

export const getJournalEntry = async (workspaceId: string, id: string) => {
  return queryOne(
    `SELECT * FROM journal_entry WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
    [id, workspaceId]
  );
};

export const linkJournalEntryContact = async (journalEntryId: string, contactId: string, confidence: number) => {
  return queryOne(
    `INSERT INTO journal_entry_contact (journal_entry_id, contact_id, confidence)
     SELECT je.id, c.id, $3
     FROM journal_entry je
     JOIN contact c ON c.id = $2
     WHERE je.id = $1
       AND je.workspace_id = c.workspace_id
       AND je.deleted_at IS NULL
       AND c.deleted_at IS NULL
     ON CONFLICT (journal_entry_id, contact_id) DO UPDATE SET confidence = GREATEST(journal_entry_contact.confidence, EXCLUDED.confidence)
     RETURNING *`,
    [journalEntryId, contactId, confidence]
  );
};

export const listExtractedItems = async (journalEntryId: string) => {
  return query(
    `SELECT * FROM extracted_item WHERE journal_entry_id = $1 ORDER BY created_at ASC`,
    [journalEntryId]
  );
};

export const createExtractedItem = async (journalEntryId: string, type: string, payload: unknown) => {
  return queryOne(
    `INSERT INTO extracted_item (journal_entry_id, type, payload_json)
     VALUES ($1, $2, $3)
     RETURNING *`,
    [journalEntryId, type, payload]
  );
};

export const updateExtractedItem = async (id: string, journalEntryId: string, status: string, payload?: unknown) => {
  return queryOne(
    `UPDATE extracted_item
     SET status = $2,
         payload_json = COALESCE($3, payload_json),
         updated_at = now()
     WHERE id = $1 AND journal_entry_id = $4
     RETURNING *`,
    [id, status, payload ?? null, journalEntryId]
  );
};

export const markJournalProcessed = async (id: string) => {
  return queryOne(
    `UPDATE journal_entry SET status = 'processed', updated_at = now() WHERE id = $1 RETURNING *`,
    [id]
  );
};

export const softDeleteJournalEntry = async (workspaceId: string, id: string, exec?: DbExecutor) => {
  const text = `UPDATE journal_entry
     SET deleted_at = now(), updated_at = now()
     WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
     RETURNING *`;
  const params = [id, workspaceId];
  return exec ? queryOneExec(exec, text, params) : queryOne(text, params);
};
