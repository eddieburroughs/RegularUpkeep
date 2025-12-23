/**
 * AI Gateway Tests
 *
 * Tests for JSON validation, fallback behavior, and safety checks.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// Mock the providers module before importing gateway
vi.mock("../providers", () => ({
  getBestAvailableProvider: vi.fn(),
  getProviderAdapter: vi.fn(),
  mapModelToProvider: vi.fn((model) => model),
}));

import { runTask } from "../gateway";
import {
  getTaskDefinition,
  isValidTaskType,
  getAllTaskTypes,
  getTaskTypesForActor,
  canActorExecuteTask,
} from "../tasks";
import { checkInputSafety, checkOutputSafety, sanitizeOutput } from "../safety";
import { getBestAvailableProvider, getProviderAdapter } from "../providers";
import type {
  AIProviderAdapter,
  IntakeClassifyInput,
  IntakeClassifyOutput,
  IntakeFollowupInput,
  IntakeFollowupOutput,
  MaintenancePlanInput,
  MaintenancePlanOutput,
  ProviderEstimateInput,
  ProviderEstimateOutput,
  MediaQualityInput,
  MediaQualityOutput,
} from "../types";

// ============================================================================
// Task Registry Tests
// ============================================================================

describe("Task Registry", () => {
  describe("isValidTaskType", () => {
    it("should return true for valid task types", () => {
      expect(isValidTaskType("INTAKE_CLASSIFY_AND_SUMMARIZE")).toBe(true);
      expect(isValidTaskType("PROVIDER_BRIEF_GENERATE")).toBe(true);
      expect(isValidTaskType("DISPUTE_TIMELINE_SUMMARY")).toBe(true);
    });

    it("should return false for invalid task types", () => {
      expect(isValidTaskType("INVALID_TASK")).toBe(false);
      expect(isValidTaskType("")).toBe(false);
      expect(isValidTaskType("intake_classify")).toBe(false);
    });
  });

  describe("getAllTaskTypes", () => {
    it("should return all 12 task types", () => {
      const taskTypes = getAllTaskTypes();
      expect(taskTypes).toHaveLength(12);
      expect(taskTypes).toContain("INTAKE_CLASSIFY_AND_SUMMARIZE");
      expect(taskTypes).toContain("SPONSOR_TILE_COPY");
    });
  });

  describe("getTaskTypesForActor", () => {
    it("should return correct tasks for customer", () => {
      const customerTasks = getTaskTypesForActor("customer");
      expect(customerTasks).toContain("INTAKE_CLASSIFY_AND_SUMMARIZE");
      expect(customerTasks).toContain("MAINTENANCE_PLAN_SUGGEST");
      expect(customerTasks).not.toContain("DISPUTE_TIMELINE_SUMMARY");
    });

    it("should return correct tasks for provider", () => {
      const providerTasks = getTaskTypesForActor("provider");
      expect(providerTasks).toContain("PROVIDER_ESTIMATE_DRAFT");
      expect(providerTasks).toContain("PROVIDER_MESSAGE_DRAFT");
      expect(providerTasks).not.toContain("FRAUD_SIGNAL_REFERRALS");
    });

    it("should return correct tasks for admin", () => {
      const adminTasks = getTaskTypesForActor("admin");
      expect(adminTasks).toContain("DISPUTE_TIMELINE_SUMMARY");
      expect(adminTasks).toContain("FRAUD_SIGNAL_REFERRALS");
    });

    it("should return all tasks for system", () => {
      const systemTasks = getTaskTypesForActor("system");
      expect(systemTasks.length).toBeGreaterThan(8);
    });
  });

  describe("canActorExecuteTask", () => {
    it("should allow customer to execute intake tasks", () => {
      expect(canActorExecuteTask("customer", "INTAKE_CLASSIFY_AND_SUMMARIZE")).toBe(true);
    });

    it("should prevent customer from executing admin tasks", () => {
      expect(canActorExecuteTask("customer", "DISPUTE_TIMELINE_SUMMARY")).toBe(false);
    });

    it("should allow provider to execute estimate draft", () => {
      expect(canActorExecuteTask("provider", "PROVIDER_ESTIMATE_DRAFT")).toBe(true);
    });
  });

  describe("getTaskDefinition", () => {
    it("should return task definition with all required fields", () => {
      const task = getTaskDefinition("INTAKE_CLASSIFY_AND_SUMMARIZE");
      expect(task).toBeDefined();
      expect(task?.taskType).toBe("INTAKE_CLASSIFY_AND_SUMMARIZE");
      expect(task?.preferredModel).toBeDefined();
      expect(task?.buildPrompt).toBeInstanceOf(Function);
      expect(task?.parseOutput).toBeInstanceOf(Function);
      expect(task?.getFallback).toBeInstanceOf(Function);
      expect(task?.validateOutput).toBeInstanceOf(Function);
    });

    it("should return undefined for invalid task type", () => {
      // @ts-expect-error - testing invalid input
      const task = getTaskDefinition("INVALID_TASK");
      expect(task).toBeUndefined();
    });
  });
});

// ============================================================================
// Safety Tests
// ============================================================================

describe("Safety Module", () => {
  describe("checkInputSafety", () => {
    it("should detect SSN patterns", () => {
      const events = checkInputSafety("My SSN is 123-45-6789");
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("PII_DETECTED");
    });

    it("should detect credit card patterns", () => {
      const events = checkInputSafety("Card: 1234567812345678");
      expect(events).toHaveLength(1);
      expect(events[0].type).toBe("PII_DETECTED");
    });

    it("should not flag normal text", () => {
      const events = checkInputSafety("My faucet is leaking in the kitchen");
      expect(events).toHaveLength(0);
    });
  });

  describe("checkOutputSafety", () => {
    it("should flag dangerous DIY instructions", () => {
      const events = checkOutputSafety("You should rewire the outlet yourself to save money");
      expect(events.some((e) => e.type === "SAFETY_FLAG_ELECTRICAL")).toBe(true);
    });

    it("should flag exact pricing", () => {
      const events = checkOutputSafety("The cost will be exactly $500");
      expect(events.some((e) => e.type === "PRICING_MENTIONED")).toBe(true);
    });

    it("should flag legal claims", () => {
      const events = checkOutputSafety("We guarantee this will fix your problem");
      expect(events.some((e) => e.type === "LEGAL_CLAIM_DETECTED")).toBe(true);
    });

    it("should not flag safe professional recommendations", () => {
      const events = checkOutputSafety(
        "We recommend hiring a licensed electrician to inspect your panel"
      );
      expect(events.filter((e) => e.severity === "critical")).toHaveLength(0);
    });
  });

  describe("sanitizeOutput", () => {
    it("should remove dangerous DIY instructions", () => {
      const sanitized = sanitizeOutput("You can rewire the outlet yourself");
      expect(sanitized).toContain("[Content removed for safety");
    });

    it("should redact PII", () => {
      const sanitized = sanitizeOutput("Your SSN 123-45-6789 is confirmed");
      expect(sanitized).toContain("[REDACTED]");
      expect(sanitized).not.toContain("123-45-6789");
    });
  });
});

// ============================================================================
// Task Fallback Tests
// ============================================================================

describe("Task Fallbacks", () => {
  describe("INTAKE_CLASSIFY_AND_SUMMARIZE fallback", () => {
    it("should return valid fallback structure", () => {
      const task = getTaskDefinition<IntakeClassifyInput, IntakeClassifyOutput>("INTAKE_CLASSIFY_AND_SUMMARIZE");
      const fallback = task?.getFallback({
        imageUrls: ["https://example.com/image.jpg"],
        category: "plumbing",
        userDescription: "Leaking faucet",
      });

      expect(fallback).toBeDefined();
      expect(fallback?.summary).toBeDefined();
      expect(fallback?.suggestedCategory).toBe("plumbing");
      expect(fallback?.confidence).toBe("low");
      expect(fallback?.urgencyLevel).toBe("standard");
    });
  });

  describe("INTAKE_FOLLOWUP_QUESTIONS fallback", () => {
    it("should return category-specific questions", () => {
      const task = getTaskDefinition<IntakeFollowupInput, IntakeFollowupOutput>("INTAKE_FOLLOWUP_QUESTIONS");

      const plumbingFallback = task?.getFallback({
        category: "plumbing",
        summary: "Leak detected",
      });
      expect(plumbingFallback?.questions).toHaveLength(3);
      expect(plumbingFallback?.questions[0].id).toBe("q1");

      const electricalFallback = task?.getFallback({
        category: "electrical",
        summary: "Power issue",
      });
      expect(electricalFallback?.questions).toHaveLength(3);
    });

    it("should return generic questions for unknown category", () => {
      const task = getTaskDefinition<IntakeFollowupInput, IntakeFollowupOutput>("INTAKE_FOLLOWUP_QUESTIONS");
      const fallback = task?.getFallback({
        category: "unknown",
        summary: "Some issue",
      });
      expect(fallback?.questions.length).toBeGreaterThan(0);
    });
  });

  describe("MAINTENANCE_PLAN_SUGGEST fallback", () => {
    it("should return standard recommendations", () => {
      const task = getTaskDefinition<MaintenancePlanInput, MaintenancePlanOutput>("MAINTENANCE_PLAN_SUGGEST");
      const fallback = task?.getFallback({
        propertyType: "single_family",
        propertyAge: 20,
        systems: [{ type: "HVAC", age: 10 }],
        location: { climate: "humid", region: "Southeast" },
      });

      expect(fallback?.recommendations.length).toBeGreaterThan(0);
      expect(fallback?.annualPlanSummary).toBeDefined();
      expect(fallback?.recommendations.some((r: { priority: string }) => r.priority === "high")).toBe(true);
    });
  });
});

// ============================================================================
// Task Output Parsing Tests
// ============================================================================

describe("Task Output Parsing", () => {
  describe("INTAKE_CLASSIFY_AND_SUMMARIZE parsing", () => {
    const task = getTaskDefinition<IntakeClassifyInput, IntakeClassifyOutput>("INTAKE_CLASSIFY_AND_SUMMARIZE");

    it("should parse valid JSON output", () => {
      const raw = JSON.stringify({
        summary: "Leaking pipe under sink",
        suggestedCategory: "plumbing",
        confidence: "high",
        keyObservations: ["Water damage visible", "Corrosion present"],
        urgencyLevel: "urgent",
      });

      const parsed = task?.parseOutput(raw);
      expect(parsed?.summary).toBe("Leaking pipe under sink");
      expect(parsed?.confidence).toBe("high");
      expect(parsed?.keyObservations).toHaveLength(2);
    });

    it("should handle missing fields with defaults", () => {
      const raw = JSON.stringify({
        summary: "Test",
      });

      const parsed = task?.parseOutput(raw);
      expect(parsed?.suggestedCategory).toBe("general");
      expect(parsed?.confidence).toBe("low");
      expect(parsed?.keyObservations).toEqual([]);
    });

    it("should throw on invalid JSON", () => {
      expect(() => task?.parseOutput("not json")).toThrow();
    });
  });

  describe("PROVIDER_ESTIMATE_DRAFT parsing", () => {
    const task = getTaskDefinition<ProviderEstimateInput, ProviderEstimateOutput>("PROVIDER_ESTIMATE_DRAFT");

    it("should parse valid estimate output", () => {
      const raw = JSON.stringify({
        scopeOfWork: "Replace water heater",
        lineItemSuggestions: [
          { description: "Remove old unit", type: "labor" },
          { description: "50-gallon water heater", type: "material" },
        ],
        clarifyingQuestions: ["Is there access to the attic?"],
        estimatedDurationRange: "4-6 hours",
        warrantyConsiderations: ["10-year tank warranty"],
      });

      const parsed = task?.parseOutput(raw);
      expect(parsed?.scopeOfWork).toBe("Replace water heater");
      expect(parsed?.lineItemSuggestions).toHaveLength(2);
      expect(parsed?.lineItemSuggestions[0].type).toBe("labor");
    });
  });
});

// ============================================================================
// Task Output Validation Tests
// ============================================================================

describe("Task Output Validation", () => {
  describe("INTAKE_CLASSIFY_AND_SUMMARIZE validation", () => {
    const task = getTaskDefinition<IntakeClassifyInput, IntakeClassifyOutput>("INTAKE_CLASSIFY_AND_SUMMARIZE");

    it("should validate correct output", () => {
      const valid = task?.validateOutput({
        summary: "Leak detected",
        suggestedCategory: "plumbing",
        confidence: "high",
        keyObservations: ["Water visible"],
        urgencyLevel: "standard",
      });
      expect(valid).toBe(true);
    });

    it("should reject invalid confidence", () => {
      const invalid = task?.validateOutput({
        summary: "Leak detected",
        suggestedCategory: "plumbing",
        confidence: "invalid" as "high",
        keyObservations: [],
        urgencyLevel: "standard",
      });
      expect(invalid).toBe(false);
    });

    it("should reject empty summary", () => {
      const invalid = task?.validateOutput({
        summary: "",
        suggestedCategory: "plumbing",
        confidence: "high",
        keyObservations: [],
        urgencyLevel: "standard",
      });
      expect(invalid).toBe(false);
    });
  });

  describe("MEDIA_QUALITY_CHECK validation", () => {
    const task = getTaskDefinition<MediaQualityInput, MediaQualityOutput>("MEDIA_QUALITY_CHECK");

    it("should validate correct output", () => {
      const valid = task?.validateOutput({
        isAcceptable: true,
        qualityScore: 85,
        issues: [],
        suggestions: [],
      });
      expect(valid).toBe(true);
    });

    it("should reject invalid quality score", () => {
      const invalid = task?.validateOutput({
        isAcceptable: true,
        qualityScore: 150,
        issues: [],
        suggestions: [],
      });
      expect(invalid).toBe(false);
    });
  });
});

// ============================================================================
// Gateway Integration Tests
// ============================================================================

describe("AI Gateway", () => {
  const mockProvider: AIProviderAdapter = {
    name: "openai",
    isAvailable: () => true,
    supportsVision: () => true,
    estimateCost: () => 0.001,
    generateCompletion: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBestAvailableProvider).mockReturnValue(mockProvider);
    vi.mocked(getProviderAdapter).mockReturnValue(mockProvider);
  });

  it("should return error for unknown task type", async () => {
    const result = await runTask({
      // @ts-expect-error - testing invalid input
      taskType: "INVALID_TASK",
      actorUserId: "user-123",
      entityType: "service_request",
      entityId: "sr-456",
      inputs: {},
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unknown task type");
  });

  it("should use fallback when provider returns invalid JSON", async () => {
    vi.mocked(mockProvider.generateCompletion).mockResolvedValue({
      content: "not valid json",
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 50,
      finishReason: "stop",
    });

    const result = await runTask({
      taskType: "INTAKE_CLASSIFY_AND_SUMMARIZE",
      actorUserId: "user-123",
      entityType: "service_request",
      entityId: "sr-456",
      inputs: {
        imageUrls: ["https://example.com/image.jpg"],
        category: "plumbing",
      },
    });

    expect(result.success).toBe(true); // Fallback is success
    expect(result.usedFallback).toBe(true);
    expect(result.policyEvents.some((e) => e.type === "FALLBACK_USED")).toBe(true);
  });

  it("should successfully process valid AI response", async () => {
    vi.mocked(mockProvider.generateCompletion).mockResolvedValue({
      content: JSON.stringify({
        summary: "Leaking faucet in kitchen",
        suggestedCategory: "plumbing",
        confidence: "high",
        keyObservations: ["Water dripping"],
        urgencyLevel: "standard",
      }),
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 50,
      finishReason: "stop",
    });

    const result = await runTask({
      taskType: "INTAKE_CLASSIFY_AND_SUMMARIZE",
      actorUserId: "user-123",
      entityType: "service_request",
      entityId: "sr-456",
      inputs: {
        imageUrls: ["https://example.com/image.jpg"],
        category: "plumbing",
      },
    });

    expect(result.success).toBe(true);
    expect(result.usedFallback).toBe(false);
    expect(result.outputJson).toHaveProperty("summary");
    expect(result.cost).toBeGreaterThan(0);
  });

  it("should handle JSON wrapped in markdown code blocks", async () => {
    vi.mocked(mockProvider.generateCompletion).mockResolvedValue({
      content: "```json\n" + JSON.stringify({
        summary: "Test summary",
        suggestedCategory: "plumbing",
        confidence: "high",
        keyObservations: [],
        urgencyLevel: "standard",
      }) + "\n```",
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 50,
      finishReason: "stop",
    });

    const result = await runTask({
      taskType: "INTAKE_CLASSIFY_AND_SUMMARIZE",
      actorUserId: "user-123",
      entityType: "service_request",
      entityId: "sr-456",
      inputs: {
        imageUrls: [],
        category: "plumbing",
      },
    });

    expect(result.success).toBe(true);
    expect(result.usedFallback).toBe(false);
    expect(result.policyEvents.some((e) => e.type === "JSON_REPAIR_NEEDED")).toBe(true);
  });

  it("should include correlation ID in response", async () => {
    vi.mocked(mockProvider.generateCompletion).mockResolvedValue({
      content: JSON.stringify({
        summary: "Test",
        suggestedCategory: "plumbing",
        confidence: "high",
        keyObservations: [],
        urgencyLevel: "standard",
      }),
      model: "gpt-4o",
      inputTokens: 100,
      outputTokens: 50,
      finishReason: "stop",
    });

    const result = await runTask({
      taskType: "INTAKE_CLASSIFY_AND_SUMMARIZE",
      actorUserId: "user-123",
      entityType: "service_request",
      entityId: "sr-456",
      inputs: {
        imageUrls: [],
        category: "plumbing",
      },
      flags: {
        correlationId: "custom-correlation-123",
      },
    });

    expect(result.correlationId).toBe("custom-correlation-123");
  });

  it("should use fallback when provider is unavailable", async () => {
    vi.mocked(getBestAvailableProvider).mockReturnValue({
      ...mockProvider,
      isAvailable: () => false,
    });

    const result = await runTask({
      taskType: "INTAKE_CLASSIFY_AND_SUMMARIZE",
      actorUserId: "user-123",
      entityType: "service_request",
      entityId: "sr-456",
      inputs: {
        imageUrls: [],
        category: "plumbing",
      },
    });

    expect(result.success).toBe(true);
    expect(result.usedFallback).toBe(true);
  });
});
