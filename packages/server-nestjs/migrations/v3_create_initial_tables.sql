-- FriendsAI v3 Initial Tables Migration
-- Database: friendsai_v3_gpt
--
-- IMPORTANT: This migration must be run on the friendsai_v3_gpt database.
-- To create the database first, run:
--   docker exec -it friendsai-db-1 psql -U friendsai -c "CREATE DATABASE friendsai_v3_gpt;"
--
-- Then run the migration:
--   DATABASE_URL="postgres://friendsai:friendsai@localhost:5432/friendsai_v3_gpt" node scripts/migrate.js

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Table: relationship_health_snapshot
-- 关系健康快照
-- ============================================
CREATE TABLE IF NOT EXISTS relationship_health_snapshot (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  contact_id VARCHAR(255) NOT NULL,
  snapshot_date DATE NOT NULL,
  health_score DECIMAL(5,2),      -- 0-100
  risk_level VARCHAR(20),         -- 'low'/'medium'/'high'
  last_interaction_at TIMESTAMP,
  interaction_frequency INT,      -- 过去30天互动次数
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, contact_id, snapshot_date)
);

-- ============================================
-- Table: relationship_debt_item
-- 关系债务项
-- ============================================
CREATE TABLE IF NOT EXISTS relationship_debt_item (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  contact_id VARCHAR(255) NOT NULL,
  debt_type VARCHAR(50),          -- 'long_no_contact', 'unfulfilled_promise', 'unreciprocated'
  severity VARCHAR(20),           -- 'low'/'medium'/'high'
  description TEXT,
  suggested_action TEXT,
  is_resolved BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- ============================================
-- Table: action_outcome_log
-- 行动结果日志
-- ============================================
CREATE TABLE IF NOT EXISTS action_outcome_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  agent_id VARCHAR(100) NOT NULL,
  suggestion_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL, -- 'shown'/'accepted'/'sent'/'replied'/'followup_completed'
  event_data JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Table: weekly_report_cache
-- 每周简报缓存
-- ============================================
CREATE TABLE IF NOT EXISTS weekly_report_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  week_start DATE NOT NULL,
  action_completion_rate DECIMAL(5,2),
  reply_rate DECIMAL(5,2),
  followup_rate DECIMAL(5,2),
  total_suggestions INT,
  total_accepted INT,
  total_sent INT,
  total_replied INT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, week_start)
);

-- ============================================
-- Indexes
-- ============================================

-- Drop indexes if they exist (for idempotency)
DROP INDEX IF EXISTS idx_action_outcome_user_event;
DROP INDEX IF EXISTS idx_health_snapshot_user;
DROP INDEX IF EXISTS idx_debt_user_resolved;

-- Create indexes for action_outcome_log queries
CREATE INDEX idx_action_outcome_user_event ON action_outcome_log(user_id, event_type, created_at);

-- Create indexes for health snapshot queries
CREATE INDEX idx_health_snapshot_user ON relationship_health_snapshot(user_id, snapshot_date DESC);

-- Create indexes for debt item queries
CREATE INDEX idx_debt_user_resolved ON relationship_debt_item(user_id, is_resolved);
