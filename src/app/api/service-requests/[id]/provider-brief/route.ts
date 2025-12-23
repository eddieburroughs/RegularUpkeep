/**
 * Provider Brief Generation API
 *
 * Generates a comprehensive brief for service providers using
 * the PROVIDER_BRIEF_GENERATE task.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ai, persistAITaskResponse } from "@/lib/ai";
import type { ProviderBriefInput, ProviderBriefOutput } from "@/lib/ai/types";

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
    // Get the service request with property details
    const { data: serviceRequest } = await supabase
      .from("service_requests")
      .select(`
        id,
        customer_id,
        category,
        description,
        ai_summary,
        property_id,
        properties (
          property_type,
          year_built,
          square_feet
        )
      `)
      .eq("id", serviceRequestId)
      .single() as {
        data: {
          id: string;
          customer_id: string;
          category: string;
          description: string | null;
          ai_summary: string | null;
          property_id: string | null;
          properties: { property_type: string; year_built: number | null; square_feet: number | null } | null;
        } | null;
      };

    if (!serviceRequest) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }

    // Verify the user owns this service request
    if (serviceRequest.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get request body
    const body = await request.json();
    const { category, summary, userDescription, imageUrls } = body;

    // Build property details
    const property = serviceRequest.properties as {
      property_type: string;
      year_built: number | null;
      square_feet: number | null;
    } | null;

    const propertyDetails = property
      ? {
          type: property.property_type,
          age: property.year_built
            ? new Date().getFullYear() - property.year_built
            : undefined,
          sqft: property.square_feet || undefined,
        }
      : undefined;

    // Run AI provider brief generation
    const result = await ai.runTask<ProviderBriefInput, ProviderBriefOutput>({
      taskType: "PROVIDER_BRIEF_GENERATE",
      actorUserId: `system-${user.id}`, // Use system actor for brief generation
      entityType: "service_request",
      entityId: serviceRequestId,
      inputs: {
        category: category || serviceRequest.category,
        summary: summary || serviceRequest.ai_summary || "",
        userDescription: userDescription || serviceRequest.description || "",
        imageUrls: imageUrls || [],
        propertyDetails,
      },
    });

    // Persist the AI response
    if (result.success) {
      await persistAITaskResponse({
        taskType: "PROVIDER_BRIEF_GENERATE",
        actorUserId: user.id,
        entityType: "service_request",
        entityId: serviceRequestId,
        inputs: { category, summary, userDescription, imageUrls, propertyDetails },
        response: result,
      });

      // Update service request with provider brief
      // Using type assertion because ai_provider_brief may not be in generated types yet
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("service_requests")
        .update({
          ai_provider_brief: result.outputJson,
          ai_processing_status: "brief_generated",
        })
        .eq("id", serviceRequestId);
    }

    return NextResponse.json({
      brief: result.outputJson,
      fallback: result.usedFallback,
      correlationId: result.correlationId,
    });
  } catch (error) {
    console.error("Provider brief error:", error);
    return NextResponse.json(
      { error: "Failed to generate provider brief" },
      { status: 500 }
    );
  }
}

export async function GET(
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
    // Get the service request with provider brief
    const { data: serviceRequest } = await supabase
      .from("service_requests")
      .select("id, customer_id, ai_provider_brief")
      .eq("id", serviceRequestId)
      .single() as { data: { id: string; customer_id: string; ai_provider_brief: unknown } | null };

    if (!serviceRequest) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }

    // For now, allow anyone authenticated to view the brief
    // In production, check if user is the customer, provider, or admin

    return NextResponse.json({
      brief: serviceRequest.ai_provider_brief,
    });
  } catch (error) {
    console.error("Get provider brief error:", error);
    return NextResponse.json(
      { error: "Failed to get provider brief" },
      { status: 500 }
    );
  }
}
