-- FriendsAI v3 Feishu Token Storage Migration
-- Database: friendsai_v3_gpt
--
-- Migration: 飞书 Token 存储表
--
-- Run the migration:
--   DATABASE_URL="postgres://friendsai:friendsai@localhost:5432/friendsai_v3_gpt" node scripts/run-v3-feishu-migration.js

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- Table: feishu_tokens
-- 飞书 Token 存储表
-- ============================================
CREATE TABLE IF NOT EXISTS feishu_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type VARCHAR(50) DEFAULT 'Bearer',
  scope VARCHAR(500),
  expires_at TIMESTAMP NOT NULL,
  feishu_user_id VARCHAR(255),
  feishu_user_name VARCHAR(255),
  feishu_user_email VARCHAR(255),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- Indexes
-- ============================================

-- Drop indexes if they exist (for idempotency)
DROP INDEX IF EXISTS idx_feishu_tokens_user;
DROP INDEX IF EXISTS idx_feishu_tokens_expires;

-- Create indexes for feishu_tokens queries
CREATE INDEX idx_feishu_tokens_user ON feishu_tokens(user_id);
CREATE INDEX idx_feishu_tokens_expires ON feishu_tokens(expires_at);

-- ============================================
-- Trigger for updated_at
-- ============================================

-- Drop function if exists
DROP FUNCTION IF EXISTS update_feishu_tokens_updated_at CASCADE;

-- Create function to auto-update updated_at
CREATE OR REPLACE FUNCTION update_feishu_tokens_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists
DROP TRIGGER IF EXISTS trigger_feishu_tokens_updated_at ON feishu_tokens;

-- Create trigger
CREATE TRIGGER trigger_feishu_tokens_updated_at
  BEFORE UPDATE ON feishu_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_feishu_tokens_updated_at();
