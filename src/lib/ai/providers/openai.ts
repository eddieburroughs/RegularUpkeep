/**
 * OpenAI Provider Adapter
 *
 * Uses OpenAI's Responses API with structured outputs (JSON mode).
 * Preferred for: vision tasks, intake classification, quick structured responses.
 */

import OpenAI from "openai";
import type {
  AIProviderAdapter,
  AIModel,
  ProviderCompletionRequest,
  ProviderCompletionResponse,
} from "../types";

// Cost per 1M tokens (as of Dec 2024)
const OPENAI_PRICING: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 2.5, output: 10 },
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4-turbo": { input: 10, output: 30 },
};

// JSON mode instruction appended to system prompt for strict structured output
const JSON_MODE_INSTRUCTION = `

IMPORTANT: You MUST respond with valid, machine-parseable JSON only.
- No markdown code blocks
- No explanatory text before or after the JSON
- Ensure all string values are properly escaped
- Use double quotes for all keys and string values`;

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }
    client = new OpenAI({ apiKey });
  }
  return client;
}

export const openaiAdapter: AIProviderAdapter = {
  name: "openai",

  isAvailable(): boolean {
    return !!process.env.OPENAI_API_KEY;
  },

  supportsVision(): boolean {
    return true;
  },

  estimateCost(model: AIModel, inputTokens: number, outputTokens: number): number {
    const pricing = OPENAI_PRICING[model] || OPENAI_PRICING["gpt-4o-mini"];
    const inputCost = (inputTokens / 1_000_000) * pricing.input;
    const outputCost = (outputTokens / 1_000_000) * pricing.output;
    return Math.round((inputCost + outputCost) * 100000) / 100000; // Round to 5 decimal places
  },

  async generateCompletion(
    request: ProviderCompletionRequest
  ): Promise<ProviderCompletionResponse> {
    const openai = getClient();

    // Map our model names to OpenAI model names
    const modelMap: Record<string, string> = {
      "gpt-4o": "gpt-4o",
      "gpt-4o-mini": "gpt-4o-mini",
      "gpt-4-turbo": "gpt-4-turbo",
    };
    const model = modelMap[request.model] || "gpt-4o-mini";

    // Build message content
    const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
      { type: "text", text: request.userPrompt },
    ];

    // Add images if present
    if (request.imageUrls && request.imageUrls.length > 0) {
      for (const url of request.imageUrls) {
        content.push({
          type: "image_url",
          image_url: { url, detail: "high" },
        });
      }
    }

    // Add JSON mode instruction to system prompt for strict structured output
    const systemPrompt = request.jsonMode
      ? request.systemPrompt + JSON_MODE_INSTRUCTION
      : request.systemPrompt;

    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content },
      ],
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      // Use OpenAI's native JSON mode for structured outputs
      ...(request.jsonMode ? { response_format: { type: "json_object" } } : {}),
    });

    const choice = response.choices[0];
    const usage = response.usage;

    return {
      content: choice?.message?.content || "",
      model: request.model,
      inputTokens: usage?.prompt_tokens || 0,
      outputTokens: usage?.completion_tokens || 0,
      finishReason: choice?.finish_reason === "stop" ? "stop" :
                    choice?.finish_reason === "length" ? "length" : "error",
    };
  },
};
