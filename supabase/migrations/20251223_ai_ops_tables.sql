-- AI Operations Tables
-- Rate limiting, cost tracking, and retention management

-- ============================================================================
-- Daily Usage Tracking (for rate limiting)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_daily_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
  call_count INTEGER NOT NULL DEFAULT 0,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, usage_date)
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_ai_daily_usage_user_date
  ON ai_daily_usage(user_id, usage_date);

-- Function to increment daily usage
CREATE OR REPLACE FUNCTION increment_ai_daily_usage(
  p_user_id UUID,
  p_usage_date DATE
) RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  INSERT INTO ai_daily_usage (user_id, usage_date, call_count)
  VALUES (p_user_id, p_usage_date, 1)
  ON CONFLICT (user_id, usage_date)
  DO UPDATE SET
    call_count = ai_daily_usage.call_count + 1,
    updated_at = NOW()
  RETURNING call_count INTO v_count;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Daily Metrics (for aggregate retention)
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_daily_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_date DATE NOT NULL,
  task_type TEXT NOT NULL,
  total_calls INTEGER NOT NULL DEFAULT 0,
  total_cost_cents INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  avg_latency_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(metric_date, task_type)
);

-- Index for trend queries
CREATE INDEX IF NOT EXISTS idx_ai_daily_metrics_date
  ON ai_daily_metrics(metric_date DESC);

-- ============================================================================
-- User Preferences (for AI consent)
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  ai_features_enabled BOOLEAN NOT NULL DEFAULT true,
  ai_consent_date TIMESTAMPTZ,
  notification_preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_user_preferences_user
  ON user_preferences(user_id);

-- ============================================================================
-- Cleanup Job Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_cleanup_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  jobs_deleted INTEGER NOT NULL DEFAULT 0,
  outputs_deleted INTEGER NOT NULL DEFAULT 0,
  feedback_deleted INTEGER NOT NULL DEFAULT 0,
  aggregates_created INTEGER NOT NULL DEFAULT 0,
  execution_time_ms INTEGER,
  error_message TEXT
);

-- Index for recent logs
CREATE INDEX IF NOT EXISTS idx_ai_cleanup_log_date
  ON ai_cleanup_log(executed_at DESC);

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Enable RLS
ALTER TABLE ai_daily_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_cleanup_log ENABLE ROW LEVEL SECURITY;

-- Users can see their own usage
CREATE POLICY "Users can view own usage"
  ON ai_daily_usage FOR SELECT
  USING (auth.uid() = user_id);

-- Users can manage their own preferences
CREATE POLICY "Users can manage own preferences"
  ON user_preferences FOR ALL
  USING (auth.uid() = user_id);

-- Admins can view all metrics
CREATE POLICY "Admins can view metrics"
  ON ai_daily_metrics FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Admins can view cleanup logs
CREATE POLICY "Admins can view cleanup logs"
  ON ai_cleanup_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- System can insert cleanup logs
CREATE POLICY "System can insert cleanup logs"
  ON ai_cleanup_log FOR INSERT
  WITH CHECK (true);

-- System can update daily usage
CREATE POLICY "System can update usage"
  ON ai_daily_usage FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update usage counts"
  ON ai_daily_usage FOR UPDATE
  USING (true);

-- System can insert metrics
CREATE POLICY "System can insert metrics"
  ON ai_daily_metrics FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update metrics"
  ON ai_daily_metrics FOR UPDATE
  USING (true);

-- ============================================================================
-- Update ai_jobs to ensure cost tracking column exists
-- ============================================================================

-- Ensure cost_estimate_cents column exists (may already be there)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'ai_jobs' AND column_name = 'cost_estimate_cents'
  ) THEN
    ALTER TABLE ai_jobs ADD COLUMN cost_estimate_cents INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Add index for cost queries
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_at_cost
  ON ai_jobs(created_at, cost_estimate_cents);

-- ============================================================================
-- View for admin dashboard
-- ============================================================================

CREATE OR REPLACE VIEW ai_ops_dashboard AS
SELECT
  CURRENT_DATE as report_date,
  (SELECT COUNT(*) FROM ai_jobs WHERE created_at >= CURRENT_DATE) as today_total_calls,
  (SELECT COALESCE(SUM(cost_estimate_cents), 0) FROM ai_jobs WHERE created_at >= CURRENT_DATE) as today_total_cost_cents,
  (SELECT COUNT(*) FROM ai_jobs WHERE created_at >= CURRENT_DATE AND status = 'failed') as today_error_count,
  (SELECT COUNT(DISTINCT actor_user_id) FROM ai_jobs WHERE created_at >= CURRENT_DATE) as today_unique_users,
  (SELECT COALESCE(AVG(latency_ms), 0) FROM ai_jobs WHERE created_at >= CURRENT_DATE) as today_avg_latency_ms;

-- Grant access to admins
GRANT SELECT ON ai_ops_dashboard TO authenticated;
