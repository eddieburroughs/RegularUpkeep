/**
 * Provider Estimate Draft API
 *
 * Generates AI-assisted estimate drafts using PROVIDER_ESTIMATE_DRAFT task.
 * Returns scope of work, line items, exclusions, assumptions, and questions.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/config/admin-config";
import { ai, persistAITaskResponse } from "@/lib/ai";
import type { ProviderEstimateInput, ProviderEstimateOutput } from "@/lib/ai/types";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if provider copilot is enabled
    const copilotEnabled = await isFeatureEnabled("ai_provider_copilot_enabled");
    if (!copilotEnabled) {
      return NextResponse.json({
        fallback: true,
        draft: null,
        message: "AI provider copilot is disabled",
      });
    }

    // Verify user is a provider
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .single() as { data: { id: string; role: string } | null };

    if (!profile || profile.role !== "provider") {
      return NextResponse.json({ error: "Forbidden - providers only" }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const {
      serviceRequestId,
      category,
      providerBrief,
      providerNotes,
      similarJobsContext,
    } = body as {
      serviceRequestId: string;
      category: string;
      providerBrief: string;
      providerNotes?: string;
      similarJobsContext?: string;
    };

    if (!serviceRequestId || !category || !providerBrief) {
      return NextResponse.json(
        { error: "Missing required fields: serviceRequestId, category, providerBrief" },
        { status: 400 }
      );
    }

    // Run AI estimate draft generation
    const result = await ai.runTask<ProviderEstimateInput, ProviderEstimateOutput>({
      taskType: "PROVIDER_ESTIMATE_DRAFT",
      actorUserId: user.id,
      entityType: "service_request",
      entityId: serviceRequestId,
      inputs: {
        category,
        providerBrief,
        providerNotes,
        similarJobsContext,
      },
    });

    // Persist the AI response for audit
    if (result.success) {
      await persistAITaskResponse({
        taskType: "PROVIDER_ESTIMATE_DRAFT",
        actorUserId: user.id,
        entityType: "service_request",
        entityId: serviceRequestId,
        inputs: { category, providerBrief, providerNotes, similarJobsContext },
        response: result,
      });
    }

    return NextResponse.json({
      draft: result.outputJson,
      fallback: result.usedFallback,
      correlationId: result.correlationId,
    });
  } catch (error) {
    console.error("Estimate draft error:", error);
    return NextResponse.json(
      { error: "Failed to generate estimate draft" },
      { status: 500 }
    );
  }
}
