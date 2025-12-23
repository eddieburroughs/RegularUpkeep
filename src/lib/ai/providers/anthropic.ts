/**
 * Anthropic Provider Adapter
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProviderAdapter,
  AIModel,
  ProviderCompletionRequest,
  ProviderCompletionResponse,
} from "../types";

// Cost per 1M tokens (as of Dec 2024)
const ANTHROPIC_PRICING: Record<string, { input: number; output: number }> = {
  "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
};

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY is not configured");
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

export const anthropicAdapter: AIProviderAdapter = {
  name: "anthropic",

  isAvailable(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  },

  supportsVision(): boolean {
    return true;
  },

  estimateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
    const pricing = ANTHROPIC_PRICING[model] || ANTHROPIC_PRICING["claude-3-haiku-20240307"];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return Math.round((inputCost + outputCost) * 100000) / 100000;
  },

  async generateCompletion(
    request: ProviderCompletionRequest
  ): Promise<ProviderCompletionResponse> {
    const anthropic = getClient();

    // Map our model names to Anthropic model names
    const modelMap: Record<string, string> = {
      "claude-3-5-sonnet-20241022": "claude-3-5-sonnet-20241022",
      "claude-3-haiku-20240307": "claude-3-haiku-20240307",
    };
    const model = modelMap[request.model] || "claude-3-haiku-20240307";

    // Build message content
    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = [];

    // Add text prompt
    (content as Anthropic.TextBlockParam[]).push({ type: "text", text: request.userPrompt });

    // Add images if present (Anthropic uses base64 or URLs differently)
    if (request.imageUrls && request.imageUrls.length > 0) {
      for (const url of request.imageUrls) {
        // Anthropic requires base64 for images or specific URL format
        // For URLs, we need to fetch and convert to base64
        // For simplicity, we'll use URL source type if supported
        content.push({
          type: "image",
          source: {
            type: "url",
            url,
          },
        } as Anthropic.ImageBlockParam);
      }
    }

    // Add JSON mode instruction to system prompt if needed
    let systemPrompt = request.systemPrompt;
    if (request.jsonMode) {
      systemPrompt += "\n\nIMPORTANT: You must respond with valid JSON only. No other text.";
    }

    const response = await anthropic.messages.create({
      model,
      max_tokens: request.maxTokens,
      system: systemPrompt,
      messages: [
        { role: "user", content },
      ],
    });

    const textBlock = response.content.find((block) => block.type === "text");
    const text = textBlock?.type === "text" ? textBlock.text : "";

    return {
      content: text,
      model: request.model,
      inputTokens: response.usage?.input_tokens || 0,
      outputTokens: response.usage?.output_tokens || 0,
      finishReason: response.stop_reason === "end_turn" ? "stop" :
                    response.stop_reason === "max_tokens" ? "length" : "error",
    };
  },
};
