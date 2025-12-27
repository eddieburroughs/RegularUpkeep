-- ============================================================================
-- SYSTEM TO MAINTENANCE TASK LINK
-- Migration: 20251227_system_maintenance_link.sql
-- Description: Connects property_systems to property_maintenance_tasks
--              Enables equipment-specific reminders (e.g., "Change HVAC Filter - 20x25x1")
-- ============================================================================

-- ============================================================================
-- 1. ADD SYSTEM_ID COLUMN TO PROPERTY_MAINTENANCE_TASKS
-- ============================================================================

-- Add optional link to property_systems
ALTER TABLE property_maintenance_tasks
  ADD COLUMN IF NOT EXISTS system_id UUID REFERENCES property_systems(id) ON DELETE SET NULL;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_property_tasks_system_id ON property_maintenance_tasks(system_id)
  WHERE system_id IS NOT NULL;

-- ============================================================================
-- 2. SYSTEM-SPECIFIC TASK TEMPLATES
-- ============================================================================

-- Mapping table: which templates apply to which system types
CREATE TABLE IF NOT EXISTS system_task_mappings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  system_type system_type NOT NULL,
  template_id UUID NOT NULL REFERENCES maintenance_task_templates(id) ON DELETE CASCADE,

  -- Customization for this system type
  custom_title_template TEXT, -- e.g., "Change {system_name} Filter - {filter_size}"
  custom_frequency_type maintenance_frequency_type,
  custom_frequency_interval INT,
  custom_suggested_months INT[],

  -- Priority boost for this system type
  priority_override TEXT,

  -- Active flag
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(system_type, template_id)
);

-- Index
CREATE INDEX idx_system_task_mappings_type ON system_task_mappings(system_type) WHERE is_active = true;

-- RLS
ALTER TABLE system_task_mappings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "system_task_mappings_select_all"
  ON system_task_mappings FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY "system_task_mappings_admin"
  ON system_task_mappings FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- 3. FUNCTION: Generate Tasks for a Property System
-- ============================================================================

CREATE OR REPLACE FUNCTION generate_system_maintenance_tasks(p_system_id UUID)
RETURNS INT AS $$
DECLARE
  v_system RECORD;
  v_mapping RECORD;
  v_task_title TEXT;
  v_next_due DATE;
  v_count INT := 0;
  v_existing_task_id UUID;
BEGIN
  -- Get the system details
  SELECT * INTO v_system FROM property_systems WHERE id = p_system_id;

  IF v_system IS NULL THEN
    RAISE EXCEPTION 'System not found: %', p_system_id;
  END IF;

  -- Loop through mappings for this system type
  FOR v_mapping IN
    SELECT stm.*, mtt.*
    FROM system_task_mappings stm
    JOIN maintenance_task_templates mtt ON mtt.id = stm.template_id
    WHERE stm.system_type = v_system.system_type
      AND stm.is_active = true
      AND mtt.is_active = true
  LOOP
    -- Build customized title
    v_task_title := COALESCE(v_mapping.custom_title_template, v_mapping.title);

    -- Replace placeholders
    v_task_title := REPLACE(v_task_title, '{system_name}', v_system.name);
    v_task_title := REPLACE(v_task_title, '{brand}', COALESCE(v_system.brand, ''));
    v_task_title := REPLACE(v_task_title, '{model}', COALESCE(v_system.model, ''));
    v_task_title := REPLACE(v_task_title, '{filter_size}', COALESCE(v_system.filter_size, ''));
    v_task_title := REPLACE(v_task_title, '{location}', COALESCE(v_system.location, ''));

    -- Clean up empty placeholders
    v_task_title := REGEXP_REPLACE(v_task_title, '\s*-\s*$', '');
    v_task_title := TRIM(v_task_title);

    -- Compute next due date
    v_next_due := compute_next_due_date(
      COALESCE(v_mapping.custom_frequency_type, v_mapping.frequency_type),
      COALESCE(v_mapping.custom_frequency_interval, v_mapping.frequency_interval),
      COALESCE(v_mapping.custom_suggested_months, v_mapping.suggested_months),
      COALESCE(v_system.next_service_date, CURRENT_DATE)
    );

    -- Check if task already exists for this system + template
    SELECT id INTO v_existing_task_id
    FROM property_maintenance_tasks
    WHERE property_id = v_system.property_id
      AND system_id = v_system.id
      AND template_id = v_mapping.template_id;

    IF v_existing_task_id IS NOT NULL THEN
      -- Update existing task
      UPDATE property_maintenance_tasks
      SET
        title = v_task_title,
        custom_notes = 'Equipment: ' || COALESCE(v_system.brand, '') || ' ' || COALESCE(v_system.model, '') ||
          CASE WHEN v_system.filter_size IS NOT NULL THEN E'\nFilter Size: ' || v_system.filter_size ELSE '' END ||
          CASE WHEN v_system.serial_number IS NOT NULL THEN E'\nSerial: ' || v_system.serial_number ELSE '' END,
        updated_at = NOW()
      WHERE id = v_existing_task_id;
    ELSE
      -- Insert new task
      INSERT INTO property_maintenance_tasks (
        property_id,
        system_id,
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
        custom_notes,
        next_due_date
      )
      VALUES (
        v_system.property_id,
        v_system.id,
        v_mapping.template_id,
        v_task_title,
        v_mapping.description,
        v_mapping.category,
        COALESCE(v_mapping.custom_frequency_type, v_mapping.frequency_type),
        COALESCE(v_mapping.custom_frequency_interval, v_mapping.frequency_interval),
        COALESCE(v_mapping.custom_suggested_months, v_mapping.suggested_months),
        COALESCE(v_mapping.priority_override, v_mapping.priority),
        v_mapping.estimated_minutes,
        v_mapping.skill_level,
        v_mapping.tags,
        v_mapping.default_assignee,
        v_mapping.instructions,
        v_mapping.pro_tips,
        v_mapping.warning_notes,
        'Equipment: ' || COALESCE(v_system.brand, '') || ' ' || COALESCE(v_system.model, '') ||
          CASE WHEN v_system.filter_size IS NOT NULL THEN E'\nFilter Size: ' || v_system.filter_size ELSE '' END ||
          CASE WHEN v_system.serial_number IS NOT NULL THEN E'\nSerial: ' || v_system.serial_number ELSE '' END,
        v_next_due
      );
    END IF;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 4. TRIGGER: Auto-generate tasks when system is created/updated
-- ============================================================================

CREATE OR REPLACE FUNCTION trigger_generate_system_tasks()
RETURNS TRIGGER AS $$
BEGIN
  -- Only generate if this is a new system or key fields changed
  IF TG_OP = 'INSERT' OR
     (TG_OP = 'UPDATE' AND (
       OLD.system_type != NEW.system_type OR
       OLD.filter_size IS DISTINCT FROM NEW.filter_size OR
       OLD.next_service_date IS DISTINCT FROM NEW.next_service_date OR
       OLD.name != NEW.name
     ))
  THEN
    PERFORM generate_system_maintenance_tasks(NEW.id);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_systems_generate_tasks
  AFTER INSERT OR UPDATE ON property_systems
  FOR EACH ROW
  EXECUTE FUNCTION trigger_generate_system_tasks();

-- ============================================================================
-- 5. FUNCTION: Get tasks with equipment details for notifications
-- ============================================================================

CREATE OR REPLACE FUNCTION get_tasks_with_equipment_details(
  p_user_id UUID,
  p_include_overdue BOOLEAN DEFAULT true,
  p_days_ahead INT DEFAULT 7
)
RETURNS TABLE (
  task_id UUID,
  task_title TEXT,
  task_description TEXT,
  task_category TEXT,
  next_due_date DATE,
  is_overdue BOOLEAN,
  days_until_due INT,
  property_id UUID,
  property_name TEXT,
  -- Equipment details
  system_id UUID,
  system_name TEXT,
  system_type system_type,
  brand TEXT,
  model TEXT,
  filter_size TEXT,
  serial_number TEXT,
  -- Enriched title with equipment info
  enriched_title TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pmt.id AS task_id,
    pmt.title AS task_title,
    pmt.description AS task_description,
    pmt.category AS task_category,
    pmt.next_due_date,
    (pmt.next_due_date < CURRENT_DATE) AS is_overdue,
    (pmt.next_due_date - CURRENT_DATE)::INT AS days_until_due,
    p.id AS property_id,
    p.name AS property_name,
    ps.id AS system_id,
    ps.name AS system_name,
    ps.system_type,
    ps.brand,
    ps.model,
    ps.filter_size,
    ps.serial_number,
    -- Build enriched title
    CASE
      WHEN ps.id IS NOT NULL THEN
        pmt.title ||
        CASE WHEN ps.filter_size IS NOT NULL THEN ' (' || ps.filter_size || ')' ELSE '' END ||
        CASE WHEN ps.brand IS NOT NULL THEN ' - ' || ps.brand ELSE '' END
      ELSE pmt.title
    END AS enriched_title
  FROM property_maintenance_tasks pmt
  JOIN properties p ON p.id = pmt.property_id
  JOIN property_members pm ON pm.property_id = p.id
  LEFT JOIN property_systems ps ON ps.id = pmt.system_id
  WHERE pm.user_id = p_user_id
    AND pmt.status = 'active'
    AND pmt.next_due_date IS NOT NULL
    AND (
      (p_include_overdue AND pmt.next_due_date < CURRENT_DATE) OR
      (pmt.next_due_date <= CURRENT_DATE + p_days_ahead)
    )
  ORDER BY pmt.next_due_date ASC;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- 6. SEED DEFAULT SYSTEM-TASK MAPPINGS
-- ============================================================================

-- First ensure we have the core maintenance templates
INSERT INTO maintenance_task_templates (id, title, description, category, frequency_type, frequency_interval, skill_level, default_assignee, instructions, is_active)
VALUES
  -- HVAC Filter Change
  ('a0000000-0000-0000-0000-000000000001', 'Change HVAC Filter', 'Replace air filter to maintain air quality and HVAC efficiency', 'hvac', 'monthly', 1, 'diy', 'homeowner',
   E'1. Turn off HVAC system\n2. Locate filter slot (usually in return air duct or air handler)\n3. Note filter size printed on existing filter\n4. Remove old filter, noting airflow direction arrow\n5. Insert new filter with arrow pointing toward duct/handler\n6. Turn system back on', true),

  -- HVAC Annual Service
  ('a0000000-0000-0000-0000-000000000002', 'Schedule HVAC Tune-Up', 'Annual professional HVAC maintenance', 'hvac', 'annual', 1, 'pro_required', 'provider',
   E'Professional technician will:\n- Check refrigerant levels\n- Clean coils\n- Test electrical connections\n- Lubricate moving parts\n- Check thermostat calibration', true),

  -- Water Heater Flush
  ('a0000000-0000-0000-0000-000000000003', 'Flush Water Heater', 'Drain and flush water heater to remove sediment buildup', 'plumbing', 'annual', 1, 'diy', 'homeowner',
   E'1. Turn off power/gas to water heater\n2. Turn off cold water supply\n3. Connect hose to drain valve\n4. Open drain valve and let water flow until clear\n5. Close drain, refill tank\n6. Restore power/gas', true),

  -- Refrigerant Check
  ('a0000000-0000-0000-0000-000000000004', 'Check AC Refrigerant', 'Professional refrigerant level check', 'hvac', 'annual', 1, 'pro_required', 'provider',
   'Technician will check refrigerant levels and top off if needed', true),

  -- Furnace Inspection
  ('a0000000-0000-0000-0000-000000000005', 'Furnace Safety Inspection', 'Annual furnace safety check before heating season', 'hvac', 'seasonal', 1, 'pro_recommended', 'provider',
   E'Inspection includes:\n- Heat exchanger inspection\n- CO detector test\n- Burner cleaning\n- Safety controls check', true)
ON CONFLICT (id) DO NOTHING;

-- Map templates to system types
INSERT INTO system_task_mappings (system_type, template_id, custom_title_template, custom_frequency_type, custom_frequency_interval)
VALUES
  -- HVAC system mappings
  ('hvac', 'a0000000-0000-0000-0000-000000000001', 'Change {system_name} Filter - {filter_size}', 'monthly', 1),
  ('hvac', 'a0000000-0000-0000-0000-000000000002', '{system_name} Annual Tune-Up', 'annual', 1),
  ('hvac', 'a0000000-0000-0000-0000-000000000004', 'Check {brand} AC Refrigerant', 'annual', 1),

  -- Heating system mappings
  ('heating', 'a0000000-0000-0000-0000-000000000001', 'Change {system_name} Filter - {filter_size}', 'monthly', 1),
  ('heating', 'a0000000-0000-0000-0000-000000000005', '{brand} Furnace Safety Inspection', 'seasonal', 1),

  -- Cooling system mappings
  ('cooling', 'a0000000-0000-0000-0000-000000000001', 'Change {system_name} Filter - {filter_size}', 'monthly', 1),
  ('cooling', 'a0000000-0000-0000-0000-000000000004', 'Check {brand} AC Refrigerant', 'annual', 1),

  -- Water heater mappings
  ('water_heater', 'a0000000-0000-0000-0000-000000000003', 'Flush {brand} Water Heater', 'annual', 1)
ON CONFLICT (system_type, template_id) DO NOTHING;

-- ============================================================================
-- 7. UPDATE property_maintenance_tasks UNIQUE CONSTRAINT
-- ============================================================================

-- Drop the old unique constraint if it exists (property_id, template_id)
-- and replace with one that includes system_id for system-specific tasks
ALTER TABLE property_maintenance_tasks DROP CONSTRAINT IF EXISTS property_maintenance_tasks_property_id_template_id_key;

-- Create new partial unique indexes
-- For system-linked tasks: unique per property + template + system
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_tasks_unique_with_system
  ON property_maintenance_tasks(property_id, template_id, system_id)
  WHERE system_id IS NOT NULL;

-- For general tasks (no system): unique per property + template
CREATE UNIQUE INDEX IF NOT EXISTS idx_property_tasks_unique_without_system
  ON property_maintenance_tasks(property_id, template_id)
  WHERE system_id IS NULL AND template_id IS NOT NULL;

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE system_task_mappings IS 'Maps maintenance task templates to system types with optional customizations';
COMMENT ON FUNCTION generate_system_maintenance_tasks IS 'Generates maintenance tasks for a property system based on its type';
COMMENT ON FUNCTION get_tasks_with_equipment_details IS 'Returns tasks with enriched equipment details for notifications';
