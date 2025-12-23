-- ============================================================================
-- REGULARUPKEEP PRICING, PAYMENTS, & CRM OVERHAUL
-- Migration: 20241223_pricing_payments_crm_overhaul.sql
--
-- This migration implements:
-- 1. Admin config system (pricing without redeploy)
-- 2. Homeowner subscriptions & billing
-- 3. Marketplace payments (estimates, approvals, captures)
-- 4. Provider tiers (Verified/Preferred)
-- 5. Sponsor tiles system
-- 6. AI-assisted intake
-- 7. Provider CRM dashboard tables
-- 8. Analytics & KPIs
-- ============================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ADMIN CONFIG SYSTEM
-- Allows changing pricing/fees without redeploy
-- ============================================================================

CREATE TABLE IF NOT EXISTS admin_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  config_key TEXT UNIQUE NOT NULL,
  config_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default pricing config
INSERT INTO admin_config (config_key, config_value, description) VALUES
-- Homeowner pricing
('homeowner_pricing', '{
  "free_homes_limit": 2,
  "additional_home_monthly_cents": 250,
  "tenant_access_monthly_cents": 250,
  "sponsor_free_yearly_cents": 2500
}', 'Homeowner subscription pricing'),

-- Diagnostic/service fees by category
('diagnostic_fees', '{
  "hvac": {"fee_cents": 8900, "creditable": true},
  "plumbing": {"fee_cents": 7900, "creditable": true},
  "electrical": {"fee_cents": 8900, "creditable": true},
  "appliances": {"fee_cents": 6900, "creditable": true},
  "exterior": {"fee_cents": 5900, "creditable": true},
  "interior": {"fee_cents": 4900, "creditable": true},
  "landscaping": {"fee_cents": 0, "creditable": false},
  "pest_control": {"fee_cents": 0, "creditable": false},
  "safety": {"fee_cents": 4900, "creditable": true},
  "other": {"fee_cents": 4900, "creditable": true}
}', 'Diagnostic fees by service category'),

-- Homeowner platform fees (per completed job)
('homeowner_platform_fees', '{
  "tiers": [
    {"min_cents": 0, "max_cents": 10000, "fee_cents": 500},
    {"min_cents": 10001, "max_cents": 25000, "fee_cents": 750},
    {"min_cents": 25001, "max_cents": 50000, "fee_cents": 1000},
    {"min_cents": 50001, "max_cents": 100000, "fee_cents": 1500}
  ],
  "cap_cents": 2500
}', 'Homeowner platform fee tiers with cap'),

-- Provider fees
('provider_fees', '{
  "percentage": 8.0,
  "minimum_cents": 500
}', 'Provider fee percentage and minimum'),

-- Provider tier pricing
('provider_tiers', '{
  "verified": {"monthly_cents": 1000, "requirements": ["background_check", "insurance", "license"]},
  "preferred": {"monthly_cents": 1500, "requires_verified": true, "performance_thresholds": {
    "min_rating": 4.5,
    "min_completed_jobs": 10,
    "max_dispute_rate": 0.05,
    "min_response_time_hours": 4
  }}
}', 'Provider subscription tiers'),

-- Sponsor pricing
('sponsor_pricing', '{
  "local_sponsor_yearly_cents": 25000,
  "tiles_per_territory": 3,
  "sponsor_types": ["realtor", "insurance", "handyman"]
}', 'Sponsor tile pricing'),

-- Realtor referral program
('realtor_referral', '{
  "qualified_homeowners_threshold": 50,
  "reward": "free_sponsor_year",
  "anti_fraud": {
    "min_days_active": 30,
    "min_properties": 1,
    "require_verified_email": true
  }
}', 'Realtor referral incentive program'),

-- Marketplace payment settings
('marketplace_payments', '{
  "estimate_buffer_percentage": 15,
  "change_order_threshold_percentage": 10,
  "auto_approve_hours": 24,
  "dispute_window_hours": 72,
  "hold_period_hours": 72
}', 'Marketplace payment flow settings'),

-- Media requirements by category
('media_requirements', '{
  "hvac": {"min_photos": 2, "video_required": false, "emergency_exception": true},
  "plumbing": {"min_photos": 2, "video_required": false, "emergency_exception": true},
  "electrical": {"min_photos": 2, "video_required": false, "emergency_exception": true},
  "appliances": {"min_photos": 2, "video_required": false, "emergency_exception": true},
  "exterior": {"min_photos": 3, "video_required": false, "emergency_exception": false},
  "interior": {"min_photos": 2, "video_required": false, "emergency_exception": false},
  "landscaping": {"min_photos": 3, "video_required": false, "emergency_exception": false},
  "pest_control": {"min_photos": 1, "video_required": false, "emergency_exception": false},
  "safety": {"min_photos": 2, "video_required": false, "emergency_exception": true},
  "other": {"min_photos": 1, "video_required": false, "emergency_exception": true}
}', 'Media requirements by service category'),

-- Feature flags
('feature_flags', '{
  "ai_intake_enabled": true,
  "sponsor_tiles_enabled": true,
  "marketplace_payments_enabled": true,
  "provider_crm_enabled": true,
  "realtor_referral_enabled": true
}', 'Feature flags for gradual rollout');

-- ============================================================================
-- 2. HOMEOWNER SUBSCRIPTIONS
-- ============================================================================

-- Homeowner subscription status
CREATE TYPE homeowner_subscription_status AS ENUM (
  'trialing', 'active', 'past_due', 'canceled', 'paused'
);

CREATE TABLE IF NOT EXISTS homeowner_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE,
  stripe_customer_id TEXT,
  status homeowner_subscription_status NOT NULL DEFAULT 'trialing',

  -- Computed billing
  active_homes_count INTEGER NOT NULL DEFAULT 0,
  billable_homes_count INTEGER NOT NULL DEFAULT 0, -- homes beyond free tier
  tenant_access_homes TEXT[] DEFAULT '{}', -- property IDs with tenant access
  sponsor_free_enabled BOOLEAN DEFAULT FALSE,

  -- Billing amounts (cents)
  homes_monthly_cents INTEGER NOT NULL DEFAULT 0,
  tenant_access_monthly_cents INTEGER NOT NULL DEFAULT 0,
  sponsor_free_yearly_cents INTEGER DEFAULT NULL,
  total_monthly_cents INTEGER NOT NULL DEFAULT 0,

  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  canceled_at TIMESTAMPTZ,

  -- Trial
  trial_start TIMESTAMPTZ,
  trial_end TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_homeowner_subs_customer ON homeowner_subscriptions(customer_id);
CREATE INDEX idx_homeowner_subs_stripe ON homeowner_subscriptions(stripe_subscription_id);
CREATE INDEX idx_homeowner_subs_status ON homeowner_subscriptions(status);

-- ============================================================================
-- 3. PAYMENT METHODS & TRANSACTIONS
-- ============================================================================

CREATE TYPE payment_method_type AS ENUM ('card', 'us_bank_account', 'link');

CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  stripe_payment_method_id TEXT UNIQUE NOT NULL,
  type payment_method_type NOT NULL,

  -- Card details (if card)
  card_brand TEXT,
  card_last4 TEXT,
  card_exp_month INTEGER,
  card_exp_year INTEGER,

  -- Bank details (if bank)
  bank_name TEXT,
  bank_last4 TEXT,

  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_profile ON payment_methods(profile_id);

-- Transaction types
CREATE TYPE transaction_type AS ENUM (
  'subscription_payment',
  'diagnostic_fee',
  'service_payment',
  'platform_fee',
  'provider_payout',
  'refund',
  'dispute_credit',
  'sponsor_payment'
);

CREATE TYPE transaction_status AS ENUM (
  'pending', 'processing', 'succeeded', 'failed', 'refunded', 'disputed'
);

CREATE TABLE IF NOT EXISTS transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Relationships
  profile_id UUID REFERENCES profiles(id),
  booking_id UUID REFERENCES bookings(id),
  service_request_id UUID, -- Will reference service_requests
  subscription_id UUID REFERENCES homeowner_subscriptions(id),

  -- Stripe references
  stripe_payment_intent_id TEXT,
  stripe_charge_id TEXT,
  stripe_transfer_id TEXT,
  stripe_refund_id TEXT,

  -- Transaction details
  type transaction_type NOT NULL,
  status transaction_status NOT NULL DEFAULT 'pending',
  amount_cents INTEGER NOT NULL,
  fee_cents INTEGER DEFAULT 0,
  net_cents INTEGER NOT NULL, -- amount - fee
  currency TEXT DEFAULT 'usd',

  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  failure_reason TEXT,

  -- Idempotency
  idempotency_key TEXT UNIQUE,

  -- Timestamps
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transactions_profile ON transactions(profile_id);
CREATE INDEX idx_transactions_booking ON transactions(booking_id);
CREATE INDEX idx_transactions_stripe_pi ON transactions(stripe_payment_intent_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_status ON transactions(status);
CREATE INDEX idx_transactions_created ON transactions(created_at);

-- ============================================================================
-- 4. PROVIDER STRIPE CONNECT
-- ============================================================================

CREATE TYPE provider_stripe_status AS ENUM (
  'not_started', 'pending', 'active', 'restricted', 'disabled'
);

CREATE TABLE IF NOT EXISTS provider_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id TEXT UNIQUE,
  status provider_stripe_status NOT NULL DEFAULT 'not_started',

  -- Onboarding
  onboarding_complete BOOLEAN DEFAULT FALSE,
  charges_enabled BOOLEAN DEFAULT FALSE,
  payouts_enabled BOOLEAN DEFAULT FALSE,
  details_submitted BOOLEAN DEFAULT FALSE,

  -- Payout settings
  payout_schedule TEXT DEFAULT 'daily', -- daily, weekly, monthly

  -- Balance
  available_balance_cents INTEGER DEFAULT 0,
  pending_balance_cents INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provider_stripe_provider ON provider_stripe_accounts(provider_id);
CREATE INDEX idx_provider_stripe_account ON provider_stripe_accounts(stripe_account_id);

-- ============================================================================
-- 5. PROVIDER TIERS (Verified & Preferred)
-- ============================================================================

CREATE TYPE provider_tier AS ENUM ('basic', 'verified', 'preferred');

CREATE TABLE IF NOT EXISTS provider_subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE UNIQUE,
  stripe_subscription_id TEXT UNIQUE,

  tier provider_tier NOT NULL DEFAULT 'basic',
  status homeowner_subscription_status NOT NULL DEFAULT 'active',

  -- Verification requirements met
  background_check_completed BOOLEAN DEFAULT FALSE,
  background_check_date TIMESTAMPTZ,
  insurance_verified BOOLEAN DEFAULT FALSE,
  insurance_expiry DATE,
  license_verified BOOLEAN DEFAULT FALSE,
  license_expiry DATE,

  -- Monthly amount
  monthly_cents INTEGER DEFAULT 0,

  -- Billing period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provider_subs_provider ON provider_subscriptions(provider_id);
CREATE INDEX idx_provider_subs_tier ON provider_subscriptions(tier);

-- Provider performance metrics (for Preferred qualification)
CREATE TABLE IF NOT EXISTS provider_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE UNIQUE,

  -- Ratings
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,

  -- Job stats
  total_jobs_completed INTEGER DEFAULT 0,
  total_jobs_disputed INTEGER DEFAULT 0,
  dispute_rate DECIMAL(5,4) DEFAULT 0,

  -- Response time (avg hours to first response)
  avg_response_time_hours DECIMAL(6,2) DEFAULT 0,

  -- Completion rate
  jobs_completed_on_time INTEGER DEFAULT 0,
  on_time_rate DECIMAL(5,4) DEFAULT 0,

  -- Revenue
  total_revenue_cents BIGINT DEFAULT 0,
  last_30_days_revenue_cents INTEGER DEFAULT 0,

  -- Qualifies for preferred
  qualifies_for_preferred BOOLEAN DEFAULT FALSE,
  last_qualification_check TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provider_metrics_provider ON provider_metrics(provider_id);
CREATE INDEX idx_provider_metrics_preferred ON provider_metrics(qualifies_for_preferred);

-- ============================================================================
-- 6. SERVICE REQUESTS (Enhanced Intake)
-- ============================================================================

CREATE TYPE service_request_status AS ENUM (
  'draft',
  'submitted',
  'ai_processing',
  'pending_provider',
  'estimate_received',
  'estimate_approved',
  'in_progress',
  'pending_completion',
  'completed',
  'disputed',
  'canceled'
);

CREATE TYPE urgency_level AS ENUM ('emergency', 'urgent', 'standard', 'flexible');

CREATE TABLE IF NOT EXISTS service_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  request_number TEXT UNIQUE NOT NULL,

  -- Relationships
  customer_id UUID NOT NULL REFERENCES customers(id),
  property_id UUID NOT NULL REFERENCES properties(id),
  provider_id UUID REFERENCES providers(id),
  booking_id UUID REFERENCES bookings(id),

  -- Request details
  category TEXT NOT NULL, -- matches MaintenanceCategory
  title TEXT NOT NULL,
  description TEXT,
  urgency urgency_level NOT NULL DEFAULT 'standard',
  status service_request_status NOT NULL DEFAULT 'draft',

  -- Media (mandatory by category)
  photos TEXT[] DEFAULT '{}',
  videos TEXT[] DEFAULT '{}',
  media_requirements_met BOOLEAN DEFAULT FALSE,
  emergency_media_exception BOOLEAN DEFAULT FALSE,

  -- AI-assisted intake
  ai_summary TEXT,
  ai_follow_up_questions JSONB DEFAULT '[]',
  ai_follow_up_answers JSONB DEFAULT '{}',
  ai_provider_brief TEXT, -- Summary for provider (no pricing)
  ai_processing_status TEXT, -- 'pending', 'completed', 'failed'

  -- Diagnostic fee
  diagnostic_fee_cents INTEGER DEFAULT 0,
  diagnostic_fee_paid BOOLEAN DEFAULT FALSE,
  diagnostic_fee_creditable BOOLEAN DEFAULT TRUE,
  diagnostic_payment_intent_id TEXT,

  -- Scheduling preference
  preferred_date DATE,
  preferred_time_start TIME,
  preferred_time_end TIME,
  flexible_scheduling BOOLEAN DEFAULT TRUE,

  -- Timestamps
  submitted_at TIMESTAMPTZ,
  provider_assigned_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  canceled_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_service_requests_customer ON service_requests(customer_id);
CREATE INDEX idx_service_requests_property ON service_requests(property_id);
CREATE INDEX idx_service_requests_provider ON service_requests(provider_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_category ON service_requests(category);

-- Update transactions table FK
ALTER TABLE transactions
ADD CONSTRAINT fk_transactions_service_request
FOREIGN KEY (service_request_id) REFERENCES service_requests(id);

-- ============================================================================
-- 7. ESTIMATES & CHANGE ORDERS
-- ============================================================================

CREATE TYPE estimate_status AS ENUM (
  'draft', 'sent', 'viewed', 'approved', 'rejected', 'expired', 'superseded'
);

CREATE TABLE IF NOT EXISTS estimates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  estimate_number TEXT UNIQUE NOT NULL,

  -- Relationships
  service_request_id UUID NOT NULL REFERENCES service_requests(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  customer_id UUID NOT NULL REFERENCES customers(id),

  -- Amounts
  labor_cents INTEGER NOT NULL DEFAULT 0,
  materials_cents INTEGER NOT NULL DEFAULT 0,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,

  -- Buffer for authorization
  buffer_percentage INTEGER DEFAULT 15,
  buffer_cents INTEGER DEFAULT 0,
  authorization_total_cents INTEGER NOT NULL DEFAULT 0, -- total + buffer

  -- Line items
  line_items JSONB NOT NULL DEFAULT '[]',
  -- Format: [{description, quantity, unit_price_cents, total_cents, type: 'labor'|'material'}]

  -- Status
  status estimate_status NOT NULL DEFAULT 'draft',
  valid_until TIMESTAMPTZ,

  -- Provider notes (internal)
  provider_notes TEXT,

  -- Customer facing
  scope_of_work TEXT,
  estimated_duration_hours DECIMAL(5,2),
  warranty_terms TEXT,

  -- Payment intent (manual capture)
  stripe_payment_intent_id TEXT,
  authorized_at TIMESTAMPTZ,

  -- Timestamps
  sent_at TIMESTAMPTZ,
  viewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_estimates_request ON estimates(service_request_id);
CREATE INDEX idx_estimates_provider ON estimates(provider_id);
CREATE INDEX idx_estimates_customer ON estimates(customer_id);
CREATE INDEX idx_estimates_status ON estimates(status);

-- Change orders (for work exceeding estimate)
CREATE TYPE change_order_status AS ENUM (
  'pending', 'approved', 'rejected', 'expired'
);

CREATE TABLE IF NOT EXISTS change_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  change_order_number TEXT UNIQUE NOT NULL,

  -- Relationships
  estimate_id UUID NOT NULL REFERENCES estimates(id),
  service_request_id UUID NOT NULL REFERENCES service_requests(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  customer_id UUID NOT NULL REFERENCES customers(id),

  -- Original vs new
  original_total_cents INTEGER NOT NULL,
  additional_cents INTEGER NOT NULL,
  new_total_cents INTEGER NOT NULL,

  -- Change details
  reason TEXT NOT NULL,
  line_items JSONB NOT NULL DEFAULT '[]',
  photos TEXT[] DEFAULT '{}', -- Supporting photos

  -- Status
  status change_order_status NOT NULL DEFAULT 'pending',

  -- Timestamps
  submitted_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ,
  rejected_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_change_orders_estimate ON change_orders(estimate_id);
CREATE INDEX idx_change_orders_request ON change_orders(service_request_id);
CREATE INDEX idx_change_orders_status ON change_orders(status);

-- ============================================================================
-- 8. INVOICES & DISPUTES
-- ============================================================================

CREATE TYPE invoice_status AS ENUM (
  'draft', 'pending_approval', 'approved', 'auto_approved', 'disputed', 'paid', 'refunded'
);

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  invoice_number TEXT UNIQUE NOT NULL,

  -- Relationships
  service_request_id UUID NOT NULL REFERENCES service_requests(id),
  estimate_id UUID REFERENCES estimates(id),
  provider_id UUID NOT NULL REFERENCES providers(id),
  customer_id UUID NOT NULL REFERENCES customers(id),

  -- Amounts
  labor_cents INTEGER NOT NULL DEFAULT 0,
  materials_cents INTEGER NOT NULL DEFAULT 0,
  subtotal_cents INTEGER NOT NULL DEFAULT 0,

  -- Credits
  diagnostic_credit_cents INTEGER DEFAULT 0, -- Credited diagnostic fee

  -- Fees
  homeowner_platform_fee_cents INTEGER DEFAULT 0,
  provider_fee_cents INTEGER DEFAULT 0,
  provider_fee_percentage DECIMAL(5,2) DEFAULT 8.0,

  -- Taxes
  tax_cents INTEGER DEFAULT 0,

  -- Totals
  total_cents INTEGER NOT NULL DEFAULT 0,
  provider_net_cents INTEGER NOT NULL DEFAULT 0, -- What provider receives

  -- Line items
  line_items JSONB NOT NULL DEFAULT '[]',

  -- Completion details
  work_summary TEXT,
  completion_photos TEXT[] DEFAULT '{}',
  completion_notes TEXT,

  -- Status
  status invoice_status NOT NULL DEFAULT 'draft',

  -- Payment
  stripe_payment_intent_id TEXT, -- For capture
  captured_at TIMESTAMPTZ,

  -- Auto-approval
  auto_approve_at TIMESTAMPTZ,

  -- Timestamps
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invoices_request ON invoices(service_request_id);
CREATE INDEX idx_invoices_provider ON invoices(provider_id);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_status ON invoices(status);

-- Disputes
CREATE TYPE dispute_status AS ENUM (
  'open', 'under_review', 'resolved_customer_favor', 'resolved_provider_favor', 'closed'
);

CREATE TYPE dispute_reason AS ENUM (
  'work_not_completed',
  'work_quality',
  'overcharged',
  'unauthorized_work',
  'damage_caused',
  'other'
);

CREATE TABLE IF NOT EXISTS disputes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  dispute_number TEXT UNIQUE NOT NULL,

  -- Relationships
  invoice_id UUID NOT NULL REFERENCES invoices(id),
  service_request_id UUID NOT NULL REFERENCES service_requests(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  provider_id UUID NOT NULL REFERENCES providers(id),

  -- Dispute details
  reason dispute_reason NOT NULL,
  description TEXT NOT NULL,
  evidence_photos TEXT[] DEFAULT '{}',

  -- Amounts
  disputed_amount_cents INTEGER NOT NULL,

  -- Status
  status dispute_status NOT NULL DEFAULT 'open',

  -- Resolution
  resolution_notes TEXT,
  refund_amount_cents INTEGER,
  resolved_by UUID REFERENCES profiles(id),
  resolved_at TIMESTAMPTZ,

  -- Window tracking
  dispute_window_ends_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_disputes_invoice ON disputes(invoice_id);
CREATE INDEX idx_disputes_customer ON disputes(customer_id);
CREATE INDEX idx_disputes_provider ON disputes(provider_id);
CREATE INDEX idx_disputes_status ON disputes(status);

-- ============================================================================
-- 9. SPONSOR TILES SYSTEM
-- ============================================================================

CREATE TYPE sponsor_type AS ENUM ('realtor', 'insurance', 'handyman');
CREATE TYPE sponsor_status AS ENUM ('pending', 'active', 'expired', 'canceled');

-- Territories for sponsor inventory
CREATE TABLE IF NOT EXISTS territories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,

  -- Geographic bounds (could be zip codes, counties, etc.)
  zip_codes TEXT[] DEFAULT '{}',
  counties TEXT[] DEFAULT '{}',
  state TEXT,

  -- Inventory limits
  max_sponsor_tiles INTEGER DEFAULT 3,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_territories_active ON territories(is_active);

-- Sponsor advertisers
CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Account owner
  profile_id UUID REFERENCES profiles(id),

  -- Business info
  business_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  website TEXT,
  logo_url TEXT,

  -- Sponsor type
  sponsor_type sponsor_type NOT NULL,

  -- Stripe
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,

  -- Status
  status sponsor_status NOT NULL DEFAULT 'pending',

  -- Referral tracking (for realtors)
  referral_code TEXT UNIQUE,
  referred_homeowners_count INTEGER DEFAULT 0,
  qualified_homeowners_count INTEGER DEFAULT 0,
  free_year_earned BOOLEAN DEFAULT FALSE,
  free_year_expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_sponsors_type ON sponsors(sponsor_type);
CREATE INDEX idx_sponsors_status ON sponsors(status);
CREATE INDEX idx_sponsors_referral ON sponsors(referral_code);

-- Sponsor tile assignments
CREATE TABLE IF NOT EXISTS sponsor_tiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id) ON DELETE CASCADE,
  territory_id UUID NOT NULL REFERENCES territories(id),

  -- Position (1, 2, 3 within territory)
  tile_position INTEGER NOT NULL CHECK (tile_position BETWEEN 1 AND 10),

  -- Content
  headline TEXT NOT NULL,
  description TEXT,
  cta_text TEXT DEFAULT 'Learn More',
  cta_url TEXT,
  image_url TEXT,

  -- Targeting
  target_categories TEXT[] DEFAULT '{}', -- Show on specific service categories

  -- Stats
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,

  -- Billing period
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(territory_id, tile_position, period_start)
);

CREATE INDEX idx_sponsor_tiles_sponsor ON sponsor_tiles(sponsor_id);
CREATE INDEX idx_sponsor_tiles_territory ON sponsor_tiles(territory_id);
CREATE INDEX idx_sponsor_tiles_active ON sponsor_tiles(is_active);

-- Referral tracking
CREATE TABLE IF NOT EXISTS sponsor_referrals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sponsor_id UUID NOT NULL REFERENCES sponsors(id),
  referred_customer_id UUID NOT NULL REFERENCES customers(id),

  -- Qualification tracking
  is_qualified BOOLEAN DEFAULT FALSE,
  qualified_at TIMESTAMPTZ,
  qualification_reason TEXT,

  -- Anti-fraud
  signup_ip TEXT,
  days_active INTEGER DEFAULT 0,
  properties_added INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(sponsor_id, referred_customer_id)
);

CREATE INDEX idx_sponsor_referrals_sponsor ON sponsor_referrals(sponsor_id);
CREATE INDEX idx_sponsor_referrals_qualified ON sponsor_referrals(is_qualified);

-- ============================================================================
-- 10. PROVIDER CRM
-- ============================================================================

-- Customer notes (provider's notes about their customers)
CREATE TABLE IF NOT EXISTS provider_customer_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  property_id UUID REFERENCES properties(id),

  note TEXT NOT NULL,
  note_type TEXT DEFAULT 'general', -- general, callback, issue, opportunity
  is_pinned BOOLEAN DEFAULT FALSE,

  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_provider_notes_provider ON provider_customer_notes(provider_id);
CREATE INDEX idx_provider_notes_customer ON provider_customer_notes(customer_id);

-- Follow-up tasks
CREATE TYPE follow_up_status AS ENUM ('pending', 'completed', 'skipped', 'overdue');

CREATE TABLE IF NOT EXISTS provider_follow_ups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  service_request_id UUID REFERENCES service_requests(id),

  title TEXT NOT NULL,
  description TEXT,
  due_date DATE NOT NULL,
  due_time TIME,

  status follow_up_status NOT NULL DEFAULT 'pending',
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES profiles(id),

  -- Recurrence
  is_recurring BOOLEAN DEFAULT FALSE,
  recurrence_pattern TEXT, -- 'weekly', 'monthly', 'quarterly', 'yearly'

  created_by UUID NOT NULL REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_follow_ups_provider ON provider_follow_ups(provider_id);
CREATE INDEX idx_follow_ups_due ON provider_follow_ups(due_date);
CREATE INDEX idx_follow_ups_status ON provider_follow_ups(status);

-- Message templates
CREATE TABLE IF NOT EXISTS provider_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  category TEXT NOT NULL, -- 'estimate', 'follow_up', 'review_request', 'promotion', 'general'
  subject TEXT,
  body TEXT NOT NULL,

  -- Variables like {{customer_name}}, {{property_address}}
  variables TEXT[] DEFAULT '{}',

  is_active BOOLEAN DEFAULT TRUE,
  use_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_templates_provider ON provider_templates(provider_id);
CREATE INDEX idx_templates_category ON provider_templates(category);

-- Review requests
CREATE TYPE review_request_status AS ENUM ('pending', 'sent', 'clicked', 'completed', 'expired');

CREATE TABLE IF NOT EXISTS review_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id),
  service_request_id UUID REFERENCES service_requests(id),
  invoice_id UUID REFERENCES invoices(id),

  status review_request_status NOT NULL DEFAULT 'pending',

  -- Send settings
  send_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ,

  -- Response tracking
  clicked_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,

  -- The review if completed
  rating INTEGER CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_review_requests_provider ON review_requests(provider_id);
CREATE INDEX idx_review_requests_status ON review_requests(status);

-- Pipeline stages for CRM
CREATE TABLE IF NOT EXISTS provider_pipeline_stages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3b82f6',
  position INTEGER NOT NULL,

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider_id, position)
);

-- Default pipeline stages (created via trigger)

-- ============================================================================
-- 11. ANALYTICS TABLES
-- ============================================================================

-- Platform-wide metrics (aggregated daily)
CREATE TABLE IF NOT EXISTS platform_metrics_daily (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  metric_date DATE NOT NULL UNIQUE,

  -- User metrics
  new_homeowners INTEGER DEFAULT 0,
  active_homeowners INTEGER DEFAULT 0,
  churned_homeowners INTEGER DEFAULT 0,

  new_providers INTEGER DEFAULT 0,
  active_providers INTEGER DEFAULT 0,
  verified_providers INTEGER DEFAULT 0,
  preferred_providers INTEGER DEFAULT 0,

  -- Property metrics
  new_properties INTEGER DEFAULT 0,
  total_active_properties INTEGER DEFAULT 0,

  -- Service request metrics
  new_service_requests INTEGER DEFAULT 0,
  completed_service_requests INTEGER DEFAULT 0,
  canceled_service_requests INTEGER DEFAULT 0,
  avg_request_to_complete_hours DECIMAL(10,2),

  -- Financial metrics (cents)
  total_gmv_cents BIGINT DEFAULT 0,
  total_platform_fees_cents BIGINT DEFAULT 0,
  total_provider_fees_cents BIGINT DEFAULT 0,
  total_subscription_revenue_cents BIGINT DEFAULT 0,
  total_sponsor_revenue_cents BIGINT DEFAULT 0,

  -- Dispute metrics
  new_disputes INTEGER DEFAULT 0,
  resolved_disputes INTEGER DEFAULT 0,
  dispute_rate DECIMAL(5,4),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_platform_metrics_date ON platform_metrics_daily(metric_date);

-- Provider-specific metrics (aggregated monthly)
CREATE TABLE IF NOT EXISTS provider_metrics_monthly (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id UUID NOT NULL REFERENCES providers(id),
  metric_month DATE NOT NULL, -- First of month

  -- Job metrics
  jobs_received INTEGER DEFAULT 0,
  jobs_completed INTEGER DEFAULT 0,
  jobs_canceled INTEGER DEFAULT 0,

  -- Revenue (cents)
  gross_revenue_cents BIGINT DEFAULT 0,
  platform_fees_cents BIGINT DEFAULT 0,
  net_revenue_cents BIGINT DEFAULT 0,

  -- Performance
  avg_rating DECIMAL(3,2),
  reviews_received INTEGER DEFAULT 0,
  avg_response_time_hours DECIMAL(6,2),
  on_time_completion_rate DECIMAL(5,4),

  -- Customer metrics
  new_customers INTEGER DEFAULT 0,
  repeat_customers INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(provider_id, metric_month)
);

CREATE INDEX idx_provider_metrics_monthly ON provider_metrics_monthly(provider_id, metric_month);

-- ============================================================================
-- 12. WEBHOOK EVENT LOG (for idempotency)
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  source TEXT NOT NULL, -- 'stripe', 'sendgrid', etc.
  event_id TEXT NOT NULL, -- External event ID
  event_type TEXT NOT NULL,

  payload JSONB NOT NULL,

  -- Processing status
  processed BOOLEAN DEFAULT FALSE,
  processed_at TIMESTAMPTZ,
  error TEXT,
  retry_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(source, event_id)
);

CREATE INDEX idx_webhook_events_source ON webhook_events(source, event_id);
CREATE INDEX idx_webhook_events_processed ON webhook_events(processed);

-- ============================================================================
-- 13. TRIGGERS & FUNCTIONS
-- ============================================================================

-- Function to generate sequential numbers
CREATE OR REPLACE FUNCTION generate_request_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
BEGIN
  SELECT 'SR-' || LPAD((COALESCE(MAX(SUBSTRING(request_number FROM 4)::INTEGER), 0) + 1)::TEXT, 6, '0')
  INTO new_number
  FROM service_requests;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_estimate_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
BEGIN
  SELECT 'EST-' || LPAD((COALESCE(MAX(SUBSTRING(estimate_number FROM 5)::INTEGER), 0) + 1)::TEXT, 6, '0')
  INTO new_number
  FROM estimates;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
BEGIN
  SELECT 'INV-' || LPAD((COALESCE(MAX(SUBSTRING(invoice_number FROM 5)::INTEGER), 0) + 1)::TEXT, 6, '0')
  INTO new_number
  FROM invoices;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_dispute_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
BEGIN
  SELECT 'DSP-' || LPAD((COALESCE(MAX(SUBSTRING(dispute_number FROM 5)::INTEGER), 0) + 1)::TEXT, 6, '0')
  INTO new_number
  FROM disputes;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION generate_change_order_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
BEGIN
  SELECT 'CO-' || LPAD((COALESCE(MAX(SUBSTRING(change_order_number FROM 4)::INTEGER), 0) + 1)::TEXT, 6, '0')
  INTO new_number
  FROM change_orders;
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Auto-generate numbers on insert
CREATE OR REPLACE FUNCTION set_request_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_number IS NULL THEN
    NEW.request_number := generate_request_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_service_request_number
  BEFORE INSERT ON service_requests
  FOR EACH ROW
  EXECUTE FUNCTION set_request_number();

CREATE OR REPLACE FUNCTION set_estimate_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estimate_number IS NULL THEN
    NEW.estimate_number := generate_estimate_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_estimate_number
  BEFORE INSERT ON estimates
  FOR EACH ROW
  EXECUTE FUNCTION set_estimate_number();

CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_invoice_number
  BEFORE INSERT ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

CREATE OR REPLACE FUNCTION set_dispute_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dispute_number IS NULL THEN
    NEW.dispute_number := generate_dispute_number();
  END IF;
  -- Set dispute window end
  IF NEW.dispute_window_ends_at IS NULL THEN
    NEW.dispute_window_ends_at := NOW() + INTERVAL '72 hours';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_dispute_number
  BEFORE INSERT ON disputes
  FOR EACH ROW
  EXECUTE FUNCTION set_dispute_number();

CREATE OR REPLACE FUNCTION set_change_order_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.change_order_number IS NULL THEN
    NEW.change_order_number := generate_change_order_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_change_order_number
  BEFORE INSERT ON change_orders
  FOR EACH ROW
  EXECUTE FUNCTION set_change_order_number();

-- Function to update provider metrics
CREATE OR REPLACE FUNCTION update_provider_metrics(p_provider_id UUID)
RETURNS VOID AS $$
DECLARE
  v_avg_rating DECIMAL(3,2);
  v_total_ratings INTEGER;
  v_total_completed INTEGER;
  v_total_disputed INTEGER;
  v_avg_response DECIMAL(6,2);
BEGIN
  -- Calculate average rating from review_requests
  SELECT AVG(rating), COUNT(*)
  INTO v_avg_rating, v_total_ratings
  FROM review_requests
  WHERE provider_id = p_provider_id AND rating IS NOT NULL;

  -- Calculate job stats
  SELECT COUNT(*) INTO v_total_completed
  FROM service_requests
  WHERE provider_id = p_provider_id AND status = 'completed';

  SELECT COUNT(*) INTO v_total_disputed
  FROM disputes
  WHERE provider_id = p_provider_id;

  -- Update or insert metrics
  INSERT INTO provider_metrics (
    provider_id,
    average_rating,
    total_ratings,
    total_jobs_completed,
    total_jobs_disputed,
    dispute_rate,
    updated_at
  ) VALUES (
    p_provider_id,
    COALESCE(v_avg_rating, 0),
    COALESCE(v_total_ratings, 0),
    COALESCE(v_total_completed, 0),
    COALESCE(v_total_disputed, 0),
    CASE WHEN v_total_completed > 0
      THEN v_total_disputed::DECIMAL / v_total_completed
      ELSE 0
    END,
    NOW()
  )
  ON CONFLICT (provider_id) DO UPDATE SET
    average_rating = EXCLUDED.average_rating,
    total_ratings = EXCLUDED.total_ratings,
    total_jobs_completed = EXCLUDED.total_jobs_completed,
    total_jobs_disputed = EXCLUDED.total_jobs_disputed,
    dispute_rate = EXCLUDED.dispute_rate,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to check preferred qualification
CREATE OR REPLACE FUNCTION check_preferred_qualification(p_provider_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_metrics provider_metrics%ROWTYPE;
  v_config JSONB;
  v_thresholds JSONB;
BEGIN
  -- Get current metrics
  SELECT * INTO v_metrics FROM provider_metrics WHERE provider_id = p_provider_id;
  IF NOT FOUND THEN RETURN FALSE; END IF;

  -- Get thresholds from config
  SELECT config_value INTO v_config FROM admin_config WHERE config_key = 'provider_tiers';
  v_thresholds := v_config->'preferred'->'performance_thresholds';

  -- Check all thresholds
  RETURN (
    v_metrics.average_rating >= (v_thresholds->>'min_rating')::DECIMAL AND
    v_metrics.total_jobs_completed >= (v_thresholds->>'min_completed_jobs')::INTEGER AND
    v_metrics.dispute_rate <= (v_thresholds->>'max_dispute_rate')::DECIMAL AND
    v_metrics.avg_response_time_hours <= (v_thresholds->>'min_response_time_hours')::DECIMAL
  );
END;
$$ LANGUAGE plpgsql;

-- Function to calculate homeowner platform fee
CREATE OR REPLACE FUNCTION calculate_homeowner_platform_fee(p_amount_cents INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_config JSONB;
  v_tiers JSONB;
  v_tier JSONB;
  v_fee INTEGER := 0;
  v_cap INTEGER;
BEGIN
  SELECT config_value INTO v_config FROM admin_config WHERE config_key = 'homeowner_platform_fees';
  v_tiers := v_config->'tiers';
  v_cap := (v_config->>'cap_cents')::INTEGER;

  FOR v_tier IN SELECT * FROM jsonb_array_elements(v_tiers)
  LOOP
    IF p_amount_cents >= (v_tier->>'min_cents')::INTEGER AND
       p_amount_cents <= (v_tier->>'max_cents')::INTEGER THEN
      v_fee := (v_tier->>'fee_cents')::INTEGER;
      EXIT;
    END IF;
  END LOOP;

  -- Apply cap
  RETURN LEAST(v_fee, v_cap);
END;
$$ LANGUAGE plpgsql;

-- Function to calculate provider fee
CREATE OR REPLACE FUNCTION calculate_provider_fee(p_amount_cents INTEGER)
RETURNS INTEGER AS $$
DECLARE
  v_config JSONB;
  v_percentage DECIMAL;
  v_minimum INTEGER;
  v_calculated INTEGER;
BEGIN
  SELECT config_value INTO v_config FROM admin_config WHERE config_key = 'provider_fees';
  v_percentage := (v_config->>'percentage')::DECIMAL;
  v_minimum := (v_config->>'minimum_cents')::INTEGER;

  v_calculated := (p_amount_cents * v_percentage / 100)::INTEGER;

  RETURN GREATEST(v_calculated, v_minimum);
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 14. DEFAULT DATA SETUP
-- ============================================================================

-- Create default territories (can be expanded)
INSERT INTO territories (name, state, zip_codes, max_sponsor_tiles) VALUES
('Eastern NC - Greenville Area', 'NC', ARRAY['27858', '27834', '27889', '27833', '27835'], 3),
('Eastern NC - New Bern Area', 'NC', ARRAY['28560', '28562', '28563', '28564'], 3),
('Eastern NC - Jacksonville Area', 'NC', ARRAY['28540', '28546', '28544', '28545'], 3)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 15. RLS POLICIES
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE homeowner_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_stripe_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE territories ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_tiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsor_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_customer_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_follow_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE platform_metrics_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE provider_metrics_monthly ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Admin config: Only admins can modify, all authenticated can read
CREATE POLICY admin_config_read ON admin_config FOR SELECT TO authenticated USING (true);
CREATE POLICY admin_config_modify ON admin_config FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Homeowner subscriptions: Customers see own, admins see all
CREATE POLICY homeowner_subs_own ON homeowner_subscriptions FOR ALL TO authenticated
  USING (customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Payment methods: Users see own
CREATE POLICY payment_methods_own ON payment_methods FOR ALL TO authenticated
  USING (profile_id = auth.uid());

-- Transactions: Users see own (as payer or payee)
CREATE POLICY transactions_own ON transactions FOR SELECT TO authenticated
  USING (
    profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Provider Stripe accounts: Provider owners see own
CREATE POLICY provider_stripe_own ON provider_stripe_accounts FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Provider subscriptions: Provider sees own, admins see all
CREATE POLICY provider_subs_own ON provider_subscriptions FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Provider metrics: Provider sees own, admins see all
CREATE POLICY provider_metrics_read ON provider_metrics FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Service requests: Customer/provider/admin can see relevant ones
CREATE POLICY service_requests_customer ON service_requests FOR ALL TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
    OR provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Estimates: Customer and provider can see
CREATE POLICY estimates_access ON estimates FOR ALL TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
    OR provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Change orders: Customer and provider can see
CREATE POLICY change_orders_access ON change_orders FOR ALL TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
    OR provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Invoices: Customer and provider can see
CREATE POLICY invoices_access ON invoices FOR ALL TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
    OR provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Disputes: Customer and provider can see, admins manage
CREATE POLICY disputes_access ON disputes FOR ALL TO authenticated
  USING (
    customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid())
    OR provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Territories: Public read
CREATE POLICY territories_read ON territories FOR SELECT TO authenticated USING (true);

-- Sponsors: Own account, admins see all
CREATE POLICY sponsors_own ON sponsors FOR ALL TO authenticated
  USING (profile_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Sponsor tiles: Public read (for display), owner/admin manage
CREATE POLICY sponsor_tiles_read ON sponsor_tiles FOR SELECT TO authenticated USING (true);
CREATE POLICY sponsor_tiles_manage ON sponsor_tiles FOR ALL TO authenticated
  USING (sponsor_id IN (SELECT id FROM sponsors WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Sponsor referrals: Sponsor sees own
CREATE POLICY sponsor_referrals_own ON sponsor_referrals FOR SELECT TO authenticated
  USING (sponsor_id IN (SELECT id FROM sponsors WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Provider CRM tables: Provider sees own
CREATE POLICY provider_notes_own ON provider_customer_notes FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()));

CREATE POLICY provider_follow_ups_own ON provider_follow_ups FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()));

CREATE POLICY provider_templates_own ON provider_templates FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()));

CREATE POLICY review_requests_provider ON review_requests FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid())
    OR customer_id IN (SELECT id FROM customers WHERE profile_id = auth.uid()));

CREATE POLICY pipeline_stages_own ON provider_pipeline_stages FOR ALL TO authenticated
  USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid()));

-- Platform metrics: Admin only
CREATE POLICY platform_metrics_admin ON platform_metrics_daily FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Provider monthly metrics: Provider sees own, admin sees all
CREATE POLICY provider_monthly_metrics ON provider_metrics_monthly FOR SELECT TO authenticated
  USING (provider_id IN (SELECT id FROM providers WHERE profile_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Webhook events: Admin only
CREATE POLICY webhook_events_admin ON webhook_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- 16. UPDATED_AT TRIGGERS
-- ============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all new tables
CREATE TRIGGER update_admin_config_updated_at BEFORE UPDATE ON admin_config
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_homeowner_subs_updated_at BEFORE UPDATE ON homeowner_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_stripe_updated_at BEFORE UPDATE ON provider_stripe_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_subs_updated_at BEFORE UPDATE ON provider_subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_metrics_updated_at BEFORE UPDATE ON provider_metrics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_service_requests_updated_at BEFORE UPDATE ON service_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_estimates_updated_at BEFORE UPDATE ON estimates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_change_orders_updated_at BEFORE UPDATE ON change_orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_disputes_updated_at BEFORE UPDATE ON disputes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_territories_updated_at BEFORE UPDATE ON territories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sponsors_updated_at BEFORE UPDATE ON sponsors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sponsor_tiles_updated_at BEFORE UPDATE ON sponsor_tiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sponsor_referrals_updated_at BEFORE UPDATE ON sponsor_referrals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_notes_updated_at BEFORE UPDATE ON provider_customer_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_follow_ups_updated_at BEFORE UPDATE ON provider_follow_ups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_provider_templates_updated_at BEFORE UPDATE ON provider_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_review_requests_updated_at BEFORE UPDATE ON review_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pipeline_stages_updated_at BEFORE UPDATE ON provider_pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
