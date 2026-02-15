-- Migration: normalize agent_snapshots.scopeId to text
-- Reason: scopeId may contain non-UUID identifiers (e.g. logical keys)

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_snapshots'
      AND column_name = 'scopeId'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE "agent_snapshots"
      ALTER COLUMN "scopeId" TYPE text USING "scopeId"::text;
  END IF;
END $$;
