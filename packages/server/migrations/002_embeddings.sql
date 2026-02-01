-- Ensure unique scope+ref_id so we can upsert.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uniq_embedding_scope_ref'
  ) THEN
    ALTER TABLE embedding
      ADD CONSTRAINT uniq_embedding_scope_ref UNIQUE (scope, ref_id);
  END IF;
END $$;

-- Vector index for similarity search (cosine distance).
-- Note: ivfflat requires ANALYZE for best performance; keep lists modest for MVP.
CREATE INDEX IF NOT EXISTS idx_embedding_vector_cosine
  ON embedding USING ivfflat (vector vector_cosine_ops) WITH (lists = 100);
