-- Migration: Add and backfill absolute millisecond timestamps for messages.

ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "createdAtMs" bigint;

DO $$
DECLARE
  v_created_at_type text;
BEGIN
  SELECT data_type
  INTO v_created_at_type
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'messages'
    AND column_name = 'createdAt';

  IF v_created_at_type IN ('timestamp without time zone', 'timestamp with time zone') THEN
    UPDATE "messages"
    SET "createdAtMs" = (EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)::bigint
    WHERE "createdAtMs" IS NULL;
  ELSE
    UPDATE "messages"
    SET "createdAtMs" = "createdAt"::bigint
    WHERE "createdAtMs" IS NULL;
  END IF;
END $$;

ALTER TABLE "messages"
  ALTER COLUMN "createdAtMs" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "IDX_messages_conversation_createdAtMs_id"
  ON "messages" ("conversationId", "createdAtMs", "id");
