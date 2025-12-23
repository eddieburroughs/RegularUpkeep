/**
 * Admin Config System
 *
 * Fetches and caches configuration from the admin_config table.
 * Allows changing pricing/fees without redeploy.
 */

import { createClient } from "@/lib/supabase/server";
import type {
  HomeownerPricingConfig,
  DiagnosticFeeConfig,
  HomeownerPlatformFeesConfig,
  ProviderFeesConfig,
  ProviderTierConfig,
  SponsorPricingConfig,
  RealtorReferralConfig,
  MarketplacePaymentsConfig,
  MediaRequirementsConfig,
  FeatureFlagsConfig,
} from "@/types/database";

// Config keys
export const CONFIG_KEYS = {
  HOMEOWNER_PRICING: "homeowner_pricing",
  DIAGNOSTIC_FEES: "diagnostic_fees",
  HOMEOWNER_PLATFORM_FEES: "homeowner_platform_fees",
  PROVIDER_FEES: "provider_fees",
  PROVIDER_TIERS: "provider_tiers",
  SPONSOR_PRICING: "sponsor_pricing",
  REALTOR_REFERRAL: "realtor_referral",
  MARKETPLACE_PAYMENTS: "marketplace_payments",
  MEDIA_REQUIREMENTS: "media_requirements",
  FEATURE_FLAGS: "feature_flags",
} as const;

export type ConfigKey = (typeof CONFIG_KEYS)[keyof typeof CONFIG_KEYS];

// Type mapping for config keys
export interface ConfigTypeMap {
  homeowner_pricing: HomeownerPricingConfig;
  diagnostic_fees: DiagnosticFeeConfig;
  homeowner_platform_fees: HomeownerPlatformFeesConfig;
  provider_fees: ProviderFeesConfig;
  provider_tiers: ProviderTierConfig;
  sponsor_pricing: SponsorPricingConfig;
  realtor_referral: RealtorReferralConfig;
  marketplace_payments: MarketplacePaymentsConfig;
  media_requirements: MediaRequirementsConfig;
  feature_flags: FeatureFlagsConfig;
}

// Default values (fallbacks if DB not populated)
export const DEFAULT_CONFIG: ConfigTypeMap = {
  homeowner_pricing: {
    free_homes_limit: 2,
    additional_home_monthly_cents: 250,
    tenant_access_monthly_cents: 250,
    sponsor_free_yearly_cents: 2500,
  },
  diagnostic_fees: {
    hvac: { fee_cents: 8900, creditable: true },
    plumbing: { fee_cents: 7900, creditable: true },
    electrical: { fee_cents: 8900, creditable: true },
    appliances: { fee_cents: 6900, creditable: true },
    exterior: { fee_cents: 5900, creditable: true },
    interior: { fee_cents: 4900, creditable: true },
    landscaping: { fee_cents: 0, creditable: false },
    pest_control: { fee_cents: 0, creditable: false },
    safety: { fee_cents: 4900, creditable: true },
    other: { fee_cents: 4900, creditable: true },
  },
  homeowner_platform_fees: {
    tiers: [
      { min_cents: 0, max_cents: 10000, fee_cents: 500 },
      { min_cents: 10001, max_cents: 25000, fee_cents: 750 },
      { min_cents: 25001, max_cents: 50000, fee_cents: 1000 },
      { min_cents: 50001, max_cents: 100000, fee_cents: 1500 },
    ],
    cap_cents: 2500,
  },
  provider_fees: {
    percentage: 8.0,
    minimum_cents: 500,
  },
  provider_tiers: {
    verified: {
      monthly_cents: 1000,
      requirements: ["background_check", "insurance", "license"],
    },
    preferred: {
      monthly_cents: 1500,
      requires_verified: true,
      performance_thresholds: {
        min_rating: 4.5,
        min_completed_jobs: 10,
        max_dispute_rate: 0.05,
        min_response_time_hours: 4,
      },
    },
  },
  sponsor_pricing: {
    local_sponsor_yearly_cents: 25000,
    tiles_per_territory: 3,
    sponsor_types: ["realtor", "insurance", "handyman"],
  },
  realtor_referral: {
    qualified_homeowners_threshold: 50,
    reward: "free_sponsor_year",
    anti_fraud: {
      min_days_active: 30,
      min_properties: 1,
      require_verified_email: true,
    },
  },
  marketplace_payments: {
    estimate_buffer_percentage: 15,
    change_order_threshold_percentage: 10,
    auto_approve_hours: 24,
    dispute_window_hours: 72,
    hold_period_hours: 72,
  },
  media_requirements: {
    hvac: { min_photos: 2, video_required: false, emergency_exception: true },
    plumbing: { min_photos: 2, video_required: false, emergency_exception: true },
    electrical: { min_photos: 2, video_required: false, emergency_exception: true },
    appliances: { min_photos: 2, video_required: false, emergency_exception: true },
    exterior: { min_photos: 3, video_required: false, emergency_exception: false },
    interior: { min_photos: 2, video_required: false, emergency_exception: false },
    landscaping: { min_photos: 3, video_required: false, emergency_exception: false },
    pest_control: { min_photos: 1, video_required: false, emergency_exception: false },
    safety: { min_photos: 2, video_required: false, emergency_exception: true },
    other: { min_photos: 1, video_required: false, emergency_exception: true },
  },
  feature_flags: {
    ai_intake_enabled: true,
    sponsor_tiles_enabled: true,
    marketplace_payments_enabled: true,
    provider_crm_enabled: true,
    realtor_referral_enabled: true,
  },
};

/**
 * Fetch a single config value by key
 */
export async function getConfig<K extends ConfigKey>(
  key: K
): Promise<ConfigTypeMap[K]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_config")
    .select("config_value")
    .eq("config_key", key)
    .single() as { data: { config_value: ConfigTypeMap[K] } | null; error: unknown };

  if (error || !data) {
    // Return default if not found
    return DEFAULT_CONFIG[key];
  }

  return data.config_value;
}

/**
 * Fetch all config values at once
 */
export async function getAllConfig(): Promise<ConfigTypeMap> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("admin_config")
    .select("config_key, config_value") as {
      data: { config_key: string; config_value: unknown }[] | null;
      error: unknown;
    };

  if (error || !data) {
    return DEFAULT_CONFIG;
  }

  // Merge with defaults - use a properly typed result
  const result: ConfigTypeMap = { ...DEFAULT_CONFIG };
  for (const row of data) {
    const key = row.config_key as ConfigKey;
    if (key in result) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (result as any)[key] = row.config_value;
    }
  }

  return result;
}

/**
 * Update a config value (admin only)
 */
export async function updateConfig<K extends ConfigKey>(
  key: K,
  value: ConfigTypeMap[K]
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // Verify admin
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: "Not authenticated" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null; error: unknown };

  if (profile?.role !== "admin") {
    return { success: false, error: "Admin access required" };
  }

  // Upsert the config using raw SQL through RPC or direct insert
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("admin_config") as any).upsert(
    {
      config_key: key,
      config_value: value,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "config_key" }
  );

  if (error) {
    return { success: false, error: (error as Error).message };
  }

  return { success: true };
}

// ============================================================================
// Helper functions for calculating fees
// ============================================================================

/**
 * Calculate homeowner platform fee for a given job amount
 */
export async function calculateHomeownerPlatformFee(
  amountCents: number
): Promise<number> {
  const config = await getConfig("homeowner_platform_fees");

  let fee = 0;
  for (const tier of config.tiers) {
    if (amountCents >= tier.min_cents && amountCents <= tier.max_cents) {
      fee = tier.fee_cents;
      break;
    }
  }

  // Apply cap
  return Math.min(fee, config.cap_cents);
}

/**
 * Calculate provider fee for a given job amount
 */
export async function calculateProviderFee(amountCents: number): Promise<number> {
  const config = await getConfig("provider_fees");
  const calculated = Math.floor((amountCents * config.percentage) / 100);
  return Math.max(calculated, config.minimum_cents);
}

/**
 * Get diagnostic fee for a service category
 */
export async function getDiagnosticFee(
  category: string
): Promise<{ fee_cents: number; creditable: boolean }> {
  const config = await getConfig("diagnostic_fees");
  return config[category] || { fee_cents: 4900, creditable: true };
}

/**
 * Get media requirements for a service category
 */
export async function getMediaRequirements(
  category: string
): Promise<{ min_photos: number; video_required: boolean; emergency_exception: boolean }> {
  const config = await getConfig("media_requirements");
  return (
    config[category] || { min_photos: 1, video_required: false, emergency_exception: true }
  );
}

/**
 * Check if a feature is enabled
 */
export async function isFeatureEnabled(
  feature: keyof FeatureFlagsConfig
): Promise<boolean> {
  const config = await getConfig("feature_flags");
  return config[feature] ?? false;
}

/**
 * Calculate monthly homeowner subscription cost
 */
export async function calculateHomeownerSubscription(params: {
  homeCount: number;
  tenantAccessCount: number;
  sponsorFree: boolean;
}): Promise<{
  homesMonthly: number;
  tenantAccessMonthly: number;
  sponsorFreeYearly: number | null;
  totalMonthly: number;
}> {
  const config = await getConfig("homeowner_pricing");

  const billableHomes = Math.max(0, params.homeCount - config.free_homes_limit);
  const homesMonthly = billableHomes * config.additional_home_monthly_cents;
  const tenantAccessMonthly =
    params.tenantAccessCount * config.tenant_access_monthly_cents;
  const sponsorFreeYearly = params.sponsorFree
    ? config.sponsor_free_yearly_cents
    : null;

  // Total monthly (sponsor-free is yearly, so divide by 12 for monthly)
  const totalMonthly =
    homesMonthly +
    tenantAccessMonthly +
    (sponsorFreeYearly ? Math.ceil(sponsorFreeYearly / 12) : 0);

  return {
    homesMonthly,
    tenantAccessMonthly,
    sponsorFreeYearly,
    totalMonthly,
  };
}
