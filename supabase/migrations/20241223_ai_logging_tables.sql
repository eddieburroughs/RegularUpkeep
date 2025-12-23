-- ============================================================================
-- AI LOGGING & OUTPUT TABLES
-- Migration: 20241223_ai_logging_tables.sql
--
-- This migration implements:
-- 1. ai_jobs - Track all AI task executions
-- 2. ai_outputs - Store AI outputs linked to entities
-- 3. ai_feedback - User feedback on AI quality
-- 4. ai_policy_events - Safety/policy event logging
-- 5. RLS policies for secure access
-- 6. Indexes for performance
-- 7. Caching support via input_hash
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- AI job status
DO $$ BEGIN
  CREATE TYPE ai_job_status AS ENUM ('queued', 'processing', 'success', 'failed', 'cached');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AI policy event severity
DO $$ BEGIN
  CREATE TYPE ai_policy_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AI feedback rating
DO $$ BEGIN
  CREATE TYPE ai_feedback_rating AS ENUM ('up', 'down');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- 2. AI_JOBS TABLE
-- Tracks all AI task executions
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Task identification
  task_type TEXT NOT NULL,
  actor_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID,

  -- Status
  status ai_job_status NOT NULL DEFAULT 'queued',

  -- Provider/model info
  provider TEXT, -- 'openai', 'anthropic', 'none'
  model TEXT,

  -- Performance metrics
  latency_ms INTEGER,
  cost_estimate_cents INTEGER DEFAULT 0,
  input_tokens INTEGER,
  output_tokens INTEGER,

  -- Caching
  input_hash TEXT, -- SHA256 of normalized inputs for cache lookup
  used_cache BOOLEAN DEFAULT FALSE,
  cache_source_job_id UUID REFERENCES ai_jobs(id),

  -- Correlation for tracing
  correlation_id TEXT,

  -- Error tracking
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  -- Metadata
  metadata JSONB DEFAULT '{}'
);

-- ============================================================================
-- 3. AI_OUTPUTS TABLE
-- Stores AI outputs linked to entities
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_outputs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Link to job
  ai_job_id UUID NOT NULL REFERENCES ai_jobs(id) ON DELETE CASCADE,

  -- Entity reference (denormalized for efficient queries)
  entity_type TEXT NOT NULL,
  entity_id UUID,

  -- Output data
  output_json JSONB NOT NULL,

  -- Versioning
  version TEXT NOT NULL DEFAULT '1.0',

  -- Validity
  is_current BOOLEAN DEFAULT TRUE, -- FALSE when superseded
  superseded_by UUID REFERENCES ai_outputs(id),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- Set based on retention policy
);

-- ============================================================================
-- 4. AI_FEEDBACK TABLE
-- User feedback on AI quality
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_feedback (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- References
  ai_job_id UUID NOT NULL REFERENCES ai_jobs(id) ON DELETE CASCADE,
  ai_output_id UUID REFERENCES ai_outputs(id) ON DELETE SET NULL,
  actor_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Feedback
  rating ai_feedback_rating NOT NULL,
  reason_code TEXT, -- 'inaccurate', 'unhelpful', 'inappropriate', 'other'
  comment TEXT,

  -- Context (what the user saw)
  context_snapshot JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 5. AI_POLICY_EVENTS TABLE
-- Safety and policy event logging
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_policy_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Reference
  ai_job_id UUID NOT NULL REFERENCES ai_jobs(id) ON DELETE CASCADE,

  -- Event details
  event_type TEXT NOT NULL, -- 'SAFETY_FLAG_ELECTRICAL', 'PII_DETECTED', etc.
  severity ai_policy_severity NOT NULL,
  message TEXT,

  -- Additional context
  metadata JSONB DEFAULT '{}',

  -- Action taken
  action_taken TEXT, -- 'blocked', 'sanitized', 'flagged', 'logged'

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 6. INDEXES
-- ============================================================================

-- ai_jobs indexes
CREATE INDEX IF NOT EXISTS idx_ai_jobs_task_type ON ai_jobs(task_type);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_entity ON ai_jobs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_actor ON ai_jobs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_status ON ai_jobs(status);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_created_at ON ai_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_jobs_input_hash ON ai_jobs(input_hash) WHERE input_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_ai_jobs_correlation ON ai_jobs(correlation_id) WHERE correlation_id IS NOT NULL;

-- ai_outputs indexes
CREATE INDEX IF NOT EXISTS idx_ai_outputs_job ON ai_outputs(ai_job_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_entity ON ai_outputs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_current ON ai_outputs(entity_type, entity_id, is_current) WHERE is_current = TRUE;
CREATE INDEX IF NOT EXISTS idx_ai_outputs_created_at ON ai_outputs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_outputs_expires_at ON ai_outputs(expires_at) WHERE expires_at IS NOT NULL;

-- ai_feedback indexes
CREATE INDEX IF NOT EXISTS idx_ai_feedback_job ON ai_feedback(ai_job_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_actor ON ai_feedback(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_rating ON ai_feedback(rating);
CREATE INDEX IF NOT EXISTS idx_ai_feedback_created_at ON ai_feedback(created_at DESC);

-- ai_policy_events indexes
CREATE INDEX IF NOT EXISTS idx_ai_policy_events_job ON ai_policy_events(ai_job_id);
CREATE INDEX IF NOT EXISTS idx_ai_policy_events_type ON ai_policy_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ai_policy_events_severity ON ai_policy_events(severity);
CREATE INDEX IF NOT EXISTS idx_ai_policy_events_created_at ON ai_policy_events(created_at DESC);

-- ============================================================================
-- 7. RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE ai_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_policy_events ENABLE ROW LEVEL SECURITY;

-- Helper function: Check if user owns entity
CREATE OR REPLACE FUNCTION user_owns_ai_entity(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_result BOOLEAN := FALSE;
BEGIN
  -- Check based on entity type
  CASE p_entity_type
    WHEN 'service_request' THEN
      SELECT EXISTS(
        SELECT 1 FROM service_requests sr
        JOIN properties p ON sr.property_id = p.id
        JOIN property_members pm ON p.id = pm.property_id
        WHERE sr.id = p_entity_id AND pm.user_id = p_user_id
      ) INTO v_result;

    WHEN 'booking' THEN
      SELECT EXISTS(
        SELECT 1 FROM bookings b
        JOIN service_requests sr ON b.service_request_id = sr.id
        JOIN properties p ON sr.property_id = p.id
        JOIN property_members pm ON p.id = pm.property_id
        WHERE b.id = p_entity_id AND pm.user_id = p_user_id
      ) INTO v_result;

    WHEN 'property' THEN
      SELECT EXISTS(
        SELECT 1 FROM property_members pm
        WHERE pm.property_id = p_entity_id AND pm.user_id = p_user_id
      ) INTO v_result;

    WHEN 'estimate' THEN
      SELECT EXISTS(
        SELECT 1 FROM estimates e
        JOIN service_requests sr ON e.service_request_id = sr.id
        JOIN properties p ON sr.property_id = p.id
        JOIN property_members pm ON p.id = pm.property_id
        WHERE e.id = p_entity_id AND pm.user_id = p_user_id
      ) INTO v_result;

    WHEN 'invoice' THEN
      SELECT EXISTS(
        SELECT 1 FROM invoices i
        JOIN bookings b ON i.booking_id = b.id
        JOIN service_requests sr ON b.service_request_id = sr.id
        JOIN properties p ON sr.property_id = p.id
        JOIN property_members pm ON p.id = pm.property_id
        WHERE i.id = p_entity_id AND pm.user_id = p_user_id
      ) INTO v_result;

    WHEN 'customer' THEN
      SELECT EXISTS(
        SELECT 1 FROM customers c
        WHERE c.id = p_entity_id AND c.user_id = p_user_id
      ) INTO v_result;

    ELSE
      v_result := FALSE;
  END CASE;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Check if provider has access to entity
CREATE OR REPLACE FUNCTION provider_has_ai_entity_access(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_result BOOLEAN := FALSE;
  v_provider_id UUID;
BEGIN
  -- Get provider ID for user
  SELECT id INTO v_provider_id FROM providers WHERE user_id = p_user_id;
  IF v_provider_id IS NULL THEN
    -- Check if user is a provider team member
    SELECT pm.provider_id INTO v_provider_id
    FROM provider_members pm
    WHERE pm.user_id = p_user_id AND pm.status = 'active';
  END IF;

  IF v_provider_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Check based on entity type
  CASE p_entity_type
    WHEN 'service_request' THEN
      SELECT EXISTS(
        SELECT 1 FROM service_requests sr
        WHERE sr.id = p_entity_id AND sr.assigned_provider_id = v_provider_id
      ) INTO v_result;

    WHEN 'booking' THEN
      SELECT EXISTS(
        SELECT 1 FROM bookings b
        WHERE b.id = p_entity_id AND b.provider_id = v_provider_id
      ) INTO v_result;

    WHEN 'estimate' THEN
      SELECT EXISTS(
        SELECT 1 FROM estimates e
        WHERE e.id = p_entity_id AND e.provider_id = v_provider_id
      ) INTO v_result;

    WHEN 'invoice' THEN
      SELECT EXISTS(
        SELECT 1 FROM invoices i
        JOIN bookings b ON i.booking_id = b.id
        WHERE i.id = p_entity_id AND b.provider_id = v_provider_id
      ) INTO v_result;

    WHEN 'provider' THEN
      v_result := (p_entity_id = v_provider_id);

    ELSE
      v_result := FALSE;
  END CASE;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Check if user is advertiser for entity
CREATE OR REPLACE FUNCTION advertiser_owns_ai_entity(
  p_entity_type TEXT,
  p_entity_id UUID,
  p_user_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_result BOOLEAN := FALSE;
BEGIN
  IF p_entity_type = 'sponsor' THEN
    SELECT EXISTS(
      SELECT 1 FROM sponsors s
      WHERE s.id = p_entity_id AND s.user_id = p_user_id
    ) INTO v_result;
  END IF;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Helper function: Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID) RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS(
    SELECT 1 FROM profiles WHERE id = p_user_id AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- AI_JOBS RLS Policies
-- ============================================================================

-- Admins can see all jobs
CREATE POLICY ai_jobs_admin_all ON ai_jobs
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Users can see their own jobs
CREATE POLICY ai_jobs_own ON ai_jobs
  FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid());

-- Homeowners can see jobs for their entities
CREATE POLICY ai_jobs_homeowner ON ai_jobs
  FOR SELECT TO authenticated
  USING (user_owns_ai_entity(entity_type, entity_id, auth.uid()));

-- Providers can see jobs for their assigned entities
CREATE POLICY ai_jobs_provider ON ai_jobs
  FOR SELECT TO authenticated
  USING (provider_has_ai_entity_access(entity_type, entity_id, auth.uid()));

-- Advertisers can see jobs for their campaigns
CREATE POLICY ai_jobs_advertiser ON ai_jobs
  FOR SELECT TO authenticated
  USING (advertiser_owns_ai_entity(entity_type, entity_id, auth.uid()));

-- ============================================================================
-- AI_OUTPUTS RLS Policies
-- ============================================================================

-- Admins can see all outputs
CREATE POLICY ai_outputs_admin_all ON ai_outputs
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Homeowners can see outputs for their entities
CREATE POLICY ai_outputs_homeowner ON ai_outputs
  FOR SELECT TO authenticated
  USING (user_owns_ai_entity(entity_type, entity_id, auth.uid()));

-- Providers can see outputs for their assigned entities
CREATE POLICY ai_outputs_provider ON ai_outputs
  FOR SELECT TO authenticated
  USING (provider_has_ai_entity_access(entity_type, entity_id, auth.uid()));

-- Advertisers can see outputs for their campaigns
CREATE POLICY ai_outputs_advertiser ON ai_outputs
  FOR SELECT TO authenticated
  USING (advertiser_owns_ai_entity(entity_type, entity_id, auth.uid()));

-- ============================================================================
-- AI_FEEDBACK RLS Policies
-- ============================================================================

-- Admins can see all feedback
CREATE POLICY ai_feedback_admin_all ON ai_feedback
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- Users can see their own feedback
CREATE POLICY ai_feedback_own_read ON ai_feedback
  FOR SELECT TO authenticated
  USING (actor_user_id = auth.uid());

-- Users can create feedback
CREATE POLICY ai_feedback_insert ON ai_feedback
  FOR INSERT TO authenticated
  WITH CHECK (actor_user_id = auth.uid());

-- ============================================================================
-- AI_POLICY_EVENTS RLS Policies
-- ============================================================================

-- Only admins can see policy events (sensitive security data)
CREATE POLICY ai_policy_events_admin_only ON ai_policy_events
  FOR ALL TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================================================
-- 8. RETENTION CONFIG
-- ============================================================================

-- Add AI config to admin_config
INSERT INTO admin_config (config_key, config_value, description)
VALUES (
  'ai_config',
  '{
    "retention_days": 180,
    "cache_ttl_hours": 24,
    "max_retries": 3,
    "rate_limit_per_minute": 60,
    "cost_alert_threshold_cents": 100,
    "feedback_required_for_improvement": true
  }',
  'AI system configuration including retention and caching'
) ON CONFLICT (config_key) DO UPDATE
SET config_value = EXCLUDED.config_value,
    updated_at = NOW();

-- ============================================================================
-- 9. HELPER FUNCTIONS
-- ============================================================================

-- Function to create an AI job
CREATE OR REPLACE FUNCTION create_ai_job(
  p_task_type TEXT,
  p_actor_user_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_input_hash TEXT DEFAULT NULL,
  p_correlation_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_job_id UUID;
  v_cached_job_id UUID;
  v_cache_ttl_hours INTEGER;
BEGIN
  -- Check for cached result if input_hash provided
  IF p_input_hash IS NOT NULL THEN
    -- Get cache TTL from config
    SELECT (config_value->>'cache_ttl_hours')::INTEGER
    INTO v_cache_ttl_hours
    FROM admin_config
    WHERE config_key = 'ai_config';

    v_cache_ttl_hours := COALESCE(v_cache_ttl_hours, 24);

    -- Look for recent cached job
    SELECT id INTO v_cached_job_id
    FROM ai_jobs
    WHERE task_type = p_task_type
      AND entity_type = p_entity_type
      AND entity_id = p_entity_id
      AND input_hash = p_input_hash
      AND status = 'success'
      AND created_at > NOW() - (v_cache_ttl_hours || ' hours')::INTERVAL
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_cached_job_id IS NOT NULL THEN
      -- Create a cached job entry pointing to original
      INSERT INTO ai_jobs (
        task_type, actor_user_id, entity_type, entity_id,
        status, input_hash, used_cache, cache_source_job_id,
        correlation_id, metadata, completed_at
      ) VALUES (
        p_task_type, p_actor_user_id, p_entity_type, p_entity_id,
        'cached', p_input_hash, TRUE, v_cached_job_id,
        p_correlation_id, p_metadata, NOW()
      ) RETURNING id INTO v_job_id;

      RETURN v_job_id;
    END IF;
  END IF;

  -- Create new job
  INSERT INTO ai_jobs (
    task_type, actor_user_id, entity_type, entity_id,
    status, input_hash, correlation_id, metadata
  ) VALUES (
    p_task_type, p_actor_user_id, p_entity_type, p_entity_id,
    'queued', p_input_hash, p_correlation_id, p_metadata
  ) RETURNING id INTO v_job_id;

  RETURN v_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete an AI job
CREATE OR REPLACE FUNCTION complete_ai_job(
  p_job_id UUID,
  p_status ai_job_status,
  p_provider TEXT DEFAULT NULL,
  p_model TEXT DEFAULT NULL,
  p_latency_ms INTEGER DEFAULT NULL,
  p_cost_estimate_cents INTEGER DEFAULT 0,
  p_input_tokens INTEGER DEFAULT NULL,
  p_output_tokens INTEGER DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  UPDATE ai_jobs SET
    status = p_status,
    provider = COALESCE(p_provider, provider),
    model = COALESCE(p_model, model),
    latency_ms = p_latency_ms,
    cost_estimate_cents = p_cost_estimate_cents,
    input_tokens = p_input_tokens,
    output_tokens = p_output_tokens,
    error_message = p_error_message,
    completed_at = NOW()
  WHERE id = p_job_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to save AI output
CREATE OR REPLACE FUNCTION save_ai_output(
  p_job_id UUID,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_output_json JSONB,
  p_version TEXT DEFAULT '1.0'
) RETURNS UUID AS $$
DECLARE
  v_output_id UUID;
  v_retention_days INTEGER;
BEGIN
  -- Get retention from config
  SELECT (config_value->>'retention_days')::INTEGER
  INTO v_retention_days
  FROM admin_config
  WHERE config_key = 'ai_config';

  v_retention_days := COALESCE(v_retention_days, 180);

  -- Mark previous outputs as not current
  UPDATE ai_outputs
  SET is_current = FALSE
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND is_current = TRUE;

  -- Insert new output
  INSERT INTO ai_outputs (
    ai_job_id, entity_type, entity_id,
    output_json, version, is_current,
    expires_at
  ) VALUES (
    p_job_id, p_entity_type, p_entity_id,
    p_output_json, p_version, TRUE,
    NOW() + (v_retention_days || ' days')::INTERVAL
  ) RETURNING id INTO v_output_id;

  -- Update superseded_by on previous outputs
  UPDATE ai_outputs
  SET superseded_by = v_output_id
  WHERE entity_type = p_entity_type
    AND entity_id = p_entity_id
    AND id != v_output_id
    AND superseded_by IS NULL;

  RETURN v_output_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log policy events
CREATE OR REPLACE FUNCTION log_ai_policy_event(
  p_job_id UUID,
  p_event_type TEXT,
  p_severity ai_policy_severity,
  p_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}',
  p_action_taken TEXT DEFAULT 'logged'
) RETURNS UUID AS $$
DECLARE
  v_event_id UUID;
BEGIN
  INSERT INTO ai_policy_events (
    ai_job_id, event_type, severity,
    message, metadata, action_taken
  ) VALUES (
    p_job_id, p_event_type, p_severity,
    p_message, p_metadata, p_action_taken
  ) RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get cached output
CREATE OR REPLACE FUNCTION get_cached_ai_output(
  p_task_type TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_input_hash TEXT
) RETURNS TABLE (
  job_id UUID,
  output_json JSONB,
  created_at TIMESTAMPTZ
) AS $$
DECLARE
  v_cache_ttl_hours INTEGER;
BEGIN
  -- Get cache TTL from config
  SELECT (config_value->>'cache_ttl_hours')::INTEGER
  INTO v_cache_ttl_hours
  FROM admin_config
  WHERE config_key = 'ai_config';

  v_cache_ttl_hours := COALESCE(v_cache_ttl_hours, 24);

  RETURN QUERY
  SELECT
    j.id as job_id,
    o.output_json,
    j.created_at
  FROM ai_jobs j
  JOIN ai_outputs o ON o.ai_job_id = j.id
  WHERE j.task_type = p_task_type
    AND j.entity_type = p_entity_type
    AND j.entity_id = p_entity_id
    AND j.input_hash = p_input_hash
    AND j.status = 'success'
    AND j.created_at > NOW() - (v_cache_ttl_hours || ' hours')::INTERVAL
    AND o.is_current = TRUE
  ORDER BY j.created_at DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================================================
-- 10. CLEANUP/ARCHIVAL PLACEHOLDER
-- ============================================================================

-- Function for scheduled cleanup (to be called by cron job)
CREATE OR REPLACE FUNCTION cleanup_expired_ai_data() RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER := 0;
  v_retention_days INTEGER;
BEGIN
  -- Get retention from config
  SELECT (config_value->>'retention_days')::INTEGER
  INTO v_retention_days
  FROM admin_config
  WHERE config_key = 'ai_config';

  v_retention_days := COALESCE(v_retention_days, 180);

  -- Delete expired outputs
  DELETE FROM ai_outputs
  WHERE expires_at < NOW();

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;

  -- Delete orphaned jobs (no outputs, older than retention)
  DELETE FROM ai_jobs
  WHERE created_at < NOW() - (v_retention_days || ' days')::INTERVAL
    AND NOT EXISTS (
      SELECT 1 FROM ai_outputs WHERE ai_job_id = ai_jobs.id
    );

  -- Log cleanup
  INSERT INTO ai_jobs (
    task_type, actor_user_id, entity_type, entity_id,
    status, metadata, completed_at
  ) VALUES (
    'SYSTEM_CLEANUP',
    (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
    'none', NULL,
    'success',
    jsonb_build_object('deleted_outputs', v_deleted_count, 'retention_days', v_retention_days),
    NOW()
  );

  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment for cron setup
COMMENT ON FUNCTION cleanup_expired_ai_data() IS
'Run this function daily via pg_cron or external scheduler: SELECT cleanup_expired_ai_data();';

-- ============================================================================
-- 11. GRANTS
-- ============================================================================

-- Grant execute on functions to authenticated users
GRANT EXECUTE ON FUNCTION user_owns_ai_entity TO authenticated;
GRANT EXECUTE ON FUNCTION provider_has_ai_entity_access TO authenticated;
GRANT EXECUTE ON FUNCTION advertiser_owns_ai_entity TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin TO authenticated;
GRANT EXECUTE ON FUNCTION create_ai_job TO authenticated;
GRANT EXECUTE ON FUNCTION complete_ai_job TO authenticated;
GRANT EXECUTE ON FUNCTION save_ai_output TO authenticated;
GRANT EXECUTE ON FUNCTION log_ai_policy_event TO authenticated;
GRANT EXECUTE ON FUNCTION get_cached_ai_output TO authenticated;

-- Service role gets cleanup access
GRANT EXECUTE ON FUNCTION cleanup_expired_ai_data TO service_role;
