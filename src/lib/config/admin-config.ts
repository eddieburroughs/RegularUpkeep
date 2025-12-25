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
  MarketingPackagesConfig,
  ProviderPayoutConfig,
  RealtorReferralConfig,
  MarketplacePaymentsConfig,
  ProofRequirementsConfig,
  AfterHoursConfig,
  BaseFeeRulesConfig,
  MediaRequirementsConfig,
  FeatureFlagsConfig,
  AIOperationsConfig,
} from "@/types/database";

// Config keys
export const CONFIG_KEYS = {
  HOMEOWNER_PRICING: "homeowner_pricing",
  DIAGNOSTIC_FEES: "diagnostic_fees",
  HOMEOWNER_PLATFORM_FEES: "homeowner_platform_fees",
  PROVIDER_FEES: "provider_fees",
  PROVIDER_TIERS: "provider_tiers",
  SPONSOR_PRICING: "sponsor_pricing",
  MARKETING_PACKAGES: "marketing_packages",
  PROVIDER_PAYOUT: "provider_payout",
  REALTOR_REFERRAL: "realtor_referral",
  MARKETPLACE_PAYMENTS: "marketplace_payments",
  PROOF_REQUIREMENTS: "proof_requirements",
  AFTER_HOURS: "after_hours",
  BASE_FEE_RULES: "base_fee_rules",
  MEDIA_REQUIREMENTS: "media_requirements",
  FEATURE_FLAGS: "feature_flags",
  AI_OPERATIONS: "ai_operations",
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
  marketing_packages: MarketingPackagesConfig;
  provider_payout: ProviderPayoutConfig;
  realtor_referral: RealtorReferralConfig;
  marketplace_payments: MarketplacePaymentsConfig;
  proof_requirements: ProofRequirementsConfig;
  after_hours: AfterHoursConfig;
  base_fee_rules: BaseFeeRulesConfig;
  media_requirements: MediaRequirementsConfig;
  feature_flags: FeatureFlagsConfig;
  ai_operations: AIOperationsConfig;
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
    // Base service fees by category (credited toward final invoice)
    handyman: { fee_cents: 4900, creditable: true },   // $49
    plumbing: { fee_cents: 7900, creditable: true },   // $79
    electrical: { fee_cents: 7900, creditable: true }, // $79
    hvac: { fee_cents: 8900, creditable: true },       // $89
    roofing: { fee_cents: 7900, creditable: true },    // $79
    water_damage: { fee_cents: 8900, creditable: true }, // $89 (emergency)
    appliances: { fee_cents: 5900, creditable: true }, // $59
    exterior: { fee_cents: 5900, creditable: true },   // $59
    interior: { fee_cents: 4900, creditable: true },   // $49
    landscaping: { fee_cents: 4900, creditable: true }, // $49
    pest_control: { fee_cents: 4900, creditable: true }, // $49
    safety: { fee_cents: 5900, creditable: true },     // $59
    default: { fee_cents: 5900, creditable: true },    // $59 fallback
  },
  homeowner_platform_fees: {
    mode: "FLAT_TIER" as const,
    tiers: [
      { min_cents: 0, max_cents: 29999, fee_cents: 600 },           // < $300 => $6
      { min_cents: 30000, max_cents: 150000, fee_cents: 1200 },     // $300-$1500 => $12
      { min_cents: 150001, max_cents: 999999999, fee_cents: 2500 }, // > $1500 => $25 (cap)
    ],
    cap_cents: 2500,
    waive_if_first_job: false,
  },
  provider_fees: {
    percentage: 8.0,
    minimum_cents: 350, // $3.50 floor
    commissionable_excludes: {
      tax: true,
      tip: true,
      permit: true,
    },
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
    max_total_tiles: 8, // Max 8 tiles per metro (ADDENDUM D)
    sponsor_types: ["realtor", "insurance", "handyman"],
  },
  marketing_packages: {
    // ADDENDUM C: Marketing packages for providers
    priority_dispatch: {
      yearly_cents: 4900, // $49/year
      placement_boost_weight: 1.5, // 50% boost in dispatch algorithm
    },
    maintenance_plans: {
      interior_yearly_per_home_cents: 3900, // $39/home/year
      exterior_yearly_per_home_cents: 4900, // $49/home/year
      full_yearly_per_home_cents: 7900, // $79/home/year (bundled)
      includes_seasonal_visits: 4, // 4 visits per year
    },
    instant_payout: {
      fee_percentage: 1.0, // +1% fee for instant payout
      available_after_verification: true, // Must be Verified tier
    },
  },
  provider_payout: {
    standard_hold_hours: 72, // Standard 72h hold after invoice approval
    instant_payout_fee_percentage: 1.0, // +1% for instant payout
    instant_payout_requires_verified: true, // Must be Verified to use
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
    estimate_buffer_percentage: 20,          // 20% buffer on authorization
    estimate_buffer_cap_cents: 25000,        // $250 max buffer
    change_order_threshold_percentage: 12,   // 12% triggers change order
    change_order_threshold_amount_cents: 7500, // OR $75 flat triggers change order
    auto_approve_hours: 24,                  // Auto-approve if no action in 24h
    dispute_window_hours: 72,                // 72h to dispute after payment
    hold_period_hours: 72,                   // 72h hold before provider transfer
  },
  proof_requirements: {
    photo_required_categories: ["plumbing", "hvac", "electrical", "roofing", "water_damage"],
    photo_before_required: true,
    photo_after_required: true,
  },
  after_hours: {
    enabled: true,
    multiplier: 1.35, // 35% surcharge for after-hours
    window_local: {
      start: "18:00",
      end: "08:00",
    },
  },
  base_fee_rules: {
    creditable_by_default: true,
    refundable_before_provider_accepts: true,
    refundable_after_accepts: false,
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
    // AI Features - all enabled
    ai_intake_enabled: true,
    ai_media_quality_enabled: true,
    ai_provider_copilot_enabled: true,
    ai_admin_triage_enabled: true,
    ai_crm_copilot_enabled: true,
    ai_maintenance_coach_enabled: true,
    ai_sponsor_copy_enabled: true,
    // Platform Features
    sponsor_tiles_enabled: true,
    marketplace_payments_enabled: true,
    provider_crm_enabled: true,
    realtor_referral_enabled: true,
  },
  ai_operations: {
    rate_limits: {
      customer_daily_limit: 50,  // 50 AI calls per customer per day
      provider_daily_limit: 100, // 100 AI calls per provider per day
      admin_daily_limit: 500,    // 500 AI calls per admin per day
    },
    cost_budgets: {
      daily_budget_cents: 10000, // $100/day platform budget
      alert_threshold_cents: 7500, // Alert at $75/day
    },
    privacy: {
      media_retention_days: 30,   // Keep media references for 30 days
      prompt_retention_days: 7,   // Keep prompt hashes for 7 days
      hash_sensitive_inputs: true,
      require_explicit_consent: false, // Default ON but visible toggle
    },
    retention: {
      ai_jobs_retention_days: 180,    // 6 months
      ai_outputs_retention_days: 180, // 6 months
      keep_aggregate_metrics: true,   // Keep aggregate stats after cleanup
    },
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
  category: string,
  isAfterHours: boolean = false
): Promise<{ fee_cents: number; creditable: boolean }> {
  const config = await getConfig("diagnostic_fees");
  const baseFee = config[category] || config["default"] || { fee_cents: 5900, creditable: true };

  // Apply after-hours multiplier if applicable
  if (isAfterHours) {
    const afterHoursConfig = await getConfig("after_hours");
    if (afterHoursConfig.enabled) {
      return {
        fee_cents: Math.ceil(baseFee.fee_cents * afterHoursConfig.multiplier),
        creditable: baseFee.creditable,
      };
    }
  }

  return baseFee;
}

/**
 * Check if current time is in after-hours window
 */
export async function isAfterHours(timezone: string = "America/New_York"): Promise<boolean> {
  const config = await getConfig("after_hours");
  if (!config.enabled) return false;

  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const currentTime = formatter.format(now);
  const [currentHour] = currentTime.split(":").map(Number);

  const [startHour] = config.window_local.start.split(":").map(Number);
  const [endHour] = config.window_local.end.split(":").map(Number);

  // Handle overnight window (e.g., 18:00 - 08:00)
  if (startHour > endHour) {
    return currentHour >= startHour || currentHour < endHour;
  }
  return currentHour >= startHour && currentHour < endHour;
}

/**
 * Check if a change order is required based on estimate vs final amount
 */
export async function requiresChangeOrder(params: {
  originalEstimateCents: number;
  newAmountCents: number;
}): Promise<{ required: boolean; reason?: string }> {
  const config = await getConfig("marketplace_payments");
  const increase = params.newAmountCents - params.originalEstimateCents;
  const percentageIncrease = (increase / params.originalEstimateCents) * 100;

  // Check percentage threshold (12%)
  if (percentageIncrease > config.change_order_threshold_percentage) {
    return {
      required: true,
      reason: `Increase of ${percentageIncrease.toFixed(1)}% exceeds ${config.change_order_threshold_percentage}% threshold`,
    };
  }

  // Check flat amount threshold ($75)
  if (increase > config.change_order_threshold_amount_cents) {
    return {
      required: true,
      reason: `Increase of $${(increase / 100).toFixed(2)} exceeds $${(config.change_order_threshold_amount_cents / 100).toFixed(2)} threshold`,
    };
  }

  return { required: false };
}

/**
 * Calculate authorization amount with buffer and cap
 */
export async function calculateAuthorizationAmount(
  estimateCents: number
): Promise<{ bufferAmount: number; totalAuthorization: number; platformFee: number }> {
  const config = await getConfig("marketplace_payments");

  // Calculate buffer (20% default)
  let bufferAmount = Math.ceil(estimateCents * (config.estimate_buffer_percentage / 100));

  // Apply buffer cap ($250 default)
  bufferAmount = Math.min(bufferAmount, config.estimate_buffer_cap_cents);

  const estimateWithBuffer = estimateCents + bufferAmount;

  // Include max possible platform fee
  const platformFee = await calculateHomeownerPlatformFee(estimateWithBuffer);

  return {
    bufferAmount,
    totalAuthorization: estimateWithBuffer + platformFee,
    platformFee,
  };
}

/**
 * Check if photo proof is required for a category
 */
export async function requiresPhotoProof(
  category: string
): Promise<{ before: boolean; after: boolean }> {
  const config = await getConfig("proof_requirements");

  if (!config.photo_required_categories.includes(category)) {
    return { before: false, after: false };
  }

  return {
    before: config.photo_before_required,
    after: config.photo_after_required,
  };
}

/**
 * Get base fee refund rules
 */
export async function getBaseFeeRules(): Promise<{
  creditableByDefault: boolean;
  refundableBeforeAccept: boolean;
  refundableAfterAccept: boolean;
}> {
  const config = await getConfig("base_fee_rules");
  return {
    creditableByDefault: config.creditable_by_default,
    refundableBeforeAccept: config.refundable_before_provider_accepts,
    refundableAfterAccept: config.refundable_after_accepts,
  };
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

/**
 * Get AI operations config
 */
export async function getAIOperationsConfig(): Promise<AIOperationsConfig> {
  return getConfig("ai_operations");
}

/**
 * Get rate limit for a user role
 */
export async function getAIRateLimit(
  role: "customer" | "provider" | "admin"
): Promise<number> {
  const config = await getConfig("ai_operations");
  switch (role) {
    case "customer":
      return config.rate_limits.customer_daily_limit;
    case "provider":
      return config.rate_limits.provider_daily_limit;
    case "admin":
      return config.rate_limits.admin_daily_limit;
    default:
      return config.rate_limits.customer_daily_limit;
  }
}
