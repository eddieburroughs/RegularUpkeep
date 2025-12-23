/**
 * Generic AI Feedback API
 *
 * Allows submitting thumbs up/down feedback for any AI output.
 * Used when task-specific endpoints aren't available.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { submitAIFeedback, getFeedbackStats } from "@/lib/ai";
import type { AITaskType } from "@/lib/ai/types";

// POST to submit feedback
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { jobId, outputId, rating, reasonCode, comment, context } = body as {
      jobId: string;
      outputId?: string;
      rating: "up" | "down";
      reasonCode?: string;
      comment?: string;
      context?: Record<string, unknown>;
    };

    if (!jobId || !rating) {
      return NextResponse.json(
        { error: "jobId and rating are required" },
        { status: 400 }
      );
    }

    if (!["up", "down"].includes(rating)) {
      return NextResponse.json(
        { error: "rating must be 'up' or 'down'" },
        { status: 400 }
      );
    }

    const feedbackId = await submitAIFeedback({
      jobId,
      outputId,
      actorUserId: user.id,
      rating,
      reasonCode,
      comment,
      contextSnapshot: context,
    });

    return NextResponse.json({ success: true, feedbackId });
  } catch (error) {
    console.error("AI feedback error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}

// GET feedback stats (admin only)
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden - admins only" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const taskType = searchParams.get("taskType") as AITaskType | null;

    if (!taskType) {
      return NextResponse.json(
        { error: "taskType query parameter is required" },
        { status: 400 }
      );
    }

    const stats = await getFeedbackStats(taskType);

    return NextResponse.json({
      taskType,
      stats,
    });
  } catch (error) {
    console.error("Get feedback stats error:", error);
    return NextResponse.json(
      { error: "Failed to get feedback stats" },
      { status: 500 }
    );
  }
}
