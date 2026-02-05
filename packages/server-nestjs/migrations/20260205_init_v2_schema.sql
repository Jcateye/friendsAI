CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  phone text,
  password text NOT NULL,
  name text,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "refreshToken" text NOT NULL,
  "expiresAt" timestamp NOT NULL,
  "revokedAt" timestamp,
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  alias text,
  email text,
  phone text,
  company text,
  position text,
  profile jsonb,
  tags text,
  note text,
  "userId" uuid REFERENCES users(id) ON DELETE SET NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  content text NOT NULL,
  embedding vector,
  "parsedData" jsonb,
  "isArchived" boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'active',
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "contactId" uuid REFERENCES contacts(id) ON DELETE SET NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  role text NOT NULL,
  content text NOT NULL,
  metadata jsonb,
  citations jsonb,
  "conversationId" uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  details jsonb,
  "eventDate" timestamp,
  embedding vector,
  "sourceConversationId" uuid,
  "sourceMessageIds" uuid[],
  "contactId" uuid REFERENCES contacts(id) ON DELETE SET NULL,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_facts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  metadata jsonb,
  "sourceConversationId" uuid,
  "sourceMessageIds" uuid[],
  "contactId" uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  "dueAt" timestamp,
  metadata jsonb,
  "sourceConversationId" uuid,
  "sourceMessageIds" uuid[],
  "contactId" uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS contact_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  citations jsonb,
  "generatedAt" timestamp NOT NULL,
  "contactId" uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversation_archives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "conversationId" uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'ready_for_review',
  summary text,
  payload jsonb,
  citations jsonb,
  "appliedAt" timestamp,
  "discardedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tool_confirmations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "toolName" text NOT NULL,
  payload jsonb,
  result jsonb,
  status text NOT NULL DEFAULT 'pending',
  error text,
  "conversationId" uuid REFERENCES conversations(id) ON DELETE SET NULL,
  "userId" uuid REFERENCES users(id) ON DELETE SET NULL,
  "confirmedAt" timestamp,
  "rejectedAt" timestamp,
  "executedAt" timestamp,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS connector_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "connectorType" text NOT NULL,
  "accessToken" text NOT NULL,
  "refreshToken" text,
  "tokenType" text,
  scope text,
  "expiresAt" timestamp,
  metadata jsonb,
  "userId" uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auth_sessions_user_id ON auth_sessions ("userId");
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages ("conversationId");
CREATE INDEX IF NOT EXISTS idx_events_contact_id ON events ("contactId");
CREATE INDEX IF NOT EXISTS idx_contact_facts_contact_id ON contact_facts ("contactId");
CREATE INDEX IF NOT EXISTS idx_contact_todos_contact_id ON contact_todos ("contactId");
CREATE INDEX IF NOT EXISTS idx_contact_briefs_contact_id ON contact_briefs ("contactId");
CREATE INDEX IF NOT EXISTS idx_conversation_archives_conversation_id ON conversation_archives ("conversationId");
CREATE INDEX IF NOT EXISTS idx_tool_confirmations_status ON tool_confirmations (status);
CREATE INDEX IF NOT EXISTS idx_connector_tokens_user_id ON connector_tokens ("userId");
