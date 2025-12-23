/**
 * Sponsor Tasks
 *
 * Tasks for sponsor/advertiser content generation.
 */

import type {
  TaskDefinition,
  SponsorTileCopyInput,
  SponsorTileCopyOutput,
} from "../types";

// ============================================================================
// SPONSOR_TILE_COPY
// ============================================================================

export const sponsorTileCopyTask: TaskDefinition<SponsorTileCopyInput, SponsorTileCopyOutput> = {
  taskType: "SPONSOR_TILE_COPY",
  description: "Generate marketing copy for sponsor tiles",
  preferredModel: "gpt-4o-mini",
  fallbackModel: "gpt-4o-mini",
  maxTokens: 800,
  temperature: 0.7,
  requiresVision: false,
  allowedActors: ["admin", "system"],

  buildPrompt(input: SponsorTileCopyInput) {
    const system = `You are a marketing copywriter for RegularUpkeep's sponsor program.

Create engaging, concise copy for sponsor tiles that appear on homeowner dashboards.

GUIDELINES:
- Headlines: 5-8 words max
- Subheadlines: 10-15 words
- Body text: 2-3 sentences
- Clear call-to-action
- Match the requested tone
- Focus on homeowner benefits
- Be authentic, not salesy

Respond with JSON only.`;

    const user = `Create sponsor tile copy:

Product: ${input.productName}
Category: ${input.productCategory}
Target Audience: ${input.targetAudience}
Key Features: ${input.keyFeatures.join(", ")}
Tone: ${input.tone}

Respond in this JSON format:
{
  "headline": "Short attention-grabbing headline",
  "subheadline": "Supporting statement",
  "bodyText": "Brief description highlighting benefits",
  "callToAction": "Action-oriented button text",
  "alternatives": [
    { "headline": "Alternative headline", "subheadline": "Alternative subheadline" }
  ]
}`;

    return { system, user };
  },

  parseOutput(raw: string): SponsorTileCopyOutput {
    try {
      const data = JSON.parse(raw);
      return {
        headline: String(data.headline || ""),
        subheadline: String(data.subheadline || ""),
        bodyText: String(data.bodyText || ""),
        callToAction: String(data.callToAction || "Learn More"),
        alternatives: Array.isArray(data.alternatives)
          ? data.alternatives.map((a: Record<string, unknown>) => ({
              headline: String(a.headline || ""),
              subheadline: String(a.subheadline || ""),
            }))
          : [],
      };
    } catch {
      throw new Error("Failed to parse sponsor tile copy output");
    }
  },

  getFallback(input: SponsorTileCopyInput): SponsorTileCopyOutput {
    return {
      headline: `Discover ${input.productName}`,
      subheadline: `${input.productCategory} solutions for your home`,
      bodyText: `${input.productName} offers ${input.keyFeatures[0] || "quality solutions"} for homeowners like you. ${input.keyFeatures[1] ? `Plus, ${input.keyFeatures[1].toLowerCase()}.` : ""}`,
      callToAction: "Learn More",
      alternatives: [
        {
          headline: `${input.productName} for Your Home`,
          subheadline: `Professional ${input.productCategory.toLowerCase()} made easy`,
        },
      ],
    };
  },

  validateOutput(output: SponsorTileCopyOutput): boolean {
    return (
      typeof output.headline === "string" &&
      output.headline.length > 0 &&
      typeof output.subheadline === "string" &&
      typeof output.bodyText === "string" &&
      typeof output.callToAction === "string" &&
      Array.isArray(output.alternatives)
    );
  },
};
