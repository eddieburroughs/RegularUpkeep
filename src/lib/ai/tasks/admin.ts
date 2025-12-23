/**
 * Admin Tasks
 *
 * Tasks for platform administration and fraud detection.
 */

import type {
  TaskDefinition,
  DisputeTimelineInput,
  DisputeTimelineOutput,
  FraudSignalInput,
  FraudSignalOutput,
} from "../types";

// ============================================================================
// DISPUTE_TIMELINE_SUMMARY
// ============================================================================

export const disputeTimelineTask: TaskDefinition<DisputeTimelineInput, DisputeTimelineOutput> = {
  taskType: "DISPUTE_TIMELINE_SUMMARY",
  description: "Summarize dispute events and create an actionable timeline",
  preferredModel: "gpt-4o",
  fallbackModel: "gpt-4o-mini",
  maxTokens: 1200,
  temperature: 0.2,
  requiresVision: false,
  allowedActors: ["admin", "system"],

  buildPrompt(input: DisputeTimelineInput) {
    const system = `You are a dispute resolution analyst for RegularUpkeep.

Your role is to:
1. Summarize dispute details objectively
2. Create a clear timeline of events
3. Identify key issues
4. Suggest appropriate actions

GUIDELINES:
- Be completely objective and neutral
- Focus on documented facts
- Identify gaps in documentation
- Never take sides
- Recommend fact-based actions

Respond with JSON only.`;

    const user = `Analyze this dispute:

Reason: ${input.disputeReason}
Invoice Amount: $${input.invoiceAmount.toFixed(2)}
Disputed Amount: $${input.disputedAmount.toFixed(2)}

Events:
${input.events.map((e) => `- ${e.timestamp}: [${e.type}] ${e.description} (by ${e.actor})`).join("\n")}

Provide analysis in this JSON format:
{
  "summary": "Objective summary of the dispute",
  "timeline": [
    { "date": "YYYY-MM-DD", "event": "Description", "relevance": "key|supporting|context" }
  ],
  "keyIssues": ["Issue 1", "Issue 2"],
  "recommendedActions": ["Action 1", "Action 2"]
}`;

    return { system, user };
  },

  parseOutput(raw: string): DisputeTimelineOutput {
    try {
      const data = JSON.parse(raw);
      return {
        summary: String(data.summary || ""),
        timeline: Array.isArray(data.timeline)
          ? data.timeline.map((item: Record<string, unknown>) => ({
              date: String(item.date || ""),
              event: String(item.event || ""),
              relevance: ["key", "supporting", "context"].includes(item.relevance as string)
                ? (item.relevance as "key" | "supporting" | "context")
                : "context",
            }))
          : [],
        keyIssues: Array.isArray(data.keyIssues) ? data.keyIssues.map(String) : [],
        recommendedActions: Array.isArray(data.recommendedActions) ? data.recommendedActions.map(String) : [],
      };
    } catch {
      throw new Error("Failed to parse dispute timeline output");
    }
  },

  getFallback(input: DisputeTimelineInput): DisputeTimelineOutput {
    return {
      summary: `Dispute filed: ${input.disputeReason}. Amount in dispute: $${input.disputedAmount.toFixed(2)} of $${input.invoiceAmount.toFixed(2)} total.`,
      timeline: input.events.map((e) => ({
        date: e.timestamp.split("T")[0],
        event: `${e.type}: ${e.description}`,
        relevance: "context" as const,
      })),
      keyIssues: ["Manual review required"],
      recommendedActions: ["Review all documentation", "Contact both parties"],
    };
  },

  validateOutput(output: DisputeTimelineOutput): boolean {
    return (
      typeof output.summary === "string" &&
      output.summary.length > 0 &&
      Array.isArray(output.timeline) &&
      Array.isArray(output.keyIssues) &&
      Array.isArray(output.recommendedActions)
    );
  },
};

// ============================================================================
// FRAUD_SIGNAL_REFERRALS
// ============================================================================

export const fraudSignalTask: TaskDefinition<FraudSignalInput, FraudSignalOutput> = {
  taskType: "FRAUD_SIGNAL_REFERRALS",
  description: "Analyze referral patterns for potential fraud signals",
  preferredModel: "gpt-4o",
  fallbackModel: "gpt-4o-mini",
  maxTokens: 800,
  temperature: 0.1,
  requiresVision: false,
  allowedActors: ["admin", "system"],

  buildPrompt(input: FraudSignalInput) {
    const system = `You are a fraud detection analyst for RegularUpkeep's referral program.

Analyze referral data for potential fraud signals such as:
- Self-referrals
- Velocity abuse (too many referrals too quickly)
- Pattern matching (similar emails, IPs, devices)
- Unusual conversion patterns

Provide a risk score from 0-100 where:
- 0-30: Low risk, approve
- 31-60: Medium risk, review
- 61-100: High risk, reject/investigate

Be precise and evidence-based.

Respond with JSON only.`;

    const user = `Analyze this referral:

Referral Code: ${input.referralCode}
Referrer History:
- Total Referrals: ${input.referrerHistory.totalReferrals}
- Conversion Rate: ${(input.referrerHistory.conversionRate * 100).toFixed(1)}%
- Avg Days to Convert: ${input.referrerHistory.avgDaysToConvert}

Referree Data:
- Signup Date: ${input.referreeData.signupDate}
- Email: ${input.referreeData.email}
${input.referreeData.ipAddress ? `- IP: ${input.referreeData.ipAddress}` : ""}
${input.referreeData.deviceFingerprint ? `- Device: ${input.referreeData.deviceFingerprint}` : ""}

Respond in this JSON format:
{
  "riskScore": 0-100,
  "signals": [
    { "type": "signal_type", "severity": "low|medium|high", "description": "explanation" }
  ],
  "recommendation": "approve|review|reject",
  "reviewNotes": "Additional context for reviewers"
}`;

    return { system, user };
  },

  parseOutput(raw: string): FraudSignalOutput {
    try {
      const data = JSON.parse(raw);
      return {
        riskScore: Math.min(100, Math.max(0, Number(data.riskScore) || 50)),
        signals: Array.isArray(data.signals)
          ? data.signals.map((s: Record<string, unknown>) => ({
              type: String(s.type || "unknown"),
              severity: ["low", "medium", "high"].includes(s.severity as string)
                ? (s.severity as "low" | "medium" | "high")
                : "medium",
              description: String(s.description || ""),
            }))
          : [],
        recommendation: ["approve", "review", "reject"].includes(data.recommendation)
          ? data.recommendation
          : "review",
        reviewNotes: String(data.reviewNotes || ""),
      };
    } catch {
      throw new Error("Failed to parse fraud signal output");
    }
  },

  getFallback(): FraudSignalOutput {
    return {
      riskScore: 50,
      signals: [{ type: "manual_review_needed", severity: "medium", description: "AI analysis unavailable" }],
      recommendation: "review",
      reviewNotes: "Automated fraud analysis unavailable. Manual review recommended.",
    };
  },

  validateOutput(output: FraudSignalOutput): boolean {
    return (
      typeof output.riskScore === "number" &&
      output.riskScore >= 0 &&
      output.riskScore <= 100 &&
      Array.isArray(output.signals) &&
      ["approve", "review", "reject"].includes(output.recommendation) &&
      typeof output.reviewNotes === "string"
    );
  },
};
