/**
 * Provider Tier Gating
 *
 * Helpers for enforcing provider tier requirements (ADDENDUM E).
 * Used to check access to features based on tier status.
 */

import { createClient } from "@/lib/supabase/server";
import { getConfig } from "@/lib/config/admin-config";

export type ProviderTier = "none" | "verified" | "preferred";

interface ProviderTierInfo {
  providerId: string;
  currentTier: ProviderTier;
  qualifiesForPreferred: boolean;
  isVerified: boolean;
  isPreferred: boolean;
  meetsPreferredThresholds: boolean;
  metrics?: {
    averageRating: number;
    totalJobsCompleted: number;
    disputeRate: number;
    avgResponseTimeHours: number;
  };
}

/**
 * Get provider's current tier status
 */
export async function getProviderTierInfo(
  providerId: string
): Promise<ProviderTierInfo | null> {
  const supabase = await createClient();

  // Get provider subscription and metrics
  const { data: subscription } = await supabase
    .from("provider_subscriptions")
    .select(`
      tier,
      status,
      provider_metrics(
        average_rating,
        total_jobs_completed,
        dispute_rate,
        avg_response_time_hours,
        qualifies_for_preferred
      )
    `)
    .eq("provider_id", providerId)
    .eq("status", "active")
    .single() as {
      data: {
        tier: string;
        status: string;
        provider_metrics: Array<{
          average_rating: number;
          total_jobs_completed: number;
          dispute_rate: number;
          avg_response_time_hours: number;
          qualifies_for_preferred: boolean;
        }>;
      } | null;
    };

  if (!subscription) {
    return {
      providerId,
      currentTier: "none",
      qualifiesForPreferred: false,
      isVerified: false,
      isPreferred: false,
      meetsPreferredThresholds: false,
    };
  }

  const metrics = subscription.provider_metrics?.[0];
  const tierConfig = await getConfig("provider_tiers");
  const thresholds = tierConfig.preferred.performance_thresholds;

  // Check if metrics meet preferred thresholds
  const meetsPreferredThresholds = metrics
    ? metrics.average_rating >= thresholds.min_rating &&
      metrics.total_jobs_completed >= thresholds.min_completed_jobs &&
      metrics.dispute_rate <= thresholds.max_dispute_rate &&
      metrics.avg_response_time_hours <= thresholds.min_response_time_hours
    : false;

  return {
    providerId,
    currentTier: subscription.tier as ProviderTier,
    qualifiesForPreferred: metrics?.qualifies_for_preferred ?? false,
    isVerified: subscription.tier === "verified" || subscription.tier === "preferred",
    isPreferred: subscription.tier === "preferred",
    meetsPreferredThresholds,
    metrics: metrics
      ? {
          averageRating: metrics.average_rating,
          totalJobsCompleted: metrics.total_jobs_completed,
          disputeRate: metrics.dispute_rate,
          avgResponseTimeHours: metrics.avg_response_time_hours,
        }
      : undefined,
  };
}

/**
 * Check if provider can access a feature that requires Verified tier
 */
export async function requiresVerifiedTier(
  providerId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const tierInfo = await getProviderTierInfo(providerId);

  if (!tierInfo) {
    return { allowed: false, reason: "Provider not found" };
  }

  if (!tierInfo.isVerified) {
    return {
      allowed: false,
      reason: "This feature requires Verified tier. Upgrade at /provider/billing",
    };
  }

  return { allowed: true };
}

/**
 * Check if provider can access a feature that requires Preferred tier
 * AND currently meets the performance thresholds
 */
export async function requiresPreferredTier(
  providerId: string
): Promise<{ allowed: boolean; reason?: string; meetsThresholds?: boolean }> {
  const tierInfo = await getProviderTierInfo(providerId);

  if (!tierInfo) {
    return { allowed: false, reason: "Provider not found" };
  }

  if (!tierInfo.isPreferred) {
    return {
      allowed: false,
      reason: "This feature requires Preferred tier. Upgrade at /provider/billing",
      meetsThresholds: tierInfo.meetsPreferredThresholds,
    };
  }

  // ADDENDUM E: Hard enforcement - must still meet thresholds
  if (!tierInfo.meetsPreferredThresholds) {
    return {
      allowed: false,
      reason:
        "Your performance metrics no longer meet Preferred tier requirements. " +
        "Improve your metrics to regain access to this feature.",
      meetsThresholds: false,
    };
  }

  return { allowed: true, meetsThresholds: true };
}

/**
 * Check if provider can use instant payout feature
 * Requires Verified tier and the instant payout add-on
 */
export async function canUseInstantPayout(
  providerId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient();
  const payoutConfig = await getConfig("provider_payout");

  // Check if instant payout requires verified
  if (payoutConfig.instant_payout_requires_verified) {
    const tierCheck = await requiresVerifiedTier(providerId);
    if (!tierCheck.allowed) {
      return tierCheck;
    }
  }

  // Check if provider has instant payout add-on
  const { data: addon } = await supabase
    .from("provider_addons")
    .select("id")
    .eq("provider_id", providerId)
    .eq("addon_type", "instant_payout")
    .eq("status", "active")
    .single() as { data: { id: string } | null };

  if (!addon) {
    return {
      allowed: false,
      reason: "Instant payout requires the Instant Payout add-on. Enable at /provider/billing",
    };
  }

  return { allowed: true };
}

/**
 * Check if provider can use priority dispatch feature
 */
export async function canUsePriorityDispatch(
  providerId: string
): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient();

  // Check if provider has priority dispatch add-on
  const { data: addon } = await supabase
    .from("provider_addons")
    .select("id")
    .eq("provider_id", providerId)
    .eq("addon_type", "priority_dispatch")
    .eq("status", "active")
    .single() as { data: { id: string } | null };

  if (!addon) {
    return {
      allowed: false,
      reason: "Priority dispatch requires the Priority Dispatch add-on. Enable at /provider/billing",
    };
  }

  return { allowed: true };
}

/**
 * Log a tier status change to history
 */
export async function logTierStatusChange(params: {
  providerId: string;
  previousStatus: string;
  newStatus: string;
  trigger: "manual" | "subscription_change" | "cron_check" | "admin_action";
  notes?: string;
}): Promise<void> {
  const supabase = await createClient();
  const tierInfo = await getProviderTierInfo(params.providerId);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("provider_tier_history") as any).insert({
    provider_id: params.providerId,
    previous_status: params.previousStatus,
    new_status: params.newStatus,
    trigger: params.trigger,
    notes: params.notes,
    metrics_snapshot: tierInfo?.metrics || null,
    created_at: new Date().toISOString(),
  });
}
