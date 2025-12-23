/**
 * CRM Tasks
 *
 * Tasks for customer relationship management.
 */

import type {
  TaskDefinition,
  CrmNextActionInput,
  CrmNextActionOutput,
} from "../types";

// ============================================================================
// CRM_NEXT_BEST_ACTION
// ============================================================================

export const crmNextActionTask: TaskDefinition<CrmNextActionInput, CrmNextActionOutput> = {
  taskType: "CRM_NEXT_BEST_ACTION",
  description: "Suggest the next best action for customer engagement",
  preferredModel: "gpt-4o-mini",
  fallbackModel: "gpt-4o-mini",
  maxTokens: 600,
  temperature: 0.4,
  requiresVision: false,
  allowedActors: ["admin", "system"],

  buildPrompt(input: CrmNextActionInput) {
    const system = `You are a CRM assistant for RegularUpkeep, a home maintenance platform.

Analyze customer data and suggest the next best action to:
- Improve customer satisfaction
- Increase engagement
- Prevent churn
- Identify upsell opportunities

Focus on actionable, specific recommendations.

Respond with JSON only.`;

    const user = `Analyze this customer and suggest the next best action:

Customer ID: ${input.customerId}

Customer History:
- Total Jobs: ${input.customerHistory.totalJobs}
- Total Spend: $${input.customerHistory.totalSpend.toFixed(2)}
- Last Job Date: ${input.customerHistory.lastJobDate}
- Average Rating Given: ${input.customerHistory.avgRating.toFixed(1)}

Recent Interactions:
${input.recentInteractions.map((i) => `- ${i}`).join("\n")}

Respond in this JSON format:
{
  "suggestedAction": "Specific action to take",
  "priority": "high|medium|low",
  "reasoning": "Why this action is recommended",
  "messageTemplate": "Optional message template if outreach is suggested",
  "timing": "When to take this action"
}`;

    return { system, user };
  },

  parseOutput(raw: string): CrmNextActionOutput {
    try {
      const data = JSON.parse(raw);
      return {
        suggestedAction: String(data.suggestedAction || ""),
        priority: ["high", "medium", "low"].includes(data.priority) ? data.priority : "medium",
        reasoning: String(data.reasoning || ""),
        messageTemplate: data.messageTemplate ? String(data.messageTemplate) : undefined,
        timing: String(data.timing || "As soon as possible"),
      };
    } catch {
      throw new Error("Failed to parse CRM next action output");
    }
  },

  getFallback(input: CrmNextActionInput): CrmNextActionOutput {
    const daysSinceLastJob = Math.floor(
      (Date.now() - new Date(input.customerHistory.lastJobDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceLastJob > 90) {
      return {
        suggestedAction: "Re-engagement outreach",
        priority: "high",
        reasoning: `Customer has not had a job in ${daysSinceLastJob} days.`,
        messageTemplate:
          "Hi! We noticed it's been a while since your last service. Is there anything we can help with?",
        timing: "Within the next week",
      };
    }

    if (input.customerHistory.avgRating < 4) {
      return {
        suggestedAction: "Follow up on service satisfaction",
        priority: "high",
        reasoning: `Customer's average rating (${input.customerHistory.avgRating.toFixed(1)}) indicates potential dissatisfaction.`,
        timing: "Immediately",
      };
    }

    return {
      suggestedAction: "Maintain regular engagement",
      priority: "low",
      reasoning: "Customer appears satisfied. Continue standard communications.",
      timing: "Next scheduled touchpoint",
    };
  },

  validateOutput(output: CrmNextActionOutput): boolean {
    return (
      typeof output.suggestedAction === "string" &&
      output.suggestedAction.length > 0 &&
      ["high", "medium", "low"].includes(output.priority) &&
      typeof output.reasoning === "string" &&
      typeof output.timing === "string"
    );
  },
};
