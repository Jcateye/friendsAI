ALTER TABLE chat_message
  ADD COLUMN IF NOT EXISTS citations_json JSONB;
