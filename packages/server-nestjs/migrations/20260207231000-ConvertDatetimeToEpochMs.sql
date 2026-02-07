-- Migration: convert datetime/timestamp columns across core tables to bigint epoch milliseconds.

ALTER TABLE "users"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "auth_sessions"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "contacts"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "conversations"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "messages"
  ALTER COLUMN "createdAt" DROP DEFAULT;

ALTER TABLE "events"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "contact_facts"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "contact_todos"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "contact_briefs"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "conversation_archives"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "tool_confirmations"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "connector_tokens"
  ALTER COLUMN "createdAt" DROP DEFAULT,
  ALTER COLUMN "updatedAt" DROP DEFAULT;

ALTER TABLE "users"
  ALTER COLUMN "createdAt" TYPE bigint USING (EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)::bigint,
  ALTER COLUMN "updatedAt" TYPE bigint USING (EXTRACT(EPOCH FROM "updatedAt" AT TIME ZONE 'UTC') * 1000)::bigint;

ALTER TABLE "auth_sessions"
  ALTER COLUMN "expiresAt" TYPE bigint USING (EXTRACT(EPOCH FROM "expiresAt" AT TIME ZONE 'UTC') * 1000)::bigint,
  ALTER COLUMN "revokedAt" TYPE bigint USING (CASE WHEN "revokedAt" IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM "revokedAt" AT TIME ZONE 'UTC') * 1000)::bigint END),
  ALTER COLUMN "createdAt" TYPE bigint USING (EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)::bigint,
  ALTER COLUMN "updatedAt" TYPE bigint USING (EXTRACT(EPOCH FROM "updatedAt" AT TIME ZONE 'UTC') * 1000)::bigint;

ALTER TABLE "contacts"
  ALTER COLUMN "createdAt" TYPE bigint USING (EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)::bigint,
  ALTER COLUMN "updatedAt" TYPE bigint USING (EXTRACT(EPOCH FROM "updatedAt" AT TIME ZONE 'UTC') * 1000)::bigint;

ALTER TABLE "conversations"
  ALTER COLUMN "createdAt" TYPE bigint USING (EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)::bigint,
  ALTER COLUMN "updatedAt" TYPE bigint USING (EXTRACT(EPOCH FROM "updatedAt" AT TIME ZONE 'UTC') * 1000)::bigint;

ALTER TABLE "messages"
  ALTER COLUMN "createdAt" TYPE bigint USING (EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)::bigint;

ALTER TABLE "events"
  ALTER COLUMN "eventDate" TYPE bigint USING (CASE WHEN "eventDate" IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM "eventDate" AT TIME ZONE 'UTC') * 1000)::bigint END),
  ALTER COLUMN "createdAt" TYPE bigint USING (EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)::bigint,
  ALTER COLUMN "updatedAt" TYPE bigint USING (EXTRACT(EPOCH FROM "updatedAt" AT TIME ZONE 'UTC') * 1000)::bigint;

ALTER TABLE "contact_facts"
  ALTER COLUMN "createdAt" TYPE bigint USING (EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)::bigint,
  ALTER COLUMN "updatedAt" TYPE bigint USING (EXTRACT(EPOCH FROM "updatedAt" AT TIME ZONE 'UTC') * 1000)::bigint;

ALTER TABLE "contact_todos"
  ALTER COLUMN "dueAt" TYPE bigint USING (CASE WHEN "dueAt" IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM "dueAt" AT TIME ZONE 'UTC') * 1000)::bigint END),
  ALTER COLUMN "createdAt" TYPE bigint USING (EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)::bigint,
  ALTER COLUMN "updatedAt" TYPE bigint USING (EXTRACT(EPOCH FROM "updatedAt" AT TIME ZONE 'UTC') * 1000)::bigint;

ALTER TABLE "contact_briefs"
  ALTER COLUMN "generatedAt" TYPE bigint USING (EXTRACT(EPOCH FROM "generatedAt" AT TIME ZONE 'UTC') * 1000)::bigint,
  ALTER COLUMN "createdAt" TYPE bigint USING (EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)::bigint,
  ALTER COLUMN "updatedAt" TYPE bigint USING (EXTRACT(EPOCH FROM "updatedAt" AT TIME ZONE 'UTC') * 1000)::bigint;

ALTER TABLE "conversation_archives"
  ALTER COLUMN "appliedAt" TYPE bigint USING (CASE WHEN "appliedAt" IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM "appliedAt" AT TIME ZONE 'UTC') * 1000)::bigint END),
  ALTER COLUMN "discardedAt" TYPE bigint USING (CASE WHEN "discardedAt" IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM "discardedAt" AT TIME ZONE 'UTC') * 1000)::bigint END),
  ALTER COLUMN "createdAt" TYPE bigint USING (EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)::bigint,
  ALTER COLUMN "updatedAt" TYPE bigint USING (EXTRACT(EPOCH FROM "updatedAt" AT TIME ZONE 'UTC') * 1000)::bigint;

ALTER TABLE "tool_confirmations"
  ALTER COLUMN "confirmedAt" TYPE bigint USING (CASE WHEN "confirmedAt" IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM "confirmedAt" AT TIME ZONE 'UTC') * 1000)::bigint END),
  ALTER COLUMN "rejectedAt" TYPE bigint USING (CASE WHEN "rejectedAt" IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM "rejectedAt" AT TIME ZONE 'UTC') * 1000)::bigint END),
  ALTER COLUMN "executedAt" TYPE bigint USING (CASE WHEN "executedAt" IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM "executedAt" AT TIME ZONE 'UTC') * 1000)::bigint END),
  ALTER COLUMN "createdAt" TYPE bigint USING (EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)::bigint,
  ALTER COLUMN "updatedAt" TYPE bigint USING (EXTRACT(EPOCH FROM "updatedAt" AT TIME ZONE 'UTC') * 1000)::bigint;

ALTER TABLE "connector_tokens"
  ALTER COLUMN "expiresAt" TYPE bigint USING (CASE WHEN "expiresAt" IS NULL THEN NULL ELSE (EXTRACT(EPOCH FROM "expiresAt" AT TIME ZONE 'UTC') * 1000)::bigint END),
  ALTER COLUMN "createdAt" TYPE bigint USING (EXTRACT(EPOCH FROM "createdAt" AT TIME ZONE 'UTC') * 1000)::bigint,
  ALTER COLUMN "updatedAt" TYPE bigint USING (EXTRACT(EPOCH FROM "updatedAt" AT TIME ZONE 'UTC') * 1000)::bigint;
