/**
 * Anthropic Provider Adapter
 *
 * Uses Claude for long-form summaries and nuanced writing.
 * Preferred for: dispute triage, CRM copilot, invoice narratives, sponsor copy.
 */

import Anthropic from "@anthropic-ai/sdk";
import type {
  AIProviderAdapter,
  AIModel,
  ProviderCompletionRequest,
  ProviderCompletionResponse,
} from "../types";

// Cost per 1M tokens (as of Dec 2024)
// Production snapshot IDs for stable behavior
const ANTHROPIC_PRICING: Record<string, { input: number; output: number }> = {
  // Claude 4.5 models (production snapshot IDs)
  "claude-sonnet-4-5-20250929": { input: 3, output: 15 },
  "claude-haiku-4-5-20251001": { input: 0.25, output: 1.25 },
  "claude-opus-4-5-20251101": { input: 15, output: 75 },
  // Legacy models (backwards compatibility)
  "claude-3-5-sonnet-20241022": { input: 3, output: 15 },
  "claude-3-haiku-20240307": { input: 0.25, output: 1.25 },
};

// JSON mode instruction for strict structured output with Claude
const JSON_MODE_INSTRUCTION = `

CRITICAL OUTPUT FORMAT REQUIREMENTS:
1. You MUST respond with valid, machine-parseable JSON only
2. Do NOT include markdown code blocks (no \`\`\`json or \`\`\`)
3. Do NOT include any explanatory text before or after the JSON
4. Ensure all string values are properly escaped
5. Use double quotes for all keys and string values
6. Begin your response with { and end with }
7. Validate your JSON structure before responding`;

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

    // Map our model names to Anthropic API model IDs
    // Uses production snapshot IDs for stable behavior
    const modelMap: Record<string, string> = {
      // Claude 4.5 models (production)
      "claude-sonnet-4-5-20250929": "claude-sonnet-4-5-20250929",
      "claude-haiku-4-5-20251001": "claude-haiku-4-5-20251001",
      "claude-opus-4-5-20251101": "claude-opus-4-5-20251101",
      // Legacy models (backwards compatibility)
      "claude-3-5-sonnet-20241022": "claude-3-5-sonnet-20241022",
      "claude-3-haiku-20240307": "claude-3-haiku-20240307",
    };
    // Default to Haiku 4.5 for fast/cheap operations
    const model = modelMap[request.model] || "claude-haiku-4-5-20251001";

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

    // Add JSON mode instruction to system prompt for strict structured output
    const systemPrompt = request.jsonMode
      ? request.systemPrompt + JSON_MODE_INSTRUCTION
      : request.systemPrompt;

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
