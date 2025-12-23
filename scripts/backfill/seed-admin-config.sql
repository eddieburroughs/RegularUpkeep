-- Seed Admin Config
-- This script initializes the admin_config table with default values.
-- Run this after creating the admin_config table.

-- Insert or update homeowner pricing
INSERT INTO admin_config (config_key, config_value, updated_at)
VALUES (
  'homeowner_pricing',
  '{
    "free_homes_limit": 2,
    "additional_home_monthly_cents": 250,
    "tenant_access_monthly_cents": 250,
    "sponsor_free_yearly_cents": 2500
  }'::jsonb,
  now()
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- Insert or update diagnostic fees
INSERT INTO admin_config (config_key, config_value, updated_at)
VALUES (
  'diagnostic_fees',
  '{
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
  }'::jsonb,
  now()
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- Insert or update homeowner platform fees
INSERT INTO admin_config (config_key, config_value, updated_at)
VALUES (
  'homeowner_platform_fees',
  '{
    "tiers": [
      {"min_cents": 0, "max_cents": 10000, "fee_cents": 500},
      {"min_cents": 10001, "max_cents": 25000, "fee_cents": 750},
      {"min_cents": 25001, "max_cents": 50000, "fee_cents": 1000},
      {"min_cents": 50001, "max_cents": 100000, "fee_cents": 1500}
    ],
    "cap_cents": 2500
  }'::jsonb,
  now()
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- Insert or update provider fees
INSERT INTO admin_config (config_key, config_value, updated_at)
VALUES (
  'provider_fees',
  '{
    "percentage": 8.0,
    "minimum_cents": 500
  }'::jsonb,
  now()
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- Insert or update provider tiers
INSERT INTO admin_config (config_key, config_value, updated_at)
VALUES (
  'provider_tiers',
  '{
    "verified": {
      "monthly_cents": 1000,
      "requirements": ["background_check", "insurance", "license"]
    },
    "preferred": {
      "monthly_cents": 1500,
      "requires_verified": true,
      "performance_thresholds": {
        "min_rating": 4.5,
        "min_completed_jobs": 10,
        "max_dispute_rate": 0.05,
        "min_response_time_hours": 4
      }
    }
  }'::jsonb,
  now()
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- Insert or update sponsor pricing
INSERT INTO admin_config (config_key, config_value, updated_at)
VALUES (
  'sponsor_pricing',
  '{
    "local_sponsor_yearly_cents": 25000,
    "tiles_per_territory": 3,
    "sponsor_types": ["realtor", "insurance", "handyman"]
  }'::jsonb,
  now()
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- Insert or update realtor referral program
INSERT INTO admin_config (config_key, config_value, updated_at)
VALUES (
  'realtor_referral',
  '{
    "qualified_homeowners_threshold": 50,
    "reward": "free_sponsor_year",
    "anti_fraud": {
      "min_days_active": 30,
      "min_properties": 1,
      "require_verified_email": true
    }
  }'::jsonb,
  now()
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- Insert or update marketplace payments
INSERT INTO admin_config (config_key, config_value, updated_at)
VALUES (
  'marketplace_payments',
  '{
    "estimate_buffer_percentage": 15,
    "change_order_threshold_percentage": 10,
    "auto_approve_hours": 24,
    "dispute_window_hours": 72,
    "hold_period_hours": 72
  }'::jsonb,
  now()
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- Insert or update media requirements
INSERT INTO admin_config (config_key, config_value, updated_at)
VALUES (
  'media_requirements',
  '{
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
  }'::jsonb,
  now()
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- Insert or update feature flags
INSERT INTO admin_config (config_key, config_value, updated_at)
VALUES (
  'feature_flags',
  '{
    "ai_intake_enabled": true,
    "sponsor_tiles_enabled": true,
    "marketplace_payments_enabled": true,
    "provider_crm_enabled": true,
    "realtor_referral_enabled": true
  }'::jsonb,
  now()
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = EXCLUDED.config_value,
  updated_at = now();

-- Verify the config was inserted
SELECT config_key, config_value FROM admin_config ORDER BY config_key;
