import { DbExecutor, query, queryOne, queryOneExec } from '@/infrastructure/db/query';

export const listContacts = async (workspaceId: string) => {
  return query(
    `SELECT * FROM contact WHERE workspace_id = $1 AND deleted_at IS NULL ORDER BY updated_at DESC`,
    [workspaceId]
  );
};

export const getContact = async (workspaceId: string, id: string) => {
  return queryOne(
    `SELECT * FROM contact WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL`,
    [id, workspaceId]
  );
};

export const createContact = async (
  workspaceId: string,
  data: { id?: string; name: string; avatarUrl?: string; notes?: string; status?: string; clientId?: string; clientChangeId?: string },
  exec?: DbExecutor
) => {
  const text = `INSERT INTO contact (id, workspace_id, name, avatar_url, notes, status, client_id, client_change_id)
     VALUES (COALESCE($2::uuid, gen_random_uuid()), $1, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (id) DO UPDATE
       SET name = EXCLUDED.name,
           avatar_url = EXCLUDED.avatar_url,
           notes = EXCLUDED.notes,
           status = EXCLUDED.status,
           client_id = COALESCE(EXCLUDED.client_id, contact.client_id),
           client_change_id = COALESCE(EXCLUDED.client_change_id, contact.client_change_id),
           updated_at = now(),
           version = contact.version + 1
       WHERE contact.workspace_id = $1
     RETURNING *`;
  const params = [
    workspaceId,
    data.id ?? null,
    data.name,
    data.avatarUrl ?? null,
    data.notes ?? null,
    data.status ?? null,
    data.clientId ?? null,
    data.clientChangeId ?? null
  ];
  return exec ? queryOneExec(exec, text, params) : queryOne(text, params);
};

export const updateContact = async (
  workspaceId: string,
  id: string,
  data: { name?: string; avatarUrl?: string; notes?: string; status?: string },
  exec?: DbExecutor
) => {
  const text = `UPDATE contact
     SET name = COALESCE($3, name),
         avatar_url = COALESCE($4, avatar_url),
         notes = COALESCE($5, notes),
         status = COALESCE($6, status),
         updated_at = now(),
         version = version + 1
     WHERE id = $1 AND workspace_id = $2
     RETURNING *`;
  const params = [id, workspaceId, data.name ?? null, data.avatarUrl ?? null, data.notes ?? null, data.status ?? null];
  return exec ? queryOneExec(exec, text, params) : queryOne(text, params);
};

export const softDeleteContact = async (workspaceId: string, id: string, exec?: DbExecutor) => {
  const text = `UPDATE contact
     SET deleted_at = now(), updated_at = now(), version = version + 1
     WHERE id = $1 AND workspace_id = $2 AND deleted_at IS NULL
     RETURNING *`;
  const params = [id, workspaceId];
  return exec ? queryOneExec(exec, text, params) : queryOne(text, params);
};

export const addContactIdentity = async (contactId: string, type: string, value: string) => {
  return queryOne(
    `INSERT INTO contact_identity (contact_id, type, value)
     VALUES ($1, $2, $3)
     ON CONFLICT (contact_id, type, value) DO NOTHING
     RETURNING *`,
    [contactId, type, value]
  );
};

export const deleteContactIdentity = async (identityId: string) => {
  return queryOne(
    `DELETE FROM contact_identity WHERE id = $1 RETURNING id`,
    [identityId]
  );
};

export const deleteContactIdentityForContact = async (contactId: string, identityId: string) => {
  return queryOne(
    `DELETE FROM contact_identity WHERE id = $1 AND contact_id = $2 RETURNING id`,
    [identityId, contactId]
  );
};

export const addTag = async (workspaceId: string, name: string) => {
  return queryOne<{ id: string; workspace_id: string; name: string }>(
    `INSERT INTO tag (workspace_id, name)
     VALUES ($1, $2)
     ON CONFLICT (workspace_id, name) DO UPDATE SET name = EXCLUDED.name
     RETURNING *`,
    [workspaceId, name]
  );
};

export const addContactTag = async (contactId: string, tagId: string) => {
  return queryOne(
    `INSERT INTO contact_tag (contact_id, tag_id)
     VALUES ($1, $2)
     ON CONFLICT (contact_id, tag_id) DO NOTHING
     RETURNING *`,
    [contactId, tagId]
  );
};

export const deleteContactTag = async (contactId: string, tagId: string) => {
  return queryOne(
    `DELETE FROM contact_tag WHERE contact_id = $1 AND tag_id = $2 RETURNING id`,
    [contactId, tagId]
  );
};
