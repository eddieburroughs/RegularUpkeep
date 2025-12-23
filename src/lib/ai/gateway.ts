/**
 * AI Gateway
 *
 * Central orchestrator for all AI operations.
 * Provides a single entry point: ai.runTask()
 */

import type {
  AITaskType,
  AITaskRequest,
  AITaskResponse,
  AITaskFlags,
  AIPolicyEvent,
  AIModel,
  AIProvider,
} from "./types";
import { getTaskDefinition, canActorExecuteTask } from "./tasks";
import { getBestAvailableProvider, mapModelToProvider, getProviderAdapter } from "./providers";
import { checkInputSafety, checkOutputSafety, sanitizeOutput, checkForEmergency } from "./safety";
import {
  generateCorrelationId,
  createLogEntryBuilder,
  logAITask,
  trackCost,
  recordMetrics,
  checkRateLimit,
} from "./observability";
import {
  checkDailyRateLimit,
  isAIEnabledForUser,
  sanitizeInputsForStorage,
} from "./ops";
import { createAIJob, completeAIJob, persistAITaskResponse } from "./db";

// ============================================================================
// Configuration
// ============================================================================

const DEFAULT_TIMEOUT_MS = 30000;
const MAX_RETRIES = 2;

// ============================================================================
// Main Gateway Function
// ============================================================================

/**
 * Execute an AI task through the gateway
 *
 * @example
 * ```typescript
 * const result = await ai.runTask({
 *   taskType: "INTAKE_CLASSIFY_AND_SUMMARIZE",
 *   actorUserId: "user-123",
 *   entityType: "service_request",
 *   entityId: "sr-456",
 *   inputs: {
 *     imageUrls: ["https://..."],
 *     category: "plumbing",
 *     userDescription: "Leaking faucet"
 *   }
 * });
 * ```
 */
export async function runTask<TInput = Record<string, unknown>, TOutput = Record<string, unknown>>(
  request: AITaskRequest<TInput>
): Promise<AITaskResponse<TOutput>> {
  const correlationId = request.flags?.correlationId || generateCorrelationId();
  const startTime = Date.now();
  const policyEvents: AIPolicyEvent[] = [];
  let usedFallback = false;

  // Get task definition
  const taskDef = getTaskDefinition<TInput, TOutput>(request.taskType);
  if (!taskDef) {
    return {
      success: false,
      outputJson: {} as TOutput,
      model: "mock",
      cost: 0,
      latencyMs: Date.now() - startTime,
      policyEvents: [{ type: "LOW_CONFIDENCE", severity: "critical", message: "Unknown task type" }],
      usedFallback: false,
      error: `Unknown task type: ${request.taskType}`,
      correlationId,
    };
  }

  // Create log entry builder
  const logBuilder = createLogEntryBuilder(
    correlationId,
    request.taskType,
    request.actorUserId,
    request.entityType,
    request.entityId
  );

  try {
    // Check if user has AI enabled (consent check)
    const actor = request.flags?.skipSafetyChecks ? "system" : await determineActorAsync(request.actorUserId);
    if (actor !== "system" && !request.flags?.skipSafetyChecks) {
      const aiEnabled = await isAIEnabledForUser(request.actorUserId);
      if (!aiEnabled) {
        policyEvents.push({
          type: "LOW_CONFIDENCE",
          severity: "info",
          message: "AI features disabled by user preference",
        });
        return createFallbackResponse(
          taskDef,
          request.inputs,
          correlationId,
          startTime,
          policyEvents,
          "AI features disabled"
        );
      }
    }

    // Check per-minute burst rate limit (in-memory)
    const rateLimit = checkRateLimit(request.actorUserId, request.taskType);
    if (!rateLimit.allowed) {
      policyEvents.push({
        type: "FRAUD_SIGNAL_VELOCITY",
        severity: "warning",
        message: `Rate limit exceeded. Reset in ${Math.ceil(rateLimit.resetIn / 1000)}s`,
      });
      return createFallbackResponse(
        taskDef,
        request.inputs,
        correlationId,
        startTime,
        policyEvents,
        "Rate limit exceeded"
      );
    }

    // Check daily rate limit (database-backed, per user role)
    if (actor !== "system") {
      const dailyRateLimit = await checkDailyRateLimit(
        request.actorUserId,
        actor as "customer" | "provider" | "admin"
      );
      if (!dailyRateLimit.allowed) {
        policyEvents.push({
          type: "FRAUD_SIGNAL_VELOCITY",
          severity: "warning",
          message: dailyRateLimit.reason || "Daily AI call limit reached",
        });
        return createFallbackResponse(
          taskDef,
          request.inputs,
          correlationId,
          startTime,
          policyEvents,
          dailyRateLimit.reason || "Daily limit exceeded"
        );
      }
    }

    // Check actor permissions (actor determined above)
    if (!canActorExecuteTask(actor, request.taskType)) {
      return {
        success: false,
        outputJson: {} as TOutput,
        model: "mock",
        cost: 0,
        latencyMs: Date.now() - startTime,
        policyEvents: [{ type: "LOW_CONFIDENCE", severity: "critical", message: "Unauthorized task" }],
        usedFallback: false,
        error: `Actor ${actor} not authorized for task ${request.taskType}`,
        correlationId,
      };
    }

    // Check input safety
    if (!request.flags?.skipSafetyChecks) {
      const inputText = JSON.stringify(request.inputs);
      const inputEvents = checkInputSafety(inputText);
      policyEvents.push(...inputEvents);

      // Check for emergency
      if (checkForEmergency(inputText)) {
        policyEvents.push({
          type: "SAFETY_FLAG_EMERGENCY",
          severity: "critical",
          message: "Emergency situation detected in input",
        });
      }
    }

    // Get provider
    const provider = request.flags?.forceProvider
      ? getProviderAdapter(request.flags.forceProvider)
      : getBestAvailableProvider();

    // Check if provider is available
    if (!provider.isAvailable()) {
      console.warn(`Provider ${provider.name} not available, using fallback`);
      return createFallbackResponse(
        taskDef,
        request.inputs,
        correlationId,
        startTime,
        policyEvents,
        "No AI provider available"
      );
    }

    // Check vision requirements
    if (taskDef.requiresVision && !provider.supportsVision()) {
      policyEvents.push({
        type: "LOW_CONFIDENCE",
        severity: "warning",
        message: "Provider does not support vision, using fallback",
      });
      return createFallbackResponse(
        taskDef,
        request.inputs,
        correlationId,
        startTime,
        policyEvents,
        "Vision not supported"
      );
    }

    // Select model
    const preferredModel = request.flags?.forceModel || taskDef.preferredModel;
    const model = mapModelToProvider(preferredModel, provider.name as AIProvider);

    // Build prompt
    const { system, user } = taskDef.buildPrompt(request.inputs);

    // Extract image URLs if present
    const imageUrls = extractImageUrls(request.inputs);

    // Execute with retry logic
    let lastError: Error | null = null;
    let response: string | null = null;
    let actualModel: AIModel = model;
    let inputTokens = 0;
    let outputTokens = 0;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const timeoutMs = request.flags?.timeoutMs || DEFAULT_TIMEOUT_MS;

        const completionPromise = provider.generateCompletion({
          model: attempt === 0 ? model : taskDef.fallbackModel,
          systemPrompt: system,
          userPrompt: user,
          imageUrls: taskDef.requiresVision ? imageUrls : undefined,
          maxTokens: taskDef.maxTokens,
          temperature: taskDef.temperature,
          jsonMode: true,
        });

        const result = await Promise.race([
          completionPromise,
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("Timeout")), timeoutMs)
          ),
        ]);

        response = result.content;
        actualModel = result.model;
        inputTokens = result.inputTokens;
        outputTokens = result.outputTokens;

        if (attempt > 0) {
          usedFallback = true;
          policyEvents.push({
            type: "FALLBACK_USED",
            severity: "info",
            message: `Used fallback model after ${attempt} retries`,
          });
        }

        break;
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        console.warn(`AI request attempt ${attempt + 1} failed:`, lastError.message);

        if (attempt === MAX_RETRIES) {
          console.error("All AI request attempts failed");
        }
      }
    }

    // If all retries failed, use fallback
    if (!response) {
      console.warn("All retries exhausted, using fallback response");
      return createFallbackResponse(
        taskDef,
        request.inputs,
        correlationId,
        startTime,
        policyEvents,
        lastError?.message || "All retries failed"
      );
    }

    // Parse and validate output
    let outputJson: TOutput;
    try {
      // Try to repair JSON if needed
      const repairedJson = repairJson(response);
      if (repairedJson !== response) {
        policyEvents.push({
          type: "JSON_REPAIR_NEEDED",
          severity: "info",
          message: "JSON was repaired before parsing",
        });
      }

      outputJson = taskDef.parseOutput(repairedJson);

      // Validate output
      if (!taskDef.validateOutput(outputJson)) {
        throw new Error("Output validation failed");
      }
    } catch (parseError) {
      console.warn("Failed to parse AI output, using fallback:", parseError);
      policyEvents.push({
        type: "JSON_REPAIR_NEEDED",
        severity: "warning",
        message: "Failed to parse output, using fallback",
      });
      return createFallbackResponse(
        taskDef,
        request.inputs,
        correlationId,
        startTime,
        policyEvents,
        "Failed to parse output"
      );
    }

    // Check output safety
    if (!request.flags?.skipSafetyChecks) {
      const outputText = JSON.stringify(outputJson);
      const outputEvents = checkOutputSafety(outputText);
      policyEvents.push(...outputEvents);

      // Sanitize if critical safety events
      if (outputEvents.some((e) => e.severity === "critical")) {
        const sanitizedText = sanitizeOutput(outputText);
        try {
          outputJson = JSON.parse(sanitizedText);
        } catch {
          // If sanitization breaks JSON, use fallback
          return createFallbackResponse(
            taskDef,
            request.inputs,
            correlationId,
            startTime,
            policyEvents,
            "Safety sanitization required"
          );
        }
      }
    }

    // Calculate cost
    const cost = provider.estimateCost(actualModel, inputTokens, outputTokens);

    // Track metrics
    const latencyMs = Date.now() - startTime;
    trackCost(request.actorUserId, cost, request.taskType);
    recordMetrics(request.taskType, latencyMs, true, usedFallback);

    // Log the task
    const logEntry = logBuilder.complete({
      provider: provider.name as AIProvider,
      model: actualModel,
      success: true,
      usedFallback,
      estimatedCost: cost,
      inputTokens,
      outputTokens,
      policyEvents: policyEvents.map((e) => e.type),
    });
    logAITask(logEntry);

    return {
      success: true,
      outputJson,
      model: actualModel,
      cost,
      latencyMs,
      policyEvents,
      usedFallback,
      correlationId,
      rawResponse: request.flags?.debug ? response : undefined,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("AI Gateway error:", errorMessage);

    // Log failure
    const logEntry = logBuilder.complete({
      provider: "none",
      model: "mock",
      success: false,
      usedFallback: true,
      estimatedCost: 0,
      policyEvents: policyEvents.map((e) => e.type),
      error: errorMessage,
    });
    logAITask(logEntry);

    // Record failure metrics
    recordMetrics(request.taskType, Date.now() - startTime, false, true);

    return createFallbackResponse(
      taskDef,
      request.inputs,
      correlationId,
      startTime,
      policyEvents,
      errorMessage
    );
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a fallback response using the task's fallback function
 */
function createFallbackResponse<TInput, TOutput>(
  taskDef: { getFallback: (input: TInput) => TOutput },
  inputs: TInput,
  correlationId: string,
  startTime: number,
  existingEvents: AIPolicyEvent[],
  errorMessage?: string
): AITaskResponse<TOutput> {
  existingEvents.push({
    type: "FALLBACK_USED",
    severity: "warning",
    message: errorMessage || "Using fallback response",
  });

  return {
    success: true, // Fallback is still a valid response
    outputJson: taskDef.getFallback(inputs),
    model: "mock",
    cost: 0,
    latencyMs: Date.now() - startTime,
    policyEvents: existingEvents,
    usedFallback: true,
    error: errorMessage,
    correlationId,
  };
}

/**
 * Extract image URLs from inputs
 */
function extractImageUrls(inputs: unknown): string[] {
  if (typeof inputs !== "object" || inputs === null) return [];

  const obj = inputs as Record<string, unknown>;

  // Check common field names
  if (Array.isArray(obj.imageUrls)) {
    return obj.imageUrls.filter((url): url is string => typeof url === "string");
  }
  if (typeof obj.imageUrl === "string") {
    return [obj.imageUrl];
  }

  return [];
}

/**
 * Attempt to repair malformed JSON
 */
function repairJson(text: string): string {
  let repaired = text.trim();

  // Remove markdown code blocks if present
  if (repaired.startsWith("```json")) {
    repaired = repaired.slice(7);
  } else if (repaired.startsWith("```")) {
    repaired = repaired.slice(3);
  }
  if (repaired.endsWith("```")) {
    repaired = repaired.slice(0, -3);
  }

  repaired = repaired.trim();

  // Try to extract JSON from text
  const jsonMatch = repaired.match(/\{[\s\S]*\}/);
  if (jsonMatch) {
    repaired = jsonMatch[0];
  }

  return repaired;
}

/**
 * Determine actor type from user ID (sync version - uses defaults)
 * @deprecated Use determineActorAsync for database-backed role lookup
 */
function determineActor(
  userId: string
): "customer" | "provider" | "admin" | "system" {
  // System calls use a special prefix
  if (userId.startsWith("system-")) return "system";

  // Default to customer (most restrictive)
  return "customer";
}

/**
 * Determine actor type from user ID by looking up role in database
 */
async function determineActorAsync(
  userId: string
): Promise<"customer" | "provider" | "admin" | "system"> {
  // System calls use a special prefix
  if (userId.startsWith("system-")) return "system";

  try {
    // Dynamic import to avoid circular dependencies
    const { createClient } = await import("@/lib/supabase/server");
    const supabase = await createClient();

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single() as { data: { role: string } | null };

    if (profile?.role === "admin") return "admin";
    if (profile?.role === "provider") return "provider";
    if (profile?.role === "handyman") return "provider"; // Treat handymen as providers for AI purposes

    return "customer";
  } catch (error) {
    console.warn("Failed to determine actor role, defaulting to customer:", error);
    return "customer";
  }
}

// ============================================================================
// Convenience Export
// ============================================================================

export const ai = {
  runTask,
};

export default ai;
