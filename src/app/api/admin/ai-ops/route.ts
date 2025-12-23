/**
 * Admin AI Ops API
 *
 * Provides AI usage metrics, cost data, and operational statistics.
 */

import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import {
  getDailyCostSummary,
  checkDailyBudget,
  getCostTrend,
  getRetentionPolicy,
} from "@/lib/ai/ops";

export async function GET() {
  const supabase = await createClient();

  // Verify admin auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: { role: string } | null };

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    // Fetch all AI ops data in parallel
    const [todaySummary, budgetStatus, costTrend, retentionPolicy] = await Promise.all([
      getDailyCostSummary(),
      checkDailyBudget(),
      getCostTrend(7),
      getRetentionPolicy(),
    ]);

    // Get unique user count from ai_jobs today
    const today = new Date().toISOString().split("T")[0];
    const { count: uniqueUsersToday } = await supabase
      .from("ai_jobs")
      .select("actor_user_id", { count: "exact", head: true })
      .gte("created_at", today + "T00:00:00Z")
      .lt("created_at", today + "T23:59:59Z");

    // Get rate limit hits (failed due to rate limit)
    const { count: rateLimitHits } = await supabase
      .from("ai_jobs")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today + "T00:00:00Z")
      .eq("status", "failed")
      .ilike("error_message", "%rate limit%");

    return NextResponse.json({
      today: {
        ...todaySummary,
        uniqueUsers: uniqueUsersToday || 0,
        rateLimitHits: rateLimitHits || 0,
      },
      budget: budgetStatus,
      costTrend,
      retention: retentionPolicy,
    });
  } catch (error) {
    console.error("AI ops fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch AI ops data" },
      { status: 500 }
    );
  }
}
