-- Migration: CreateMessageEntity
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  -- conversations 表在 20260205_init_v2_schema.sql 中创建。
  -- 若当前库尚未创建该表，则跳过本迁移，让后续基线迁移创建完整 messages 结构。
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'conversations'
  ) THEN
    CREATE TABLE IF NOT EXISTS "messages" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "role" text NOT NULL,
      "content" text NOT NULL,
      "metadata" jsonb,
      "citations" jsonb,
      "conversationId" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
      "createdAt" timestamptz NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS "IDX_message_conversationId" ON "messages" ("conversationId");
  END IF;
END $$;
