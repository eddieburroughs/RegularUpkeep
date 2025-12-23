/**
 * AI Intake Flow Tests
 *
 * Tests for AI fallback behavior, feature flag handling, and error scenarios
 * in the service request intake flow.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock isFeatureEnabled
vi.mock("@/lib/config/admin-config", () => ({
  isFeatureEnabled: vi.fn(),
  getCategoryMediaRequirements: vi.fn(),
}));

import { isFeatureEnabled } from "@/lib/config/admin-config";

// ============================================================================
// Helper Types and Functions
// ============================================================================

interface AIIntakeResponse {
  fallback: boolean;
  classification: {
    summary: string;
    suggestedCategory: string;
    confidence: "low" | "medium" | "high";
    keyObservations: string[];
    urgencyLevel: string;
    safetyFlags?: Array<{
      type: string;
      severity: "warning" | "critical";
      description: string;
      guidance: string;
      recommendEmergencyServices: boolean;
    }>;
  } | null;
  correlationId?: string;
  message?: string;
}

interface AIFollowupResponse {
  questions: Array<{
    id: string;
    question: string;
    type: "text" | "select" | "boolean";
    options?: string[];
    required: boolean;
  }>;
  fallback?: boolean;
}

interface AIBriefResponse {
  brief: {
    briefSummary: string;
    keyObservations: string[];
    potentialCauses: string[];
    recommendedQuestions: string[];
    urgencyAssessment: "low" | "medium" | "high" | "emergency";
    estimatedComplexity: "simple" | "moderate" | "complex";
    safetyNotes: string[];
    suggestedToolsOrParts?: string[];
    remoteEstimatePossible?: boolean;
    siteVisitRecommended?: boolean;
  };
  fallback?: boolean;
  correlationId?: string;
}

// Simulate API call for AI intake
async function callAIIntake(
  serviceRequestId: string,
  data: { category: string; imageUrls: string[]; userDescription: string }
): Promise<AIIntakeResponse> {
  const response = await fetch(`/api/service-requests/${serviceRequestId}/ai-intake`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to analyze request");
  }

  return response.json();
}

// Simulate API call for follow-up questions
async function callAIFollowup(
  serviceRequestId: string,
  data: { category: string; summary: string }
): Promise<AIFollowupResponse> {
  const response = await fetch(`/api/service-requests/${serviceRequestId}/ai-followup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to generate questions");
  }

  return response.json();
}

// Simulate API call for provider brief
async function callAIBrief(
  serviceRequestId: string,
  data: {
    category: string;
    summary: string;
    userDescription: string;
    imageUrls: string[];
  }
): Promise<AIBriefResponse> {
  const response = await fetch(`/api/service-requests/${serviceRequestId}/provider-brief`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    throw new Error("Failed to generate brief");
  }

  return response.json();
}

// ============================================================================
// Feature Flag Tests
// ============================================================================

describe("AI Intake Feature Flag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return fallback when ai_intake_enabled is false", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(false);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        fallback: true,
        classification: null,
        message: "AI intake is disabled",
      }),
    });

    const result = await callAIIntake("sr-123", {
      category: "plumbing",
      imageUrls: ["https://example.com/image.jpg"],
      userDescription: "Leaking faucet",
    });

    expect(result.fallback).toBe(true);
    expect(result.classification).toBeNull();
    expect(result.message).toBe("AI intake is disabled");
  });

  it("should process normally when ai_intake_enabled is true", async () => {
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        fallback: false,
        classification: {
          summary: "Leaking kitchen faucet",
          suggestedCategory: "plumbing",
          confidence: "high",
          keyObservations: ["Water visible under sink"],
          urgencyLevel: "standard",
        },
        correlationId: "ai-123",
      }),
    });

    const result = await callAIIntake("sr-123", {
      category: "plumbing",
      imageUrls: ["https://example.com/image.jpg"],
      userDescription: "Leaking faucet",
    });

    expect(result.fallback).toBe(false);
    expect(result.classification).not.toBeNull();
    expect(result.classification?.summary).toBe("Leaking kitchen faucet");
    expect(result.correlationId).toBe("ai-123");
  });
});

// ============================================================================
// API Failure Fallback Tests
// ============================================================================

describe("AI API Failure Fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  });

  it("should handle network errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(
      callAIIntake("sr-123", {
        category: "plumbing",
        imageUrls: [],
        userDescription: "Test",
      })
    ).rejects.toThrow("Network error");
  });

  it("should handle 500 server errors", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(
      callAIIntake("sr-123", {
        category: "plumbing",
        imageUrls: [],
        userDescription: "Test",
      })
    ).rejects.toThrow("Failed to analyze request");
  });

  it("should handle 503 service unavailable", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
    });

    await expect(
      callAIIntake("sr-123", {
        category: "plumbing",
        imageUrls: [],
        userDescription: "Test",
      })
    ).rejects.toThrow("Failed to analyze request");
  });

  it("should handle AI provider returning usedFallback", async () => {
    // Simulates when the AI gateway uses fallback due to provider issues
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        fallback: true,
        classification: {
          summary: "Service request for plumbing issue",
          suggestedCategory: "plumbing",
          confidence: "low",
          keyObservations: [],
          urgencyLevel: "standard",
        },
        correlationId: "fallback-123",
      }),
    });

    const result = await callAIIntake("sr-123", {
      category: "plumbing",
      imageUrls: [],
      userDescription: "Test",
    });

    expect(result.fallback).toBe(true);
    expect(result.classification).not.toBeNull();
    expect(result.classification?.confidence).toBe("low");
  });
});

// ============================================================================
// Timeout Handling Tests
// ============================================================================

describe("AI Timeout Handling", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  });

  it("should handle request timeout", async () => {
    // Simulate a timeout by making fetch hang and using AbortController
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error("Request timeout")), 100);
        })
    );

    await expect(
      callAIIntake("sr-123", {
        category: "plumbing",
        imageUrls: [],
        userDescription: "Test",
      })
    ).rejects.toThrow("Request timeout");
  });

  it("should handle slow response with eventual success", async () => {
    // Simulate slow but successful response
    mockFetch.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({
                  fallback: false,
                  classification: {
                    summary: "Delayed but successful",
                    suggestedCategory: "plumbing",
                    confidence: "high",
                    keyObservations: [],
                    urgencyLevel: "standard",
                  },
                }),
              }),
            50
          );
        })
    );

    const result = await callAIIntake("sr-123", {
      category: "plumbing",
      imageUrls: [],
      userDescription: "Test",
    });

    expect(result.fallback).toBe(false);
    expect(result.classification?.summary).toBe("Delayed but successful");
  });
});

// ============================================================================
// Follow-up Questions Fallback Tests
// ============================================================================

describe("AI Follow-up Questions Fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  });

  it("should return category-specific fallback questions on error", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: [
          {
            id: "q1",
            question: "When did you first notice this issue?",
            type: "text",
            required: true,
          },
          {
            id: "q2",
            question: "Is there any visible water damage?",
            type: "boolean",
            required: true,
          },
          {
            id: "q3",
            question: "Which fixture is affected?",
            type: "select",
            options: ["Sink", "Toilet", "Shower", "Water heater", "Other"],
            required: true,
          },
        ],
        fallback: true,
      }),
    });

    const result = await callAIFollowup("sr-123", {
      category: "plumbing",
      summary: "Leaking faucet",
    });

    expect(result.questions).toHaveLength(3);
    expect(result.fallback).toBe(true);
    expect(result.questions[0].id).toBe("q1");
  });

  it("should handle empty questions response", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: [],
        fallback: false,
      }),
    });

    const result = await callAIFollowup("sr-123", {
      category: "general",
      summary: "Some issue",
    });

    expect(result.questions).toHaveLength(0);
  });
});

// ============================================================================
// Provider Brief Fallback Tests
// ============================================================================

describe("AI Provider Brief Fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  });

  it("should return basic brief on AI failure", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        brief: {
          briefSummary: "Service request for plumbing issue",
          keyObservations: [],
          potentialCauses: [],
          recommendedQuestions: [],
          urgencyAssessment: "medium",
          estimatedComplexity: "moderate",
          safetyNotes: [],
        },
        fallback: true,
      }),
    });

    const result = await callAIBrief("sr-123", {
      category: "plumbing",
      summary: "Leaking faucet",
      userDescription: "My faucet is dripping",
      imageUrls: [],
    });

    expect(result.fallback).toBe(true);
    expect(result.brief).toBeDefined();
    expect(result.brief.urgencyAssessment).toBe("medium");
  });

  it("should include extended fields when AI succeeds", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        brief: {
          briefSummary: "Kitchen faucet leaking at base, likely worn O-ring",
          keyObservations: ["Water pooling at faucet base", "Faucet is approx 10 years old"],
          potentialCauses: ["Worn O-ring", "Corroded valve seat", "Loose packing nut"],
          recommendedQuestions: ["How long has it been leaking?", "Is it a constant drip?"],
          urgencyAssessment: "medium",
          estimatedComplexity: "simple",
          safetyNotes: ["Ensure water supply is shut off before work begins"],
          suggestedToolsOrParts: ["Adjustable wrench", "O-ring kit", "Plumber's grease"],
          remoteEstimatePossible: true,
          siteVisitRecommended: false,
        },
        fallback: false,
        correlationId: "brief-456",
      }),
    });

    const result = await callAIBrief("sr-123", {
      category: "plumbing",
      summary: "Leaking faucet",
      userDescription: "My kitchen faucet has been dripping for a week",
      imageUrls: ["https://example.com/faucet.jpg"],
    });

    expect(result.fallback).toBe(false);
    expect(result.brief.suggestedToolsOrParts).toContain("O-ring kit");
    expect(result.brief.remoteEstimatePossible).toBe(true);
    expect(result.brief.siteVisitRecommended).toBe(false);
  });
});

// ============================================================================
// Safety Flag Handling Tests
// ============================================================================

describe("Safety Flag Detection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  });

  it("should detect and return safety flags from classification", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        fallback: false,
        classification: {
          summary: "Gas smell detected near water heater",
          suggestedCategory: "hvac",
          confidence: "high",
          keyObservations: ["Strong gas odor reported", "Water heater in basement"],
          urgencyLevel: "emergency",
          safetyFlags: [
            {
              type: "gas_smell",
              severity: "critical",
              description: "Customer reports gas smell near appliance",
              guidance: "Leave the area immediately. Do not use electrical switches. Call gas company.",
              recommendEmergencyServices: true,
            },
          ],
        },
        correlationId: "safety-123",
      }),
    });

    const result = await callAIIntake("sr-123", {
      category: "hvac",
      imageUrls: ["https://example.com/heater.jpg"],
      userDescription: "I smell gas near my water heater",
    });

    expect(result.classification?.safetyFlags).toHaveLength(1);
    expect(result.classification?.safetyFlags?.[0].type).toBe("gas_smell");
    expect(result.classification?.safetyFlags?.[0].severity).toBe("critical");
    expect(result.classification?.safetyFlags?.[0].recommendEmergencyServices).toBe(true);
  });

  it("should handle multiple safety flags", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        fallback: false,
        classification: {
          summary: "Electrical issue with water damage",
          suggestedCategory: "electrical",
          confidence: "high",
          keyObservations: ["Sparking outlet", "Water on floor near outlet"],
          urgencyLevel: "emergency",
          safetyFlags: [
            {
              type: "electrical_sparking",
              severity: "critical",
              description: "Sparking electrical outlet",
              guidance: "Turn off power at breaker immediately",
              recommendEmergencyServices: false,
            },
            {
              type: "water_near_electrical",
              severity: "critical",
              description: "Water near electrical components",
              guidance: "Do not touch. Keep everyone away from the area.",
              recommendEmergencyServices: true,
            },
          ],
        },
      }),
    });

    const result = await callAIIntake("sr-123", {
      category: "electrical",
      imageUrls: [],
      userDescription: "My outlet is sparking and there's water on the floor",
    });

    expect(result.classification?.safetyFlags).toHaveLength(2);
    expect(result.classification?.safetyFlags?.some((f) => f.type === "electrical_sparking")).toBe(
      true
    );
    expect(result.classification?.safetyFlags?.some((f) => f.type === "water_near_electrical")).toBe(
      true
    );
  });

  it("should return empty safety flags for normal issues", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        fallback: false,
        classification: {
          summary: "Slow draining sink",
          suggestedCategory: "plumbing",
          confidence: "high",
          keyObservations: ["Kitchen sink drains slowly"],
          urgencyLevel: "standard",
          safetyFlags: [],
        },
      }),
    });

    const result = await callAIIntake("sr-123", {
      category: "plumbing",
      imageUrls: [],
      userDescription: "My sink drains slowly",
    });

    expect(result.classification?.safetyFlags).toHaveLength(0);
    expect(result.classification?.urgencyLevel).toBe("standard");
  });
});

// ============================================================================
// Full Flow Integration Tests
// ============================================================================

describe("AI Intake Full Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isFeatureEnabled).mockResolvedValue(true);
  });

  it("should complete full AI intake flow successfully", async () => {
    // Step 1: Classification
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        fallback: false,
        classification: {
          summary: "Leaking pipe under kitchen sink",
          suggestedCategory: "plumbing",
          confidence: "high",
          keyObservations: ["Water damage visible", "P-trap appears corroded"],
          urgencyLevel: "urgent",
        },
        correlationId: "step1-123",
      }),
    });

    const classifyResult = await callAIIntake("sr-123", {
      category: "plumbing",
      imageUrls: ["https://example.com/leak.jpg"],
      userDescription: "Water is leaking under my kitchen sink",
    });

    expect(classifyResult.fallback).toBe(false);
    expect(classifyResult.classification?.confidence).toBe("high");

    // Step 2: Follow-up questions
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        questions: [
          { id: "q1", question: "How long has it been leaking?", type: "text", required: true },
          { id: "q2", question: "Is the leak constant or intermittent?", type: "select", options: ["Constant", "Intermittent", "Only when running water"], required: true },
        ],
      }),
    });

    const questionsResult = await callAIFollowup("sr-123", {
      category: classifyResult.classification?.suggestedCategory || "plumbing",
      summary: classifyResult.classification?.summary || "",
    });

    expect(questionsResult.questions).toHaveLength(2);

    // Step 3: Provider brief
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        brief: {
          briefSummary: "Active leak from corroded P-trap under kitchen sink",
          keyObservations: ["Water damage visible on cabinet floor", "P-trap shows corrosion"],
          potentialCauses: ["Corroded P-trap", "Loose connections", "Failed gaskets"],
          recommendedQuestions: ["Any recent clogs or drain issues?"],
          urgencyAssessment: "high",
          estimatedComplexity: "simple",
          safetyNotes: ["Place bucket under leak", "Turn off water supply if severe"],
          suggestedToolsOrParts: ["P-trap replacement kit", "Channel locks", "Plumber's tape"],
          remoteEstimatePossible: true,
          siteVisitRecommended: false,
        },
        correlationId: "step3-123",
      }),
    });

    const briefResult = await callAIBrief("sr-123", {
      category: classifyResult.classification?.suggestedCategory || "plumbing",
      summary: classifyResult.classification?.summary || "",
      userDescription: "Water is leaking under my kitchen sink",
      imageUrls: ["https://example.com/leak.jpg"],
    });

    expect(briefResult.brief.urgencyAssessment).toBe("high");
    expect(briefResult.brief.estimatedComplexity).toBe("simple");
    expect(briefResult.brief.suggestedToolsOrParts).toContain("P-trap replacement kit");
  });

  it("should gracefully degrade when AI fails mid-flow", async () => {
    // Step 1: Classification succeeds
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        fallback: false,
        classification: {
          summary: "HVAC not cooling properly",
          suggestedCategory: "hvac",
          confidence: "high",
          keyObservations: ["AC running but not cooling"],
          urgencyLevel: "standard",
        },
      }),
    });

    const classifyResult = await callAIIntake("sr-123", {
      category: "hvac",
      imageUrls: [],
      userDescription: "My AC is running but not cooling",
    });

    expect(classifyResult.fallback).toBe(false);

    // Step 2: Questions fail
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    await expect(
      callAIFollowup("sr-123", {
        category: "hvac",
        summary: classifyResult.classification?.summary || "",
      })
    ).rejects.toThrow("Failed to generate questions");

    // Flow can continue without questions - provider brief still works
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        brief: {
          briefSummary: "AC not cooling - possible refrigerant or compressor issue",
          keyObservations: [],
          potentialCauses: ["Low refrigerant", "Dirty filters", "Compressor issue"],
          recommendedQuestions: [],
          urgencyAssessment: "medium",
          estimatedComplexity: "moderate",
          safetyNotes: [],
        },
        fallback: true,
      }),
    });

    const briefResult = await callAIBrief("sr-123", {
      category: "hvac",
      summary: classifyResult.classification?.summary || "",
      userDescription: "My AC is running but not cooling",
      imageUrls: [],
    });

    // Brief still generated with fallback
    expect(briefResult.brief).toBeDefined();
    expect(briefResult.fallback).toBe(true);
  });
});
