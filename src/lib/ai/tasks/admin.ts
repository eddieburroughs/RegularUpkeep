/**
 * Admin Tasks
 *
 * Tasks for platform administration, dispute triage, and fraud detection.
 */

import type {
  TaskDefinition,
  DisputeTimelineInput,
  DisputeTimelineOutput,
  DisputeRootCauseCategory,
  FraudSignalInput,
  FraudSignalOutput,
  ProviderQualityInput,
  ProviderQualityOutput,
} from "../types";

// ============================================================================
// DISPUTE_TIMELINE_SUMMARY
// ============================================================================

export const disputeTimelineTask: TaskDefinition<DisputeTimelineInput, DisputeTimelineOutput> = {
  taskType: "DISPUTE_TIMELINE_SUMMARY",
  description: "Analyze dispute with timeline, root cause, and refund recommendation",
  preferredModel: "gpt-4o",
  fallbackModel: "gpt-4o-mini",
  maxTokens: 1500,
  temperature: 0.2,
  requiresVision: false,
  allowedActors: ["admin", "system"],

  buildPrompt(input: DisputeTimelineInput) {
    const system = `You are a dispute resolution analyst for RegularUpkeep home services platform.

Your role is to analyze disputes objectively and provide structured analysis for admin review.

CRITICAL SAFETY RULES:
- NEVER make accusations against either party
- ALWAYS reference evidence types (e.g., "per message timestamp", "based on invoice")
- Recommendations are NON-BINDING - human admin makes final decision
- Focus on documented facts only
- Identify gaps in documentation without assuming fault

ROOT CAUSE CATEGORIES:
- scope: Work performed differs from agreed scope
- quality: Quality of work is disputed
- billing: Pricing, charges, or payment issues
- miscommunication: Communication breakdown between parties
- unknown: Insufficient evidence to determine

Respond with JSON only.`;

    let userPrompt = `Analyze this dispute:

Reason: ${input.disputeReason}
Invoice Amount: $${input.invoiceAmount.toFixed(2)}
Disputed Amount: $${input.disputedAmount.toFixed(2)}

Events:
${input.events.map((e) => `- ${e.timestamp}: [${e.type}] ${e.description} (by ${e.actor})`).join("\n")}`;

    if (input.bookingTimeline) {
      userPrompt += `\n\nBooking Timeline:
- Created: ${input.bookingTimeline.created}
- Scheduled: ${input.bookingTimeline.scheduled}
${input.bookingTimeline.started ? `- Started: ${input.bookingTimeline.started}` : ""}
${input.bookingTimeline.completed ? `- Completed: ${input.bookingTimeline.completed}` : ""}`;
    }

    if (input.estimateDetails) {
      userPrompt += `\n\nEstimate Details:
- Original Amount: $${input.estimateDetails.originalAmount.toFixed(2)}
- Change Orders: ${input.estimateDetails.changeOrders.length > 0
  ? input.estimateDetails.changeOrders.map(co => `${co.description} ($${co.amount.toFixed(2)}, ${co.approved ? "approved" : "not approved"})`).join("; ")
  : "None"}`;
    }

    if (input.messageHistory && input.messageHistory.length > 0) {
      userPrompt += `\n\nMessage History (${input.messageHistory.length} messages):
${input.messageHistory.slice(-5).map(m => `- ${m.timestamp} [${m.sender}]: ${m.content.substring(0, 100)}...`).join("\n")}`;
    }

    if (input.mediaList && input.mediaList.length > 0) {
      userPrompt += `\n\nMedia Evidence: ${input.mediaList.length} items (${input.mediaList.map(m => `${m.type} by ${m.uploadedBy}`).join(", ")})`;
    }

    if (input.policyConfig) {
      userPrompt += `\n\nPolicy Config:
- Dispute Window: ${input.policyConfig.disputeWindowHours} hours
- Auto-Approval Threshold: $${input.policyConfig.autoApprovalThreshold.toFixed(2)}`;
    }

    userPrompt += `

Provide analysis in this JSON format:
{
  "summary": "Objective summary without accusations",
  "timelineBullets": ["Bullet 1", "Bullet 2"],
  "timeline": [
    { "date": "YYYY-MM-DD", "event": "Description referencing evidence", "relevance": "key|supporting|context" }
  ],
  "keyIssues": ["Issue 1 with evidence reference", "Issue 2"],
  "likelyRootCauseCategory": "scope|quality|billing|miscommunication|unknown",
  "policyViolationsDetected": [
    { "violation": "Description", "evidence": "Evidence type/reference", "severity": "minor|major|critical" }
  ],
  "refundRecommendation": {
    "type": "none|partial|full",
    "rationale": "Evidence-based reasoning",
    "suggestedAmount": 0
  },
  "confidence": "high|medium|low",
  "recommendedActions": ["Action 1", "Action 2"]
}`;

    return { system, user: userPrompt };
  },

  parseOutput(raw: string): DisputeTimelineOutput {
    try {
      const data = JSON.parse(raw);

      const validRootCauses: DisputeRootCauseCategory[] = ["scope", "quality", "billing", "miscommunication", "unknown"];

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
        timelineBullets: Array.isArray(data.timelineBullets) ? data.timelineBullets.map(String) : [],
        likelyRootCauseCategory: validRootCauses.includes(data.likelyRootCauseCategory)
          ? data.likelyRootCauseCategory
          : "unknown",
        policyViolationsDetected: Array.isArray(data.policyViolationsDetected)
          ? data.policyViolationsDetected.map((v: Record<string, unknown>) => ({
              violation: String(v.violation || ""),
              evidence: String(v.evidence || ""),
              severity: ["minor", "major", "critical"].includes(v.severity as string)
                ? (v.severity as "minor" | "major" | "critical")
                : "minor",
            }))
          : [],
        refundRecommendation: {
          type: ["none", "partial", "full"].includes(data.refundRecommendation?.type)
            ? data.refundRecommendation.type
            : "none",
          rationale: String(data.refundRecommendation?.rationale || "Insufficient evidence for recommendation"),
          suggestedAmount: typeof data.refundRecommendation?.suggestedAmount === "number"
            ? data.refundRecommendation.suggestedAmount
            : undefined,
        },
        confidence: ["high", "medium", "low"].includes(data.confidence)
          ? data.confidence
          : "low",
      };
    } catch {
      throw new Error("Failed to parse dispute timeline output");
    }
  },

  getFallback(input: DisputeTimelineInput): DisputeTimelineOutput {
    return {
      summary: `Dispute filed: ${input.disputeReason}. Amount in dispute: $${input.disputedAmount.toFixed(2)} of $${input.invoiceAmount.toFixed(2)} total. Manual review required.`,
      timeline: input.events.map((e) => ({
        date: e.timestamp.split("T")[0],
        event: `${e.type}: ${e.description}`,
        relevance: "context" as const,
      })),
      keyIssues: ["AI analysis unavailable - manual review required"],
      recommendedActions: ["Review all documentation", "Contact both parties", "Request additional evidence if needed"],
      timelineBullets: [
        `Dispute reason: ${input.disputeReason}`,
        `Amount disputed: $${input.disputedAmount.toFixed(2)}`,
        `Total events: ${input.events.length}`,
      ],
      likelyRootCauseCategory: "unknown",
      policyViolationsDetected: [],
      refundRecommendation: {
        type: "none",
        rationale: "AI analysis unavailable. Human review required to determine appropriate resolution.",
      },
      confidence: "low",
    };
  },

  validateOutput(output: DisputeTimelineOutput): boolean {
    return (
      typeof output.summary === "string" &&
      output.summary.length > 0 &&
      Array.isArray(output.timeline) &&
      Array.isArray(output.keyIssues) &&
      Array.isArray(output.recommendedActions) &&
      Array.isArray(output.timelineBullets) &&
      ["scope", "quality", "billing", "miscommunication", "unknown"].includes(output.likelyRootCauseCategory) &&
      Array.isArray(output.policyViolationsDetected) &&
      typeof output.refundRecommendation === "object" &&
      ["none", "partial", "full"].includes(output.refundRecommendation.type) &&
      ["high", "medium", "low"].includes(output.confidence)
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
  maxTokens: 1000,
  temperature: 0.1,
  requiresVision: false,
  allowedActors: ["admin", "system"],

  buildPrompt(input: FraudSignalInput) {
    const system = `You are a fraud detection analyst for RegularUpkeep's realtor referral program.

Analyze referral data for potential fraud signals:
- Self-referrals (same person referring themselves)
- Velocity abuse (too many referrals too quickly)
- Cluster patterns (similar emails, IPs, devices, addresses)
- Unusual conversion patterns
- Payment method anomalies

CRITICAL RULES:
- NEVER recommend auto-banning users
- All recommendations require human review
- Use hashed data references only (privacy)
- Provide evidence-based signals only
- When in doubt, recommend "review"

Risk Score Guide (0-100):
- 0-30: Low risk (likely legitimate)
- 31-60: Medium risk (review recommended)
- 61-100: High risk (investigation recommended)

Respond with JSON only.`;

    let userPrompt = `Analyze this referrer's referral patterns:

Referrer ID: ${input.referrerId}

Referral History:
- Total Referrals: ${input.referralCount}
- Conversion Rate: ${(input.conversionRate * 100).toFixed(1)}%

Recent Referrals:
${input.recentReferrals.slice(0, 5).map(r => `- ${r.timestamp}: ${r.converted ? "Converted" : "Pending"}`).join("\n")}

Cluster Analysis:
- Email Domain Cluster: ${input.clusterData.emailDomainHash}
- IP Cluster: ${input.clusterData.ipClusterHash}
- Device Cluster: ${input.clusterData.deviceClusterHash}
- Address Cluster: ${input.clusterData.addressHash}`;

    if (input.paymentFingerprints && input.paymentFingerprints.length > 0) {
      userPrompt += `

Payment Methods: ${input.paymentFingerprints.length} on file
${input.paymentFingerprints.map(p => `- Method: ${p.methodHash.substring(0, 8)}... ${p.last4 ? `(****${p.last4})` : ""}`).join("\n")}`;
    }

    userPrompt += `

Time Patterns:
- Signups Last 24h: ${input.timePatterns.signupsLast24h}
- Signups Last 7d: ${input.timePatterns.signupsLast7d}
- Avg Time Between Signups: ${input.timePatterns.avgTimeBetweenSignups.toFixed(1)} minutes`;

    userPrompt += `

Respond in this JSON format:
{
  "riskScore": 0-100,
  "signals": [
    { "type": "signal_type", "severity": "low|medium|high", "description": "evidence-based explanation" }
  ],
  "recommendation": "approve|review|reject",
  "reviewNotes": "Context for human reviewer - ALWAYS requires human decision"
}`;

    return { system, user: userPrompt };
  },

  parseOutput(raw: string): FraudSignalOutput {
    try {
      const data = JSON.parse(raw);

      // Ensure recommendation always requires review for high-risk cases
      let recommendation = data.recommendation;
      const riskScore = Math.min(100, Math.max(0, Number(data.riskScore) || 50));

      // If high risk, always require review (never auto-reject)
      if (riskScore >= 61 && recommendation === "reject") {
        recommendation = "review"; // Downgrade to review - human must decide
      }

      return {
        riskScore,
        signals: Array.isArray(data.signals)
          ? data.signals.map((s: Record<string, unknown>) => ({
              type: String(s.type || "unknown"),
              severity: ["low", "medium", "high"].includes(s.severity as string)
                ? (s.severity as "low" | "medium" | "high")
                : "medium",
              description: String(s.description || ""),
            }))
          : [],
        recommendation: ["approve", "review", "reject"].includes(recommendation)
          ? recommendation
          : "review",
        reviewNotes: String(data.reviewNotes || "") + " [Human decision required]",
      };
    } catch {
      throw new Error("Failed to parse fraud signal output");
    }
  },

  getFallback(): FraudSignalOutput {
    return {
      riskScore: 50,
      signals: [{ type: "ai_unavailable", severity: "medium", description: "AI analysis unavailable - manual review required" }],
      recommendation: "review",
      reviewNotes: "Automated fraud analysis unavailable. Manual review required. [Human decision required]",
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

// ============================================================================
// PROVIDER_QUALITY_SUMMARY
// ============================================================================

export const providerQualityTask: TaskDefinition<ProviderQualityInput, ProviderQualityOutput> = {
  taskType: "PROVIDER_QUALITY_SUMMARY",
  description: "Generate plain-language provider quality insights for admins",
  preferredModel: "gpt-4o-mini",
  fallbackModel: "gpt-4o-mini",
  maxTokens: 800,
  temperature: 0.3,
  requiresVision: false,
  allowedActors: ["admin", "system"],

  buildPrompt(input: ProviderQualityInput) {
    const system = `You are a provider quality analyst for RegularUpkeep home services platform.

Your role is to provide plain-language summaries of provider performance metrics for admin review.

IMPORTANT RULES:
- This is DESCRIPTIVE ONLY - you do not make tier decisions
- Tier gating is rules-based (handled by the platform, not AI)
- Highlight both strengths and concerns objectively
- Human review is ALWAYS required for any demotion
- Never make accusations, only describe metrics

Respond with JSON only.`;

    const user = `Analyze this provider's quality metrics:

Provider: ${input.providerName} (ID: ${input.providerId})
Current Tier: ${input.currentTier}

Performance Metrics:
- Average Rating: ${input.metrics.rating.toFixed(2)} / 5.0
- Total Jobs Completed: ${input.metrics.totalJobs}
- Dispute Rate: ${(input.metrics.disputeRate * 100).toFixed(2)}%
- Cancellation Rate: ${(input.metrics.cancellationRate * 100).toFixed(2)}%
- Avg Response Time: ${input.metrics.avgResponseTimeHours.toFixed(1)} hours
- On-Time Completion Rate: ${(input.metrics.onTimeRate * 100).toFixed(1)}%

${input.recentIssues && input.recentIssues.length > 0
  ? `Recent Issues:\n${input.recentIssues.map(i => `- ${i}`).join("\n")}`
  : "Recent Issues: None reported"}

Provide analysis in this JSON format:
{
  "qualitySummary": "Plain-language summary of overall performance",
  "strengths": ["Strength 1", "Strength 2"],
  "concerns": ["Concern 1 (if any)"],
  "tierRecommendation": "preferred|verified|basic|probation",
  "humanReviewRequired": true|false,
  "reviewReason": "Why human review is needed (if applicable)"
}`;

    return { system, user };
  },

  parseOutput(raw: string): ProviderQualityOutput {
    try {
      const data = JSON.parse(raw);

      // Always require human review for probation or demotion recommendations
      let humanReviewRequired = Boolean(data.humanReviewRequired);
      let reviewReason = String(data.reviewReason || "");

      if (data.tierRecommendation === "probation") {
        humanReviewRequired = true;
        reviewReason = reviewReason || "Probation recommendation requires admin approval";
      }

      return {
        qualitySummary: String(data.qualitySummary || ""),
        strengths: Array.isArray(data.strengths) ? data.strengths.map(String) : [],
        concerns: Array.isArray(data.concerns) ? data.concerns.map(String) : [],
        tierRecommendation: ["preferred", "verified", "basic", "probation"].includes(data.tierRecommendation)
          ? data.tierRecommendation
          : "basic",
        humanReviewRequired,
        reviewReason: reviewReason || undefined,
      };
    } catch {
      throw new Error("Failed to parse provider quality output");
    }
  },

  getFallback(input: ProviderQualityInput): ProviderQualityOutput {
    return {
      qualitySummary: `${input.providerName} is currently on the ${input.currentTier} tier with ${input.metrics.totalJobs} completed jobs and a ${input.metrics.rating.toFixed(1)}/5 rating. AI analysis unavailable - manual review recommended.`,
      strengths: input.metrics.rating >= 4.0 ? ["Good customer rating"] : [],
      concerns: input.metrics.disputeRate > 0.05 ? ["Dispute rate above threshold"] : [],
      tierRecommendation: input.currentTier,
      humanReviewRequired: true,
      reviewReason: "AI analysis unavailable - manual review required",
    };
  },

  validateOutput(output: ProviderQualityOutput): boolean {
    return (
      typeof output.qualitySummary === "string" &&
      output.qualitySummary.length > 0 &&
      Array.isArray(output.strengths) &&
      Array.isArray(output.concerns) &&
      ["preferred", "verified", "basic", "probation"].includes(output.tierRecommendation) &&
      typeof output.humanReviewRequired === "boolean"
    );
  },
};
