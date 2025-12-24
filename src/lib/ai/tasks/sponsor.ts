/**
 * Sponsor Tasks
 *
 * Tasks for sponsor/advertiser content generation.
 * Behind ai_sponsor_copy_enabled feature flag.
 */

import type {
  TaskDefinition,
  SponsorTileCopyInput,
  SponsorTileCopyOutput,
} from "../types";
import { SPONSOR_PROHIBITED_CLAIMS } from "../types";

// Helper to check for prohibited claims
function checkProhibitedClaims(text: string): string[] {
  const lower = text.toLowerCase();
  return SPONSOR_PROHIBITED_CLAIMS.filter(claim => lower.includes(claim.toLowerCase()));
}

// ============================================================================
// SPONSOR_TILE_COPY
// ============================================================================

export const sponsorTileCopyTask: TaskDefinition<SponsorTileCopyInput, SponsorTileCopyOutput> = {
  taskType: "SPONSOR_TILE_COPY",
  description: "Generate multiple marketing copy variants for sponsor tiles with compliance checking",
  preferredModel: "claude-haiku-4-5-20251001", // Short marketing copy
  fallbackModel: "claude-sonnet-4-5-20250929",
  maxTokens: 1500,
  temperature: 0.7,
  requiresVision: false,
  allowedActors: ["admin", "system"],

  buildPrompt(input: SponsorTileCopyInput) {
    const headlineLimit = input.charLimits?.headline || 50;
    const descLimit = input.charLimits?.description || 120;
    const ctaLimit = input.charLimits?.cta || 25;

    const system = `You are a marketing copywriter for RegularUpkeep's sponsor program.

Create engaging, honest copy for sponsor tiles that appear on homeowner dashboards.

REQUIREMENTS:
- Generate 3-4 variants for headlines, CTAs, and descriptions
- Headlines: Max ${headlineLimit} characters
- Descriptions: Max ${descLimit} characters
- CTAs: Max ${ctaLimit} characters
- Match the requested tone: ${input.tone}
- Focus on homeowner benefits
- Be authentic, not salesy

PROHIBITED CLAIMS (never use these or similar):
${SPONSOR_PROHIBITED_CLAIMS.map(c => `- "${c}"`).join("\n")}

${input.brandGuidelines ? `BRAND GUIDELINES:\n${input.brandGuidelines}\n` : ""}
${input.avoidPhrases && input.avoidPhrases.length > 0 ? `AVOID THESE PHRASES:\n${input.avoidPhrases.map(p => `- "${p}"`).join("\n")}\n` : ""}

Respond with JSON only.`;

    const user = `Create sponsor tile copy variants:

Product: ${input.productName}
Category: ${input.productCategory}
Target Audience: ${input.targetAudience}
Key Features: ${input.keyFeatures.join(", ")}
Tone: ${input.tone}
${input.campaignId ? `Campaign ID: ${input.campaignId}` : ""}

Respond in this JSON format:
{
  "headlines": [
    { "text": "Headline text", "charCount": 25 }
  ],
  "ctas": [
    { "text": "CTA text", "charCount": 12 }
  ],
  "shortDescriptions": [
    { "text": "Description text", "charCount": 80 }
  ],
  "complianceNotes": [
    { "type": "approved|warning|suggestion", "message": "Note about compliance" }
  ],
  "recommended": {
    "headline": "Best headline option",
    "description": "Best description option",
    "cta": "Best CTA option"
  }
}

Provide 3-4 options for each category. Include at least one compliance note about the generated copy.`;

    return { system, user };
  },

  parseOutput(raw: string): SponsorTileCopyOutput {
    try {
      const data = JSON.parse(raw);

      // Parse and validate headlines
      const headlines = Array.isArray(data.headlines)
        ? data.headlines.map((h: Record<string, unknown>) => ({
            text: String(h.text || ""),
            charCount: typeof h.charCount === "number" ? h.charCount : String(h.text || "").length,
          }))
        : [];

      // Parse and validate CTAs
      const ctas = Array.isArray(data.ctas)
        ? data.ctas.map((c: Record<string, unknown>) => ({
            text: String(c.text || ""),
            charCount: typeof c.charCount === "number" ? c.charCount : String(c.text || "").length,
          }))
        : [];

      // Parse and validate descriptions
      const shortDescriptions = Array.isArray(data.shortDescriptions)
        ? data.shortDescriptions.map((d: Record<string, unknown>) => ({
            text: String(d.text || ""),
            charCount: typeof d.charCount === "number" ? d.charCount : String(d.text || "").length,
          }))
        : [];

      // Parse compliance notes
      const complianceNotes = Array.isArray(data.complianceNotes)
        ? data.complianceNotes.map((n: Record<string, unknown>) => ({
            type: ["warning", "suggestion", "approved"].includes(n.type as string)
              ? (n.type as "warning" | "suggestion" | "approved")
              : "suggestion",
            message: String(n.message || ""),
          }))
        : [];

      // Check all generated text for prohibited claims
      const allText = [
        ...headlines.map((h: { text: string }) => h.text),
        ...ctas.map((c: { text: string }) => c.text),
        ...shortDescriptions.map((d: { text: string }) => d.text),
      ];

      for (const text of allText) {
        const violations = checkProhibitedClaims(text);
        if (violations.length > 0) {
          complianceNotes.push({
            type: "warning",
            message: `Prohibited claim detected: "${violations.join(", ")}" - must be removed before publishing`,
          });
        }
      }

      // Parse recommended combination
      const recommended = data.recommended
        ? {
            headline: String(data.recommended.headline || headlines[0]?.text || ""),
            description: String(data.recommended.description || shortDescriptions[0]?.text || ""),
            cta: String(data.recommended.cta || ctas[0]?.text || "Learn More"),
          }
        : {
            headline: headlines[0]?.text || "",
            description: shortDescriptions[0]?.text || "",
            cta: ctas[0]?.text || "Learn More",
          };

      return {
        headlines,
        ctas,
        shortDescriptions,
        complianceNotes,
        recommended,
      };
    } catch {
      throw new Error("Failed to parse sponsor tile copy output");
    }
  },

  getFallback(input: SponsorTileCopyInput): SponsorTileCopyOutput {
    const headline1 = `Discover ${input.productName}`;
    const headline2 = `${input.productName} for Your Home`;
    const headline3 = `Home ${input.productCategory} Made Easy`;

    const desc1 = `${input.productName} offers ${input.keyFeatures[0] || "quality solutions"} for homeowners.`;
    const desc2 = `Professional ${input.productCategory.toLowerCase()} solutions trusted by homeowners.`;
    const desc3 = `Keep your home maintained with ${input.productName}.`;

    const cta1 = "Learn More";
    const cta2 = "Get Started";
    const cta3 = "See Details";

    return {
      headlines: [
        { text: headline1, charCount: headline1.length },
        { text: headline2, charCount: headline2.length },
        { text: headline3, charCount: headline3.length },
      ],
      ctas: [
        { text: cta1, charCount: cta1.length },
        { text: cta2, charCount: cta2.length },
        { text: cta3, charCount: cta3.length },
      ],
      shortDescriptions: [
        { text: desc1, charCount: desc1.length },
        { text: desc2, charCount: desc2.length },
        { text: desc3, charCount: desc3.length },
      ],
      complianceNotes: [
        {
          type: "suggestion",
          message: "Fallback copy generated - AI was unavailable. Review before publishing.",
        },
      ],
      recommended: {
        headline: headline1,
        description: desc1,
        cta: cta1,
      },
    };
  },

  validateOutput(output: SponsorTileCopyOutput): boolean {
    return (
      Array.isArray(output.headlines) &&
      output.headlines.length > 0 &&
      Array.isArray(output.ctas) &&
      output.ctas.length > 0 &&
      Array.isArray(output.shortDescriptions) &&
      output.shortDescriptions.length > 0 &&
      Array.isArray(output.complianceNotes) &&
      typeof output.recommended === "object" &&
      typeof output.recommended.headline === "string" &&
      typeof output.recommended.description === "string" &&
      typeof output.recommended.cta === "string"
    );
  },
};
