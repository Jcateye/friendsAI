-- Create agent_feedback table for storing user feedback on agent-generated actions
-- Migration: 20260210XXXXXXXX
-- Description: Create agent_feedback table with indexes for feedback API

-- Create enum type for feedback types
DO $$ BEGIN
    CREATE TYPE agent_feedback_type AS ENUM (
        'action_accepted',
        'action_rejected',
        'action_modified',
        'insight_helpful',
        'insight_not_helpful',
        'other'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create agent_feedback table
CREATE TABLE IF NOT EXISTS agent_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NULL,
    agent_id TEXT NOT NULL,
    run_id UUID NULL,
    action_id TEXT NULL,
    contact_id UUID NULL,
    feedback_type agent_feedback_type NOT NULL,
    rating INT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NULL,
    original_data JSONB NULL,
    modified_data JSONB NULL,
    reason TEXT NULL,
    created_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT,
    updated_at BIGINT NOT NULL DEFAULT (EXTRACT(EPOCH FROM NOW()) * 1000)::BIGINT
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS IDX_agent_feedback_userId ON agent_feedback(user_id);
CREATE INDEX IF NOT EXISTS IDX_agent_feedback_agentId ON agent_feedback(agent_id);
CREATE INDEX IF NOT EXISTS IDX_agent_feedback_runId ON agent_feedback(run_id);
CREATE INDEX IF NOT EXISTS IDX_agent_feedback_actionId ON agent_feedback(action_id);
CREATE INDEX IF NOT EXISTS IDX_agent_feedback_createdAt ON agent_feedback(created_at);

-- Create index for feedback type queries
CREATE INDEX IF NOT EXISTS IDX_agent_feedback_feedbackType ON agent_feedback(feedback_type);

-- Add comments for documentation
COMMENT ON TABLE agent_feedback IS 'Stores user feedback on agent-generated action cards and insights';
COMMENT ON COLUMN agent_feedback.id IS 'Unique identifier (UUID)';
COMMENT ON COLUMN agent_feedback.user_id IS 'User who provided feedback';
COMMENT ON COLUMN agent_feedback.agent_id IS 'Agent that generated the action (e.g., contact_insight, network_action)';
COMMENT ON COLUMN agent_feedback.run_id IS 'Agent run ID';
COMMENT ON COLUMN agent_feedback.action_id IS 'Action card ID being feedback on';
COMMENT ON COLUMN agent_feedback.contact_id IS 'Contact ID related to this feedback';
COMMENT ON COLUMN agent_feedback.feedback_type IS 'Type of feedback';
COMMENT ON COLUMN agent_feedback.rating IS 'User rating (1-5)';
COMMENT ON COLUMN agent_feedback.comment IS 'Free-text feedback';
COMMENT ON COLUMN agent_feedback.original_data IS 'Original action/data that was feedback on';
COMMENT ON COLUMN agent_feedback.modified_data IS 'Modified action/data (if user modified)';
COMMENT ON COLUMN agent_feedback.reason IS 'Reason for rejection/modification (e.g., not_relevant, too_generic)';
COMMENT ON COLUMN agent_feedback.created_at IS 'Creation timestamp (epoch milliseconds)';
COMMENT ON COLUMN agent_feedback.updated_at IS 'Update timestamp (epoch milliseconds)';
