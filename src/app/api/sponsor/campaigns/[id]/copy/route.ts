/**
 * Sponsor Tile Copy API
 *
 * Generates AI-powered marketing copy variants for sponsor campaigns.
 * Behind ai_sponsor_copy_enabled feature flag.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isFeatureEnabled } from "@/lib/config/admin-config";
import { ai, persistAITaskResponse, submitAIFeedback } from "@/lib/ai";
import type { SponsorTileCopyInput, SponsorTileCopyOutput } from "@/lib/ai/types";
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

  const { id: campaignId } = await params;

  try {
    // Check if sponsor copy is enabled
    const copyEnabled = await isFeatureEnabled("ai_sponsor_copy_enabled");

    // Verify user is a sponsor/admin with access to this campaign
    type SponsorCampaign = {
      id: string;
      product_name: string;
      product_category: string;
      target_audience: string;
      key_features: string[];
      tone: "professional" | "friendly" | "urgent";
      brand_guidelines?: string;
      avoid_phrases?: string[];
      sponsors: {
        user_id: string;
        business_name: string;
      } | null;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaignData, error: campaignError } = await (supabase as any)
      .from("sponsor_campaigns")
      .select(`
        id,
        product_name,
        product_category,
        target_audience,
        key_features,
        tone,
        brand_guidelines,
        avoid_phrases,
        sponsors (
          user_id,
          business_name
        )
      `)
      .eq("id", campaignId)
      .single();

    const campaign = campaignData as SponsorCampaign | null;

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    // Verify user owns this campaign or is admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single() as { data: { role: string } | null };

    const isOwner = campaign.sponsors?.user_id === user.id;
    const isAdmin = profile?.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden - no access to campaign" }, { status: 403 });
    }

    // Parse request body for optional overrides
    let bodyOverrides: Partial<SponsorTileCopyInput> = {};
    try {
      bodyOverrides = await request.json();
    } catch {
      // No body provided, use defaults from campaign
    }

    // Build input for AI task
    const input: SponsorTileCopyInput = {
      campaignId,
      productName: bodyOverrides.productName || campaign.product_name,
      productCategory: bodyOverrides.productCategory || campaign.product_category,
      targetAudience: bodyOverrides.targetAudience || campaign.target_audience || "homeowners",
      keyFeatures: bodyOverrides.keyFeatures || campaign.key_features || [],
      tone: bodyOverrides.tone || campaign.tone || "professional",
      brandGuidelines: bodyOverrides.brandGuidelines || campaign.brand_guidelines,
      avoidPhrases: bodyOverrides.avoidPhrases || campaign.avoid_phrases,
      charLimits: bodyOverrides.charLimits || {
        headline: 50,
        description: 120,
        cta: 25,
      },
    };

    // If AI is disabled, return fallback
    if (!copyEnabled) {
      const task = getTaskDefinition("SPONSOR_TILE_COPY")!;
      const fallbackOutput = task.getFallback(input) as SponsorTileCopyOutput;

      return NextResponse.json({
        copy: fallbackOutput,
        fallback: true,
        featureDisabled: true,
        message: "AI sponsor copy is disabled. Showing template-based copy.",
      });
    }

    // Run AI task
    const result = await ai.runTask<SponsorTileCopyInput, SponsorTileCopyOutput>({
      taskType: "SPONSOR_TILE_COPY",
      actorUserId: user.id,
      entityType: "sponsor",
      entityId: campaignId,
      inputs: input,
    });

    // Persist the response
    const { jobId } = await persistAITaskResponse({
      taskType: "SPONSOR_TILE_COPY",
      actorUserId: user.id,
      entityType: "sponsor",
      entityId: campaignId,
      inputs: input,
      response: result,
    });

    return NextResponse.json({
      copy: result.outputJson,
      fallback: result.usedFallback,
      jobId,
      correlationId: result.correlationId,
    });
  } catch (error) {
    console.error("Sponsor copy error:", error);
    return NextResponse.json(
      { error: "Failed to generate sponsor copy" },
      { status: 500 }
    );
  }
}

// GET existing copy variants
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: campaignId } = await params;

  try {
    // Verify user has access to this campaign
    type SponsorCampaign = {
      sponsors: { user_id: string } | null;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaignData } = await (supabase as any)
      .from("sponsor_campaigns")
      .select("sponsors (user_id)")
      .eq("id", campaignId)
      .single();

    const campaign = campaignData as SponsorCampaign | null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single() as { data: { role: string } | null };

    const isOwner = campaign?.sponsors?.user_id === user.id;
    const isAdmin = profile?.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden - no access to campaign" }, { status: 403 });
    }

    // Get most recent AI outputs for this campaign
    type AIOutputRecord = {
      id: string;
      output_json: unknown;
      created_at: string;
      ai_jobs: {
        id: string;
        used_fallback: boolean;
        correlation_id: string;
      };
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: outputsData } = await (supabase as any)
      .from("ai_outputs")
      .select(`
        id,
        output_json,
        created_at,
        ai_jobs (
          id,
          used_fallback,
          correlation_id
        )
      `)
      .eq("entity_type", "sponsor")
      .eq("entity_id", campaignId)
      .order("created_at", { ascending: false })
      .limit(5);

    const outputs = (outputsData || []) as AIOutputRecord[];

    if (outputs.length === 0) {
      return NextResponse.json({
        copy: null,
        history: [],
        message: "No copy variants found. Generate some using POST.",
      });
    }

    return NextResponse.json({
      copy: outputs[0].output_json,
      fallback: outputs[0].ai_jobs?.used_fallback || false,
      createdAt: outputs[0].created_at,
      jobId: outputs[0].ai_jobs?.id,
      history: outputs.slice(1).map(o => ({
        copy: o.output_json,
        createdAt: o.created_at,
        jobId: o.ai_jobs?.id,
      })),
    });
  } catch (error) {
    console.error("Get sponsor copy error:", error);
    return NextResponse.json(
      { error: "Failed to get sponsor copy" },
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

  const { id: campaignId } = await params;

  try {
    // Verify user has access to this campaign
    type SponsorCampaign = {
      sponsors: { user_id: string } | null;
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: campaignData } = await (supabase as any)
      .from("sponsor_campaigns")
      .select("sponsors (user_id)")
      .eq("id", campaignId)
      .single();

    const campaign = campaignData as SponsorCampaign | null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single() as { data: { role: string } | null };

    const isOwner = campaign?.sponsors?.user_id === user.id;
    const isAdmin = profile?.role === "admin";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden - no access to campaign" }, { status: 403 });
    }

    const body = await request.json();
    const { jobId, rating, reasonCode, comment, selectedVariant } = body as {
      jobId: string;
      rating: "up" | "down";
      reasonCode?: string;
      comment?: string;
      selectedVariant?: { headline: string; description: string; cta: string };
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
      contextSnapshot: { campaignId, selectedVariant },
    });

    return NextResponse.json({ success: true, feedbackId });
  } catch (error) {
    console.error("Sponsor copy feedback error:", error);
    return NextResponse.json(
      { error: "Failed to submit feedback" },
      { status: 500 }
    );
  }
}
