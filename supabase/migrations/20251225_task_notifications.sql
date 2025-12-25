-- ============================================================================
-- TASK NOTIFICATIONS
-- Migration: 20251225_task_notifications.sql
-- Description: Adds notification tracking and preferences for maintenance tasks
-- ============================================================================

-- ============================================================================
-- 1. ADD NOTIFICATION TRACKING TO TASKS
-- ============================================================================

-- Track when notifications were last sent for each task
ALTER TABLE property_maintenance_tasks
ADD COLUMN IF NOT EXISTS last_notification_sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS notification_count INT NOT NULL DEFAULT 0;

-- Index for finding tasks needing notifications
CREATE INDEX IF NOT EXISTS idx_property_tasks_notification
ON property_maintenance_tasks(next_due_date, last_notification_sent_at)
WHERE status = 'active';

-- ============================================================================
-- 2. NOTIFICATION PREFERENCES
-- ============================================================================

-- Add notification preferences to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'notification_preferences'
  ) THEN
    ALTER TABLE profiles ADD COLUMN notification_preferences JSONB DEFAULT '{}';
  END IF;
END $$;

-- Default notification preferences schema:
-- {
--   "maintenance_reminders": true,
--   "maintenance_frequency": "daily",  -- "daily", "weekly", "never"
--   "overdue_alerts": true,
--   "email_enabled": true,
--   "push_enabled": false
-- }

-- ============================================================================
-- 3. NOTIFICATION LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Recipient
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,

  -- Notification details
  type TEXT NOT NULL, -- 'task_digest', 'task_overdue', 'task_reminder', etc.
  channel TEXT NOT NULL, -- 'email', 'push', 'in_app'

  -- Content
  subject TEXT,
  body_preview TEXT,

  -- Status
  status TEXT NOT NULL DEFAULT 'sent', -- 'sent', 'failed', 'bounced'
  error_message TEXT,

  -- Metadata
  metadata JSONB DEFAULT '{}', -- task IDs, property IDs, etc.

  -- Timestamps
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- For deduplication
  dedup_key TEXT
);

-- Indexes
CREATE INDEX idx_notification_log_profile ON notification_log(profile_id, sent_at DESC);
CREATE INDEX idx_notification_log_type ON notification_log(type, sent_at DESC);
CREATE UNIQUE INDEX idx_notification_log_dedup ON notification_log(dedup_key) WHERE dedup_key IS NOT NULL;

-- ============================================================================
-- 4. IN-APP NOTIFICATIONS (using existing notifications table)
-- ============================================================================

-- Ensure notifications table exists with correct schema
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'task_due', 'task_overdue', 'booking_confirmed', etc.
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}', -- { taskId, propertyId, link, etc. }
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_profile_unread
ON notifications(profile_id, is_read, created_at DESC);

-- ============================================================================
-- 5. RLS POLICIES
-- ============================================================================

-- Enable RLS on notification_log
ALTER TABLE notification_log ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notification logs
DROP POLICY IF EXISTS notification_log_select ON notification_log;
CREATE POLICY notification_log_select ON notification_log
  FOR SELECT USING (auth.uid() = profile_id);

-- Only service role can insert (from cron jobs)
DROP POLICY IF EXISTS notification_log_insert ON notification_log;
CREATE POLICY notification_log_insert ON notification_log
  FOR INSERT WITH CHECK (true); -- Service role bypasses RLS

-- Enable RLS on notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can view and update their own notifications
DROP POLICY IF EXISTS notifications_select ON notifications;
CREATE POLICY notifications_select ON notifications
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS notifications_update ON notifications;
CREATE POLICY notifications_update ON notifications
  FOR UPDATE USING (auth.uid() = profile_id);

-- Service role can insert
DROP POLICY IF EXISTS notifications_insert ON notifications;
CREATE POLICY notifications_insert ON notifications
  FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 6. HELPER FUNCTION: Get users needing task notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION get_users_needing_task_notifications(
  p_days_ahead INT DEFAULT 3
)
RETURNS TABLE (
  profile_id UUID,
  email TEXT,
  full_name TEXT,
  notification_preferences JSONB,
  overdue_count BIGINT,
  due_soon_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id AS profile_id,
    p.email,
    p.full_name,
    COALESCE(p.notification_preferences, '{}') AS notification_preferences,
    COUNT(CASE WHEN t.next_due_date < CURRENT_DATE THEN 1 END) AS overdue_count,
    COUNT(CASE WHEN t.next_due_date >= CURRENT_DATE
               AND t.next_due_date <= CURRENT_DATE + p_days_ahead THEN 1 END) AS due_soon_count
  FROM profiles p
  INNER JOIN property_members pm ON pm.user_id = p.id
  INNER JOIN property_maintenance_tasks t ON t.property_id = pm.property_id
  WHERE
    p.is_active = true
    AND p.role = 'customer'
    AND t.status = 'active'
    AND t.next_due_date <= CURRENT_DATE + p_days_ahead
    AND pm.member_role IN ('owner', 'manager')
    -- Only include if not notified in last 23 hours (allow for cron timing variance)
    AND (t.last_notification_sent_at IS NULL
         OR t.last_notification_sent_at < NOW() - INTERVAL '23 hours')
    -- Check notification preferences
    AND COALESCE((p.notification_preferences->>'maintenance_reminders')::boolean, true) = true
    AND COALESCE(p.notification_preferences->>'maintenance_frequency', 'daily') != 'never'
  GROUP BY p.id, p.email, p.full_name, p.notification_preferences
  HAVING COUNT(t.id) > 0;
END;
$$;

-- ============================================================================
-- 7. HELPER FUNCTION: Get tasks for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tasks_for_notification(
  p_profile_id UUID,
  p_days_ahead INT DEFAULT 3
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  category TEXT,
  priority TEXT,
  next_due_date DATE,
  property_id UUID,
  property_nickname TEXT,
  property_address TEXT,
  is_overdue BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.id,
    t.title,
    t.category,
    t.priority,
    t.next_due_date,
    t.property_id,
    prop.nickname AS property_nickname,
    prop.address_line1 AS property_address,
    t.next_due_date < CURRENT_DATE AS is_overdue
  FROM property_maintenance_tasks t
  INNER JOIN properties prop ON prop.id = t.property_id
  INNER JOIN property_members pm ON pm.property_id = t.property_id
  WHERE
    pm.user_id = p_profile_id
    AND pm.member_role IN ('owner', 'manager')
    AND t.status = 'active'
    AND t.next_due_date <= CURRENT_DATE + p_days_ahead
  ORDER BY t.next_due_date ASC, t.priority DESC;
END;
$$;

-- ============================================================================
-- 8. MARK TASKS AS NOTIFIED
-- ============================================================================

CREATE OR REPLACE FUNCTION mark_tasks_notified(
  p_task_ids UUID[]
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  updated_count INT;
BEGIN
  UPDATE property_maintenance_tasks
  SET
    last_notification_sent_at = NOW(),
    notification_count = notification_count + 1
  WHERE id = ANY(p_task_ids);

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$;
