-- Skills center tables: lifecycle governance, parser audit, runtime mounts

CREATE TABLE IF NOT EXISTS skill_definitions (
  id uuid PRIMARY KEY,
  skill_key varchar(100) NOT NULL,
  scope_type varchar(20) NOT NULL,
  scope_id varchar(255),
  display_name varchar(255) NOT NULL,
  description text,
  enabled boolean NOT NULL DEFAULT true,
  created_by varchar(255),
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  UNIQUE (skill_key, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_definitions_scope
  ON skill_definitions (scope_type, scope_id, skill_key);

CREATE TABLE IF NOT EXISTS skill_versions (
  id uuid PRIMARY KEY,
  definition_id uuid NOT NULL REFERENCES skill_definitions(id) ON DELETE CASCADE,
  version varchar(64) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'draft',
  manifest jsonb NOT NULL,
  parser_rules jsonb,
  checksum varchar(128) NOT NULL,
  created_by varchar(255),
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  UNIQUE (definition_id, version)
);

CREATE INDEX IF NOT EXISTS idx_skill_versions_definition_status
  ON skill_versions (definition_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS skill_release_rules (
  id uuid PRIMARY KEY,
  definition_id uuid NOT NULL REFERENCES skill_definitions(id) ON DELETE CASCADE,
  version varchar(64) NOT NULL,
  scope_type varchar(20) NOT NULL DEFAULT 'global',
  scope_id varchar(255),
  rollout_percent int NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT false,
  created_by varchar(255),
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  UNIQUE (definition_id, version, scope_type, scope_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_release_rules_active
  ON skill_release_rules (definition_id, is_active, scope_type, scope_id);

CREATE TABLE IF NOT EXISTS skill_bindings (
  id uuid PRIMARY KEY,
  tenant_id varchar(255) NOT NULL,
  scope_type varchar(20) NOT NULL,
  scope_id varchar(255) NOT NULL,
  skill_key varchar(100) NOT NULL,
  priority int NOT NULL DEFAULT 100,
  enabled boolean NOT NULL DEFAULT true,
  rollout_percent int NOT NULL DEFAULT 100,
  pinned_version varchar(64),
  created_by varchar(255),
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  UNIQUE (tenant_id, scope_type, scope_id, skill_key)
);

CREATE INDEX IF NOT EXISTS idx_skill_bindings_tenant
  ON skill_bindings (tenant_id, scope_type, scope_id, enabled, priority DESC);

CREATE TABLE IF NOT EXISTS skill_runtime_mounts (
  id uuid PRIMARY KEY,
  tenant_id varchar(255) NOT NULL,
  engine varchar(50) NOT NULL,
  agent_scope varchar(255) NOT NULL,
  desired_hash varchar(128) NOT NULL,
  applied_hash varchar(128),
  status varchar(20) NOT NULL,
  details jsonb,
  last_reconcile_at bigint,
  created_at bigint NOT NULL,
  updated_at bigint NOT NULL,
  UNIQUE (tenant_id, engine, agent_scope)
);

CREATE INDEX IF NOT EXISTS idx_skill_runtime_mounts_tenant
  ON skill_runtime_mounts (tenant_id, engine, agent_scope, updated_at DESC);

CREATE TABLE IF NOT EXISTS skill_invocation_logs (
  id uuid PRIMARY KEY,
  tenant_id varchar(255) NOT NULL,
  conversation_id uuid,
  session_id varchar(255),
  trace_id varchar(64) NOT NULL,
  matched boolean NOT NULL,
  skill_key varchar(100),
  operation varchar(100),
  source varchar(40) NOT NULL,
  confidence numeric(5,2),
  status varchar(30) NOT NULL,
  warnings jsonb,
  args jsonb,
  raw_input text,
  error_code varchar(100),
  error_message text,
  created_at bigint NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_skill_invocation_logs_tenant_created
  ON skill_invocation_logs (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_skill_invocation_logs_trace
  ON skill_invocation_logs (trace_id);

CREATE TABLE IF NOT EXISTS skill_publish_logs (
  id uuid PRIMARY KEY,
  definition_id uuid NOT NULL REFERENCES skill_definitions(id) ON DELETE CASCADE,
  skill_key varchar(100) NOT NULL,
  version varchar(64) NOT NULL,
  scope_type varchar(20) NOT NULL,
  scope_id varchar(255),
  rollout_percent int NOT NULL,
  export_path text NOT NULL,
  published_by varchar(255),
  published_at bigint NOT NULL,
  metadata jsonb
);

CREATE INDEX IF NOT EXISTS idx_skill_publish_logs_definition_published
  ON skill_publish_logs (definition_id, published_at DESC);

CREATE INDEX IF NOT EXISTS idx_skill_publish_logs_skill_version
  ON skill_publish_logs (skill_key, version, published_at DESC);
