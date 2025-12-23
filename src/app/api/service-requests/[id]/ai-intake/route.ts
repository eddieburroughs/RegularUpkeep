/**
 * AI Intake Classification API
 *
 * Runs the INTAKE_CLASSIFY_AND_SUMMARIZE task on a service request.
 * Returns classification results including safety flags.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/config/admin-config";
import { ai, persistAITaskResponse } from "@/lib/ai";
import type { IntakeClassifyInput, IntakeClassifyOutput } from "@/lib/ai/types";

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
    // Check if AI intake is enabled
    const aiEnabled = await isFeatureEnabled("ai_intake_enabled");
    if (!aiEnabled) {
      return NextResponse.json({
        fallback: true,
        classification: null,
        message: "AI intake is disabled",
      });
    }

    // Get the service request
    const { data: serviceRequest } = await supabase
      .from("service_requests")
      .select("id, customer_id, category")
      .eq("id", serviceRequestId)
      .single() as { data: { id: string; customer_id: string; category: string } | null };

    if (!serviceRequest) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }

    // Verify the user owns this service request
    if (serviceRequest.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { category, imageUrls, userDescription } = body as IntakeClassifyInput;

    // Run AI classification
    const result = await ai.runTask<IntakeClassifyInput, IntakeClassifyOutput>({
      taskType: "INTAKE_CLASSIFY_AND_SUMMARIZE",
      actorUserId: user.id,
      entityType: "service_request",
      entityId: serviceRequestId,
      inputs: {
        category: category || serviceRequest.category,
        imageUrls: imageUrls || [],
        userDescription: userDescription || "",
      },
    });

    // Persist the AI response
    if (result.success) {
      await persistAITaskResponse({
        taskType: "INTAKE_CLASSIFY_AND_SUMMARIZE",
        actorUserId: user.id,
        entityType: "service_request",
        entityId: serviceRequestId,
        inputs: { category, imageUrls, userDescription },
        response: result,
      });

      // Update service request with AI summary
      // Using type assertion because ai_summary may not be in generated types yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("service_requests")
        .update({
          ai_summary: result.outputJson.summary,
          ai_processing_status: "classified",
        })
        .eq("id", serviceRequestId);
    }

    return NextResponse.json({
      fallback: result.usedFallback,
      classification: result.outputJson,
      correlationId: result.correlationId,
    });
  } catch (error) {
    console.error("AI intake error:", error);
    return NextResponse.json(
      { error: "Failed to run AI classification" },
      { status: 500 }
    );
  }
}
