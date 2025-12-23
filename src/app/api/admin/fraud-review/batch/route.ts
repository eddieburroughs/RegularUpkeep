/**
 * Batch Fraud Review API
 *
 * Processes multiple referrals for fraud signals.
 * Used by the daily cron job and manual batch operations.
 * Never auto-bans - always marks as "review required".
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/config/admin-config";
import { ai, persistAITaskResponse } from "@/lib/ai";
import type { FraudSignalInput, FraudSignalOutput } from "@/lib/ai/types";

// Rate limit: max 50 referrals per batch
const MAX_BATCH_SIZE = 50;

// Type definitions
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

// POST - Process batch of referrals
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Check for cron secret OR admin user
  const cronSecret = request.headers.get("x-cron-secret");
  const isCron = cronSecret === process.env.CRON_SECRET;

  if (!isCron && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if admin triage is enabled
    const triageEnabled = await isFeatureEnabled("ai_admin_triage_enabled");
    if (!triageEnabled) {
      return NextResponse.json({
        processed: 0,
        message: "AI admin triage is disabled",
      });
    }

    // If not cron, verify admin role
    if (!isCron && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", user.id)
        .single() as { data: { id: string; role: string } | null };

      if (!profile || profile.role !== "admin") {
        return NextResponse.json({ error: "Forbidden - admins only" }, { status: 403 });
      }
    }

    // Get request body
    const body = await request.json();
    const { referralIds, since } = body as {
      referralIds?: string[];
      since?: string; // ISO date string
    };

    let referralsToProcess: { id: string }[] = [];

    if (referralIds && referralIds.length > 0) {
      // Process specific referrals
      referralsToProcess = referralIds.slice(0, MAX_BATCH_SIZE).map(id => ({ id }));
    } else {
      // Get unreviewed referrals since date (default: last 24h)
      const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: unreviewedReferrals } = await (supabase as any)
        .from("sponsor_referrals")
        .select("id")
        .gte("created_at", sinceDate)
        .limit(MAX_BATCH_SIZE);

      referralsToProcess = (unreviewedReferrals || []) as { id: string }[];
    }

    if (referralsToProcess.length === 0) {
      return NextResponse.json({
        processed: 0,
        results: [],
        message: "No referrals to process",
      });
    }

    const results: Array<{
      referralId: string;
      success: boolean;
      riskScore?: number;
      recommendation?: string;
      error?: string;
    }> = [];

    // Process each referral
    for (const ref of referralsToProcess) {
      try {
        // Get referral details
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: referralData } = await (supabase as any)
          .from("sponsor_referrals")
          .select(`
            id,
            referrer_id,
            referee_email,
            created_at,
            metadata
          `)
          .eq("id", ref.id)
          .single();

        const referral = referralData as ReferralRecord | null;

        if (!referral) {
          results.push({
            referralId: ref.id,
            success: false,
            error: "Referral not found",
          });
          continue;
        }

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
            gaps.push(gap / (60 * 1000));
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
        const actorId = isCron ? "system" : user!.id;
        const result = await ai.runTask<FraudSignalInput, FraudSignalOutput>({
          taskType: "FRAUD_SIGNAL_REFERRALS",
          actorUserId: actorId,
          entityType: "profile",
          entityId: referral.referrer_id,
          inputs: input,
        });

        // Persist response
        if (result.success) {
          await persistAITaskResponse({
            taskType: "FRAUD_SIGNAL_REFERRALS",
            actorUserId: actorId,
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
          .upsert({
            referral_id: ref.id,
            ai_risk_score: output?.riskScore || 0,
            ai_signals: output?.signals || [],
            ai_recommendation: output?.recommendation || "review",
            status: "pending",
            created_at: new Date().toISOString(),
          }, {
            onConflict: "referral_id",
          });

        results.push({
          referralId: ref.id,
          success: true,
          riskScore: output?.riskScore,
          recommendation: output?.recommendation,
        });
      } catch (err) {
        console.error(`Error processing referral ${ref.id}:`, err);
        results.push({
          referralId: ref.id,
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        });
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const highRisk = results.filter(r => (r.riskScore || 0) >= 61).length;

    return NextResponse.json({
      processed: results.length,
      successful,
      failed,
      highRisk,
      results,
      message: `Processed ${results.length} referrals. ${highRisk} flagged for review.`,
    });
  } catch (error) {
    console.error("Batch fraud review error:", error);
    return NextResponse.json(
      { error: "Failed to process batch fraud review" },
      { status: 500 }
    );
  }
}
