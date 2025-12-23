/**
 * AI Follow-up Questions API
 *
 * POST: Generate follow-up questions using INTAKE_FOLLOWUP_QUESTIONS task
 * PUT: Save user answers to follow-up questions
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ai, persistAITaskResponse } from "@/lib/ai";
import type { IntakeFollowupInput, IntakeFollowupOutput } from "@/lib/ai/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: serviceRequestId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the service request
    const { data: serviceRequest } = await supabase
      .from("service_requests")
      .select("id, customer_id, category, ai_summary")
      .eq("id", serviceRequestId)
      .single() as { data: { id: string; customer_id: string; category: string; ai_summary: string | null } | null };

    if (!serviceRequest) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }

    // Verify the user owns this service request
    if (serviceRequest.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { category, summary, existingAnswers } = body as IntakeFollowupInput;

    // Run AI follow-up questions generation
    const result = await ai.runTask<IntakeFollowupInput, IntakeFollowupOutput>({
      taskType: "INTAKE_FOLLOWUP_QUESTIONS",
      actorUserId: user.id,
      entityType: "service_request",
      entityId: serviceRequestId,
      inputs: {
        category: category || serviceRequest.category,
        summary: summary || serviceRequest.ai_summary || "",
        existingAnswers,
      },
    });

    // Persist the AI response
    if (result.success && !result.usedFallback) {
      await persistAITaskResponse({
        taskType: "INTAKE_FOLLOWUP_QUESTIONS",
        actorUserId: user.id,
        entityType: "service_request",
        entityId: serviceRequestId,
        inputs: { category, summary, existingAnswers },
        response: result,
      });
    }

    // Store questions in service request
    // Using type assertion because ai_follow_up_questions may not be in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("service_requests")
      .update({
        ai_follow_up_questions: result.outputJson.questions,
        ai_processing_status: "questions_generated",
      })
      .eq("id", serviceRequestId);

    return NextResponse.json({
      questions: result.outputJson.questions,
      fallback: result.usedFallback,
      correlationId: result.correlationId,
    });
  } catch (error) {
    console.error("AI followup error:", error);
    return NextResponse.json(
      { error: "Failed to generate follow-up questions" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: serviceRequestId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the service request
    const { data: serviceRequest } = await supabase
      .from("service_requests")
      .select("id, customer_id")
      .eq("id", serviceRequestId)
      .single() as { data: { id: string; customer_id: string } | null };

    if (!serviceRequest) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }

    // Verify the user owns this service request
    if (serviceRequest.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get answers from request body
    const body = await request.json();
    const { answers } = body as { answers: Record<string, string> };

    // Update service request with answers
    // Using type assertion because ai_follow_up_answers may not be in generated types yet
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("service_requests")
      .update({
        ai_follow_up_answers: answers,
        ai_processing_status: "questions_answered",
      })
      .eq("id", serviceRequestId);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({
      success: true,
      answersCount: Object.keys(answers).length,
    });
  } catch (error) {
    console.error("AI followup save error:", error);
    return NextResponse.json(
      { error: "Failed to save answers" },
      { status: 500 }
    );
  }
}
