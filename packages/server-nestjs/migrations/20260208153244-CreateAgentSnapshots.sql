-- Migration: Create agent_snapshots table and add summary field to conversations table.

-- Create agent_snapshots table
CREATE TABLE IF NOT EXISTS "agent_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "agentId" text NOT NULL,
  "operation" text,
  "scopeType" text NOT NULL,
  "scopeId" uuid,
  "userId" uuid,
  "sourceHash" text NOT NULL,
  "promptVersion" text NOT NULL,
  "model" text,
  "input" jsonb NOT NULL,
  "output" jsonb NOT NULL,
  "expiresAt" bigint,
  "createdAt" bigint NOT NULL,
  "updatedAt" bigint NOT NULL
);

-- Create unique composite index for cache lookup
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_agent_snapshots_unique" 
ON "agent_snapshots" ("agentId", "operation", "userId", "scopeType", "scopeId", "sourceHash", "promptVersion");

-- Create index for expiration queries
CREATE INDEX IF NOT EXISTS "IDX_agent_snapshots_expires_at" 
ON "agent_snapshots" ("expiresAt");

-- Add summary field to conversations table
ALTER TABLE "conversations"
  ADD COLUMN IF NOT EXISTS "summary" text;



