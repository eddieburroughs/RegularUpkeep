/**
 * Provider Message Draft API
 *
 * Generates AI-assisted message drafts using PROVIDER_MESSAGE_DRAFT task.
 * Returns professional message drafts with appropriate tone.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/config/admin-config";
import { ai, persistAITaskResponse } from "@/lib/ai";
import type { ProviderMessageInput, ProviderMessageOutput } from "@/lib/ai/types";

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
      threadId,
      context,
      customerName,
      serviceCategory,
      keyPoints,
    } = body as {
      threadId: string;
      context: "introduction" | "update" | "scheduling" | "completion" | "followup";
      customerName: string;
      serviceCategory: string;
      keyPoints: string[];
    };

    if (!threadId || !context || !customerName || !serviceCategory) {
      return NextResponse.json(
        { error: "Missing required fields: threadId, context, customerName, serviceCategory" },
        { status: 400 }
      );
    }

    // Run AI message draft generation
    const result = await ai.runTask<ProviderMessageInput, ProviderMessageOutput>({
      taskType: "PROVIDER_MESSAGE_DRAFT",
      actorUserId: user.id,
      entityType: "message_thread",
      entityId: threadId,
      inputs: {
        context,
        customerName,
        serviceCategory,
        keyPoints: keyPoints || [],
      },
    });

    // Persist the AI response for audit
    if (result.success) {
      await persistAITaskResponse({
        taskType: "PROVIDER_MESSAGE_DRAFT",
        actorUserId: user.id,
        entityType: "message_thread",
        entityId: threadId,
        inputs: { context, customerName, serviceCategory, keyPoints },
        response: result,
      });
    }

    return NextResponse.json({
      draft: result.outputJson,
      fallback: result.usedFallback,
      correlationId: result.correlationId,
    });
  } catch (error) {
    console.error("Message draft error:", error);
    return NextResponse.json(
      { error: "Failed to generate message draft" },
      { status: 500 }
    );
  }
}
