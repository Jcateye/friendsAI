-- Migration: CreateMessageEntity
-- Create messages table
CREATE TABLE "messages" (
  "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  "role" text NOT NULL,
  "content" text NOT NULL,
  "metadata" jsonb,
  "citations" jsonb,
  "conversationId" uuid NOT NULL,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

-- Add foreign key constraint to messages table
ALTER TABLE "messages"
ADD CONSTRAINT "FK_message_conversation"
FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE;

-- Optional: Create an index on conversationId for faster lookups
CREATE INDEX "IDX_message_conversationId" ON "messages" ("conversationId");