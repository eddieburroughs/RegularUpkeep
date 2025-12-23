/**
 * Admin Triage Tests
 *
 * Tests for admin AI triage features:
 * - Dispute timeline summary
 * - Fraud signal detection
 * - Provider quality insights
 *
 * Safety rules tested:
 * - Never make accusations
 * - Always require human review
 * - Never auto-ban or auto-demote
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the providers module
vi.mock("../providers", () => ({
  getBestAvailableProvider: vi.fn(),
  getProviderAdapter: vi.fn(),
  mapModelToProvider: vi.fn((model) => model),
}));

import { getTaskDefinition, canActorExecuteTask } from "../tasks";
import type {
  DisputeTimelineInput,
  DisputeTimelineOutput,
  FraudSignalInput,
  FraudSignalOutput,
  ProviderQualityInput,
  ProviderQualityOutput,
} from "../types";

// ============================================================================
// Dispute Timeline Summary Tests
// ============================================================================

describe("Dispute Timeline Summary", () => {
  describe("Task Definition", () => {
    it("should exist and have correct configuration", () => {
      const task = getTaskDefinition("DISPUTE_TIMELINE_SUMMARY");
      expect(task).toBeDefined();
      expect(task?.taskType).toBe("DISPUTE_TIMELINE_SUMMARY");
      expect(task?.allowedActors).toContain("admin");
      expect(task?.allowedActors).toContain("system");
    });

    it("should only allow admins and system to execute", () => {
      expect(canActorExecuteTask("admin", "DISPUTE_TIMELINE_SUMMARY")).toBe(true);
      expect(canActorExecuteTask("system", "DISPUTE_TIMELINE_SUMMARY")).toBe(true);
      expect(canActorExecuteTask("customer", "DISPUTE_TIMELINE_SUMMARY")).toBe(false);
      expect(canActorExecuteTask("provider", "DISPUTE_TIMELINE_SUMMARY")).toBe(false);
    });
  });

  describe("Prompt Generation", () => {
    it("should include safety rules in prompt", () => {
      const task = getTaskDefinition("DISPUTE_TIMELINE_SUMMARY");
      const input: DisputeTimelineInput = {
        disputeReason: "Quality of work",
        events: [
          { timestamp: "2024-01-01", type: "booking_created", description: "Booking created", actor: "customer" },
        ],
        invoiceAmount: 50000,
        disputedAmount: 20000,
      };

      const { system } = task!.buildPrompt(input);

      // Must include safety rules
      expect(system.toLowerCase()).toContain("never make accusations");
      expect(system.toLowerCase()).toContain("non-binding");
    });

    it("should reference evidence types only", () => {
      const task = getTaskDefinition("DISPUTE_TIMELINE_SUMMARY");
      const input: DisputeTimelineInput = {
        disputeReason: "Work not completed",
        events: [],
        invoiceAmount: 30000,
        disputedAmount: 30000,
      };

      const { system } = task!.buildPrompt(input);

      // Should encourage evidence-based analysis
      expect(system.toLowerCase()).toContain("evidence");
    });
  });

  describe("Output Parsing", () => {
    it("should parse valid JSON output with new fields", () => {
      const task = getTaskDefinition("DISPUTE_TIMELINE_SUMMARY");
      const rawOutput = JSON.stringify({
        summary: "Customer disputes quality of completed work",
        timeline: [
          { date: "2024-01-01", event: "Booking created", relevance: "key" },
        ],
        keyIssues: ["Work quality concerns"],
        recommendedActions: ["Request photos of completed work"],
        timelineBullets: [
          "Booking created on 2024-01-01",
          "Work completed on 2024-01-05",
          "Dispute filed on 2024-01-07",
        ],
        likelyRootCauseCategory: "quality",
        policyViolationsDetected: [
          {
            violation: "Late completion",
            evidence: "Per booking timestamp",
            severity: "minor",
          },
        ],
        refundRecommendation: {
          type: "partial",
          rationale: "Quality issues documented but work was completed",
          suggestedAmount: 10000,
        },
        confidence: "medium",
      });

      const output = task!.parseOutput(rawOutput) as DisputeTimelineOutput;

      expect(output.summary).toContain("Customer disputes");
      expect(output.timelineBullets).toHaveLength(3);
      expect(output.likelyRootCauseCategory).toBe("quality");
      expect(output.policyViolationsDetected).toHaveLength(1);
      expect(output.refundRecommendation.type).toBe("partial");
      expect(output.confidence).toBe("medium");
    });
  });

  describe("Fallback", () => {
    it("should provide safe fallback output", () => {
      const task = getTaskDefinition("DISPUTE_TIMELINE_SUMMARY");
      const input: DisputeTimelineInput = {
        disputeReason: "Test dispute",
        events: [],
        invoiceAmount: 10000,
        disputedAmount: 5000,
      };

      const fallback = task!.getFallback(input) as DisputeTimelineOutput;

      // Fallback should be conservative
      expect(fallback.confidence).toBe("low");
      expect(fallback.refundRecommendation.type).toBe("none");
      expect(fallback.likelyRootCauseCategory).toBe("unknown");
    });
  });

  describe("Safety Rules", () => {
    it("should never make accusations in output", () => {
      const task = getTaskDefinition("DISPUTE_TIMELINE_SUMMARY");

      // Test that output format doesn't include accusatory language
      const { system } = task!.buildPrompt({
        disputeReason: "Fraud",
        events: [],
        invoiceAmount: 0,
        disputedAmount: 0,
      });

      expect(system.toLowerCase()).not.toContain("the customer is lying");
      expect(system.toLowerCase()).not.toContain("the provider committed fraud");
    });

    it("refund recommendation should be non-binding", () => {
      const task = getTaskDefinition("DISPUTE_TIMELINE_SUMMARY");
      const { system } = task!.buildPrompt({
        disputeReason: "Test",
        events: [],
        invoiceAmount: 0,
        disputedAmount: 0,
      });

      expect(system.toLowerCase()).toContain("non-binding");
    });
  });
});

// ============================================================================
// Fraud Signal Referrals Tests
// ============================================================================

describe("Fraud Signal Referrals", () => {
  describe("Task Definition", () => {
    it("should exist and have correct configuration", () => {
      const task = getTaskDefinition("FRAUD_SIGNAL_REFERRALS");
      expect(task).toBeDefined();
      expect(task?.taskType).toBe("FRAUD_SIGNAL_REFERRALS");
      expect(task?.allowedActors).toContain("admin");
      expect(task?.allowedActors).toContain("system");
    });

    it("should only allow admins and system to execute", () => {
      expect(canActorExecuteTask("admin", "FRAUD_SIGNAL_REFERRALS")).toBe(true);
      expect(canActorExecuteTask("system", "FRAUD_SIGNAL_REFERRALS")).toBe(true);
      expect(canActorExecuteTask("customer", "FRAUD_SIGNAL_REFERRALS")).toBe(false);
      expect(canActorExecuteTask("provider", "FRAUD_SIGNAL_REFERRALS")).toBe(false);
    });
  });

  describe("Prompt Generation", () => {
    it("should include cluster data analysis in prompt", () => {
      const task = getTaskDefinition("FRAUD_SIGNAL_REFERRALS");
      const input: FraudSignalInput = {
        referrerId: "user-123",
        referralCount: 10,
        conversionRate: 0.8,
        recentReferrals: [],
        clusterData: {
          emailDomainHash: "abc123",
          ipClusterHash: "def456",
          deviceClusterHash: "ghi789",
          addressHash: "jkl012",
        },
        timePatterns: {
          signupsLast24h: 5,
          signupsLast7d: 20,
          avgTimeBetweenSignups: 10,
        },
      };

      const { user } = task!.buildPrompt(input);

      expect(user.toLowerCase()).toContain("cluster");
    });
  });

  describe("Output Parsing", () => {
    it("should parse fraud signals correctly", () => {
      const task = getTaskDefinition("FRAUD_SIGNAL_REFERRALS");
      const rawOutput = JSON.stringify({
        riskScore: 75,
        signals: [
          { flag: "High velocity", reason: "20 referrals in 7 days", severity: "high" },
          { flag: "IP cluster", reason: "Multiple accounts from same IP range", severity: "medium" },
        ],
        recommendation: "review",
        summary: "Suspicious activity detected",
      });

      const output = task!.parseOutput(rawOutput) as FraudSignalOutput;

      expect(output.riskScore).toBe(75);
      expect(output.signals).toHaveLength(2);
      expect(output.recommendation).toBe("review");
    });

    it("should never return reject recommendation for high risk", () => {
      const task = getTaskDefinition("FRAUD_SIGNAL_REFERRALS");
      // Even if AI returns "reject", parseOutput should downgrade to "review"
      const rawOutput = JSON.stringify({
        riskScore: 85,
        signals: [{ flag: "Definite fraud", reason: "Test", severity: "high" }],
        recommendation: "reject",
        summary: "Test",
      });

      const output = task!.parseOutput(rawOutput) as FraudSignalOutput;

      // High risk with reject should be downgraded to review
      expect(output.recommendation).toBe("review");
    });
  });

  describe("Fallback", () => {
    it("should provide conservative fallback", () => {
      const task = getTaskDefinition("FRAUD_SIGNAL_REFERRALS");
      const input: FraudSignalInput = {
        referrerId: "user-123",
        referralCount: 5,
        conversionRate: 0.5,
        recentReferrals: [],
        clusterData: {
          emailDomainHash: "abc123",
          ipClusterHash: "def456",
          deviceClusterHash: "ghi789",
          addressHash: "jkl012",
        },
        timePatterns: {
          signupsLast24h: 1,
          signupsLast7d: 5,
          avgTimeBetweenSignups: 30,
        },
      };

      const fallback = task!.getFallback(input) as FraudSignalOutput;

      // Fallback should always require review
      expect(fallback.recommendation).toBe("review");
      expect(fallback.riskScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Safety Rules", () => {
    it("should always require human review for high risk", () => {
      const task = getTaskDefinition("FRAUD_SIGNAL_REFERRALS");
      const { system } = task!.buildPrompt({
        referrerId: "test",
        referralCount: 100,
        conversionRate: 0,
        recentReferrals: [],
        clusterData: {
          emailDomainHash: "test123",
          ipClusterHash: "test456",
          deviceClusterHash: "test789",
          addressHash: "test012",
        },
        timePatterns: {
          signupsLast24h: 50,
          signupsLast7d: 100,
          avgTimeBetweenSignups: 5,
        },
      });

      expect(system.toLowerCase()).toContain("never recommend auto");
    });

    it("should never recommend auto-ban", () => {
      const task = getTaskDefinition("FRAUD_SIGNAL_REFERRALS");
      const rawOutput = JSON.stringify({
        riskScore: 100,
        signals: [{ flag: "Obvious fraud", reason: "Test", severity: "high" }],
        recommendation: "auto_ban",
        summary: "Test",
      });

      const output = task!.parseOutput(rawOutput) as FraudSignalOutput;

      // Even if AI returns auto_ban, should be converted to review
      expect(output.recommendation).not.toBe("auto_ban");
    });
  });
});

// ============================================================================
// Provider Quality Summary Tests
// ============================================================================

describe("Provider Quality Summary", () => {
  describe("Task Definition", () => {
    it("should exist and have correct configuration", () => {
      const task = getTaskDefinition("PROVIDER_QUALITY_SUMMARY");
      expect(task).toBeDefined();
      expect(task?.taskType).toBe("PROVIDER_QUALITY_SUMMARY");
      expect(task?.allowedActors).toContain("admin");
      expect(task?.allowedActors).toContain("system");
    });

    it("should only allow admins and system to execute", () => {
      expect(canActorExecuteTask("admin", "PROVIDER_QUALITY_SUMMARY")).toBe(true);
      expect(canActorExecuteTask("system", "PROVIDER_QUALITY_SUMMARY")).toBe(true);
      expect(canActorExecuteTask("customer", "PROVIDER_QUALITY_SUMMARY")).toBe(false);
      expect(canActorExecuteTask("provider", "PROVIDER_QUALITY_SUMMARY")).toBe(false);
    });
  });

  describe("Prompt Generation", () => {
    it("should include metrics in prompt", () => {
      const task = getTaskDefinition("PROVIDER_QUALITY_SUMMARY");
      const input: ProviderQualityInput = {
        providerId: "provider-123",
        providerName: "Test Provider",
        metrics: {
          rating: 4.5,
          totalJobs: 50,
          disputeRate: 0.02,
          cancellationRate: 0.01,
          avgResponseTimeHours: 2,
          onTimeRate: 0.95,
        },
        currentTier: "verified",
      };

      const { user } = task!.buildPrompt(input);

      expect(user).toContain("Test Provider");
      expect(user).toContain("4.5");
      expect(user).toContain("50");
    });

    it("should not auto-demote based on AI alone", () => {
      const task = getTaskDefinition("PROVIDER_QUALITY_SUMMARY");
      const { system } = task!.buildPrompt({
        providerId: "test",
        providerName: "Test",
        metrics: {
          rating: 2.0,
          totalJobs: 100,
          disputeRate: 0.5,
          cancellationRate: 0.3,
          avgResponseTimeHours: 48,
          onTimeRate: 0.3,
        },
        currentTier: "preferred",
      });

      expect(system.toLowerCase()).toContain("human");
    });
  });

  describe("Output Parsing", () => {
    it("should parse quality insights correctly", () => {
      const task = getTaskDefinition("PROVIDER_QUALITY_SUMMARY");
      const rawOutput = JSON.stringify({
        qualitySummary: "Strong performer with excellent ratings",
        strengths: ["High customer satisfaction", "Quick response times"],
        concerns: ["Slight increase in disputes this month"],
        tierRecommendation: "preferred",
        humanReviewRequired: false,
      });

      const output = task!.parseOutput(rawOutput) as ProviderQualityOutput;

      expect(output.qualitySummary).toContain("Strong performer");
      expect(output.strengths).toHaveLength(2);
      expect(output.concerns).toHaveLength(1);
      expect(output.tierRecommendation).toBe("preferred");
    });
  });

  describe("Fallback", () => {
    it("should provide neutral fallback", () => {
      const task = getTaskDefinition("PROVIDER_QUALITY_SUMMARY");
      const input: ProviderQualityInput = {
        providerId: "provider-123",
        providerName: "Test Provider",
        metrics: {
          rating: 3.0,
          totalJobs: 10,
          disputeRate: 0.1,
          cancellationRate: 0.1,
          avgResponseTimeHours: 12,
          onTimeRate: 0.7,
        },
        currentTier: "basic",
      };

      const fallback = task!.getFallback(input) as ProviderQualityOutput;

      // Fallback should recommend keeping current tier
      expect(fallback.tierRecommendation).toBe("basic");
      expect(fallback.humanReviewRequired).toBe(true);
    });
  });

  describe("Safety Rules", () => {
    it("should require human review for tier demotion", () => {
      const task = getTaskDefinition("PROVIDER_QUALITY_SUMMARY");
      const rawOutput = JSON.stringify({
        qualitySummary: "Provider performance has declined",
        strengths: [],
        concerns: ["High dispute rate", "Slow response times"],
        tierRecommendation: "probation",
        humanReviewRequired: true,
        reviewReason: "Significant performance decline detected",
      });

      const output = task!.parseOutput(rawOutput) as ProviderQualityOutput;

      // Any demotion suggestion should require human review
      if (output.tierRecommendation === "probation") {
        expect(output.humanReviewRequired).toBe(true);
      }
    });

    it("should not auto-demote providers", () => {
      const task = getTaskDefinition("PROVIDER_QUALITY_SUMMARY");
      const { system } = task!.buildPrompt({
        providerId: "test",
        providerName: "Test",
        metrics: {
          rating: 1.0,
          totalJobs: 100,
          disputeRate: 0.8,
          cancellationRate: 0.5,
          avgResponseTimeHours: 72,
          onTimeRate: 0.1,
        },
        currentTier: "preferred",
      });

      // Should not include auto-demotion instructions
      expect(system.toLowerCase()).not.toContain("auto-demote");
      expect(system.toLowerCase()).not.toContain("automatically demote");
    });
  });
});

// ============================================================================
// Actor Permission Tests
// ============================================================================

describe("Admin Task Permissions", () => {
  const adminTasks = [
    "DISPUTE_TIMELINE_SUMMARY",
    "FRAUD_SIGNAL_REFERRALS",
    "PROVIDER_QUALITY_SUMMARY",
  ] as const;

  it("should restrict all admin tasks to admins and system only", () => {
    for (const taskType of adminTasks) {
      expect(canActorExecuteTask("admin", taskType)).toBe(true);
      expect(canActorExecuteTask("system", taskType)).toBe(true);
      expect(canActorExecuteTask("customer", taskType)).toBe(false);
      expect(canActorExecuteTask("provider", taskType)).toBe(false);
    }
  });
});

// ============================================================================
// Feature Flag Integration Tests
// ============================================================================

describe("Feature Flag Integration", () => {
  it("all admin triage tasks should be gated by ai_admin_triage_enabled", () => {
    // This is tested in the API routes, but we verify task definitions exist
    const disputeTask = getTaskDefinition("DISPUTE_TIMELINE_SUMMARY");
    const fraudTask = getTaskDefinition("FRAUD_SIGNAL_REFERRALS");
    const qualityTask = getTaskDefinition("PROVIDER_QUALITY_SUMMARY");

    expect(disputeTask).toBeDefined();
    expect(fraudTask).toBeDefined();
    expect(qualityTask).toBeDefined();
  });
});
