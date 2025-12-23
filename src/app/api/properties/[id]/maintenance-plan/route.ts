/**
 * Maintenance Plan API
 *
 * Generates AI-powered maintenance recommendations for homeowner properties.
 * Behind ai_maintenance_coach_enabled feature flag.
 * Premium features unlock for standard/premium subscribers.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/config/admin-config";
import { ai, persistAITaskResponse, submitAIFeedback } from "@/lib/ai";
import type { MaintenancePlanInput, MaintenancePlanOutput } from "@/lib/ai/types";
import { getTaskDefinition } from "@/lib/ai/tasks";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: propertyId } = await params;

  try {
    // Check if maintenance coach is enabled
    const coachEnabled = await isFeatureEnabled("ai_maintenance_coach_enabled");

    // Verify user has access to this property
    type PropertyMembership = {
      role: string;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membershipData } = await (supabase as any)
      .from("property_members")
      .select("role")
      .eq("property_id", propertyId)
      .eq("user_id", user.id)
      .single();

    const membership = membershipData as PropertyMembership | null;

    if (!membership) {
      return NextResponse.json({ error: "Forbidden - no access to property" }, { status: 403 });
    }

    // Get property details
    type PropertyDetails = {
      id: string;
      property_type: string;
      year_built?: number;
      square_feet?: number;
      address_city: string;
      address_state: string;
      created_at: string;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: propertyData, error: propertyError } = await (supabase as any)
      .from("properties")
      .select(`
        id,
        property_type,
        year_built,
        square_feet,
        address_city,
        address_state,
        created_at
      `)
      .eq("id", propertyId)
      .single();

    const property = propertyData as PropertyDetails | null;

    if (propertyError || !property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    // Get property systems
    type PropertySystem = {
      system_type: string;
      brand?: string;
      model?: string;
      install_year?: number;
      last_service_date?: string;
      condition?: string;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: systemsData } = await (supabase as any)
      .from("property_systems")
      .select(`
        system_type,
        brand,
        model,
        install_year,
        last_service_date,
        condition
      `)
      .eq("property_id", propertyId);

    const systems = (systemsData || []) as PropertySystem[];

    // Get customer subscription tier
    type CustomerSubscription = {
      subscription_tier?: string;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: customerData } = await (supabase as any)
      .from("customers")
      .select("subscription_tier")
      .eq("user_id", user.id)
      .single();

    const customer = customerData as CustomerSubscription | null;
    const subscriptionTier = (customer?.subscription_tier || "none") as "essential" | "standard" | "premium" | "none";

    // Get recent service requests for issues context
    type RecentRequest = {
      category: string;
      description?: string;
      status: string;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: requestsData } = await (supabase as any)
      .from("service_requests")
      .select("category, description, status")
      .eq("property_id", propertyId)
      .order("created_at", { ascending: false })
      .limit(10);

    const recentRequests = (requestsData || []) as RecentRequest[];
    const recentIssues = recentRequests
      .filter(r => r.status === "completed" || r.status === "in_progress")
      .map(r => `${r.category}: ${r.description?.substring(0, 100) || "Service completed"}`);

    // Determine timezone from state (simplified mapping)
    const stateToTimezone: Record<string, string> = {
      NC: "America/New_York",
      SC: "America/New_York",
      VA: "America/New_York",
      GA: "America/New_York",
      FL: "America/New_York",
      TX: "America/Chicago",
      CA: "America/Los_Angeles",
      WA: "America/Los_Angeles",
      AZ: "America/Phoenix",
      NY: "America/New_York",
    };
    const timezone = stateToTimezone[property.address_state] || "America/New_York";

    // Calculate property age
    const currentYear = new Date().getFullYear();
    const propertyAge = property.year_built ? currentYear - property.year_built : undefined;

    // Build input for AI task
    const input: MaintenancePlanInput = {
      propertyId,
      propertyType: property.property_type,
      propertyAge,
      yearBuilt: property.year_built,
      squareFeet: property.square_feet,
      systems: systems.map(s => ({
        type: s.system_type,
        brand: s.brand,
        model: s.model,
        age: s.install_year ? currentYear - s.install_year : undefined,
        lastService: s.last_service_date,
        condition: s.condition as "excellent" | "good" | "fair" | "poor" | undefined,
      })),
      location: {
        timezone,
        region: `${property.address_city}, ${property.address_state}`,
      },
      subscriptionTier,
      recentIssues,
    };

    // If AI is disabled, return fallback
    if (!coachEnabled) {
      const task = getTaskDefinition("MAINTENANCE_PLAN_SUGGEST")!;
      const fallbackOutput = task.getFallback(input) as MaintenancePlanOutput;

      // Remove printable summary if not premium/standard
      if (subscriptionTier !== "premium" && subscriptionTier !== "standard") {
        delete fallbackOutput.printableSummary;
      }

      return NextResponse.json({
        plan: fallbackOutput,
        fallback: true,
        featureDisabled: true,
        isPremium: subscriptionTier === "premium" || subscriptionTier === "standard",
        message: "AI maintenance coach is disabled. Showing rule-based suggestions.",
      });
    }

    // Run AI task
    const result = await ai.runTask<MaintenancePlanInput, MaintenancePlanOutput>({
      taskType: "MAINTENANCE_PLAN_SUGGEST",
      actorUserId: user.id,
      entityType: "property",
      entityId: propertyId,
      inputs: input,
    });

    // Persist the response
    const { jobId } = await persistAITaskResponse({
      taskType: "MAINTENANCE_PLAN_SUGGEST",
      actorUserId: user.id,
      entityType: "property",
      entityId: propertyId,
      inputs: input,
      response: result,
    });

    // Check if premium features should be included
    const outputJson = result.outputJson;
    const isPremium = subscriptionTier === "premium" || subscriptionTier === "standard";

    // Remove printable summary if not premium
    if (!isPremium && outputJson.printableSummary) {
      delete outputJson.printableSummary;
    }

    return NextResponse.json({
      plan: outputJson,
      fallback: result.usedFallback,
      isPremium,
      jobId,
      correlationId: result.correlationId,
    });
  } catch (error) {
    console.error("Maintenance plan error:", error);
    return NextResponse.json(
      { error: "Failed to generate maintenance plan" },
      { status: 500 }
    );
  }
}

// GET existing maintenance plan
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: propertyId } = await params;

  try {
    // Verify user has access to this property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membershipData } = await (supabase as any)
      .from("property_members")
      .select("role")
      .eq("property_id", propertyId)
      .eq("user_id", user.id)
      .single();

    if (!membershipData) {
      return NextResponse.json({ error: "Forbidden - no access to property" }, { status: 403 });
    }

    // Get most recent AI output for this property
    type AIOutputRecord = {
      id: string;
      output_json: unknown;
      created_at: string;
      ai_jobs: {
        used_fallback: boolean;
        correlation_id: string;
      };
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: outputData } = await (supabase as any)
      .from("ai_outputs")
      .select(`
        id,
        output_json,
        created_at,
        ai_jobs (
          used_fallback,
          correlation_id
        )
      `)
      .eq("entity_type", "property")
      .eq("entity_id", propertyId)
      .eq("is_current", true)
      .single();

    const output = outputData as AIOutputRecord | null;

    if (!output) {
      return NextResponse.json({
        plan: null,
        message: "No maintenance plan found. Generate one using POST.",
      });
    }

    return NextResponse.json({
      plan: output.output_json,
      fallback: output.ai_jobs?.used_fallback || false,
      createdAt: output.created_at,
      correlationId: output.ai_jobs?.correlation_id,
    });
  } catch (error) {
    console.error("Get maintenance plan error:", error);
    return NextResponse.json(
      { error: "Failed to get maintenance plan" },
      { status: 500 }
    );
  }
}

// PATCH to submit feedback
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: propertyId } = await params;

  try {
    // Verify user has access to this property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: membershipData } = await (supabase as any)
      .from("property_members")
      .select("role")
      .eq("property_id", propertyId)
      .eq("user_id", user.id)
      .single();

    if (!membershipData) {
      return NextResponse.json({ error: "Forbidden - no access to property" }, { status: 403 });
    }

    const body = await request.json();
    const { jobId, rating, reasonCode, comment } = body as {
      jobId: string;
      rating: "up" | "down";
      reasonCode?: string;
      comment?: string;
    };

    if (!jobId || !rating) {
      return NextResponse.json({ error: "jobId and rating are required" }, { status: 400 });
    }

    const feedbackId = await submitAIFeedback({
      jobId,
      actorUserId: user.id,
      rating,
      reasonCode,
      comment,
      contextSnapshot: { propertyId },
    });

    return NextResponse.json({ success: true, feedbackId });
  } catch (error) {
    console.error("Maintenance plan feedback error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
