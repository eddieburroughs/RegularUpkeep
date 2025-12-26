-- =====================================================
-- Google Provider Discovery Feature
-- Migration: 20251226_google_provider_discovery.sql
--
-- Adds tables and columns for:
-- 1. Property geolocation (lat/lng)
-- 2. Google provider leads cache
-- 3. External provider invites
-- 4. Provider network agreements
-- =====================================================

-- =====================================================
-- PART 1: Add geolocation to properties
-- =====================================================

-- Add latitude and longitude columns to properties
ALTER TABLE properties
ADD COLUMN IF NOT EXISTS lat DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS lng DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS geocoded_at TIMESTAMPTZ;

-- Index for geolocation queries (bounding box)
CREATE INDEX IF NOT EXISTS idx_properties_geolocation
ON properties(lat, lng)
WHERE lat IS NOT NULL AND lng IS NOT NULL;

COMMENT ON COLUMN properties.lat IS 'Latitude coordinate for property address';
COMMENT ON COLUMN properties.lng IS 'Longitude coordinate for property address';
COMMENT ON COLUMN properties.geocoded_at IS 'When the address was last geocoded';

-- =====================================================
-- PART 2: Provider Leads (cached Google results)
-- =====================================================

-- Enum for provider lead source
DO $$ BEGIN
  CREATE TYPE provider_lead_source AS ENUM ('google', 'manual', 'referral');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Provider leads table (cached from Google Places API)
CREATE TABLE IF NOT EXISTS provider_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Source tracking
  source provider_lead_source NOT NULL DEFAULT 'google',
  place_id TEXT UNIQUE, -- Google Place ID (unique for Google sources)

  -- Business info
  name TEXT NOT NULL,
  primary_service TEXT, -- Main service category (HVAC, Plumbing, etc.)
  service_tags TEXT[] DEFAULT '{}', -- Additional service tags

  -- Google ratings
  rating NUMERIC(2,1), -- e.g., 4.5
  user_ratings_total INTEGER, -- Number of reviews

  -- Contact info
  phone TEXT,
  website TEXT,
  email TEXT, -- May be added manually

  -- Location
  address TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,

  -- Cache management
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  raw_json JSONB, -- Full Google Places response

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT valid_rating CHECK (rating IS NULL OR (rating >= 0 AND rating <= 5))
);

-- Indexes for provider_leads
CREATE INDEX IF NOT EXISTS idx_provider_leads_place_id ON provider_leads(place_id) WHERE place_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_provider_leads_last_fetched ON provider_leads(last_fetched_at);
CREATE INDEX IF NOT EXISTS idx_provider_leads_service ON provider_leads(primary_service);
CREATE INDEX IF NOT EXISTS idx_provider_leads_geolocation ON provider_leads(lat, lng) WHERE lat IS NOT NULL AND lng IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_provider_leads_rating ON provider_leads(rating DESC NULLS LAST);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_provider_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS provider_leads_updated_at ON provider_leads;
CREATE TRIGGER provider_leads_updated_at
  BEFORE UPDATE ON provider_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_provider_leads_updated_at();

COMMENT ON TABLE provider_leads IS 'Cached provider information from Google Places and other sources';

-- =====================================================
-- PART 3: External Provider Invites
-- =====================================================

-- Enum for invite status
DO $$ BEGIN
  CREATE TYPE external_invite_status AS ENUM ('pending', 'sent', 'opened', 'accepted', 'declined', 'expired');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Enum for invite method
DO $$ BEGIN
  CREATE TYPE invite_method AS ENUM ('sms', 'email', 'manual', 'link');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- External provider invites table
CREATE TABLE IF NOT EXISTS external_provider_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who sent it
  homeowner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,

  -- Who it's for
  provider_lead_id UUID NOT NULL REFERENCES provider_leads(id) ON DELETE CASCADE,

  -- Service context
  service_type TEXT NOT NULL,

  -- Invite details
  token TEXT UNIQUE NOT NULL, -- Secure random token for invite link
  status external_invite_status NOT NULL DEFAULT 'pending',

  -- Delivery
  sent_via invite_method NOT NULL DEFAULT 'sms',
  sent_to TEXT NOT NULL, -- Phone number or email
  message TEXT, -- Optional custom message

  -- Tracking
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),

  -- If accepted, link to provider
  provider_id UUID REFERENCES providers(id),

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for external_provider_invites
CREATE INDEX IF NOT EXISTS idx_ext_invites_homeowner ON external_provider_invites(homeowner_user_id);
CREATE INDEX IF NOT EXISTS idx_ext_invites_token ON external_provider_invites(token);
CREATE INDEX IF NOT EXISTS idx_ext_invites_status ON external_provider_invites(status);
CREATE INDEX IF NOT EXISTS idx_ext_invites_lead ON external_provider_invites(provider_lead_id);
CREATE INDEX IF NOT EXISTS idx_ext_invites_provider ON external_provider_invites(provider_id) WHERE provider_id IS NOT NULL;

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_ext_invites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ext_invites_updated_at ON external_provider_invites;
CREATE TRIGGER ext_invites_updated_at
  BEFORE UPDATE ON external_provider_invites
  FOR EACH ROW
  EXECUTE FUNCTION update_ext_invites_updated_at();

COMMENT ON TABLE external_provider_invites IS 'Invitations sent to external (Google) providers to join the network';

-- =====================================================
-- PART 4: Provider Network Agreements
-- =====================================================

-- Provider agreements table (tracks terms acceptance)
CREATE TABLE IF NOT EXISTS provider_network_agreements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

  -- Agreement version
  agreement_version TEXT NOT NULL, -- e.g., '2025-01'

  -- Acceptance details
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT,

  -- Terms summary (for reference)
  platform_fee_bps INTEGER NOT NULL DEFAULT 800, -- 8.00% = 800 bps
  payment_terms TEXT NOT NULL DEFAULT 'Customer pays RegularUpkeep. Provider receives payout after job completion confirmation minus platform fee.',

  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agreements_provider ON provider_network_agreements(provider_id);
CREATE INDEX IF NOT EXISTS idx_agreements_version ON provider_network_agreements(agreement_version);

COMMENT ON TABLE provider_network_agreements IS 'Records of providers accepting network terms and conditions';

-- =====================================================
-- PART 5: Add network source tracking to providers
-- =====================================================

-- Add columns to track how provider joined
ALTER TABLE providers
ADD COLUMN IF NOT EXISTS joined_via TEXT DEFAULT 'direct', -- 'direct', 'invite', 'google'
ADD COLUMN IF NOT EXISTS invite_id UUID REFERENCES external_provider_invites(id),
ADD COLUMN IF NOT EXISTS provider_lead_id UUID REFERENCES provider_leads(id);

COMMENT ON COLUMN providers.joined_via IS 'How provider joined: direct signup, invite from homeowner, or Google discovery';
COMMENT ON COLUMN providers.invite_id IS 'Reference to the invite that brought this provider (if any)';
COMMENT ON COLUMN providers.provider_lead_id IS 'Reference to the Google lead record (if from Google)';

-- =====================================================
-- PART 6: Platform Settings for Google Discovery
-- =====================================================

-- Add Google discovery settings to admin_config
INSERT INTO admin_config (key, value, description)
VALUES
  ('google_provider_discovery', '{
    "enabled": true,
    "search_radius_miles": 30,
    "min_rating": 4.0,
    "min_reviews": 5,
    "cache_ttl_hours": 168,
    "max_results_per_search": 20
  }', 'Google Provider Discovery feature settings')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  updated_at = NOW();

-- =====================================================
-- PART 7: RLS Policies
-- =====================================================

-- Enable RLS on new tables
ALTER TABLE provider_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE external_provider_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_network_agreements ENABLE ROW LEVEL SECURITY;

-- Provider Leads: Customers can read via API (server-side filtering)
-- We allow authenticated users to read but only via server API
CREATE POLICY "Authenticated users can read provider leads"
  ON provider_leads FOR SELECT
  TO authenticated
  USING (true);

-- Only service role can insert/update provider leads (from API)
CREATE POLICY "Service role can manage provider leads"
  ON provider_leads FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- External Provider Invites: Customers see their own invites
CREATE POLICY "Customers can view their own invites"
  ON external_provider_invites FOR SELECT
  TO authenticated
  USING (homeowner_user_id = auth.uid());

CREATE POLICY "Customers can create invites for their properties"
  ON external_provider_invites FOR INSERT
  TO authenticated
  WITH CHECK (
    homeowner_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM property_members
      WHERE property_id = external_provider_invites.property_id
      AND user_id = auth.uid()
    )
  );

-- Allow public access to invites by token (for onboarding page)
CREATE POLICY "Anyone can view invite by token"
  ON external_provider_invites FOR SELECT
  TO anon
  USING (token IS NOT NULL);

-- Service role full access
CREATE POLICY "Service role can manage invites"
  ON external_provider_invites FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Provider Agreements: Providers can see their own
CREATE POLICY "Providers can view their own agreements"
  ON provider_network_agreements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM providers
      WHERE id = provider_network_agreements.provider_id
      AND profile_id = auth.uid()
    )
  );

-- Providers can create agreements for themselves
CREATE POLICY "Providers can create their own agreements"
  ON provider_network_agreements FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM providers
      WHERE id = provider_network_agreements.provider_id
      AND profile_id = auth.uid()
    )
  );

-- Service role full access
CREATE POLICY "Service role can manage agreements"
  ON provider_network_agreements FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admin can view all
CREATE POLICY "Admins can view all invites"
  ON external_provider_invites FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all agreements"
  ON provider_network_agreements FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Admins can view all provider leads"
  ON provider_leads FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- =====================================================
-- PART 8: Helper Functions
-- =====================================================

-- Function to calculate distance between two points (Haversine formula)
CREATE OR REPLACE FUNCTION haversine_distance_miles(
  lat1 DOUBLE PRECISION,
  lng1 DOUBLE PRECISION,
  lat2 DOUBLE PRECISION,
  lng2 DOUBLE PRECISION
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  R CONSTANT DOUBLE PRECISION := 3959; -- Earth radius in miles
  dlat DOUBLE PRECISION;
  dlng DOUBLE PRECISION;
  a DOUBLE PRECISION;
  c DOUBLE PRECISION;
BEGIN
  -- Handle null values
  IF lat1 IS NULL OR lng1 IS NULL OR lat2 IS NULL OR lng2 IS NULL THEN
    RETURN NULL;
  END IF;

  dlat := radians(lat2 - lat1);
  dlng := radians(lng2 - lng1);

  a := sin(dlat / 2) ^ 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlng / 2) ^ 2;
  c := 2 * asin(sqrt(a));

  RETURN R * c;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION haversine_distance_miles IS 'Calculate distance in miles between two lat/lng points using Haversine formula';

-- Function to find providers within radius
CREATE OR REPLACE FUNCTION find_providers_within_radius(
  center_lat DOUBLE PRECISION,
  center_lng DOUBLE PRECISION,
  radius_miles DOUBLE PRECISION,
  service_filter TEXT DEFAULT NULL,
  min_rating NUMERIC DEFAULT 4.0
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  primary_service TEXT,
  rating NUMERIC,
  user_ratings_total INTEGER,
  phone TEXT,
  website TEXT,
  address TEXT,
  distance_miles DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    pl.id,
    pl.name,
    pl.primary_service,
    pl.rating,
    pl.user_ratings_total,
    pl.phone,
    pl.website,
    pl.address,
    haversine_distance_miles(center_lat, center_lng, pl.lat, pl.lng) as distance_miles
  FROM provider_leads pl
  WHERE
    pl.lat IS NOT NULL
    AND pl.lng IS NOT NULL
    AND (pl.rating >= min_rating OR pl.rating IS NULL)
    AND (service_filter IS NULL OR pl.primary_service = service_filter OR service_filter = ANY(pl.service_tags))
    AND haversine_distance_miles(center_lat, center_lng, pl.lat, pl.lng) <= radius_miles
  ORDER BY
    distance_miles ASC,
    pl.rating DESC NULLS LAST,
    pl.user_ratings_total DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION find_providers_within_radius IS 'Find cached provider leads within a radius of a point, filtered by service and rating';

-- Function to generate secure invite token
CREATE OR REPLACE FUNCTION generate_invite_token()
RETURNS TEXT AS $$
BEGIN
  RETURN encode(gen_random_bytes(32), 'base64url');
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_invite_token IS 'Generate a cryptographically secure invite token';

-- =====================================================
-- PART 9: Views for Admin Dashboard
-- =====================================================

-- View for invite statistics
CREATE OR REPLACE VIEW admin_invite_stats AS
SELECT
  DATE_TRUNC('day', created_at) as day,
  status,
  COUNT(*) as count,
  COUNT(DISTINCT homeowner_user_id) as unique_homeowners,
  COUNT(DISTINCT provider_lead_id) as unique_leads
FROM external_provider_invites
GROUP BY DATE_TRUNC('day', created_at), status
ORDER BY day DESC, status;

-- View for provider lead statistics
CREATE OR REPLACE VIEW admin_provider_lead_stats AS
SELECT
  source,
  primary_service,
  COUNT(*) as total_leads,
  COUNT(*) FILTER (WHERE rating >= 4.0) as high_rated,
  AVG(rating) as avg_rating,
  MIN(last_fetched_at) as oldest_cache,
  MAX(last_fetched_at) as newest_cache
FROM provider_leads
GROUP BY source, primary_service
ORDER BY source, primary_service;

-- Grant access to views
GRANT SELECT ON admin_invite_stats TO authenticated;
GRANT SELECT ON admin_provider_lead_stats TO authenticated;
