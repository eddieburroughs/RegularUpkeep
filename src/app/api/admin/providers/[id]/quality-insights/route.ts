/**
 * Provider Quality Insights API
 *
 * Generates AI-assisted provider quality summaries using PROVIDER_QUALITY_SUMMARY task.
 * Returns plain-language insights, strengths, concerns, and tier recommendations.
 * AI provides summaries only - tier gating is rules-based, not AI-driven.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/config/admin-config";
import { ai, persistAITaskResponse } from "@/lib/ai";
import type { ProviderQualityInput, ProviderQualityOutput } from "@/lib/ai/types";

// Type definitions
type ProviderRecord = {
  id: string;
  business_name: string | null;
  status: string;
  tier: string;
  profiles: { full_name: string; email: string } | null;
};

type BookingRecord = {
  id: string;
  status: string;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  total_amount: number;
};

type ReviewRecord = {
  rating: number;
};

type DisputeRecord = {
  reason: string;
  description: string | null;
};

type AIJobRecord = {
  id: string;
  output_json: unknown;
  input_json: { metrics?: unknown; currentTier?: string } | null;
  used_fallback: boolean;
  correlation_id: string;
  created_at: string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: providerId } = await params;

  try {
    // Check if admin triage is enabled
    const triageEnabled = await isFeatureEnabled("ai_admin_triage_enabled");
    if (!triageEnabled) {
      return NextResponse.json({
        fallback: true,
        insights: null,
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

    // Get provider details with metrics
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: providerData, error: providerError } = await (supabase as any)
      .from("providers")
      .select(`
        id,
        business_name,
        status,
        tier,
        profiles:id (
          full_name,
          email
        )
      `)
      .eq("id", providerId)
      .single();

    const provider = providerData as ProviderRecord | null;

    if (providerError || !provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Get all bookings for this provider
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: bookingsData } = await (supabase as any)
      .from("bookings")
      .select(`
        id,
        status,
        scheduled_at,
        started_at,
        completed_at,
        total_amount
      `)
      .eq("provider_id", providerId);

    const bookings = (bookingsData || []) as BookingRecord[];

    const totalJobs = bookings.length;
    const completedJobs = bookings.filter(b => b.status === "completed").length;
    const cancelledJobs = bookings.filter(b => b.status === "cancelled").length;

    // Get disputes count
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { count: disputeCount } = await (supabase as any)
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .in("booking_id", bookings.map(b => b.id));

    // Get average rating
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: reviewData } = await (supabase as any)
      .from("reviews")
      .select("rating")
      .eq("provider_id", providerId);

    const reviews = (reviewData || []) as ReviewRecord[];
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 0;

    // Calculate on-time rate (jobs started within 30 min of scheduled)
    const onTimeJobs = bookings.filter(b => {
      if (!b.scheduled_at || !b.started_at) return false;
      const scheduled = new Date(b.scheduled_at).getTime();
      const started = new Date(b.started_at).getTime();
      return Math.abs(started - scheduled) <= 30 * 60 * 1000; // 30 minutes
    }).length;
    const onTimeRate = completedJobs > 0 ? onTimeJobs / completedJobs : 0;

    // Simplified avg response calculation
    const avgResponseTimeHours = 4; // Default estimate

    // Get recent issues/complaints
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: recentDisputesData } = await (supabase as any)
      .from("disputes")
      .select("reason, description")
      .in("booking_id", bookings.map(b => b.id))
      .order("created_at", { ascending: false })
      .limit(5);

    const recentDisputes = (recentDisputesData || []) as DisputeRecord[];
    const recentIssues = recentDisputes.map(d => `${d.reason}: ${d.description || "No details"}`);

    // Build input for AI task
    const input: ProviderQualityInput = {
      providerId,
      providerName: provider.business_name || provider.profiles?.full_name || "Unknown Provider",
      metrics: {
        rating: Math.round(avgRating * 10) / 10,
        totalJobs,
        disputeRate: totalJobs > 0 ? (disputeCount || 0) / totalJobs : 0,
        cancellationRate: totalJobs > 0 ? cancelledJobs / totalJobs : 0,
        avgResponseTimeHours,
        onTimeRate,
      },
      recentIssues: recentIssues.length > 0 ? recentIssues : undefined,
      currentTier: (provider.tier as "preferred" | "verified" | "basic") || "basic",
    };

    // Run AI quality summary
    const result = await ai.runTask<ProviderQualityInput, ProviderQualityOutput>({
      taskType: "PROVIDER_QUALITY_SUMMARY",
      actorUserId: user.id,
      entityType: "provider",
      entityId: providerId,
      inputs: input,
    });

    // Persist the AI response for audit
    if (result.success) {
      await persistAITaskResponse({
        taskType: "PROVIDER_QUALITY_SUMMARY",
        actorUserId: user.id,
        entityType: "provider",
        entityId: providerId,
        inputs: input,
        response: result,
      });
    }

    const output = result.outputJson as ProviderQualityOutput;

    return NextResponse.json({
      insights: output,
      metrics: input.metrics,
      currentTier: input.currentTier,
      fallback: result.usedFallback,
      correlationId: result.correlationId,
      providerId,
      message: output?.humanReviewRequired
        ? "AI insights generated. Human review required for tier changes."
        : "AI insights generated. No immediate concerns identified.",
    });
  } catch (error) {
    console.error("Provider quality insights error:", error);
    return NextResponse.json(
      { error: "Failed to generate provider insights" },
      { status: 500 }
    );
  }
}

// GET - Get existing quality insights
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: providerId } = await params;

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

    // Get most recent AI insights for this provider
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: aiJobData } = await (supabase as any)
      .from("ai_jobs")
      .select("*")
      .eq("task_type", "PROVIDER_QUALITY_SUMMARY")
      .eq("entity_type", "provider")
      .eq("entity_id", providerId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    const aiJob = aiJobData as AIJobRecord | null;

    if (!aiJob) {
      return NextResponse.json({
        insights: null,
        message: "No AI insights found. Generate using POST.",
      });
    }

    return NextResponse.json({
      insights: aiJob.output_json,
      metrics: aiJob.input_json?.metrics,
      currentTier: aiJob.input_json?.currentTier,
      fallback: aiJob.used_fallback,
      correlationId: aiJob.correlation_id,
      createdAt: aiJob.created_at,
      message: "AI insights retrieved.",
    });
  } catch (error) {
    console.error("Get provider quality insights error:", error);
    return NextResponse.json(
      { error: "Failed to get provider insights" },
      { status: 500 }
    );
  }
}
