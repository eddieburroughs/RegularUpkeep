/**
 * AI Provider Factory
 *
 * Selects and returns the appropriate AI provider based on configuration.
 */

import type { AIProvider, AIProviderAdapter, AIModel } from "../types";
import { openaiAdapter } from "./openai";
import { anthropicAdapter } from "./anthropic";
import { mockAdapter } from "./mock";

/**
 * Get the configured AI provider from environment
 */
export function getConfiguredProvider(): AIProvider {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "anthropic") return "anthropic";
  if (provider === "none") return "none";
  return "openai"; // Default to OpenAI
}

/**
 * Get the provider adapter for a given provider name
 */
export function getProviderAdapter(provider: AIProvider): AIProviderAdapter {
  switch (provider) {
    case "openai":
      return openaiAdapter;
    case "anthropic":
      return anthropicAdapter;
    case "none":
      return mockAdapter;
    default:
      return mockAdapter;
  }
}

/**
 * Get the best available provider
 * Falls back through providers if primary is not available
 */
export function getBestAvailableProvider(): AIProviderAdapter {
  const configured = getConfiguredProvider();

  // Try configured provider first
  const configuredAdapter = getProviderAdapter(configured);
  if (configuredAdapter.isAvailable()) {
    return configuredAdapter;
  }

  // Fall back to other providers
  if (configured !== "openai" && openaiAdapter.isAvailable()) {
    console.warn(`Configured provider ${configured} unavailable, falling back to OpenAI`);
    return openaiAdapter;
  }

  if (configured !== "anthropic" && anthropicAdapter.isAvailable()) {
    console.warn(`Configured provider ${configured} unavailable, falling back to Anthropic`);
    return anthropicAdapter;
  }

  // Last resort: mock adapter
  console.warn("No AI provider available, using mock adapter");
  return mockAdapter;
}

/**
 * Map model preferences to available models for a provider
 */
export function mapModelToProvider(
  preferredModel: AIModel,
  provider: AIProvider
): AIModel {
  // Model mapping between providers
  const modelEquivalents: Record<AIModel, Record<AIProvider, AIModel>> = {
    // OpenAI models
    "gpt-4o": {
      openai: "gpt-4o",
      anthropic: "claude-3-5-sonnet-20241022",
      none: "mock",
    },
    "gpt-4o-mini": {
      openai: "gpt-4o-mini",
      anthropic: "claude-3-haiku-20240307",
      none: "mock",
    },
    "gpt-4-turbo": {
      openai: "gpt-4-turbo",
      anthropic: "claude-3-5-sonnet-20241022",
      none: "mock",
    },
    // Anthropic models
    "claude-3-5-sonnet-20241022": {
      openai: "gpt-4o",
      anthropic: "claude-3-5-sonnet-20241022",
      none: "mock",
    },
    "claude-3-haiku-20240307": {
      openai: "gpt-4o-mini",
      anthropic: "claude-3-haiku-20240307",
      none: "mock",
    },
    // Mock
    mock: {
      openai: "gpt-4o-mini",
      anthropic: "claude-3-haiku-20240307",
      none: "mock",
    },
  };

  return modelEquivalents[preferredModel]?.[provider] || preferredModel;
}

export { openaiAdapter, anthropicAdapter, mockAdapter };
