/**
 * Admin Fraud Review API
 *
 * Lists fraud review queue and runs fraud signal analysis on referrals.
 * Uses FRAUD_SIGNAL_REFERRALS task.
 * Never auto-bans - always requires human review.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/config/admin-config";
import { ai, persistAITaskResponse } from "@/lib/ai";
import type { FraudSignalInput, FraudSignalOutput } from "@/lib/ai/types";

// Type definitions for tables not in generated types yet
type FraudReviewRecord = {
  id: string;
  referral_id: string;
  ai_risk_score: number;
  ai_signals: Array<{ flag: string; reason: string; severity: string }>;
  ai_recommendation: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decision_notes: string | null;
  created_at: string;
  sponsor_referrals?: {
    id: string;
    referrer_id: string;
    referee_email: string;
    status: string;
    created_at: string;
    profiles: { full_name: string; email: string } | null;
  };
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

// GET - List fraud review queue
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify user is an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single() as { data: { id: string; role: string } | null };

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - admins only" }, { status: 403 });
    }

    // Parse query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") || "pending";
    const limit = parseInt(searchParams.get("limit") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");

    // Get fraud review queue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reviews, count, error } = await (supabase as any)
      .from("fraud_review_queue")
      .select(`
        id,
        referral_id,
        ai_risk_score,
        ai_signals,
        ai_recommendation,
        status,
        reviewed_by,
        reviewed_at,
        decision_notes,
        created_at,
        sponsor_referrals (
          id,
          referrer_id,
          referee_email,
          status,
          created_at,
          profiles:referrer_id (
            full_name,
            email
          )
        )
      `, { count: "exact" })
      .eq("status", status)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("Error fetching fraud review queue:", error);
      return NextResponse.json({ error: "Failed to fetch fraud reviews" }, { status: 500 });
    }

    return NextResponse.json({
      reviews: (reviews || []) as FraudReviewRecord[],
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error("Fraud review list error:", error);
    return NextResponse.json(
      { error: "Failed to list fraud reviews" },
      { status: 500 }
    );
  }
}

// POST - Run fraud signal analysis on a specific referral
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if admin triage is enabled
    const triageEnabled = await isFeatureEnabled("ai_admin_triage_enabled");
    if (!triageEnabled) {
      return NextResponse.json({
        fallback: true,
        analysis: null,
        message: "AI admin triage is disabled",
      });
    }

    // Verify user is an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single() as { data: { id: string; role: string } | null };

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - admins only" }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { referralId } = body as { referralId: string };

    if (!referralId) {
      return NextResponse.json(
        { error: "Missing required field: referralId" },
        { status: 400 }
      );
    }

    // Get referral details with cluster data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: referralData, error: refError } = await (supabase as any)
      .from("sponsor_referrals")
      .select(`
        id,
        referrer_id,
        referee_email,
        created_at,
        metadata
      `)
      .eq("id", referralId)
      .single();

    const referral = referralData as ReferralRecord | null;

    if (refError || !referral) {
      return NextResponse.json({ error: "Referral not found" }, { status: 404 });
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
        gaps.push(gap / (60 * 1000)); // Convert to minutes
      }
      avgTimeBetween = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    }

    // Hash email domain for privacy
    const emailDomain = referral.referee_email?.split("@")[1] || "";
    const emailDomainHash = Buffer.from(emailDomain).toString("base64").slice(0, 8);

    const metadata = referral.metadata || {};

    // Build input for AI task
    const input: FraudSignalInput = {
      referrerId: referral.referrer_id,
      referralCount: referralCounts.length,
      conversionRate: 0, // Would be calculated from actual data
      recentReferrals: referralCounts.slice(0, 10).map(r => ({
        refereeId: "", // Privacy: don't expose
        timestamp: r.created_at,
        converted: false, // Would check actual conversion
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
      actorUserId: user.id,
      entityType: "profile", // Use profile as entity type
      entityId: referral.referrer_id,
      inputs: input,
    });

    // Persist the AI response for audit
    if (result.success) {
      await persistAITaskResponse({
        taskType: "FRAUD_SIGNAL_REFERRALS",
        actorUserId: user.id,
        entityType: "profile",
        entityId: referral.referrer_id,
        inputs: input,
        response: result,
      });
    }

    const output = result.outputJson as FraudSignalOutput;

    // Insert or update fraud review queue
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: upsertError } = await (supabase as any)
      .from("fraud_review_queue")
      .upsert({
        referral_id: referralId,
        ai_risk_score: output?.riskScore || 0,
        ai_signals: output?.signals || [],
        ai_recommendation: output?.recommendation || "review",
        status: "pending",
        created_at: new Date().toISOString(),
      }, {
        onConflict: "referral_id",
      });

    if (upsertError) {
      console.error("Error updating fraud review queue:", upsertError);
    }

    return NextResponse.json({
      analysis: result.outputJson,
      fallback: result.usedFallback,
      correlationId: result.correlationId,
      referralId,
      message: "Fraud analysis complete. Admin review required.",
    });
  } catch (error) {
    console.error("Fraud analysis error:", error);
    return NextResponse.json(
      { error: "Failed to run fraud analysis" },
      { status: 500 }
    );
  }
}

// PATCH - Update fraud review decision
export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Verify user is an admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single() as { data: { id: string; role: string } | null };

    if (!profile || profile.role !== "admin") {
      return NextResponse.json({ error: "Forbidden - admins only" }, { status: 403 });
    }

    const body = await request.json();
    const { reviewId, decision, notes } = body as {
      reviewId: string;
      decision: "approved" | "rejected" | "escalated";
      notes?: string;
    };

    if (!reviewId || !decision) {
      return NextResponse.json(
        { error: "Missing required fields: reviewId, decision" },
        { status: 400 }
      );
    }

    // Update the review
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("fraud_review_queue")
      .update({
        status: decision,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        decision_notes: notes,
      })
      .eq("id", reviewId);

    if (updateError) {
      console.error("Error updating fraud review:", updateError);
      return NextResponse.json({ error: "Failed to update review" }, { status: 500 });
    }

    // Log the admin decision for audit
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("admin_decisions").insert({
      decision_type: "fraud_review",
      entity_type: "fraud_review",
      entity_id: reviewId,
      admin_decision: decision,
      admin_id: user.id,
      decision_notes: notes,
      human_review_required: true,
    });

    return NextResponse.json({
      success: true,
      reviewId,
      decision,
      message: "Fraud review decision recorded.",
    });
  } catch (error) {
    console.error("Update fraud review error:", error);
    return NextResponse.json(
      { error: "Failed to update fraud review" },
      { status: 500 }
    );
  }
}
