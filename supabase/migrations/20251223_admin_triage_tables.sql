-- ============================================================================
-- Admin Triage Tables Migration
--
-- Creates tables for:
-- - Fraud review queue (referral fraud detection)
-- - Admin decisions audit log
-- - Cron job runs tracking
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Fraud Review Queue
-- Stores referrals pending fraud review with AI-generated signals
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS fraud_review_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL,
  ai_risk_score INTEGER NOT NULL DEFAULT 0 CHECK (ai_risk_score >= 0 AND ai_risk_score <= 100),
  ai_signals JSONB DEFAULT '[]'::jsonb,
  ai_recommendation TEXT DEFAULT 'review' CHECK (ai_recommendation IN ('approve', 'reject', 'review')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'escalated')),
  reviewed_by UUID REFERENCES profiles(id),
  reviewed_at TIMESTAMPTZ,
  decision_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure one queue entry per referral
  CONSTRAINT fk_referral FOREIGN KEY (referral_id) REFERENCES sponsor_referrals(id) ON DELETE CASCADE
);

-- Create unique constraint to prevent duplicate reviews
CREATE UNIQUE INDEX IF NOT EXISTS idx_fraud_review_queue_referral
  ON fraud_review_queue(referral_id);

-- Index for filtering by status
CREATE INDEX IF NOT EXISTS idx_fraud_review_queue_status
  ON fraud_review_queue(status);

-- Index for filtering by risk score
CREATE INDEX IF NOT EXISTS idx_fraud_review_queue_risk
  ON fraud_review_queue(ai_risk_score DESC) WHERE status = 'pending';

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_fraud_review_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_fraud_review_queue_updated_at ON fraud_review_queue;
CREATE TRIGGER trigger_fraud_review_queue_updated_at
  BEFORE UPDATE ON fraud_review_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_fraud_review_queue_updated_at();

-- ----------------------------------------------------------------------------
-- Admin Decisions Audit Log
-- Records all admin decisions with AI recommendations for auditing
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  decision_type TEXT NOT NULL CHECK (decision_type IN (
    'dispute_resolution',
    'fraud_review',
    'provider_tier_change',
    'user_suspension',
    'refund_approval',
    'other'
  )),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  ai_recommendation JSONB,
  admin_decision TEXT NOT NULL,
  admin_id UUID NOT NULL REFERENCES profiles(id),
  decision_notes TEXT,
  human_review_required BOOLEAN DEFAULT true NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Index for finding decisions by entity
CREATE INDEX IF NOT EXISTS idx_admin_decisions_entity
  ON admin_decisions(entity_type, entity_id);

-- Index for finding decisions by admin
CREATE INDEX IF NOT EXISTS idx_admin_decisions_admin
  ON admin_decisions(admin_id);

-- Index for finding decisions by type
CREATE INDEX IF NOT EXISTS idx_admin_decisions_type
  ON admin_decisions(decision_type);

-- Index for recent decisions
CREATE INDEX IF NOT EXISTS idx_admin_decisions_created
  ON admin_decisions(created_at DESC);

-- ----------------------------------------------------------------------------
-- Cron Job Runs Tracking
-- Tracks execution history of scheduled jobs
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS cron_job_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name TEXT NOT NULL,
  status TEXT DEFAULT 'running' CHECK (status IN ('running', 'success', 'failed', 'cancelled')),
  started_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Index for finding runs by job name
CREATE INDEX IF NOT EXISTS idx_cron_job_runs_job
  ON cron_job_runs(job_name, started_at DESC);

-- Index for finding latest successful run
CREATE INDEX IF NOT EXISTS idx_cron_job_runs_success
  ON cron_job_runs(job_name, completed_at DESC)
  WHERE status = 'success';

-- ----------------------------------------------------------------------------
-- Row Level Security Policies
-- ----------------------------------------------------------------------------

-- Enable RLS on all tables
ALTER TABLE fraud_review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE cron_job_runs ENABLE ROW LEVEL SECURITY;

-- Fraud Review Queue policies (admin only)
CREATE POLICY "Admins can view fraud reviews"
  ON fraud_review_queue FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert fraud reviews"
  ON fraud_review_queue FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update fraud reviews"
  ON fraud_review_queue FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Allow service role full access for cron jobs
CREATE POLICY "Service role can manage fraud reviews"
  ON fraud_review_queue FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin Decisions policies (admin only for their own decisions)
CREATE POLICY "Admins can view all decisions"
  ON admin_decisions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can insert their own decisions"
  ON admin_decisions FOR INSERT
  TO authenticated
  WITH CHECK (
    admin_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Service role can insert decisions (for system actions)
CREATE POLICY "Service role can manage decisions"
  ON admin_decisions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cron Job Runs policies (read-only for admins, full for service role)
CREATE POLICY "Admins can view cron runs"
  ON cron_job_runs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Service role can manage cron runs"
  ON cron_job_runs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- Platform Config for dispute settings (if not exists)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS platform_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dispute_window_hours INTEGER DEFAULT 72,
  auto_approval_threshold INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Insert default config if table is empty
INSERT INTO platform_config (dispute_window_hours, auto_approval_threshold)
SELECT 72, 50
WHERE NOT EXISTS (SELECT 1 FROM platform_config);

-- Enable RLS
ALTER TABLE platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view platform config"
  ON platform_config FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update platform config"
  ON platform_config FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- ----------------------------------------------------------------------------
-- Comments for documentation
-- ----------------------------------------------------------------------------

COMMENT ON TABLE fraud_review_queue IS 'Queue of referrals pending fraud review with AI-generated signals';
COMMENT ON COLUMN fraud_review_queue.ai_risk_score IS 'AI-generated risk score 0-100, higher = more suspicious';
COMMENT ON COLUMN fraud_review_queue.ai_signals IS 'Array of fraud signals detected by AI';
COMMENT ON COLUMN fraud_review_queue.ai_recommendation IS 'AI recommendation: approve, reject, or review';
COMMENT ON COLUMN fraud_review_queue.status IS 'Review status set by admin';

COMMENT ON TABLE admin_decisions IS 'Audit log of all admin decisions with AI recommendations';
COMMENT ON COLUMN admin_decisions.human_review_required IS 'Whether this decision required human review (always true for safety)';

COMMENT ON TABLE cron_job_runs IS 'Tracking table for scheduled job execution history';

COMMENT ON TABLE platform_config IS 'Platform-wide configuration settings';
COMMENT ON COLUMN platform_config.dispute_window_hours IS 'Hours after completion when disputes can be filed';
COMMENT ON COLUMN platform_config.auto_approval_threshold IS 'Dollar threshold below which some actions may be auto-approved';
