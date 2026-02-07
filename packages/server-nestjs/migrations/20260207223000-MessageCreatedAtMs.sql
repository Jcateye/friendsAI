-- Migration: Add and backfill absolute millisecond timestamps for messages.

ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "createdAtMs" bigint;

UPDATE "messages"
SET "createdAtMs" = (EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)::bigint
WHERE "createdAtMs" IS NULL;

ALTER TABLE "messages"
  ALTER COLUMN "createdAtMs" SET NOT NULL;

CREATE INDEX IF NOT EXISTS "IDX_messages_conversation_createdAtMs_id"
  ON "messages" ("conversationId", "createdAtMs", "id");

