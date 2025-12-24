-- ADDENDUM: Marketing + Monetization hardening
-- Migration for new tables and columns

-- ============================================================================
-- Provider Tier History (ADDENDUM E)
-- Logs status changes for audit trail
-- ============================================================================
CREATE TABLE IF NOT EXISTS provider_tier_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  previous_status TEXT NOT NULL,
  new_status TEXT NOT NULL,
  trigger TEXT NOT NULL CHECK (trigger IN ('manual', 'subscription_change', 'cron_check', 'admin_action')),
  notes TEXT,
  metrics_snapshot JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_tier_history_provider ON provider_tier_history(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_tier_history_created ON provider_tier_history(created_at DESC);

-- ============================================================================
-- Provider Addons (ADDENDUM C)
-- Tracks add-on purchases: Priority Dispatch, Instant Payout, Maintenance Plans
-- ============================================================================
CREATE TABLE IF NOT EXISTS provider_addons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  addon_type TEXT NOT NULL CHECK (addon_type IN ('priority_dispatch', 'instant_payout', 'maintenance_plan_interior', 'maintenance_plan_exterior', 'maintenance_plan_full')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'expired')),
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  homes_count INTEGER, -- For maintenance plans
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_addons_provider ON provider_addons(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_addons_type ON provider_addons(addon_type);
CREATE INDEX IF NOT EXISTS idx_provider_addons_status ON provider_addons(status);

-- ============================================================================
-- Sponsor Tile Waitlist (ADDENDUM D)
-- Queue for territories that are at capacity
-- ============================================================================
CREATE TABLE IF NOT EXISTS sponsor_tile_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES territories(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  notified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(sponsor_id, territory_id)
);

CREATE INDEX IF NOT EXISTS idx_sponsor_tile_waitlist_territory ON sponsor_tile_waitlist(territory_id, position);

-- ============================================================================
-- Add new columns to invoices table
-- ============================================================================
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS total_captured_cents INTEGER;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS homeowner_platform_fee_cents INTEGER;

-- ============================================================================
-- Add activated_at to sponsor_tiles
-- ============================================================================
ALTER TABLE sponsor_tiles ADD COLUMN IF NOT EXISTS activated_at TIMESTAMPTZ;

-- ============================================================================
-- Add instant_payout_enabled to provider_stripe_accounts
-- ============================================================================
ALTER TABLE provider_stripe_accounts ADD COLUMN IF NOT EXISTS instant_payout_enabled BOOLEAN DEFAULT FALSE;

-- ============================================================================
-- RLS Policies
-- ============================================================================

-- Provider Tier History: Read-only for providers, write for system
ALTER TABLE provider_tier_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view their own tier history"
  ON provider_tier_history FOR SELECT
  USING (provider_id IN (
    SELECT id FROM providers WHERE profile_id = auth.uid()
  ));

-- Provider Addons: Providers can view their own
ALTER TABLE provider_addons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Providers can view their own addons"
  ON provider_addons FOR SELECT
  USING (provider_id IN (
    SELECT id FROM providers WHERE profile_id = auth.uid()
  ));

-- Sponsor Tile Waitlist: Sponsors can view their own position
ALTER TABLE sponsor_tile_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sponsors can view their own waitlist positions"
  ON sponsor_tile_waitlist FOR SELECT
  USING (profile_id = auth.uid());

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE provider_tier_history IS 'Audit log of provider tier status changes (ADDENDUM E)';
COMMENT ON TABLE provider_addons IS 'Provider add-on purchases: Priority Dispatch, Instant Payout, Maintenance Plans (ADDENDUM C)';
COMMENT ON TABLE sponsor_tile_waitlist IS 'Queue for sponsor tile slots in full territories (ADDENDUM D)';
COMMENT ON COLUMN invoices.total_captured_cents IS 'Total amount captured including homeowner platform fee';
COMMENT ON COLUMN invoices.homeowner_platform_fee_cents IS 'Platform fee charged to homeowner (separate from provider commission)';
