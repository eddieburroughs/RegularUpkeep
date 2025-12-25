-- ============================================================================
-- PUSH SUBSCRIPTIONS
-- Migration: 20251225_push_subscriptions.sql
-- Description: Adds push notification subscription storage
-- ============================================================================

-- ============================================================================
-- 1. PUSH SUBSCRIPTIONS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User reference
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Push subscription data
  endpoint TEXT NOT NULL,
  p256dh_key TEXT NOT NULL,
  auth_key TEXT NOT NULL,

  -- Device info
  user_agent TEXT,
  device_name TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  error_count INT NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate subscriptions
  UNIQUE(profile_id, endpoint)
);

-- Indexes
CREATE INDEX idx_push_subscriptions_profile ON push_subscriptions(profile_id) WHERE is_active = true;
CREATE INDEX idx_push_subscriptions_endpoint ON push_subscriptions(endpoint);

-- ============================================================================
-- 2. RLS POLICIES
-- ============================================================================

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
DROP POLICY IF EXISTS push_subscriptions_select ON push_subscriptions;
CREATE POLICY push_subscriptions_select ON push_subscriptions
  FOR SELECT USING (auth.uid() = profile_id);

-- Users can insert their own subscriptions
DROP POLICY IF EXISTS push_subscriptions_insert ON push_subscriptions;
CREATE POLICY push_subscriptions_insert ON push_subscriptions
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- Users can update their own subscriptions
DROP POLICY IF EXISTS push_subscriptions_update ON push_subscriptions;
CREATE POLICY push_subscriptions_update ON push_subscriptions
  FOR UPDATE USING (auth.uid() = profile_id);

-- Users can delete their own subscriptions
DROP POLICY IF EXISTS push_subscriptions_delete ON push_subscriptions;
CREATE POLICY push_subscriptions_delete ON push_subscriptions
  FOR DELETE USING (auth.uid() = profile_id);

-- ============================================================================
-- 3. ADD PUSH PREFERENCES TO PROFILES
-- ============================================================================

-- Add push_enabled preference to notification_preferences
-- Default structure:
-- {
--   "maintenance_reminders": true,
--   "maintenance_frequency": "daily",
--   "overdue_alerts": true,
--   "email_enabled": true,
--   "push_enabled": true
-- }

-- ============================================================================
-- 4. HELPER FUNCTION: Get user push subscriptions
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_push_subscriptions(p_profile_id UUID)
RETURNS TABLE (
  id UUID,
  endpoint TEXT,
  p256dh_key TEXT,
  auth_key TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    ps.id,
    ps.endpoint,
    ps.p256dh_key,
    ps.auth_key
  FROM push_subscriptions ps
  WHERE
    ps.profile_id = p_profile_id
    AND ps.is_active = true
    AND ps.error_count < 3;
END;
$$;

-- ============================================================================
-- 5. HELPER FUNCTION: Mark subscription as errored
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_push_subscription_error(p_endpoint TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE push_subscriptions
  SET
    error_count = error_count + 1,
    is_active = CASE WHEN error_count >= 2 THEN false ELSE is_active END,
    updated_at = NOW()
  WHERE endpoint = p_endpoint;
END;
$$;

-- ============================================================================
-- 6. HELPER FUNCTION: Deactivate expired subscription
-- ============================================================================

CREATE OR REPLACE FUNCTION deactivate_push_subscription(p_endpoint TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE push_subscriptions
  SET
    is_active = false,
    updated_at = NOW()
  WHERE endpoint = p_endpoint;
END;
$$;
