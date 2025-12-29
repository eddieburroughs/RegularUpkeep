/**
 * AI Cleanup Cron Job
 *
 * Scheduled cleanup of old AI jobs, outputs, and feedback.
 * Protected by CRON_SECRET environment variable.
 *
 * Trigger: Set up as Vercel Cron, GitHub Actions, or external scheduler
 * Recommended: Daily at 3 AM
 */

import { NextRequest, NextResponse } from "next/server";
import { runRetentionCleanup, getRetentionPolicy } from "@/lib/ai/ops";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("CRON_SECRET not configured");
    return NextResponse.json(
      { error: "Cron not configured" },
      { status: 500 }
    );
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  try {
    // Log start time
    const startTime = Date.now();

    // Get retention policy for logging
    const policy = await getRetentionPolicy();
    console.log("AI Cleanup starting with policy:", policy);

    // Run cleanup
    const result = await runRetentionCleanup();

    // Calculate execution time
    const executionTimeMs = Date.now() - startTime;

    // Log to database
    const supabase = await createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("ai_cleanup_log") as any).insert({
      jobs_deleted: result.jobsDeleted,
      outputs_deleted: result.outputsDeleted,
      feedback_deleted: result.feedbackDeleted,
      aggregates_created: result.aggregatesCreated,
      execution_time_ms: executionTimeMs,
    });

    console.log("AI Cleanup completed:", {
      ...result,
      executionTimeMs,
    });

    return NextResponse.json({
      success: true,
      ...result,
      executionTimeMs,
    });
  } catch (error) {
    console.error("AI Cleanup failed:", error);

    // Log error to database
    try {
      const supabase = await createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("ai_cleanup_log") as any).insert({
        jobs_deleted: 0,
        outputs_deleted: 0,
        feedback_deleted: 0,
        aggregates_created: 0,
        error_message: error instanceof Error ? error.message : "Unknown error",
      });
    } catch (logError) {
      console.error("Failed to log cleanup error:", logError);
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cleanup failed",
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggers from admin dashboard
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
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

  // Run same cleanup logic
  try {
    const startTime = Date.now();
    const result = await runRetentionCleanup();
    const executionTimeMs = Date.now() - startTime;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("ai_cleanup_log") as any).insert({
      jobs_deleted: result.jobsDeleted,
      outputs_deleted: result.outputsDeleted,
      feedback_deleted: result.feedbackDeleted,
      aggregates_created: result.aggregatesCreated,
      execution_time_ms: executionTimeMs,
    });

    return NextResponse.json({
      success: true,
      ...result,
      executionTimeMs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Cleanup failed",
      },
      { status: 500 }
    );
  }
}
