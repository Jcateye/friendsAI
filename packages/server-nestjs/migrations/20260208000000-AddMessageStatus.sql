-- Migration: Add status field to messages table for tracking abandoned messages.

ALTER TABLE "messages"
  ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'active';

-- Update existing messages to have 'active' status
UPDATE "messages"
SET "status" = 'active'
WHERE "status" IS NULL;

-- Create index for faster queries filtering by status
CREATE INDEX IF NOT EXISTS "IDX_messages_status" ON "messages" ("status");



