/**
 * Mock Provider Adapter
 *
 * Used for testing and when AI_PROVIDER="none"
 */

import type {
  AIProviderAdapter,
  AIModel,
  ProviderCompletionRequest,
  ProviderCompletionResponse,
} from "../types";

export const mockAdapter: AIProviderAdapter = {
  name: "none",

  isAvailable(): boolean {
    return true; // Always available
  },

  supportsVision(): boolean {
    return true;
  },

  estimateCost(): number {
    return 0; // No cost for mock
  },

  async generateCompletion(
    request: ProviderCompletionRequest
  ): Promise<ProviderCompletionResponse> {
    // Simulate some latency
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Return empty response - actual fallback logic is handled by the gateway
    return {
      content: "{}",
      model: "mock" as AIModel,
      inputTokens: 0,
      outputTokens: 0,
      finishReason: "stop",
    };
  },
};
