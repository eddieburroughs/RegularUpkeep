/**
 * Provider Invoice Narrative API
 *
 * Generates AI-assisted work summaries using INVOICE_NARRATIVE_DRAFT task.
 * Returns professional narratives describing completed work.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/config/admin-config";
import { ai, persistAITaskResponse } from "@/lib/ai";
import type { InvoiceNarrativeInput, InvoiceNarrativeOutput } from "@/lib/ai/types";

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
        narrative: null,
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
      bookingId,
      category,
      scopeOfWork,
      completedWork,
      materialsUsed,
      technician,
    } = body as {
      bookingId: string;
      category: string;
      scopeOfWork: string;
      completedWork: string[];
      materialsUsed?: string[];
      technician?: string;
    };

    if (!bookingId || !category || !scopeOfWork || !completedWork?.length) {
      return NextResponse.json(
        { error: "Missing required fields: bookingId, category, scopeOfWork, completedWork" },
        { status: 400 }
      );
    }

    // Run AI invoice narrative generation
    const result = await ai.runTask<InvoiceNarrativeInput, InvoiceNarrativeOutput>({
      taskType: "INVOICE_NARRATIVE_DRAFT",
      actorUserId: user.id,
      entityType: "booking",
      entityId: bookingId,
      inputs: {
        category,
        scopeOfWork,
        completedWork,
        materialsUsed,
        technician,
      },
    });

    // Persist the AI response for audit
    if (result.success) {
      await persistAITaskResponse({
        taskType: "INVOICE_NARRATIVE_DRAFT",
        actorUserId: user.id,
        entityType: "booking",
        entityId: bookingId,
        inputs: { category, scopeOfWork, completedWork, materialsUsed, technician },
        response: result,
      });
    }

    return NextResponse.json({
      narrative: result.outputJson,
      fallback: result.usedFallback,
      correlationId: result.correlationId,
    });
  } catch (error) {
    console.error("Invoice narrative error:", error);
    return NextResponse.json(
      { error: "Failed to generate invoice narrative" },
      { status: 500 }
    );
  }
}
