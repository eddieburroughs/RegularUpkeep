/**
 * Provider Copilot Tests
 *
 * Tests for AI-assisted provider workflows:
 * - Estimate drafting
 * - Message drafting
 * - Invoice narrative generation
 * - Safety rules enforcement
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
  ProviderEstimateInput,
  ProviderEstimateOutput,
  ProviderMessageInput,
  ProviderMessageOutput,
  InvoiceNarrativeInput,
  InvoiceNarrativeOutput,
} from "../types";

// ============================================================================
// Provider Estimate Draft Tests
// ============================================================================

describe("Provider Estimate Draft", () => {
  describe("Task Definition", () => {
    it("should exist and have correct configuration", () => {
      const task = getTaskDefinition("PROVIDER_ESTIMATE_DRAFT");
      expect(task).toBeDefined();
      expect(task?.taskType).toBe("PROVIDER_ESTIMATE_DRAFT");
      // Hybrid AI mode: Claude for long-form text generation
      expect(task?.preferredModel).toBe("claude-sonnet-4-5-20250929");
      expect(task?.allowedActors).toContain("provider");
      expect(task?.allowedActors).toContain("system");
    });

    it("should allow providers and system to execute", () => {
      expect(canActorExecuteTask("provider", "PROVIDER_ESTIMATE_DRAFT")).toBe(true);
      expect(canActorExecuteTask("system", "PROVIDER_ESTIMATE_DRAFT")).toBe(true);
      expect(canActorExecuteTask("customer", "PROVIDER_ESTIMATE_DRAFT")).toBe(false);
    });
  });

  describe("Prompt Generation", () => {
    it("should build prompt with all inputs", () => {
      const task = getTaskDefinition("PROVIDER_ESTIMATE_DRAFT");
      const input: ProviderEstimateInput = {
        category: "plumbing",
        providerBrief: "Leaking faucet in kitchen. Customer reports dripping for 2 days.",
        providerNotes: "May need to replace washers",
        similarJobsContext: "Similar job last month: replaced cartridge",
      };

      const { system, user } = task!.buildPrompt(input);

      expect(system).toContain("NEVER include specific dollar amounts");
      expect(system).toContain("exclusions");
      expect(system).toContain("assumptions");
      expect(user).toContain("plumbing");
      expect(user).toContain("Leaking faucet");
      expect(user).toContain("May need to replace washers");
    });

    it("should include safety guidelines in prompt", () => {
      const task = getTaskDefinition("PROVIDER_ESTIMATE_DRAFT");
      const input: ProviderEstimateInput = {
        category: "electrical",
        providerBrief: "Outlet not working",
      };

      const { system } = task!.buildPrompt(input);

      expect(system).toContain("NEVER include specific dollar amounts or prices");
    });
  });

  describe("Output Parsing", () => {
    it("should parse valid JSON output", () => {
      const task = getTaskDefinition("PROVIDER_ESTIMATE_DRAFT");
      const rawOutput = JSON.stringify({
        scopeOfWork: "Replace kitchen faucet cartridge and inspect supply lines",
        lineItemSuggestions: [
          { description: "Labor - Faucet repair", type: "labor" },
          { description: "Replacement cartridge", type: "material", note: "OEM recommended" },
        ],
        clarifyingQuestions: ["Is this a single or double handle faucet?"],
        estimatedDurationRange: "1-2 hours",
        warrantyConsiderations: ["90-day labor warranty"],
        exclusions: ["Supply line replacement if needed"],
        assumptions: ["Standard faucet type", "Parts available"],
        remoteEstimateOk: false,
        requiresSiteVisit: true,
        missingInfoRequests: ["Photo of faucet model"],
      });

      const output = task!.parseOutput(rawOutput) as ProviderEstimateOutput;

      expect(output.scopeOfWork).toBe("Replace kitchen faucet cartridge and inspect supply lines");
      expect(output.lineItemSuggestions).toHaveLength(2);
      expect(output.lineItemSuggestions[0].type).toBe("labor");
      expect(output.lineItemSuggestions[1].note).toBe("OEM recommended");
      expect(output.exclusions).toContain("Supply line replacement if needed");
      expect(output.assumptions).toHaveLength(2);
      expect(output.remoteEstimateOk).toBe(false);
      expect(output.requiresSiteVisit).toBe(true);
      expect(output.missingInfoRequests).toContain("Photo of faucet model");
    });

    it("should not include prices in output", () => {
      const task = getTaskDefinition("PROVIDER_ESTIMATE_DRAFT");
      const rawOutput = JSON.stringify({
        scopeOfWork: "Fix leaking pipe",
        lineItemSuggestions: [
          { description: "Pipe repair labor", type: "labor" },
        ],
        clarifyingQuestions: [],
        estimatedDurationRange: "2-3 hours",
        warrantyConsiderations: [],
        exclusions: [],
        assumptions: [],
      });

      const output = task!.parseOutput(rawOutput) as ProviderEstimateOutput;

      // Verify line items don't have price fields
      output.lineItemSuggestions.forEach((item) => {
        expect(item).not.toHaveProperty("price");
        expect(item).not.toHaveProperty("amount");
        expect(item).not.toHaveProperty("cost");
      });
    });
  });

  describe("Fallback", () => {
    it("should provide reasonable fallback output", () => {
      const task = getTaskDefinition("PROVIDER_ESTIMATE_DRAFT");
      const input: ProviderEstimateInput = {
        category: "hvac",
        providerBrief: "AC not cooling",
      };

      const fallback = task!.getFallback(input) as ProviderEstimateOutput;

      expect(fallback.scopeOfWork).toContain("hvac");
      expect(fallback.lineItemSuggestions.length).toBeGreaterThan(0);
      expect(fallback.exclusions).toBeDefined();
      expect(fallback.assumptions).toBeDefined();
      expect(fallback.requiresSiteVisit).toBe(true);
    });
  });

  describe("Validation", () => {
    it("should validate correct output", () => {
      const task = getTaskDefinition("PROVIDER_ESTIMATE_DRAFT");
      const validOutput: ProviderEstimateOutput = {
        scopeOfWork: "Complete AC maintenance",
        lineItemSuggestions: [
          { description: "System inspection", type: "labor" },
        ],
        clarifyingQuestions: [],
        estimatedDurationRange: "1 hour",
        warrantyConsiderations: [],
      };

      expect(task!.validateOutput(validOutput)).toBe(true);
    });

    it("should reject invalid output", () => {
      const task = getTaskDefinition("PROVIDER_ESTIMATE_DRAFT");

      // Empty scope
      expect(task!.validateOutput({
        scopeOfWork: "",
        lineItemSuggestions: [],
        clarifyingQuestions: [],
        estimatedDurationRange: "",
        warrantyConsiderations: [],
      })).toBe(false);

      // Invalid line item type
      expect(task!.validateOutput({
        scopeOfWork: "Test",
        lineItemSuggestions: [{ description: "Test", type: "invalid" as "labor" }],
        clarifyingQuestions: [],
        estimatedDurationRange: "",
        warrantyConsiderations: [],
      })).toBe(false);
    });
  });
});

// ============================================================================
// Provider Message Draft Tests
// ============================================================================

describe("Provider Message Draft", () => {
  describe("Task Definition", () => {
    it("should exist and have correct configuration", () => {
      const task = getTaskDefinition("PROVIDER_MESSAGE_DRAFT");
      expect(task).toBeDefined();
      expect(task?.taskType).toBe("PROVIDER_MESSAGE_DRAFT");
      // Hybrid AI mode: Claude Haiku for fast message drafts
      expect(task?.preferredModel).toBe("claude-haiku-4-5-20251001");
      expect(task?.maxTokens).toBe(600);
    });
  });

  describe("Prompt Generation", () => {
    it("should build prompt for introduction context", () => {
      const task = getTaskDefinition("PROVIDER_MESSAGE_DRAFT");
      const input: ProviderMessageInput = {
        context: "introduction",
        customerName: "John Smith",
        serviceCategory: "plumbing",
        keyPoints: ["Available tomorrow", "Will need access to basement"],
      };

      const { system, user } = task!.buildPrompt(input);

      expect(system).toContain("Never include pricing in messages");
      expect(user).toContain("introduction");
      expect(user).toContain("John Smith");
      expect(user).toContain("plumbing");
      expect(user).toContain("Available tomorrow");
    });

    it("should prohibit pricing in messages", () => {
      const task = getTaskDefinition("PROVIDER_MESSAGE_DRAFT");
      const { system } = task!.buildPrompt({
        context: "update",
        customerName: "Jane Doe",
        serviceCategory: "electrical",
        keyPoints: [],
      });

      expect(system.toLowerCase()).toContain("never include pricing");
    });
  });

  describe("Output Parsing", () => {
    it("should parse message with tone", () => {
      const task = getTaskDefinition("PROVIDER_MESSAGE_DRAFT");
      const rawOutput = JSON.stringify({
        message: "Hi John, I'll be arriving tomorrow at 9am. Please ensure access to the basement.",
        tone: "professional",
        suggestedAlternatives: ["Hello John, Looking forward to helping you tomorrow at 9am."],
      });

      const output = task!.parseOutput(rawOutput) as ProviderMessageOutput;

      expect(output.message).toContain("Hi John");
      expect(output.tone).toBe("professional");
      expect(output.suggestedAlternatives).toHaveLength(1);
    });
  });

  describe("Fallback", () => {
    it("should provide context-appropriate fallback", () => {
      const task = getTaskDefinition("PROVIDER_MESSAGE_DRAFT");

      const introFallback = task!.getFallback({
        context: "introduction",
        customerName: "Bob",
        serviceCategory: "hvac",
        keyPoints: [],
      }) as ProviderMessageOutput;

      expect(introFallback.message).toContain("Bob");
      expect(introFallback.message).toContain("hvac");
      expect(introFallback.tone).toBe("professional");

      const completionFallback = task!.getFallback({
        context: "completion",
        customerName: "Alice",
        serviceCategory: "plumbing",
        keyPoints: [],
      }) as ProviderMessageOutput;

      expect(completionFallback.message).toContain("completed");
    });
  });
});

// ============================================================================
// Invoice Narrative Draft Tests
// ============================================================================

describe("Invoice Narrative Draft", () => {
  describe("Task Definition", () => {
    it("should exist and have correct configuration", () => {
      const task = getTaskDefinition("INVOICE_NARRATIVE_DRAFT");
      expect(task).toBeDefined();
      expect(task?.taskType).toBe("INVOICE_NARRATIVE_DRAFT");
      expect(task?.temperature).toBe(0.3); // Lower temperature for consistency
    });
  });

  describe("Prompt Generation", () => {
    it("should build prompt with work details", () => {
      const task = getTaskDefinition("INVOICE_NARRATIVE_DRAFT");
      const input: InvoiceNarrativeInput = {
        category: "plumbing",
        scopeOfWork: "Replace kitchen faucet",
        completedWork: ["Removed old faucet", "Installed new Moen faucet", "Tested for leaks"],
        materialsUsed: ["Moen Arbor faucet", "Supply lines", "Plumber's tape"],
        technician: "Mike Johnson",
      };

      const { system, user } = task!.buildPrompt(input);

      expect(system).toContain("professional invoice descriptions");
      expect(user).toContain("plumbing");
      expect(user).toContain("Replace kitchen faucet");
      expect(user).toContain("Removed old faucet");
      expect(user).toContain("Moen Arbor faucet");
      expect(user).toContain("Mike Johnson");
    });
  });

  describe("Output Parsing", () => {
    it("should parse narrative with highlights and disclaimer", () => {
      const task = getTaskDefinition("INVOICE_NARRATIVE_DRAFT");
      const rawOutput = JSON.stringify({
        narrative: "Completed professional faucet replacement in kitchen. Old fixture was removed and new Moen Arbor faucet installed. All connections tested and verified leak-free.",
        highlights: ["New Moen faucet installed", "Leak-free operation confirmed"],
        disclaimer: "Work performed as described. Standard warranty applies.",
      });

      const output = task!.parseOutput(rawOutput) as InvoiceNarrativeOutput;

      expect(output.narrative).toContain("professional faucet replacement");
      expect(output.highlights).toHaveLength(2);
      expect(output.disclaimer).toContain("warranty");
    });
  });

  describe("Safety Rules", () => {
    it("should not include code compliance claims by default", () => {
      const task = getTaskDefinition("INVOICE_NARRATIVE_DRAFT");
      const { system } = task!.buildPrompt({
        category: "electrical",
        scopeOfWork: "Install outlet",
        completedWork: ["Installed new outlet"],
      });

      // The prompt should not encourage code compliance claims
      // (Provider must explicitly confirm via checkbox in UI)
      expect(system).not.toContain("code compliant");
    });
  });

  describe("Fallback", () => {
    it("should provide reasonable fallback", () => {
      const task = getTaskDefinition("INVOICE_NARRATIVE_DRAFT");
      const fallback = task!.getFallback({
        category: "electrical",
        scopeOfWork: "Replace outlet",
        completedWork: ["Removed old outlet", "Installed new GFCI outlet"],
        materialsUsed: ["GFCI outlet"],
      }) as InvoiceNarrativeOutput;

      expect(fallback.narrative).toContain("electrical");
      expect(fallback.narrative).toContain("Removed old outlet");
      expect(fallback.highlights.length).toBeGreaterThan(0);
      expect(fallback.disclaimer).toBeDefined();
    });
  });
});

// ============================================================================
// Safety and Audit Tests
// ============================================================================

describe("Provider Copilot Safety", () => {
  it("should not allow customer to execute provider tasks", () => {
    expect(canActorExecuteTask("customer", "PROVIDER_ESTIMATE_DRAFT")).toBe(false);
    expect(canActorExecuteTask("customer", "PROVIDER_MESSAGE_DRAFT")).toBe(false);
    expect(canActorExecuteTask("customer", "INVOICE_NARRATIVE_DRAFT")).toBe(false);
  });

  it("should allow providers to execute all provider tasks", () => {
    expect(canActorExecuteTask("provider", "PROVIDER_ESTIMATE_DRAFT")).toBe(true);
    expect(canActorExecuteTask("provider", "PROVIDER_MESSAGE_DRAFT")).toBe(true);
    expect(canActorExecuteTask("provider", "INVOICE_NARRATIVE_DRAFT")).toBe(true);
  });

  it("should allow system to execute provider tasks", () => {
    expect(canActorExecuteTask("system", "PROVIDER_ESTIMATE_DRAFT")).toBe(true);
    expect(canActorExecuteTask("system", "PROVIDER_MESSAGE_DRAFT")).toBe(true);
    expect(canActorExecuteTask("system", "INVOICE_NARRATIVE_DRAFT")).toBe(true);
  });
});

// ============================================================================
// Edit Before Send Tests
// ============================================================================

describe("Draft Editing Behavior", () => {
  it("estimate draft should be editable (no direct send)", () => {
    // This test verifies the design pattern - drafts return data, not actions
    const task = getTaskDefinition("PROVIDER_ESTIMATE_DRAFT");
    const output = task!.getFallback({
      category: "test",
      providerBrief: "test",
    }) as ProviderEstimateOutput;

    // Output should be data that the provider can edit
    expect(typeof output.scopeOfWork).toBe("string");
    expect(Array.isArray(output.lineItemSuggestions)).toBe(true);

    // Output should NOT have send/submit actions
    expect(output).not.toHaveProperty("autoSend");
    expect(output).not.toHaveProperty("submitAction");
  });

  it("message draft should be editable (no direct send)", () => {
    const task = getTaskDefinition("PROVIDER_MESSAGE_DRAFT");
    const output = task!.getFallback({
      context: "update",
      customerName: "Test",
      serviceCategory: "test",
      keyPoints: [],
    }) as ProviderMessageOutput;

    // Output should be text that provider can edit
    expect(typeof output.message).toBe("string");

    // Output should NOT auto-send
    expect(output).not.toHaveProperty("autoSend");
    expect(output).not.toHaveProperty("sendImmediately");
  });

  it("invoice narrative should be editable (no direct submit)", () => {
    const task = getTaskDefinition("INVOICE_NARRATIVE_DRAFT");
    const output = task!.getFallback({
      category: "test",
      scopeOfWork: "test",
      completedWork: ["test"],
    }) as InvoiceNarrativeOutput;

    // Output should be text that provider can edit
    expect(typeof output.narrative).toBe("string");

    // Output should NOT auto-submit
    expect(output).not.toHaveProperty("autoSubmit");
    expect(output).not.toHaveProperty("finalizeInvoice");
  });
});
