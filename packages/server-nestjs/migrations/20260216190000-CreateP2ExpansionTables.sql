-- P2 expansion tables: daily digest, feishu closed-loop, prompt/schema version center

CREATE TABLE IF NOT EXISTS daily_action_digests (
  id uuid PRIMARY KEY,
  user_id varchar(255) NOT NULL,
  digest_date date NOT NULL,
  generated_at bigint NOT NULL,
  metadata jsonb,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  UNIQUE (user_id, digest_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_action_digests_user_date
  ON daily_action_digests (user_id, digest_date DESC);

CREATE TABLE IF NOT EXISTS daily_action_digest_items (
  id uuid PRIMARY KEY,
  digest_id uuid NOT NULL REFERENCES daily_action_digests(id) ON DELETE CASCADE,
  rank int NOT NULL,
  action_type varchar(50) NOT NULL,
  source_agent_id varchar(100) NOT NULL,
  source_ref varchar(255),
  title text NOT NULL,
  description text NOT NULL,
  priority_score numeric(5,2) NOT NULL DEFAULT 0,
  confidence numeric(5,2),
  payload jsonb,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  UNIQUE (digest_id, rank)
);

CREATE INDEX IF NOT EXISTS idx_daily_action_digest_items_digest_rank
  ON daily_action_digest_items (digest_id, rank);

CREATE TABLE IF NOT EXISTS feishu_message_templates (
  id uuid PRIMARY KEY,
  user_id varchar(255) NOT NULL,
  title varchar(255) NOT NULL,
  content text NOT NULL,
  variables jsonb,
  status varchar(20) NOT NULL DEFAULT 'active',
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feishu_message_templates_user_status
  ON feishu_message_templates (user_id, status);

CREATE TABLE IF NOT EXISTS feishu_message_deliveries (
  id uuid PRIMARY KEY,
  user_id varchar(255) NOT NULL,
  template_id uuid REFERENCES feishu_message_templates(id) ON DELETE SET NULL,
  message_id varchar(255),
  recipient_open_id varchar(255) NOT NULL,
  status varchar(32) NOT NULL,
  retryable boolean NOT NULL DEFAULT false,
  error_code varchar(120),
  error_message text,
  conversation_id uuid,
  archive_id uuid,
  tool_confirmation_id uuid,
  request_payload jsonb,
  response_payload jsonb,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feishu_message_deliveries_user_created
  ON feishu_message_deliveries (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feishu_message_deliveries_message
  ON feishu_message_deliveries (message_id);

CREATE TABLE IF NOT EXISTS agent_definition_versions (
  id uuid PRIMARY KEY,
  agent_id varchar(100) NOT NULL,
  version varchar(64) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'draft',
  template_bundle jsonb NOT NULL,
  schema jsonb NOT NULL,
  created_by varchar(255),
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  UNIQUE (agent_id, version)
);

CREATE INDEX IF NOT EXISTS idx_agent_definition_versions_agent_status
  ON agent_definition_versions (agent_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS agent_definition_release_rules (
  id uuid PRIMARY KEY,
  agent_id varchar(100) NOT NULL,
  version varchar(64) NOT NULL,
  rollout_percent int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT false,
  created_by varchar(255),
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  UNIQUE (agent_id, version)
);

CREATE INDEX IF NOT EXISTS idx_agent_definition_release_rules_agent_active
  ON agent_definition_release_rules (agent_id, is_active);

CREATE TABLE IF NOT EXISTS agent_definition_publish_logs (
  id uuid PRIMARY KEY,
  agent_id varchar(100) NOT NULL,
  version varchar(64) NOT NULL,
  action varchar(50) NOT NULL,
  result varchar(20) NOT NULL,
  details jsonb,
  created_by varchar(255),
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_agent_definition_publish_logs_agent_created
  ON agent_definition_publish_logs (agent_id, created_at DESC);
