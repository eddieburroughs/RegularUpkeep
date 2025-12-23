/**
 * Provider Tasks
 *
 * Tasks for service provider assistance.
 */

import type {
  TaskDefinition,
  ProviderEstimateInput,
  ProviderEstimateOutput,
  ProviderMessageInput,
  ProviderMessageOutput,
  InvoiceNarrativeInput,
  InvoiceNarrativeOutput,
} from "../types";

// ============================================================================
// PROVIDER_ESTIMATE_DRAFT
// ============================================================================

export const providerEstimateTask: TaskDefinition<ProviderEstimateInput, ProviderEstimateOutput> = {
  taskType: "PROVIDER_ESTIMATE_DRAFT",
  description: "Help providers draft estimates with scope of work suggestions",
  preferredModel: "gpt-4o",
  fallbackModel: "gpt-4o-mini",
  maxTokens: 1200,
  temperature: 0.4,
  requiresVision: false,
  allowedActors: ["provider", "system"],

  buildPrompt(input: ProviderEstimateInput) {
    const system = `You are an assistant helping home service providers create professional estimates.

Your role is to suggest scope of work items and line items based on the job description.

IMPORTANT GUIDELINES:
- NEVER include specific dollar amounts or prices
- Focus on describing the work clearly
- Include both labor and material items where appropriate
- Suggest warranty considerations
- Ask clarifying questions if information is missing

Respond with JSON only.`;

    const user = `Help draft an estimate for this job:

Category: ${input.category}
Provider Brief: ${input.providerBrief}
${input.providerNotes ? `Provider Notes: ${input.providerNotes}` : ""}
${input.similarJobsContext ? `Similar Past Jobs: ${input.similarJobsContext}` : ""}

Provide suggestions in this JSON format:
{
  "scopeOfWork": "Detailed description of the work to be performed",
  "lineItemSuggestions": [
    { "description": "Item description", "type": "labor|material", "note": "optional note" }
  ],
  "clarifyingQuestions": ["Questions for the customer or technician"],
  "estimatedDurationRange": "e.g., 2-4 hours",
  "warrantyConsiderations": ["Warranty notes"]
}`;

    return { system, user };
  },

  parseOutput(raw: string): ProviderEstimateOutput {
    try {
      const data = JSON.parse(raw);
      return {
        scopeOfWork: String(data.scopeOfWork || ""),
        lineItemSuggestions: Array.isArray(data.lineItemSuggestions)
          ? data.lineItemSuggestions.map((item: Record<string, unknown>) => ({
              description: String(item.description || ""),
              type: item.type === "material" ? "material" : "labor",
              note: item.note ? String(item.note) : undefined,
            }))
          : [],
        clarifyingQuestions: Array.isArray(data.clarifyingQuestions)
          ? data.clarifyingQuestions.map(String)
          : [],
        estimatedDurationRange: String(data.estimatedDurationRange || "TBD"),
        warrantyConsiderations: Array.isArray(data.warrantyConsiderations)
          ? data.warrantyConsiderations.map(String)
          : [],
      };
    } catch {
      throw new Error("Failed to parse provider estimate output");
    }
  },

  getFallback(input: ProviderEstimateInput): ProviderEstimateOutput {
    return {
      scopeOfWork: `${input.category} service as described in the provider brief. Final scope to be confirmed after on-site assessment.`,
      lineItemSuggestions: [
        { description: "Service call and diagnosis", type: "labor" },
        { description: "Repair/replacement work", type: "labor" },
        { description: "Parts and materials", type: "material" },
      ],
      clarifyingQuestions: ["Please confirm access to the work area", "Any scheduling preferences?"],
      estimatedDurationRange: "To be determined after assessment",
      warrantyConsiderations: ["Standard workmanship warranty applies"],
    };
  },

  validateOutput(output: ProviderEstimateOutput): boolean {
    return (
      typeof output.scopeOfWork === "string" &&
      output.scopeOfWork.length > 0 &&
      Array.isArray(output.lineItemSuggestions) &&
      output.lineItemSuggestions.every(
        (item) =>
          typeof item.description === "string" && ["labor", "material"].includes(item.type)
      )
    );
  },
};

// ============================================================================
// PROVIDER_MESSAGE_DRAFT
// ============================================================================

export const providerMessageTask: TaskDefinition<ProviderMessageInput, ProviderMessageOutput> = {
  taskType: "PROVIDER_MESSAGE_DRAFT",
  description: "Help providers draft professional messages to customers",
  preferredModel: "gpt-4o-mini",
  fallbackModel: "gpt-4o-mini",
  maxTokens: 600,
  temperature: 0.5,
  requiresVision: false,
  allowedActors: ["provider", "system"],

  buildPrompt(input: ProviderMessageInput) {
    const system = `You are a communications assistant for home service providers.

Help draft professional, friendly messages to customers.

GUIDELINES:
- Keep messages concise but warm
- Use the customer's name
- Be clear about next steps
- Maintain professional tone
- Never include pricing in messages

Respond with JSON only.`;

    const user = `Draft a ${input.context} message:

Customer Name: ${input.customerName}
Service Category: ${input.serviceCategory}
Key Points to Include: ${input.keyPoints.join(", ")}

Respond in this JSON format:
{
  "message": "The drafted message",
  "tone": "professional|friendly|urgent",
  "suggestedAlternatives": ["alternative version if helpful"]
}`;

    return { system, user };
  },

  parseOutput(raw: string): ProviderMessageOutput {
    try {
      const data = JSON.parse(raw);
      return {
        message: String(data.message || ""),
        tone: ["professional", "friendly", "urgent"].includes(data.tone) ? data.tone : "professional",
        suggestedAlternatives: Array.isArray(data.suggestedAlternatives)
          ? data.suggestedAlternatives.map(String)
          : undefined,
      };
    } catch {
      throw new Error("Failed to parse provider message output");
    }
  },

  getFallback(input: ProviderMessageInput): ProviderMessageOutput {
    const templates: Record<string, string> = {
      introduction: `Hi ${input.customerName}, thank you for choosing us for your ${input.serviceCategory} needs. We look forward to helping you.`,
      update: `Hi ${input.customerName}, I wanted to update you on your ${input.serviceCategory} service. Please let me know if you have any questions.`,
      scheduling: `Hi ${input.customerName}, I'd like to schedule your ${input.serviceCategory} service. What times work best for you?`,
      completion: `Hi ${input.customerName}, your ${input.serviceCategory} service has been completed. Thank you for your business!`,
      followup: `Hi ${input.customerName}, I'm following up on your recent ${input.serviceCategory} service. Is everything working well?`,
    };

    return {
      message: templates[input.context] || templates.update,
      tone: "professional",
    };
  },

  validateOutput(output: ProviderMessageOutput): boolean {
    return (
      typeof output.message === "string" &&
      output.message.length > 0 &&
      ["professional", "friendly", "urgent"].includes(output.tone)
    );
  },
};

// ============================================================================
// INVOICE_NARRATIVE_DRAFT
// ============================================================================

export const invoiceNarrativeTask: TaskDefinition<InvoiceNarrativeInput, InvoiceNarrativeOutput> = {
  taskType: "INVOICE_NARRATIVE_DRAFT",
  description: "Generate professional invoice narratives",
  preferredModel: "gpt-4o-mini",
  fallbackModel: "gpt-4o-mini",
  maxTokens: 800,
  temperature: 0.3,
  requiresVision: false,
  allowedActors: ["provider", "system"],

  buildPrompt(input: InvoiceNarrativeInput) {
    const system = `You are assisting home service providers in creating professional invoice descriptions.

Write clear, detailed descriptions of completed work that:
- Clearly explain what was done
- Justify the value provided
- Are professional and easy to understand
- Include relevant highlights
- Add appropriate disclaimers

Respond with JSON only.`;

    const user = `Create an invoice narrative for this completed work:

Category: ${input.category}
Scope of Work: ${input.scopeOfWork}
Work Completed: ${input.completedWork.join("; ")}
${input.materialsUsed ? `Materials Used: ${input.materialsUsed.join(", ")}` : ""}
${input.technician ? `Technician: ${input.technician}` : ""}

Respond in this JSON format:
{
  "narrative": "A detailed description of the work performed",
  "highlights": ["Key accomplishments or value points"],
  "disclaimer": "Standard disclaimer text"
}`;

    return { system, user };
  },

  parseOutput(raw: string): InvoiceNarrativeOutput {
    try {
      const data = JSON.parse(raw);
      return {
        narrative: String(data.narrative || ""),
        highlights: Array.isArray(data.highlights) ? data.highlights.map(String) : [],
        disclaimer: String(data.disclaimer || "Work performed as described. Standard warranty applies."),
      };
    } catch {
      throw new Error("Failed to parse invoice narrative output");
    }
  },

  getFallback(input: InvoiceNarrativeInput): InvoiceNarrativeOutput {
    return {
      narrative: `${input.category} service completed. Work performed: ${input.completedWork.join("; ")}. ${input.materialsUsed ? `Materials: ${input.materialsUsed.join(", ")}.` : ""}`,
      highlights: input.completedWork.slice(0, 3),
      disclaimer: "Work performed as described. Standard workmanship warranty applies. Please contact us with any questions.",
    };
  },

  validateOutput(output: InvoiceNarrativeOutput): boolean {
    return (
      typeof output.narrative === "string" &&
      output.narrative.length > 0 &&
      Array.isArray(output.highlights) &&
      typeof output.disclaimer === "string"
    );
  },
};
