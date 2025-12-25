-- ============================================================================
-- MAINTENANCE CALENDAR MODULE
-- Migration: 20251225_maintenance_calendar.sql
-- Description: Adds maintenance planning, tracking, and request integration
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- Frequency types for maintenance tasks
CREATE TYPE maintenance_frequency_type AS ENUM (
  'weekly',
  'monthly',
  'seasonal',
  'annual',
  'multi_year',
  'one_time'
);

-- Skill level for tasks
CREATE TYPE maintenance_skill_level AS ENUM (
  'diy',
  'pro_recommended',
  'pro_required'
);

-- Default assignee for tasks
CREATE TYPE maintenance_default_assignee AS ENUM (
  'homeowner',
  'provider'
);

-- Task status for property tasks
CREATE TYPE property_task_status AS ENUM (
  'active',
  'paused',
  'archived'
);

-- ============================================================================
-- 2. MAINTENANCE TASK TEMPLATES (Admin-managed master list)
-- ============================================================================

CREATE TABLE IF NOT EXISTS maintenance_task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Core info
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- Uses existing MaintenanceCategory values

  -- Scheduling
  frequency_type maintenance_frequency_type NOT NULL DEFAULT 'annual',
  frequency_interval INT NOT NULL DEFAULT 1, -- e.g., 2 for "every 2 years"
  suggested_months INT[] DEFAULT NULL, -- e.g., {3,4} for March/April

  -- Task details
  priority TEXT NOT NULL DEFAULT 'normal', -- Uses existing MaintenancePriority values
  estimated_minutes INT DEFAULT 30,
  skill_level maintenance_skill_level NOT NULL DEFAULT 'diy',
  tags TEXT[] DEFAULT '{}',
  default_assignee maintenance_default_assignee NOT NULL DEFAULT 'homeowner',

  -- Pro tips and instructions
  instructions TEXT,
  pro_tips TEXT,
  warning_notes TEXT,

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Audit
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for active templates by category
CREATE INDEX idx_templates_active_category ON maintenance_task_templates(category)
  WHERE is_active = true;

-- ============================================================================
-- 3. PROPERTY MAINTENANCE TASKS (Per-property task instances)
-- ============================================================================

CREATE TABLE IF NOT EXISTS property_maintenance_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  template_id UUID REFERENCES maintenance_task_templates(id) ON DELETE SET NULL,

  -- Copied/customizable fields from template
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  frequency_type maintenance_frequency_type NOT NULL DEFAULT 'annual',
  frequency_interval INT NOT NULL DEFAULT 1,
  suggested_months INT[] DEFAULT NULL,
  priority TEXT NOT NULL DEFAULT 'normal',
  estimated_minutes INT DEFAULT 30,
  skill_level maintenance_skill_level NOT NULL DEFAULT 'diy',
  tags TEXT[] DEFAULT '{}',
  default_assignee maintenance_default_assignee NOT NULL DEFAULT 'homeowner',
  instructions TEXT,
  pro_tips TEXT,
  warning_notes TEXT,

  -- Custom notes per property
  custom_notes TEXT,

  -- Status & scheduling
  status property_task_status NOT NULL DEFAULT 'active',
  next_due_date DATE,
  last_completed_at TIMESTAMPTZ,
  last_completed_by UUID REFERENCES profiles(id),

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint to prevent duplicate template assignments
  UNIQUE(property_id, template_id)
);

-- Indexes for common queries
CREATE INDEX idx_property_tasks_property ON property_maintenance_tasks(property_id);
CREATE INDEX idx_property_tasks_due_date ON property_maintenance_tasks(next_due_date)
  WHERE status = 'active';
CREATE INDEX idx_property_tasks_category ON property_maintenance_tasks(category);
CREATE INDEX idx_property_tasks_status ON property_maintenance_tasks(status);

-- ============================================================================
-- 4. MAINTENANCE TASK COMPLETIONS (History log)
-- ============================================================================

CREATE TABLE IF NOT EXISTS maintenance_task_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  property_task_id UUID NOT NULL REFERENCES property_maintenance_tasks(id) ON DELETE CASCADE,
  completed_by UUID NOT NULL REFERENCES profiles(id),

  -- Completion details
  completed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  cost_cents INT DEFAULT 0,

  -- Attachments (stored as array of storage paths or URLs)
  attachments JSONB DEFAULT '[]'::jsonb,

  -- Link to service request if completed by provider
  related_request_id UUID REFERENCES service_requests(id) ON DELETE SET NULL,

  -- Completion source
  completion_source TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'provider_job', 'auto'

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX idx_completions_property_task ON maintenance_task_completions(property_task_id);
CREATE INDEX idx_completions_completed_by ON maintenance_task_completions(completed_by);
CREATE INDEX idx_completions_completed_at ON maintenance_task_completions(completed_at DESC);
CREATE INDEX idx_completions_request ON maintenance_task_completions(related_request_id)
  WHERE related_request_id IS NOT NULL;

-- ============================================================================
-- 5. MAINTENANCE TASK REQUEST LINKS (Join table for task → request)
-- ============================================================================

CREATE TABLE IF NOT EXISTS maintenance_task_request_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Relationships
  property_task_id UUID NOT NULL REFERENCES property_maintenance_tasks(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES service_requests(id) ON DELETE CASCADE,

  -- Link metadata
  included_in_scope BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,

  -- Audit
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Unique constraint
  UNIQUE(property_task_id, request_id)
);

-- Indexes
CREATE INDEX idx_task_links_request ON maintenance_task_request_links(request_id);
CREATE INDEX idx_task_links_task ON maintenance_task_request_links(property_task_id);

-- ============================================================================
-- 6. UPDATE TRIGGERS
-- ============================================================================

-- Auto-update updated_at for templates
CREATE OR REPLACE FUNCTION update_template_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_template_timestamp
  BEFORE UPDATE ON maintenance_task_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_template_timestamp();

-- Auto-update updated_at for property tasks
CREATE OR REPLACE FUNCTION update_property_task_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_property_task_timestamp
  BEFORE UPDATE ON property_maintenance_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_property_task_timestamp();

-- ============================================================================
-- 7. HELPER FUNCTIONS
-- ============================================================================

-- Function to compute next due date based on frequency
CREATE OR REPLACE FUNCTION compute_next_due_date(
  p_frequency_type maintenance_frequency_type,
  p_frequency_interval INT,
  p_suggested_months INT[],
  p_from_date DATE DEFAULT CURRENT_DATE
) RETURNS DATE AS $$
DECLARE
  v_next_date DATE;
  v_month INT;
  v_year INT;
BEGIN
  CASE p_frequency_type
    WHEN 'weekly' THEN
      v_next_date := p_from_date + (p_frequency_interval * 7);

    WHEN 'monthly' THEN
      v_next_date := p_from_date + (p_frequency_interval || ' months')::INTERVAL;

    WHEN 'seasonal' THEN
      -- Find next suggested month
      IF p_suggested_months IS NOT NULL AND array_length(p_suggested_months, 1) > 0 THEN
        v_month := EXTRACT(MONTH FROM p_from_date)::INT;
        v_year := EXTRACT(YEAR FROM p_from_date)::INT;

        -- Find next month in suggested_months
        SELECT m INTO v_month
        FROM unnest(p_suggested_months) AS m
        WHERE m > EXTRACT(MONTH FROM p_from_date)
        ORDER BY m
        LIMIT 1;

        IF v_month IS NULL THEN
          -- Wrap to next year, use first suggested month
          v_month := p_suggested_months[1];
          v_year := v_year + 1;
        END IF;

        v_next_date := make_date(v_year, v_month, 1);
      ELSE
        -- Default to 3 months if no suggested months
        v_next_date := p_from_date + '3 months'::INTERVAL;
      END IF;

    WHEN 'annual' THEN
      v_next_date := p_from_date + (p_frequency_interval || ' years')::INTERVAL;

    WHEN 'multi_year' THEN
      v_next_date := p_from_date + (p_frequency_interval || ' years')::INTERVAL;

    WHEN 'one_time' THEN
      v_next_date := NULL; -- No next date for one-time tasks

    ELSE
      v_next_date := p_from_date + '1 year'::INTERVAL;
  END CASE;

  RETURN v_next_date;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to generate property maintenance plan from templates
CREATE OR REPLACE FUNCTION generate_property_maintenance_plan(p_property_id UUID)
RETURNS INT AS $$
DECLARE
  v_count INT := 0;
  v_template RECORD;
BEGIN
  FOR v_template IN
    SELECT * FROM maintenance_task_templates WHERE is_active = true
  LOOP
    -- Insert if not already exists
    INSERT INTO property_maintenance_tasks (
      property_id,
      template_id,
      title,
      description,
      category,
      frequency_type,
      frequency_interval,
      suggested_months,
      priority,
      estimated_minutes,
      skill_level,
      tags,
      default_assignee,
      instructions,
      pro_tips,
      warning_notes,
      next_due_date
    )
    VALUES (
      p_property_id,
      v_template.id,
      v_template.title,
      v_template.description,
      v_template.category,
      v_template.frequency_type,
      v_template.frequency_interval,
      v_template.suggested_months,
      v_template.priority,
      v_template.estimated_minutes,
      v_template.skill_level,
      v_template.tags,
      v_template.default_assignee,
      v_template.instructions,
      v_template.pro_tips,
      v_template.warning_notes,
      compute_next_due_date(
        v_template.frequency_type,
        v_template.frequency_interval,
        v_template.suggested_months
      )
    )
    ON CONFLICT (property_id, template_id) DO NOTHING;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 8. RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE maintenance_task_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_maintenance_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_task_request_links ENABLE ROW LEVEL SECURITY;

-- =========================
-- Templates: Read for all authenticated, write for admins only
-- =========================

CREATE POLICY "templates_select_authenticated"
  ON maintenance_task_templates
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "templates_all_admin"
  ON maintenance_task_templates
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =========================
-- Property Tasks: Homeowners can manage for their properties
-- =========================

CREATE POLICY "property_tasks_select_owner"
  ON property_maintenance_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_members pm
      WHERE pm.property_id = property_maintenance_tasks.property_id
        AND pm.user_id = auth.uid()
        AND pm.member_role IN ('owner', 'manager')
    )
  );

CREATE POLICY "property_tasks_insert_owner"
  ON property_maintenance_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM property_members pm
      WHERE pm.property_id = property_maintenance_tasks.property_id
        AND pm.user_id = auth.uid()
        AND pm.member_role IN ('owner', 'manager')
    )
  );

CREATE POLICY "property_tasks_update_owner"
  ON property_maintenance_tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_members pm
      WHERE pm.property_id = property_maintenance_tasks.property_id
        AND pm.user_id = auth.uid()
        AND pm.member_role IN ('owner', 'manager')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM property_members pm
      WHERE pm.property_id = property_maintenance_tasks.property_id
        AND pm.user_id = auth.uid()
        AND pm.member_role IN ('owner', 'manager')
    )
  );

CREATE POLICY "property_tasks_delete_owner"
  ON property_maintenance_tasks
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_members pm
      WHERE pm.property_id = property_maintenance_tasks.property_id
        AND pm.user_id = auth.uid()
        AND pm.member_role = 'owner'
    )
  );

-- Providers can view tasks linked to their assigned requests
CREATE POLICY "property_tasks_select_provider"
  ON property_maintenance_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM maintenance_task_request_links trl
      JOIN service_requests sr ON sr.id = trl.request_id
      WHERE trl.property_task_id = property_maintenance_tasks.id
        AND sr.provider_id IN (
          SELECT provider_id FROM provider_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );

-- Admin can access all
CREATE POLICY "property_tasks_all_admin"
  ON property_maintenance_tasks
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =========================
-- Completions: Homeowners can read/write for their properties, providers for their jobs
-- =========================

CREATE POLICY "completions_select_owner"
  ON maintenance_task_completions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM property_maintenance_tasks pmt
      JOIN property_members pm ON pm.property_id = pmt.property_id
      WHERE pmt.id = maintenance_task_completions.property_task_id
        AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "completions_insert_owner"
  ON maintenance_task_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM property_maintenance_tasks pmt
      JOIN property_members pm ON pm.property_id = pmt.property_id
      WHERE pmt.id = maintenance_task_completions.property_task_id
        AND pm.user_id = auth.uid()
        AND pm.member_role IN ('owner', 'manager')
    )
  );

-- Providers can insert completions for their assigned jobs
CREATE POLICY "completions_insert_provider"
  ON maintenance_task_completions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    related_request_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = maintenance_task_completions.related_request_id
        AND sr.provider_id IN (
          SELECT provider_id FROM provider_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );

-- Providers can view completions for their jobs
CREATE POLICY "completions_select_provider"
  ON maintenance_task_completions
  FOR SELECT
  TO authenticated
  USING (
    related_request_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = maintenance_task_completions.related_request_id
        AND sr.provider_id IN (
          SELECT provider_id FROM provider_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );

-- Admin full access
CREATE POLICY "completions_all_admin"
  ON maintenance_task_completions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- =========================
-- Request Links: Follow request ownership
-- =========================

CREATE POLICY "links_select_owner"
  ON maintenance_task_request_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      JOIN customers c ON c.id = sr.customer_id
      WHERE sr.id = maintenance_task_request_links.request_id
        AND c.profile_id = auth.uid()
    )
  );

CREATE POLICY "links_insert_owner"
  ON maintenance_task_request_links
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_requests sr
      JOIN customers c ON c.id = sr.customer_id
      WHERE sr.id = maintenance_task_request_links.request_id
        AND c.profile_id = auth.uid()
    )
  );

-- Providers can view links for their assigned requests
CREATE POLICY "links_select_provider"
  ON maintenance_task_request_links
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM service_requests sr
      WHERE sr.id = maintenance_task_request_links.request_id
        AND sr.provider_id IN (
          SELECT provider_id FROM provider_members
          WHERE user_id = auth.uid() AND status = 'active'
        )
    )
  );

-- Admin full access
CREATE POLICY "links_all_admin"
  ON maintenance_task_request_links
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- ============================================================================
-- 9. STORAGE BUCKET
-- ============================================================================

-- Create storage bucket for maintenance attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'maintenance-attachments',
  'maintenance-attachments',
  false,
  10485760, -- 10MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for maintenance attachments
-- Folder structure: /{property_id}/{property_task_id}/{completion_id}/filename

CREATE POLICY "maintenance_attachments_select"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'maintenance-attachments'
    AND (
      -- Property owner/manager can view
      EXISTS (
        SELECT 1 FROM property_members pm
        WHERE pm.property_id = (string_to_array(name, '/'))[1]::uuid
          AND pm.user_id = auth.uid()
      )
      OR
      -- Provider assigned to related request can view
      EXISTS (
        SELECT 1 FROM maintenance_task_completions mtc
        JOIN service_requests sr ON sr.id = mtc.related_request_id
        WHERE mtc.id = (string_to_array(name, '/'))[3]::uuid
          AND sr.provider_id IN (
            SELECT provider_id FROM provider_members
            WHERE user_id = auth.uid() AND status = 'active'
          )
      )
      OR
      -- Admin can view all
      EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

CREATE POLICY "maintenance_attachments_insert"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'maintenance-attachments'
    AND (
      -- Property owner/manager can upload
      EXISTS (
        SELECT 1 FROM property_members pm
        WHERE pm.property_id = (string_to_array(name, '/'))[1]::uuid
          AND pm.user_id = auth.uid()
          AND pm.member_role IN ('owner', 'manager')
      )
      OR
      -- Provider can upload for their jobs
      EXISTS (
        SELECT 1 FROM maintenance_task_completions mtc
        JOIN service_requests sr ON sr.id = mtc.related_request_id
        WHERE mtc.id = (string_to_array(name, '/'))[3]::uuid
          AND sr.provider_id IN (
            SELECT provider_id FROM provider_members
            WHERE user_id = auth.uid() AND status = 'active'
          )
      )
    )
  );

CREATE POLICY "maintenance_attachments_delete"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'maintenance-attachments'
    AND (
      -- Property owner can delete
      EXISTS (
        SELECT 1 FROM property_members pm
        WHERE pm.property_id = (string_to_array(name, '/'))[1]::uuid
          AND pm.user_id = auth.uid()
          AND pm.member_role = 'owner'
      )
      OR
      -- Admin can delete
      EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- ============================================================================
-- 10. COMMENTS
-- ============================================================================

COMMENT ON TABLE maintenance_task_templates IS 'Master list of maintenance tasks that can be applied to properties';
COMMENT ON TABLE property_maintenance_tasks IS 'Per-property maintenance task instances with scheduling';
COMMENT ON TABLE maintenance_task_completions IS 'Completion history log for maintenance tasks';
COMMENT ON TABLE maintenance_task_request_links IS 'Links maintenance tasks to service requests for provider completion';

COMMENT ON FUNCTION compute_next_due_date IS 'Calculates next due date based on frequency type and interval';
COMMENT ON FUNCTION generate_property_maintenance_plan IS 'Generates a maintenance plan for a property from active templates';
