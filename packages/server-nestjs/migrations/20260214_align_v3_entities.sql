-- Migration: Complete alignment of v3 tables with TypeORM entity definitions
-- Run this after v3_create_initial_tables.sql
-- ============================================

-- ==========================================
-- 1. action_outcome_log — add missing columns
-- ==========================================
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS contact_id VARCHAR(255);
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS agent_name VARCHAR(100);
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS action_type VARCHAR(50);
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS action_metadata JSONB;
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS outcome_type VARCHAR(50);
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS outcome_reason VARCHAR(255);
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS action_timestamp BIGINT;
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS response_time_seconds INT;
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS platform VARCHAR(50);
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS message_id UUID;
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS conversation_id UUID;
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS followup_required BOOLEAN DEFAULT FALSE;
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS followup_deadline TIMESTAMP;
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS conversion_score DECIMAL(5,2);
ALTER TABLE IF EXISTS action_outcome_log ADD COLUMN IF NOT EXISTS metadata JSONB;

-- Drop NOT NULL on legacy columns not managed by TypeORM entity
ALTER TABLE IF EXISTS action_outcome_log ALTER COLUMN agent_id DROP NOT NULL;
ALTER TABLE IF EXISTS action_outcome_log ALTER COLUMN suggestion_id DROP NOT NULL;
ALTER TABLE IF EXISTS action_outcome_log ALTER COLUMN event_type DROP NOT NULL;

-- ==========================================
-- 2. weekly_report_cache — add missing columns
-- ==========================================
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS week_start_date DATE;
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS week_end_date DATE;
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS report_data JSONB;
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS accepted_suggestions INT DEFAULT 0;
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS messages_sent INT DEFAULT 0;
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS messages_replied INT DEFAULT 0;
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS followups_completed INT DEFAULT 0;
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS acceptance_rate DECIMAL(5,2);
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS conversion_rate DECIMAL(5,2);
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS top_contacts TEXT;
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS risk_contacts TEXT;
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS resolved_debts INT DEFAULT 0;
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS new_debts INT DEFAULT 0;
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS key_insights TEXT;
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS improvement_suggestions TEXT;
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS generation_version VARCHAR(20);
ALTER TABLE IF EXISTS weekly_report_cache ADD COLUMN IF NOT EXISTS is_regenerated BOOLEAN DEFAULT FALSE;

-- The old week_start column has NOT NULL but the entity now uses week_start_date
ALTER TABLE IF EXISTS weekly_report_cache ALTER COLUMN week_start DROP NOT NULL;

-- Backfill week_start_date from week_start if data exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weekly_report_cache'
      AND column_name = 'week_start_date'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'weekly_report_cache'
      AND column_name = 'week_start'
  ) THEN
    UPDATE weekly_report_cache
    SET week_start_date = week_start
    WHERE week_start_date IS NULL
      AND week_start IS NOT NULL;
  END IF;
END $$;

-- ==========================================
-- 3. relationship_health_snapshot — fix column names and add missing
-- ==========================================
-- Entity uses interaction_frequency_days but DB has interaction_frequency
ALTER TABLE IF EXISTS relationship_health_snapshot ADD COLUMN IF NOT EXISTS interaction_frequency_days INT;
-- Copy data from interaction_frequency to interaction_frequency_days
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'relationship_health_snapshot'
      AND column_name = 'interaction_frequency_days'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'relationship_health_snapshot'
      AND column_name = 'interaction_frequency'
  ) THEN
    UPDATE relationship_health_snapshot
    SET interaction_frequency_days = interaction_frequency
    WHERE interaction_frequency_days IS NULL
      AND interaction_frequency IS NOT NULL;
  END IF;
END $$;

ALTER TABLE IF EXISTS relationship_health_snapshot ADD COLUMN IF NOT EXISTS total_interactions INT DEFAULT 0;
ALTER TABLE IF EXISTS relationship_health_snapshot ADD COLUMN IF NOT EXISTS insight_tags TEXT;
ALTER TABLE IF EXISTS relationship_health_snapshot ADD COLUMN IF NOT EXISTS priority_score DECIMAL(5,2);

-- ==========================================
-- 4. relationship_debt_item — add missing columns
-- ==========================================
ALTER TABLE IF EXISTS relationship_debt_item ADD COLUMN IF NOT EXISTS days_overdue INT;
ALTER TABLE IF EXISTS relationship_debt_item ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE IF EXISTS relationship_debt_item ADD COLUMN IF NOT EXISTS suggested_message_template TEXT;
ALTER TABLE IF EXISTS relationship_debt_item ADD COLUMN IF NOT EXISTS original_event_id UUID;
ALTER TABLE IF EXISTS relationship_debt_item ADD COLUMN IF NOT EXISTS original_conversation_id UUID;
ALTER TABLE IF EXISTS relationship_debt_item ADD COLUMN IF NOT EXISTS metadata JSONB;
ALTER TABLE IF EXISTS relationship_debt_item ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP;

-- Sync status from is_resolved
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'relationship_debt_item'
      AND column_name = 'status'
  ) AND EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'relationship_debt_item'
      AND column_name = 'is_resolved'
  ) THEN
    UPDATE relationship_debt_item
    SET status = CASE WHEN is_resolved = TRUE THEN 'resolved' ELSE 'pending' END
    WHERE status IS NULL;
  END IF;
END $$;
