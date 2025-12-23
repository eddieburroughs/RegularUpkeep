/**
 * AI Operations Module
 *
 * Rate limiting, cost tracking, and usage management for AI features.
 * Uses database for persistence and enforces configurable limits.
 */

import { createClient } from "@/lib/supabase/server";
import { getAIOperationsConfig, getAIRateLimit } from "@/lib/config/admin-config";
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// ============================================================================
// Rate Limiting
// ============================================================================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string;
  reason?: string;
}

/**
 * Check and update daily rate limit for a user
 */
export async function checkDailyRateLimit(
  userId: string,
  userRole: "customer" | "provider" | "admin"
): Promise<RateLimitResult> {
  const supabase = await createClient() as AnySupabaseClient;
  const today = new Date().toISOString().split("T")[0];
  const limit = await getAIRateLimit(userRole);

  // Get current usage from database
  const { data: usage } = await supabase
    .from("ai_daily_usage")
    .select("call_count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .single();

  const currentCount = usage?.call_count || 0;
  const remaining = Math.max(0, limit - currentCount);
  const resetAt = new Date(today + "T23:59:59Z").toISOString();

  if (currentCount >= limit) {
    return {
      allowed: false,
      remaining: 0,
      limit,
      resetAt,
      reason: `Daily limit of ${limit} AI calls reached. Resets at midnight.`,
    };
  }

  // Increment usage
  const { error } = await supabase.rpc("increment_ai_daily_usage", {
    p_user_id: userId,
    p_usage_date: today,
  });

  if (error) {
    // If RPC doesn't exist, upsert directly
    await supabase
      .from("ai_daily_usage")
      .upsert(
        { user_id: userId, usage_date: today, call_count: currentCount + 1 },
        { onConflict: "user_id,usage_date" }
      );
  }

  return {
    allowed: true,
    remaining: remaining - 1,
    limit,
    resetAt,
  };
}

/**
 * Get current daily usage for a user
 */
export async function getDailyUsage(userId: string): Promise<{
  callCount: number;
  limit: number;
  usageDate: string;
}> {
  const supabase = await createClient() as AnySupabaseClient;
  const today = new Date().toISOString().split("T")[0];

  // Get user role for limit
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();

  const role = (profile?.role || "customer") as "customer" | "provider" | "admin";
  const limit = await getAIRateLimit(role);

  const { data: usage } = await supabase
    .from("ai_daily_usage")
    .select("call_count")
    .eq("user_id", userId)
    .eq("usage_date", today)
    .single();

  return {
    callCount: usage?.call_count || 0,
    limit,
    usageDate: today,
  };
}

// ============================================================================
// Cost Tracking
// ============================================================================

export interface DailyCostSummary {
  date: string;
  totalCostCents: number;
  totalCalls: number;
  avgCostCents: number;
  topTaskTypes: Array<{ taskType: string; count: number; costCents: number }>;
  errorCount: number;
  errorRate: number;
}

/**
 * Get daily AI cost summary for admin dashboard
 */
export async function getDailyCostSummary(
  date?: string
): Promise<DailyCostSummary> {
  const supabase = await createClient() as AnySupabaseClient;
  const targetDate = date || new Date().toISOString().split("T")[0];

  // Get all AI jobs for the date
  const { data: jobs } = await supabase
    .from("ai_jobs")
    .select("task_type, cost_estimate_cents, status")
    .gte("created_at", targetDate + "T00:00:00Z")
    .lt("created_at", targetDate + "T23:59:59Z");

  const allJobs = jobs || [];
  const totalCalls = allJobs.length;
  const totalCostCents = allJobs.reduce((sum, j) => sum + (j.cost_estimate_cents || 0), 0);
  const errorCount = allJobs.filter(j => j.status === "failed").length;

  // Aggregate by task type
  const taskTypeMap = new Map<string, { count: number; costCents: number }>();
  for (const job of allJobs) {
    const current = taskTypeMap.get(job.task_type) || { count: 0, costCents: 0 };
    taskTypeMap.set(job.task_type, {
      count: current.count + 1,
      costCents: current.costCents + (job.cost_estimate_cents || 0),
    });
  }

  const topTaskTypes = Array.from(taskTypeMap.entries())
    .map(([taskType, stats]) => ({ taskType, ...stats }))
    .sort((a, b) => b.costCents - a.costCents)
    .slice(0, 5);

  return {
    date: targetDate,
    totalCostCents,
    totalCalls,
    avgCostCents: totalCalls > 0 ? Math.round(totalCostCents / totalCalls) : 0,
    topTaskTypes,
    errorCount,
    errorRate: totalCalls > 0 ? (errorCount / totalCalls) * 100 : 0,
  };
}

/**
 * Check if platform is within daily budget
 */
export async function checkDailyBudget(): Promise<{
  withinBudget: boolean;
  currentSpendCents: number;
  budgetCents: number;
  alertThresholdReached: boolean;
}> {
  const config = await getAIOperationsConfig();
  const summary = await getDailyCostSummary();

  return {
    withinBudget: summary.totalCostCents < config.cost_budgets.daily_budget_cents,
    currentSpendCents: summary.totalCostCents,
    budgetCents: config.cost_budgets.daily_budget_cents,
    alertThresholdReached: summary.totalCostCents >= config.cost_budgets.alert_threshold_cents,
  };
}

/**
 * Get cost trend for last N days
 */
export async function getCostTrend(days: number = 7): Promise<Array<{
  date: string;
  totalCostCents: number;
  totalCalls: number;
}>> {
  const results: Array<{ date: string; totalCostCents: number; totalCalls: number }> = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];
    const summary = await getDailyCostSummary(dateStr);
    results.push({
      date: dateStr,
      totalCostCents: summary.totalCostCents,
      totalCalls: summary.totalCalls,
    });
  }

  return results.reverse();
}

// ============================================================================
// Privacy & Consent
// ============================================================================

/**
 * Hash sensitive input data for privacy
 */
export function hashSensitiveInput(input: string): string {
  return createHash("sha256").update(input).digest("hex").substring(0, 16);
}

/**
 * Sanitize inputs before storing (remove/hash PII)
 */
export function sanitizeInputsForStorage(
  inputs: Record<string, unknown>,
  hashSensitive: boolean = true
): Record<string, unknown> {
  const sensitiveFields = [
    "email",
    "phone",
    "address",
    "ssn",
    "password",
    "credit_card",
    "bank_account",
  ];

  const sanitized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(inputs)) {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
      if (hashSensitive && typeof value === "string") {
        sanitized[key] = `[HASHED:${hashSensitiveInput(value)}]`;
      } else {
        sanitized[key] = "[REDACTED]";
      }
    } else if (typeof value === "object" && value !== null) {
      sanitized[key] = sanitizeInputsForStorage(
        value as Record<string, unknown>,
        hashSensitive
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Check if user has AI features enabled
 */
export async function isAIEnabledForUser(userId: string): Promise<boolean> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data: prefs } = await supabase
    .from("user_preferences")
    .select("ai_features_enabled")
    .eq("user_id", userId)
    .single();

  // Default to enabled if no preference set
  return prefs?.ai_features_enabled ?? true;
}

/**
 * Update user AI feature preference
 */
export async function setAIEnabledForUser(
  userId: string,
  enabled: boolean
): Promise<void> {
  const supabase = await createClient() as AnySupabaseClient;

  await supabase
    .from("user_preferences")
    .upsert(
      { user_id: userId, ai_features_enabled: enabled, updated_at: new Date().toISOString() },
      { onConflict: "user_id" }
    );
}

// ============================================================================
// Retention & Cleanup
// ============================================================================

export interface CleanupResult {
  jobsDeleted: number;
  outputsDeleted: number;
  feedbackDeleted: number;
  aggregatesCreated: number;
  executedAt: string;
}

/**
 * Run retention cleanup job
 * Deletes old AI data while optionally preserving aggregate metrics
 */
export async function runRetentionCleanup(): Promise<CleanupResult> {
  const supabase = await createClient() as AnySupabaseClient;
  const config = await getAIOperationsConfig();
  const now = new Date();

  // Calculate cutoff dates
  const jobsCutoff = new Date(now);
  jobsCutoff.setDate(jobsCutoff.getDate() - config.retention.ai_jobs_retention_days);

  const outputsCutoff = new Date(now);
  outputsCutoff.setDate(outputsCutoff.getDate() - config.retention.ai_outputs_retention_days);

  let aggregatesCreated = 0;

  // If keeping aggregates, first save daily summaries before deleting
  if (config.retention.keep_aggregate_metrics) {
    // Get unique dates from jobs that will be deleted
    const { data: oldJobs } = await supabase
      .from("ai_jobs")
      .select("created_at, task_type, cost_estimate_cents, status")
      .lt("created_at", jobsCutoff.toISOString());

    if (oldJobs && oldJobs.length > 0) {
      // Group by date and task type
      const aggregates = new Map<string, {
        date: string;
        taskType: string;
        totalCalls: number;
        totalCostCents: number;
        errorCount: number;
      }>();

      for (const job of oldJobs) {
        const date = job.created_at.split("T")[0];
        const key = `${date}:${job.task_type}`;
        const current = aggregates.get(key) || {
          date,
          taskType: job.task_type,
          totalCalls: 0,
          totalCostCents: 0,
          errorCount: 0,
        };

        current.totalCalls++;
        current.totalCostCents += job.cost_estimate_cents || 0;
        if (job.status === "failed") current.errorCount++;

        aggregates.set(key, current);
      }

      // Insert aggregates
      for (const agg of aggregates.values()) {
        await supabase
          .from("ai_daily_metrics")
          .upsert(
            {
              metric_date: agg.date,
              task_type: agg.taskType,
              total_calls: agg.totalCalls,
              total_cost_cents: agg.totalCostCents,
              error_count: agg.errorCount,
            },
            { onConflict: "metric_date,task_type" }
          );
        aggregatesCreated++;
      }
    }
  }

  // Delete old outputs first (foreign key constraint)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const outputsResult = await (supabase.from("ai_outputs") as any)
    .delete({ count: "exact" })
    .lt("created_at", outputsCutoff.toISOString());
  const outputsDeleted = outputsResult.count;

  // Delete old feedback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const feedbackResult = await (supabase.from("ai_feedback") as any)
    .delete({ count: "exact" })
    .lt("created_at", jobsCutoff.toISOString());
  const feedbackDeleted = feedbackResult.count;

  // Delete old jobs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const jobsResult = await (supabase.from("ai_jobs") as any)
    .delete({ count: "exact" })
    .lt("created_at", jobsCutoff.toISOString());
  const jobsDeleted = jobsResult.count;

  return {
    jobsDeleted: jobsDeleted || 0,
    outputsDeleted: outputsDeleted || 0,
    feedbackDeleted: feedbackDeleted || 0,
    aggregatesCreated,
    executedAt: now.toISOString(),
  };
}

/**
 * Get retention config for display
 */
export async function getRetentionPolicy(): Promise<{
  aiJobsRetentionDays: number;
  aiOutputsRetentionDays: number;
  keepAggregateMetrics: boolean;
  mediaRetentionDays: number;
}> {
  const config = await getAIOperationsConfig();
  return {
    aiJobsRetentionDays: config.retention.ai_jobs_retention_days,
    aiOutputsRetentionDays: config.retention.ai_outputs_retention_days,
    keepAggregateMetrics: config.retention.keep_aggregate_metrics,
    mediaRetentionDays: config.privacy.media_retention_days,
  };
}
