-- ============================================================================
-- SMS NOTIFICATIONS
-- Migration: 20251225_sms_notifications.sql
-- Description: Adds SMS notification support to the notification system
-- ============================================================================

-- ============================================================================
-- 1. UPDATE HELPER FUNCTION TO INCLUDE PHONE
-- ============================================================================

-- Drop existing function first (return type is changing)
DROP FUNCTION IF EXISTS get_users_needing_task_notifications(INT);

CREATE OR REPLACE FUNCTION get_users_needing_task_notifications(
  p_days_ahead INT DEFAULT 3
)
RETURNS TABLE (
  profile_id UUID,
  email TEXT,
  phone TEXT,
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
    p.phone,
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
  GROUP BY p.id, p.email, p.phone, p.full_name, p.notification_preferences
  HAVING COUNT(t.id) > 0;
END;
$$;

-- ============================================================================
-- 2. ADD PHONE COLUMN TO PROFILES IF NOT EXISTS
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'phone'
  ) THEN
    ALTER TABLE profiles ADD COLUMN phone TEXT;
  END IF;
END $$;

-- ============================================================================
-- 3. SMS LOG TABLE (using existing notification_log with channel='sms')
-- ============================================================================

-- No new table needed - notification_log already supports channel='sms'

-- ============================================================================
-- 4. ADD SMS TO DEFAULT NOTIFICATION PREFERENCES COMMENT
-- ============================================================================

-- Default notification preferences schema:
-- {
--   "maintenance_reminders": true,
--   "maintenance_frequency": "daily",  -- "daily", "weekly", "never"
--   "overdue_alerts": true,
--   "email_enabled": true,
--   "push_enabled": true,
--   "sms_enabled": false  -- opt-in only, requires phone number
-- }
