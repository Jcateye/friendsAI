-- Sync improvements for offline/local-first:
-- - Store client_id + client_change_id in the change log
-- - Enforce uniqueness to support idempotent sync pushes
-- - Use stable ordering (created_at, id) for cursors

ALTER TABLE sync_change_log
  ADD COLUMN IF NOT EXISTS client_id text,
  ADD COLUMN IF NOT EXISTS client_change_id text;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_sync_change_log_idempotency
  ON sync_change_log(workspace_id, client_id, client_change_id);

CREATE INDEX IF NOT EXISTS idx_sync_change_workspace_created_id
  ON sync_change_log(workspace_id, created_at ASC, id ASC);
