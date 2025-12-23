/**
 * CRM Tasks
 *
 * Tasks for customer relationship management.
 * Behind ai_crm_copilot_enabled feature flag.
 */

import type {
  TaskDefinition,
  CrmNextActionInput,
  CrmNextActionOutput,
  CrmActionType,
} from "../types";

// ============================================================================
// CRM_NEXT_BEST_ACTION
// ============================================================================

export const crmNextActionTask: TaskDefinition<CrmNextActionInput, CrmNextActionOutput> = {
  taskType: "CRM_NEXT_BEST_ACTION",
  description: "Suggest next best actions for customer engagement with risks and upsell opportunities",
  preferredModel: "gpt-4o",
  fallbackModel: "gpt-4o-mini",
  maxTokens: 1200,
  temperature: 0.4,
  requiresVision: false,
  allowedActors: ["provider", "admin", "system"],

  buildPrompt(input: CrmNextActionInput) {
    const system = `You are a CRM assistant for RegularUpkeep, a home maintenance platform.

Analyze customer data and provide actionable suggestions for the service provider to:
- Improve customer satisfaction and retention
- Identify and mitigate churn risks
- Spot upsell and cross-sell opportunities
- Maintain strong customer relationships

GUIDELINES:
- Provide specific, actionable recommendations
- Include ready-to-use message templates
- Consider the customer's service history and engagement patterns
- Prioritize high-impact actions
- Be realistic about timing (dueInDays should be practical)
- Identify early warning signs of dissatisfaction

PROHIBITED:
- Never suggest aggressive sales tactics
- Never recommend contacting customers excessively
- Never suggest discounts below cost

Respond with JSON only.`;

    let userPrompt = `Analyze this customer and suggest next actions:

Customer: ${input.customerName} (ID: ${input.customerId})

Customer History:
- Member Since: ${input.customerHistory.memberSince}
- Total Jobs: ${input.customerHistory.totalJobs}
- Total Spend: $${input.customerHistory.totalSpend.toFixed(2)}
- Last Job Date: ${input.customerHistory.lastJobDate}
- Average Rating Given: ${input.customerHistory.avgRating.toFixed(1)}/5
${input.customerHistory.subscriptionTier ? `- Subscription: ${input.customerHistory.subscriptionTier}` : ""}

Recent Interactions:
${input.recentInteractions.length > 0 ? input.recentInteractions.map((i) => `- ${i}`).join("\n") : "- No recent interactions"}`;

    if (input.bookingContext) {
      userPrompt += `

Current Booking Context:
- Booking ID: ${input.bookingContext.bookingId}
- Service: ${input.bookingContext.serviceCategory}
- Status: ${input.bookingContext.status}
${input.bookingContext.scheduledDate ? `- Scheduled: ${input.bookingContext.scheduledDate}` : ""}
${input.bookingContext.completedDate ? `- Completed: ${input.bookingContext.completedDate}` : ""}
${input.bookingContext.amount ? `- Amount: $${(input.bookingContext.amount / 100).toFixed(2)}` : ""}`;
    }

    if (input.providerCategories && input.providerCategories.length > 0) {
      userPrompt += `

Provider's Service Categories: ${input.providerCategories.join(", ")}`;
    }

    userPrompt += `

Respond in this JSON format:
{
  "nextActions": [
    {
      "actionType": "follow_up_call|send_message|schedule_service|offer_discount|request_review|send_maintenance_reminder|upsell_service|win_back|thank_you",
      "suggestedMessage": "Ready-to-use message text",
      "dueInDays": 0-30,
      "reason": "Why this action is recommended",
      "priority": "high|medium|low"
    }
  ],
  "risks": [
    {
      "type": "churn|dissatisfaction|missed_opportunity|overdue_service",
      "description": "Description of the risk",
      "severity": "high|medium|low"
    }
  ],
  "upsellOpportunities": [
    {
      "service": "Service name",
      "reason": "Why this is a good fit",
      "estimatedValue": "$X-$Y"
    }
  ],
  "customerHealthScore": 0-100
}`;

    return { system, user: userPrompt };
  },

  parseOutput(raw: string): CrmNextActionOutput {
    try {
      const data = JSON.parse(raw);

      const validActionTypes: CrmActionType[] = [
        "follow_up_call", "send_message", "schedule_service", "offer_discount",
        "request_review", "send_maintenance_reminder", "upsell_service", "win_back", "thank_you"
      ];

      return {
        nextActions: Array.isArray(data.nextActions)
          ? data.nextActions.map((a: Record<string, unknown>) => ({
              actionType: validActionTypes.includes(a.actionType as CrmActionType)
                ? (a.actionType as CrmActionType)
                : "send_message",
              suggestedMessage: String(a.suggestedMessage || ""),
              dueInDays: typeof a.dueInDays === "number" ? Math.min(30, Math.max(0, a.dueInDays)) : 7,
              reason: String(a.reason || ""),
              priority: ["high", "medium", "low"].includes(a.priority as string)
                ? (a.priority as "high" | "medium" | "low")
                : "medium",
            }))
          : [],
        risks: Array.isArray(data.risks)
          ? data.risks.map((r: Record<string, unknown>) => ({
              type: ["churn", "dissatisfaction", "missed_opportunity", "overdue_service"].includes(r.type as string)
                ? (r.type as "churn" | "dissatisfaction" | "missed_opportunity" | "overdue_service")
                : "missed_opportunity",
              description: String(r.description || ""),
              severity: ["high", "medium", "low"].includes(r.severity as string)
                ? (r.severity as "high" | "medium" | "low")
                : "medium",
            }))
          : [],
        upsellOpportunities: Array.isArray(data.upsellOpportunities)
          ? data.upsellOpportunities.map((u: Record<string, unknown>) => ({
              service: String(u.service || ""),
              reason: String(u.reason || ""),
              estimatedValue: String(u.estimatedValue || ""),
            }))
          : [],
        customerHealthScore: typeof data.customerHealthScore === "number"
          ? Math.min(100, Math.max(0, data.customerHealthScore))
          : 50,
      };
    } catch {
      throw new Error("Failed to parse CRM next action output");
    }
  },

  getFallback(input: CrmNextActionInput): CrmNextActionOutput {
    const daysSinceLastJob = Math.floor(
      (Date.now() - new Date(input.customerHistory.lastJobDate).getTime()) / (1000 * 60 * 60 * 24)
    );

    const nextActions: CrmNextActionOutput["nextActions"] = [];
    const risks: CrmNextActionOutput["risks"] = [];
    const upsellOpportunities: CrmNextActionOutput["upsellOpportunities"] = [];
    let healthScore = 70;

    // Check for churn risk
    if (daysSinceLastJob > 180) {
      healthScore -= 30;
      risks.push({
        type: "churn",
        description: `Customer has not had a service in ${daysSinceLastJob} days`,
        severity: "high",
      });
      nextActions.push({
        actionType: "win_back",
        suggestedMessage: `Hi ${input.customerName}! We noticed it's been a while since your last service. Is there anything we can help with around the house? We'd love to keep your home in great shape.`,
        dueInDays: 3,
        reason: "High churn risk - long time since last engagement",
        priority: "high",
      });
    } else if (daysSinceLastJob > 90) {
      healthScore -= 15;
      risks.push({
        type: "overdue_service",
        description: "Customer may have seasonal maintenance needs",
        severity: "medium",
      });
      nextActions.push({
        actionType: "send_maintenance_reminder",
        suggestedMessage: `Hi ${input.customerName}! Just checking in - with the season changing, it might be a good time to schedule some routine maintenance. Let us know if we can help!`,
        dueInDays: 7,
        reason: "Proactive seasonal outreach opportunity",
        priority: "medium",
      });
    }

    // Check for satisfaction issues
    if (input.customerHistory.avgRating < 4) {
      healthScore -= 20;
      risks.push({
        type: "dissatisfaction",
        description: `Customer's average rating (${input.customerHistory.avgRating.toFixed(1)}) indicates potential issues`,
        severity: "high",
      });
      nextActions.push({
        actionType: "follow_up_call",
        suggestedMessage: `Hi ${input.customerName}, I wanted to personally check in and see how we can better serve you. Your feedback is really important to us.`,
        dueInDays: 1,
        reason: "Address potential dissatisfaction before churn",
        priority: "high",
      });
    }

    // Recent booking context
    if (input.bookingContext?.status === "completed") {
      nextActions.push({
        actionType: "request_review",
        suggestedMessage: `Hi ${input.customerName}! Thank you for choosing us for your recent ${input.bookingContext.serviceCategory} service. We'd really appreciate if you could share your experience with a quick review!`,
        dueInDays: 2,
        reason: "Capture feedback while experience is fresh",
        priority: "medium",
      });
    }

    // Default action if none triggered
    if (nextActions.length === 0) {
      nextActions.push({
        actionType: "send_message",
        suggestedMessage: `Hi ${input.customerName}! Just wanted to check in and see if there's anything we can help with. We're always here for your home maintenance needs!`,
        dueInDays: 14,
        reason: "Maintain regular engagement",
        priority: "low",
      });
    }

    // Upsell opportunity based on history
    if (input.customerHistory.totalJobs >= 3 && input.customerHistory.avgRating >= 4) {
      upsellOpportunities.push({
        service: "Annual Maintenance Plan",
        reason: "Loyal customer with positive history - good candidate for recurring service",
        estimatedValue: "$200-$500/year",
      });
    }

    return {
      nextActions,
      risks,
      upsellOpportunities,
      customerHealthScore: Math.max(0, healthScore),
    };
  },

  validateOutput(output: CrmNextActionOutput): boolean {
    return (
      Array.isArray(output.nextActions) &&
      Array.isArray(output.risks) &&
      Array.isArray(output.upsellOpportunities) &&
      typeof output.customerHealthScore === "number" &&
      output.customerHealthScore >= 0 &&
      output.customerHealthScore <= 100
    );
  },
};
