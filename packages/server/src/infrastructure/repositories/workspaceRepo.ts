import { query, queryOne } from '@/infrastructure/db/query';

export interface WorkspaceRecord {
  id: string;
  name: string;
}

export const createWorkspace = async (name: string) => {
  return queryOne<WorkspaceRecord>(
    `INSERT INTO workspace (name) VALUES ($1) RETURNING *`,
    [name]
  );
};

export const listWorkspacesForUser = async (userId: string) => {
  return query<WorkspaceRecord>(
    `SELECT w.* FROM workspace w
     JOIN workspace_member wm ON wm.workspace_id = w.id
     WHERE wm.user_id = $1 AND w.deleted_at IS NULL`,
    [userId]
  );
};

export const addMember = async (workspaceId: string, userId: string, role: string) => {
  return queryOne(
    `INSERT INTO workspace_member (workspace_id, user_id, role)
     VALUES ($1, $2, $3)
     ON CONFLICT (workspace_id, user_id) DO UPDATE SET role = EXCLUDED.role
     RETURNING *`,
    [workspaceId, userId, role]
  );
};

export const updateMemberRole = async (workspaceId: string, memberId: string, role: string) => {
  return queryOne(
    `UPDATE workspace_member SET role = $1, updated_at = now()
     WHERE id = $2 AND workspace_id = $3
     RETURNING *`,
    [role, memberId, workspaceId]
  );
};

export const findMemberByUser = async (workspaceId: string, userId: string) => {
  return queryOne(
    `SELECT * FROM workspace_member WHERE workspace_id = $1 AND user_id = $2`,
    [workspaceId, userId]
  );
};
