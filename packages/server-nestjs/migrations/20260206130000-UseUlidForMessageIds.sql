-- Migration: Use ULID-friendly message IDs
-- Allow messages.id to store ULIDs and align sourceMessageIds columns.

ALTER TABLE "messages"
  ALTER COLUMN "id" TYPE text USING "id"::text,
  ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "events"
  ALTER COLUMN "sourceMessageIds" TYPE text[] USING "sourceMessageIds"::text[];

ALTER TABLE "contact_facts"
  ALTER COLUMN "sourceMessageIds" TYPE text[] USING "sourceMessageIds"::text[];

ALTER TABLE "contact_todos"
  ALTER COLUMN "sourceMessageIds" TYPE text[] USING "sourceMessageIds"::text[];
