-- Property Systems Table
-- Stores detailed information about home systems (HVAC, water heater, appliances, etc.)

-- System type enum
CREATE TYPE system_type AS ENUM (
  'hvac',           -- Heating/cooling combined
  'heating',        -- Heating only (furnace, boiler, etc.)
  'cooling',        -- Cooling only (AC, evaporative cooler)
  'water_heater',   -- Water heater (tank, tankless)
  'electrical',     -- Electrical panel, circuits
  'plumbing',       -- Main plumbing, water softener, etc.
  'roof',           -- Roof system
  'appliance',      -- Major appliances (washer, dryer, fridge, etc.)
  'pool_spa',       -- Pool or spa equipment
  'security',       -- Security system, cameras
  'garage',         -- Garage door opener
  'irrigation',     -- Sprinkler system
  'solar',          -- Solar panels, inverters
  'septic',         -- Septic system
  'well',           -- Well pump
  'fireplace',      -- Fireplace, wood stove
  'other'           -- Other systems
);

-- System condition enum
CREATE TYPE system_condition AS ENUM (
  'excellent',      -- Like new, recently installed
  'good',           -- Working well, normal wear
  'fair',           -- Some issues, may need attention soon
  'poor',           -- Significant issues, needs repair
  'unknown'         -- Condition not assessed
);

-- Property systems table
CREATE TABLE IF NOT EXISTS property_systems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- System identification
  system_type system_type NOT NULL,
  name VARCHAR(100) NOT NULL,               -- User-friendly name (e.g., "Main HVAC", "Upstairs AC")
  location VARCHAR(100),                     -- Where in the property (e.g., "Basement", "Attic", "Garage")

  -- Equipment details
  brand VARCHAR(100),                        -- Manufacturer (e.g., "Carrier", "Rheem", "LG")
  model VARCHAR(100),                        -- Model number
  serial_number VARCHAR(100),                -- Serial number for warranty/service

  -- HVAC-specific fields
  filter_size VARCHAR(50),                   -- Filter dimensions (e.g., "20x25x1", "16x20x4")
  filter_type VARCHAR(100),                  -- Filter type (e.g., "MERV 13", "HEPA", "Fiberglass")
  refrigerant_type VARCHAR(50),              -- For AC units (e.g., "R-410A", "R-22")
  tonnage DECIMAL(4,2),                      -- AC tonnage (e.g., 2.5, 3.0)
  btu_rating INTEGER,                        -- BTU rating for heating/cooling capacity

  -- Water heater specific
  tank_size_gallons INTEGER,                 -- Tank capacity in gallons
  fuel_type VARCHAR(50),                     -- Gas, electric, propane, solar, heat pump

  -- Dates
  install_date DATE,                         -- When system was installed
  manufacture_date DATE,                     -- Manufacturing date (from serial number)
  warranty_expiry DATE,                      -- Warranty expiration date
  last_service_date DATE,                    -- Last professional service
  next_service_date DATE,                    -- Scheduled next service

  -- Status and condition
  condition system_condition DEFAULT 'unknown',
  is_active BOOLEAN DEFAULT true,            -- Is system currently in use

  -- Documentation
  notes TEXT,                                -- Additional notes
  photo_url TEXT,                            -- Photo of equipment label
  manual_url TEXT,                           -- Link to manual (uploaded or external)
  warranty_doc_url TEXT,                     -- Warranty documentation

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id)
);

-- Indexes
CREATE INDEX idx_property_systems_property_id ON property_systems(property_id);
CREATE INDEX idx_property_systems_type ON property_systems(system_type);
CREATE INDEX idx_property_systems_next_service ON property_systems(next_service_date) WHERE next_service_date IS NOT NULL;

-- RLS policies
ALTER TABLE property_systems ENABLE ROW LEVEL SECURITY;

-- Property members can view systems
CREATE POLICY "Property members can view systems"
  ON property_systems FOR SELECT
  USING (
    property_id IN (
      SELECT property_id FROM property_members WHERE user_id = auth.uid()
    )
  );

-- Property owners/managers can insert systems
CREATE POLICY "Property owners can insert systems"
  ON property_systems FOR INSERT
  WITH CHECK (
    property_id IN (
      SELECT property_id FROM property_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Property owners/managers can update systems
CREATE POLICY "Property owners can update systems"
  ON property_systems FOR UPDATE
  USING (
    property_id IN (
      SELECT property_id FROM property_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Property owners/managers can delete systems
CREATE POLICY "Property owners can delete systems"
  ON property_systems FOR DELETE
  USING (
    property_id IN (
      SELECT property_id FROM property_members
      WHERE user_id = auth.uid() AND role IN ('owner', 'manager')
    )
  );

-- Admins have full access
CREATE POLICY "Admins have full access to systems"
  ON property_systems FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_property_systems_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER property_systems_updated_at
  BEFORE UPDATE ON property_systems
  FOR EACH ROW
  EXECUTE FUNCTION update_property_systems_updated_at();

-- Add comment
COMMENT ON TABLE property_systems IS 'Stores detailed information about home systems including HVAC, water heaters, appliances, etc.';
