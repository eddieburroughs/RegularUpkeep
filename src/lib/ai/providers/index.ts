/**
 * AI Provider Factory
 *
 * Selects and returns the appropriate AI provider based on configuration.
 * Supports HYBRID mode: routes vision/intake to OpenAI, long-form to Anthropic.
 */

import type { AIProvider, AIProviderAdapter, AIModel, AITaskType } from "../types";
import { openaiAdapter } from "./openai";
import { anthropicAdapter } from "./anthropic";
import { mockAdapter } from "./mock";

// ============================================================================
// Hybrid Mode Task-to-Provider Routing
// ============================================================================

/**
 * Task routing configuration for hybrid mode.
 * - OpenAI: Vision + intake + strict JSON (Responses API with Structured Outputs)
 * - Anthropic: Long-form summaries + drafting + ops reasoning (Claude native API)
 *
 * Model selection uses env vars for production flexibility:
 * - OPENAI_VISION_MODEL / OPENAI_VISION_MODEL_STRONG
 * - ANTHROPIC_LONGFORM_MODEL / ANTHROPIC_FAST_MODEL / ANTHROPIC_HEAVY_MODEL
 */
interface TaskRoutingConfig {
  provider: AIProvider;
  primaryModel: AIModel;
  fallbackModel: AIModel;
  notes?: string;
}

const HYBRID_TASK_ROUTING: Record<AITaskType, TaskRoutingConfig> = {
  // OpenAI Vision + Intake Tasks (Responses API + Structured Outputs)
  "MEDIA_QUALITY_CHECK": {
    provider: "openai",
    primaryModel: "gpt-4o-mini",
    fallbackModel: "gpt-4o",
    notes: "Vision + fast",
  },
  "INTAKE_CLASSIFY_AND_SUMMARIZE": {
    provider: "openai",
    primaryModel: "gpt-4o-mini",
    fallbackModel: "gpt-4o",
    notes: "Vision + strict JSON",
  },
  "INTAKE_FOLLOWUP_QUESTIONS": {
    provider: "openai",
    primaryModel: "gpt-4o-mini",
    fallbackModel: "gpt-4o",
    notes: "Dynamic intake questions",
  },
  "PROVIDER_BRIEF_GENERATE": {
    provider: "openai",
    primaryModel: "gpt-4o",
    fallbackModel: "gpt-4o-mini",
    notes: "More nuanced brief; still vision-grounded",
  },

  // Anthropic Long-form + Drafting (Claude native API with Structured Outputs)
  "PROVIDER_ESTIMATE_DRAFT": {
    provider: "anthropic",
    primaryModel: "claude-sonnet-4-5-20250929",
    fallbackModel: "claude-haiku-4-5-20251001",
    notes: "Strong writing + structured output",
  },
  "PROVIDER_MESSAGE_DRAFT": {
    provider: "anthropic",
    primaryModel: "claude-haiku-4-5-20251001",
    fallbackModel: "claude-sonnet-4-5-20250929",
    notes: "Fast/cheap; upgrade if needed",
  },
  "INVOICE_NARRATIVE_DRAFT": {
    provider: "anthropic",
    primaryModel: "claude-sonnet-4-5-20250929",
    fallbackModel: "claude-haiku-4-5-20251001",
    notes: "Better professional narrative",
  },

  // Anthropic Admin + Ops Tasks
  "DISPUTE_TIMELINE_SUMMARY": {
    provider: "anthropic",
    primaryModel: "claude-sonnet-4-5-20250929",
    fallbackModel: "claude-opus-4-5-20251101",
    notes: "Use Opus only if Sonnet isn't enough",
  },
  "FRAUD_SIGNAL_REFERRALS": {
    provider: "anthropic",
    primaryModel: "claude-sonnet-4-5-20250929",
    fallbackModel: "claude-haiku-4-5-20251001",
    notes: "Flags for review, not accusations",
  },
  "PROVIDER_QUALITY_SUMMARY": {
    provider: "anthropic",
    primaryModel: "claude-sonnet-4-5-20250929",
    fallbackModel: "claude-haiku-4-5-20251001",
    notes: "Provider quality insights",
  },

  // Anthropic CRM + Homeowner Tasks
  "CRM_NEXT_BEST_ACTION": {
    provider: "anthropic",
    primaryModel: "claude-sonnet-4-5-20250929",
    fallbackModel: "claude-haiku-4-5-20251001",
    notes: "Pipeline suggestions",
  },
  "MAINTENANCE_PLAN_SUGGEST": {
    provider: "anthropic",
    primaryModel: "claude-haiku-4-5-20251001",
    fallbackModel: "claude-sonnet-4-5-20250929",
    notes: "Mostly templated text generation",
  },
  "SPONSOR_TILE_COPY": {
    provider: "anthropic",
    primaryModel: "claude-haiku-4-5-20251001",
    fallbackModel: "claude-sonnet-4-5-20250929",
    notes: "Short marketing copy",
  },
};

/**
 * Get the configured AI provider mode from environment
 * Supports: "openai" | "anthropic" | "hybrid" | "none"
 */
export type AIProviderMode = AIProvider | "hybrid";

export function getConfiguredProviderMode(): AIProviderMode {
  const provider = process.env.AI_PROVIDER?.toLowerCase();
  if (provider === "anthropic") return "anthropic";
  if (provider === "hybrid") return "hybrid";
  if (provider === "none") return "none";
  return "openai"; // Default to OpenAI
}

/**
 * Get the configured AI provider from environment (legacy)
 * @deprecated Use getConfiguredProviderMode() instead
 */
export function getConfiguredProvider(): AIProvider {
  const mode = getConfiguredProviderMode();
  if (mode === "hybrid") return "openai"; // Default for hybrid
  return mode;
}

/**
 * Get the preferred provider for a specific task type
 * In hybrid mode, uses the routing map; otherwise uses global config
 */
export function getProviderForTask(taskType: AITaskType): AIProvider {
  const mode = getConfiguredProviderMode();

  if (mode === "hybrid") {
    const config = HYBRID_TASK_ROUTING[taskType];
    return config?.provider || "openai";
  }

  if (mode === "none") return "none";
  return mode;
}

/**
 * Get the full routing config for a task (provider + models)
 */
export function getTaskRoutingConfig(taskType: AITaskType): TaskRoutingConfig | null {
  const mode = getConfiguredProviderMode();

  if (mode === "hybrid") {
    return HYBRID_TASK_ROUTING[taskType] || null;
  }

  return null;
}

/**
 * Get the primary model for a task, respecting env overrides
 */
export function getPrimaryModelForTask(taskType: AITaskType): AIModel {
  const config = HYBRID_TASK_ROUTING[taskType];
  if (!config) return "gpt-4o-mini";

  // Check env overrides
  if (config.provider === "openai") {
    if (config.primaryModel === "gpt-4o") {
      return (process.env.OPENAI_VISION_MODEL_STRONG as AIModel) || config.primaryModel;
    }
    return (process.env.OPENAI_VISION_MODEL as AIModel) || config.primaryModel;
  }

  if (config.provider === "anthropic") {
    const model = config.primaryModel;
    if (model.includes("sonnet")) {
      return (process.env.ANTHROPIC_LONGFORM_MODEL as AIModel) || model;
    }
    if (model.includes("haiku")) {
      return (process.env.ANTHROPIC_FAST_MODEL as AIModel) || model;
    }
    if (model.includes("opus")) {
      return (process.env.ANTHROPIC_HEAVY_MODEL as AIModel) || model;
    }
  }

  return config.primaryModel;
}

/**
 * Get the fallback model for a task, respecting env overrides
 */
export function getFallbackModelForTask(taskType: AITaskType): AIModel {
  const config = HYBRID_TASK_ROUTING[taskType];
  if (!config) return "gpt-4o";

  // Check env overrides for fallback
  if (config.provider === "openai") {
    if (config.fallbackModel === "gpt-4o") {
      return (process.env.OPENAI_VISION_MODEL_STRONG as AIModel) || config.fallbackModel;
    }
    return (process.env.OPENAI_VISION_MODEL as AIModel) || config.fallbackModel;
  }

  if (config.provider === "anthropic") {
    const model = config.fallbackModel;
    if (model.includes("sonnet")) {
      return (process.env.ANTHROPIC_LONGFORM_MODEL as AIModel) || model;
    }
    if (model.includes("haiku")) {
      return (process.env.ANTHROPIC_FAST_MODEL as AIModel) || model;
    }
    if (model.includes("opus")) {
      return (process.env.ANTHROPIC_HEAVY_MODEL as AIModel) || model;
    }
  }

  return config.fallbackModel;
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
      anthropic: "claude-sonnet-4-5-20250929",
      none: "mock",
    },
    "gpt-4o-mini": {
      openai: "gpt-4o-mini",
      anthropic: "claude-haiku-4-5-20251001",
      none: "mock",
    },
    "gpt-4-turbo": {
      openai: "gpt-4-turbo",
      anthropic: "claude-sonnet-4-5-20250929",
      none: "mock",
    },
    // Claude 4.5 models (production snapshot IDs)
    "claude-sonnet-4-5-20250929": {
      openai: "gpt-4o",
      anthropic: "claude-sonnet-4-5-20250929",
      none: "mock",
    },
    "claude-haiku-4-5-20251001": {
      openai: "gpt-4o-mini",
      anthropic: "claude-haiku-4-5-20251001",
      none: "mock",
    },
    "claude-opus-4-5-20251101": {
      openai: "gpt-4o",
      anthropic: "claude-opus-4-5-20251101",
      none: "mock",
    },
    // Legacy Anthropic models (backwards compatibility)
    "claude-3-5-sonnet-20241022": {
      openai: "gpt-4o",
      anthropic: "claude-sonnet-4-5-20250929", // Upgrade to 4.5
      none: "mock",
    },
    "claude-3-haiku-20240307": {
      openai: "gpt-4o-mini",
      anthropic: "claude-haiku-4-5-20251001", // Upgrade to 4.5
      none: "mock",
    },
    // Mock
    mock: {
      openai: "gpt-4o-mini",
      anthropic: "claude-haiku-4-5-20251001",
      none: "mock",
    },
  };

  return modelEquivalents[preferredModel]?.[provider] || preferredModel;
}

export { openaiAdapter, anthropicAdapter, mockAdapter };
