-- Migration: CreateMessageEntity
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create messages table
CREATE TABLE IF NOT EXISTS "messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "role" text NOT NULL,
  "content" text NOT NULL,
  "metadata" jsonb,
  "citations" jsonb,
  "conversationId" uuid NOT NULL REFERENCES "conversations"("id") ON DELETE CASCADE,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

-- Optional: Create an index on conversationId for faster lookups
CREATE INDEX IF NOT EXISTS "IDX_message_conversationId" ON "messages" ("conversationId");
