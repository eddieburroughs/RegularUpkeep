/**
 * Daily Fraud Review Cron Job
 *
 * Processes new referrals for fraud signals.
 * Triggered by external cron service (Vercel Cron, GitHub Actions, etc.)
 * Protected by CRON_SECRET environment variable.
 *
 * To configure:
 * 1. Set CRON_SECRET environment variable
 * 2. Configure cron service to call POST /api/cron/fraud-review
 *    with header: x-cron-secret: YOUR_CRON_SECRET
 *
 * Example cron schedule: "0 6 * * *" (6 AM daily)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/config/admin-config";
import { ai, persistAITaskResponse } from "@/lib/ai";
import type { FraudSignalInput, FraudSignalOutput } from "@/lib/ai/types";

const MAX_REFERRALS_PER_RUN = 50;
const DELAY_BETWEEN_REQUESTS_MS = 200;

// Type definitions
type CronJobRun = {
  id: string;
  completed_at: string | null;
};

type ReferralRecord = {
  id: string;
  referrer_id: string;
  referee_email: string | null;
  created_at: string;
  metadata: Record<string, unknown> | null;
};

type ReferralCount = {
  id: string;
  created_at: string;
};

type FraudReviewRecord = {
  referral_id: string;
};

export async function POST(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get("x-cron-secret");

  if (!process.env.CRON_SECRET) {
    console.error("CRON_SECRET environment variable not set");
    return NextResponse.json(
      { error: "Cron job not configured" },
      { status: 500 }
    );
  }

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const startTime = Date.now();

  try {
    // Check if admin triage is enabled
    const triageEnabled = await isFeatureEnabled("ai_admin_triage_enabled");
    if (!triageEnabled) {
      return NextResponse.json({
        success: true,
        processed: 0,
        message: "AI admin triage is disabled. Skipping fraud review.",
      });
    }

    const supabase = await createClient();

    // Get the timestamp of the last cron run
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: lastRunData } = await (supabase as any)
      .from("cron_job_runs")
      .select("completed_at")
      .eq("job_name", "fraud_review")
      .eq("status", "success")
      .order("completed_at", { ascending: false })
      .limit(1)
      .single();

    const lastRun = lastRunData as CronJobRun | null;
    const sinceDate = lastRun?.completed_at ||
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Record cron job start
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: cronRunData } = await (supabase as any)
      .from("cron_job_runs")
      .insert({
        job_name: "fraud_review",
        status: "running",
        started_at: new Date().toISOString(),
        metadata: { sinceDate },
      })
      .select()
      .single();

    const cronRun = cronRunData as { id: string } | null;

    // Get unreviewed referrals since last run
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: referralsData } = await (supabase as any)
      .from("sponsor_referrals")
      .select("id, referrer_id, referee_email, created_at, metadata")
      .gte("created_at", sinceDate)
      .limit(MAX_REFERRALS_PER_RUN);

    const referrals = (referralsData || []) as ReferralRecord[];

    // Filter out already processed referrals
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingReviewsData } = await (supabase as any)
      .from("fraud_review_queue")
      .select("referral_id")
      .in("referral_id", referrals.map(r => r.id));

    const existingReviews = (existingReviewsData || []) as FraudReviewRecord[];
    const existingIds = new Set(existingReviews.map(r => r.referral_id));
    const toProcess = referrals.filter(r => !existingIds.has(r.id));

    if (toProcess.length === 0) {
      // Update cron run status
      if (cronRun) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("cron_job_runs")
          .update({
            status: "success",
            completed_at: new Date().toISOString(),
            metadata: {
              sinceDate,
              processed: 0,
              message: "No new referrals to process",
            },
          })
          .eq("id", cronRun.id);
      }

      return NextResponse.json({
        success: true,
        processed: 0,
        message: "No new referrals to process",
      });
    }

    const results: Array<{
      referralId: string;
      success: boolean;
      riskScore?: number;
      error?: string;
    }> = [];

    // Process each referral
    for (const referral of toProcess) {
      try {
        // Get referral counts for this referrer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: referralCountsData } = await (supabase as any)
          .from("sponsor_referrals")
          .select("id, created_at")
          .eq("referrer_id", referral.referrer_id);

        const referralCounts = (referralCountsData || []) as ReferralCount[];

        const now = new Date();
        const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

        const signupsLast24h = referralCounts.filter(
          r => new Date(r.created_at) > last24h
        ).length;
        const signupsLast7d = referralCounts.filter(
          r => new Date(r.created_at) > last7d
        ).length;

        // Calculate average time between signups
        const sortedReferrals = referralCounts.sort(
          (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        let avgTimeBetween = 0;
        if (sortedReferrals.length > 1) {
          const gaps = [];
          for (let i = 1; i < sortedReferrals.length; i++) {
            const gap = new Date(sortedReferrals[i].created_at).getTime() -
                        new Date(sortedReferrals[i-1].created_at).getTime();
            gaps.push(gap / (60 * 1000)); // Convert to minutes
          }
          avgTimeBetween = gaps.reduce((a, b) => a + b, 0) / gaps.length;
        }

        // Hash email domain for privacy
        const emailDomain = referral.referee_email?.split("@")[1] || "";
        const emailDomainHash = Buffer.from(emailDomain).toString("base64").slice(0, 8);

        const metadata = referral.metadata || {};
        const input: FraudSignalInput = {
          referrerId: referral.referrer_id,
          referralCount: referralCounts.length,
          conversionRate: 0,
          recentReferrals: referralCounts.slice(0, 10).map(r => ({
            refereeId: "",
            timestamp: r.created_at,
            converted: false,
          })),
          clusterData: {
            emailDomainHash,
            ipClusterHash: (metadata.ipHash as string) || "",
            deviceClusterHash: (metadata.deviceHash as string) || "",
            addressHash: (metadata.addressHash as string) || "",
          },
          timePatterns: {
            signupsLast24h,
            signupsLast7d,
            avgTimeBetweenSignups: avgTimeBetween,
          },
        };

        // Run AI fraud signal analysis
        const result = await ai.runTask<FraudSignalInput, FraudSignalOutput>({
          taskType: "FRAUD_SIGNAL_REFERRALS",
          actorUserId: "system",
          entityType: "profile",
          entityId: referral.referrer_id,
          inputs: input,
        });

        // Persist response
        if (result.success) {
          await persistAITaskResponse({
            taskType: "FRAUD_SIGNAL_REFERRALS",
            actorUserId: "system",
            entityType: "profile",
            entityId: referral.referrer_id,
            inputs: input,
            response: result,
          });
        }

        const output = result.outputJson as FraudSignalOutput;

        // Insert into fraud review queue
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("fraud_review_queue")
          .insert({
            referral_id: referral.id,
            ai_risk_score: output?.riskScore || 0,
            ai_signals: output?.signals || [],
            ai_recommendation: output?.recommendation || "review",
            status: "pending",
          });

        results.push({
          referralId: referral.id,
          success: true,
          riskScore: output?.riskScore,
        });
      } catch (err) {
        console.error(`Error processing referral ${referral.id}:`, err);
        results.push({
          referralId: referral.id,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS_MS));
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const highRisk = results.filter(r => (r.riskScore || 0) >= 61).length;
    const durationMs = Date.now() - startTime;

    // Update cron run status
    if (cronRun) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("cron_job_runs")
        .update({
          status: "success",
          completed_at: new Date().toISOString(),
          metadata: {
            sinceDate,
            processed: results.length,
            successful,
            failed,
            highRisk,
            durationMs,
          },
        })
        .eq("id", cronRun.id);
    }

    return NextResponse.json({
      success: true,
      processed: results.length,
      successful,
      failed,
      highRisk,
      durationMs,
      message: `Processed ${results.length} referrals. ${highRisk} flagged as high risk.`,
    });
  } catch (error) {
    console.error("Fraud review cron error:", error);
    return NextResponse.json(
      { error: "Fraud review cron job failed" },
      { status: 500 }
    );
  }
}

// GET endpoint for health check / status
export async function GET(request: NextRequest) {
  // Verify cron secret
  const cronSecret = request.headers.get("x-cron-secret");

  if (cronSecret !== process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    const supabase = await createClient();

    // Get last 5 runs
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: runs } = await (supabase as any)
      .from("cron_job_runs")
      .select("*")
      .eq("job_name", "fraud_review")
      .order("started_at", { ascending: false })
      .limit(5);

    // Get pending review count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: pendingCount } = await (supabase as any)
      .from("fraud_review_queue")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending");

    return NextResponse.json({
      status: "healthy",
      pendingReviews: pendingCount || 0,
      recentRuns: runs || [],
    });
  } catch (error) {
    return NextResponse.json(
      { status: "error", error: "Failed to get status" },
      { status: 500 }
    );
  }
}
