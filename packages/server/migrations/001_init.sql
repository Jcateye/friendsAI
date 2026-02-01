CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  phone text UNIQUE,
  name text NOT NULL,
  password_hash text NOT NULL,
  settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS workspace (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS workspace_member (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);

CREATE TABLE IF NOT EXISTS auth_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  refresh_token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_session (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  last_sync_cursor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name text NOT NULL,
  avatar_url text,
  notes text,
  status text,
  version int NOT NULL DEFAULT 1,
  client_id text,
  client_change_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_contact_workspace_updated ON contact(workspace_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS contact_identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  type text NOT NULL,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, type, value)
);

CREATE TABLE IF NOT EXISTS tag (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, name)
);

CREATE TABLE IF NOT EXISTS contact_tag (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES tag(id) ON DELETE CASCADE,
  UNIQUE (contact_id, tag_id)
);

CREATE TABLE IF NOT EXISTS journal_entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  raw_text text NOT NULL,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  client_id text,
  client_change_id text,
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_journal_workspace_created ON journal_entry(workspace_id, created_at DESC);

CREATE TABLE IF NOT EXISTS journal_entry_contact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  confidence numeric(4,3) NOT NULL DEFAULT 1.0
);

CREATE INDEX IF NOT EXISTS idx_journal_entry_contact_entry ON journal_entry_contact(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_journal_entry_contact_contact ON journal_entry_contact(contact_id);

CREATE TABLE IF NOT EXISTS extracted_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id uuid NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload_json jsonb NOT NULL,
  status text NOT NULL DEFAULT 'proposed',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_extracted_item_entry_status ON extracted_item(journal_entry_id, status);

CREATE TABLE IF NOT EXISTS event (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  occurred_at timestamptz NOT NULL,
  summary text NOT NULL,
  source_entry_id uuid NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_contact_time ON event(contact_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS fact (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  key text NOT NULL,
  value text NOT NULL,
  confidence numeric(4,3) NOT NULL DEFAULT 1.0,
  source_entry_id uuid NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fact_contact_key ON fact(contact_id, key);

CREATE TABLE IF NOT EXISTS action_item (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  due_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  suggestion_reason text,
  source_entry_id uuid NOT NULL REFERENCES journal_entry(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_action_item_contact_status ON action_item(contact_id, status);
CREATE INDEX IF NOT EXISTS idx_action_item_due ON action_item(due_at);

CREATE TABLE IF NOT EXISTS brief_snapshot (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id uuid NOT NULL REFERENCES contact(id) ON DELETE CASCADE,
  content text NOT NULL,
  generated_at timestamptz NOT NULL,
  source_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (contact_id, source_hash)
);

CREATE TABLE IF NOT EXISTS embedding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL,
  ref_id uuid NOT NULL,
  vector vector(1536),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_embedding_scope_ref ON embedding(scope, ref_id);

CREATE TABLE IF NOT EXISTS tool_task (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_item_id uuid NOT NULL REFERENCES action_item(id) ON DELETE CASCADE,
  type text NOT NULL,
  payload_json jsonb NOT NULL,
  execute_at timestamptz,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tool_task_status_time ON tool_task(status, execute_at);

CREATE TABLE IF NOT EXISTS tool_execution (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_task_id uuid NOT NULL REFERENCES tool_task(id) ON DELETE CASCADE,
  provider text NOT NULL,
  request_json jsonb,
  response_json jsonb,
  status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sync_change_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  entity text NOT NULL,
  entity_id uuid NOT NULL,
  op text NOT NULL,
  data jsonb NOT NULL,
  version int NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sync_change_workspace_created ON sync_change_log(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS sync_state (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspace(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  last_cursor text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id, client_id)
);
