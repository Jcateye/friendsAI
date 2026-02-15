-- Migration: convert datetime/timestamp columns across core tables to bigint epoch milliseconds.
-- Idempotent: safe when columns are already bigint.

DO $$
DECLARE
  rec record;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('users', 'createdAt'),
        ('users', 'updatedAt'),
        ('auth_sessions', 'createdAt'),
        ('auth_sessions', 'updatedAt'),
        ('contacts', 'createdAt'),
        ('contacts', 'updatedAt'),
        ('conversations', 'createdAt'),
        ('conversations', 'updatedAt'),
        ('messages', 'createdAt'),
        ('events', 'createdAt'),
        ('events', 'updatedAt'),
        ('contact_facts', 'createdAt'),
        ('contact_facts', 'updatedAt'),
        ('contact_todos', 'createdAt'),
        ('contact_todos', 'updatedAt'),
        ('contact_briefs', 'createdAt'),
        ('contact_briefs', 'updatedAt'),
        ('conversation_archives', 'createdAt'),
        ('conversation_archives', 'updatedAt'),
        ('tool_confirmations', 'createdAt'),
        ('tool_confirmations', 'updatedAt'),
        ('connector_tokens', 'createdAt'),
        ('connector_tokens', 'updatedAt')
    ) AS t(tbl, col)
  LOOP
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = rec.tbl
        AND column_name = rec.col
    ) THEN
      EXECUTE format('ALTER TABLE %I ALTER COLUMN %I DROP DEFAULT', rec.tbl, rec.col);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE
  rec record;
  v_type text;
BEGIN
  FOR rec IN
    SELECT *
    FROM (
      VALUES
        ('users', 'createdAt'),
        ('users', 'updatedAt'),
        ('auth_sessions', 'expiresAt'),
        ('auth_sessions', 'revokedAt'),
        ('auth_sessions', 'createdAt'),
        ('auth_sessions', 'updatedAt'),
        ('contacts', 'createdAt'),
        ('contacts', 'updatedAt'),
        ('conversations', 'createdAt'),
        ('conversations', 'updatedAt'),
        ('messages', 'createdAt'),
        ('events', 'eventDate'),
        ('events', 'createdAt'),
        ('events', 'updatedAt'),
        ('contact_facts', 'createdAt'),
        ('contact_facts', 'updatedAt'),
        ('contact_todos', 'dueAt'),
        ('contact_todos', 'createdAt'),
        ('contact_todos', 'updatedAt'),
        ('contact_briefs', 'generatedAt'),
        ('contact_briefs', 'createdAt'),
        ('contact_briefs', 'updatedAt'),
        ('conversation_archives', 'appliedAt'),
        ('conversation_archives', 'discardedAt'),
        ('conversation_archives', 'createdAt'),
        ('conversation_archives', 'updatedAt'),
        ('tool_confirmations', 'confirmedAt'),
        ('tool_confirmations', 'rejectedAt'),
        ('tool_confirmations', 'executedAt'),
        ('tool_confirmations', 'createdAt'),
        ('tool_confirmations', 'updatedAt'),
        ('connector_tokens', 'expiresAt'),
        ('connector_tokens', 'createdAt'),
        ('connector_tokens', 'updatedAt')
    ) AS t(tbl, col)
  LOOP
    SELECT data_type
    INTO v_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = rec.tbl
      AND column_name = rec.col;

    IF v_type IS NULL OR v_type = 'bigint' THEN
      CONTINUE;
    END IF;

    IF v_type IN ('timestamp without time zone', 'timestamp with time zone') THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE bigint USING (EXTRACT(EPOCH FROM %I AT TIME ZONE ''UTC'') * 1000)::bigint',
        rec.tbl, rec.col, rec.col
      );
    ELSIF v_type = 'date' THEN
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE bigint USING (EXTRACT(EPOCH FROM %I::timestamp AT TIME ZONE ''UTC'') * 1000)::bigint',
        rec.tbl, rec.col, rec.col
      );
    ELSE
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE bigint USING %I::bigint',
        rec.tbl, rec.col, rec.col
      );
    END IF;
  END LOOP;
END $$;
