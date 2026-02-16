CREATE TABLE IF NOT EXISTS agent_run_metrics (
  id uuid PRIMARY KEY,
  run_id varchar(64) NOT NULL,
  user_id varchar(255),
  agent_id varchar(100) NOT NULL,
  operation varchar(100),
  endpoint varchar(16) NOT NULL,
  status varchar(16) NOT NULL,
  cached boolean NOT NULL DEFAULT false,
  duration_ms integer NOT NULL,
  error_code varchar(120),
  created_at bigint NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS IDX_agent_run_metrics_run_id
  ON agent_run_metrics(run_id);

CREATE INDEX IF NOT EXISTS IDX_agent_run_metrics_user_created
  ON agent_run_metrics(user_id, created_at);

CREATE INDEX IF NOT EXISTS IDX_agent_run_metrics_agent_created
  ON agent_run_metrics(agent_id, created_at);

CREATE INDEX IF NOT EXISTS IDX_agent_run_metrics_status_created
  ON agent_run_metrics(status, created_at);
