-- Migration: create feishu config and webhook log tables.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS "feishu_configs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "app_token" varchar(255),
  "table_id" varchar(255),
  "webhook_url" varchar(1024),
  "enabled" boolean NOT NULL DEFAULT true,
  "created_at" bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
  "updated_at" bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint
);

CREATE UNIQUE INDEX IF NOT EXISTS "IDX_feishu_configs_user_id"
  ON "feishu_configs" ("user_id");

CREATE TABLE IF NOT EXISTS "feishu_webhook_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "app_token" varchar(255) NOT NULL,
  "table_id" varchar(255) NOT NULL,
  "record_id" varchar(255) NOT NULL,
  "button_id" varchar(255),
  "user_id" varchar(255) NOT NULL,
  "payload" jsonb,
  "status" smallint NOT NULL DEFAULT 0,
  "error_message" text,
  "received_at" bigint NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::bigint,
  "processed_at" bigint
);

CREATE INDEX IF NOT EXISTS "IDX_feishu_webhook_logs_record_id"
  ON "feishu_webhook_logs" ("record_id");

CREATE INDEX IF NOT EXISTS "IDX_feishu_webhook_logs_status_received_at"
  ON "feishu_webhook_logs" ("status", "received_at");
