DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'uniq_journal_entry_contact'
  ) THEN
    ALTER TABLE journal_entry_contact
      ADD CONSTRAINT uniq_journal_entry_contact UNIQUE (journal_entry_id, contact_id);
  END IF;
END $$;
