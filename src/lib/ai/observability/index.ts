/**
 * AI Observability Module
 *
 * Logging, metrics, and cost tracking for AI operations.
 */

import type {
  AILogEntry,
  AITaskType,
  AIEntityType,
  AIProvider,
  AIModel,
  AIPolicyEventType,
} from "../types";

// ============================================================================
// Correlation ID Generation
// ============================================================================

/**
 * Generate a new correlation ID
 */
export function generateCorrelationId(): string {
  // Use timestamp + random for sortable, unique IDs
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `ai-${timestamp}-${random}`;
}

// ============================================================================
// Logging
// ============================================================================

/**
 * Log an AI task execution
 */
export function logAITask(entry: AILogEntry): void {
  // Structure the log for easy parsing
  const logData = {
    ...entry,
    // Add environment info
    env: process.env.NODE_ENV || "development",
    service: "regularupkeep-ai",
  };

  // In production, this could go to:
  // - CloudWatch Logs
  // - Datadog
  // - Elasticsearch
  // - Custom logging service

  if (entry.success) {
    console.log("[AI_TASK_SUCCESS]", JSON.stringify(logData));
  } else {
    console.error("[AI_TASK_FAILURE]", JSON.stringify(logData));
  }

  // Log policy events separately for monitoring
  if (entry.policyEvents.length > 0) {
    console.warn("[AI_POLICY_EVENTS]", JSON.stringify({
      correlationId: entry.correlationId,
      taskType: entry.taskType,
      events: entry.policyEvents,
    }));
  }
}

/**
 * Create a log entry builder for easier construction
 */
export function createLogEntryBuilder(
  correlationId: string,
  taskType: AITaskType,
  actorUserId: string,
  entityType: AIEntityType,
  entityId: string
) {
  const startTime = Date.now();

  return {
    startTime,
    correlationId,

    complete(params: {
      provider: AIProvider;
      model: AIModel;
      success: boolean;
      usedFallback: boolean;
      estimatedCost: number;
      inputTokens?: number;
      outputTokens?: number;
      policyEvents: AIPolicyEventType[];
      error?: string;
    }): AILogEntry {
      return {
        timestamp: new Date().toISOString(),
        correlationId,
        taskType,
        actorUserId,
        entityType,
        entityId,
        provider: params.provider,
        model: params.model,
        latencyMs: Date.now() - startTime,
        success: params.success,
        usedFallback: params.usedFallback,
        estimatedCost: params.estimatedCost,
        inputTokens: params.inputTokens,
        outputTokens: params.outputTokens,
        policyEvents: params.policyEvents,
        error: params.error,
      };
    },
  };
}

// ============================================================================
// Cost Tracking
// ============================================================================

// In-memory cost aggregation (in production, use Redis or database)
const costTracker = new Map<string, { totalCost: number; taskCount: number }>();

/**
 * Track cost for a user/entity
 */
export function trackCost(
  actorUserId: string,
  cost: number,
  taskType: AITaskType
): void {
  const key = `${actorUserId}:${new Date().toISOString().split("T")[0]}`; // Daily key
  const current = costTracker.get(key) || { totalCost: 0, taskCount: 0 };

  costTracker.set(key, {
    totalCost: current.totalCost + cost,
    taskCount: current.taskCount + 1,
  });

  // Log high cost events
  if (cost > 0.01) {
    console.log("[AI_HIGH_COST]", JSON.stringify({
      actorUserId,
      cost,
      taskType,
      dailyTotal: current.totalCost + cost,
    }));
  }
}

/**
 * Get daily cost for a user
 */
export function getDailyCost(actorUserId: string): number {
  const key = `${actorUserId}:${new Date().toISOString().split("T")[0]}`;
  return costTracker.get(key)?.totalCost || 0;
}

/**
 * Check if user is within cost budget
 */
export function isWithinBudget(
  actorUserId: string,
  dailyBudget: number = 1.0 // $1 default daily budget per user
): boolean {
  return getDailyCost(actorUserId) < dailyBudget;
}

// ============================================================================
// Metrics
// ============================================================================

// Simple in-memory metrics (in production, use Prometheus/Datadog)
const metrics = {
  taskCounts: new Map<AITaskType, number>(),
  errorCounts: new Map<AITaskType, number>(),
  fallbackCounts: new Map<AITaskType, number>(),
  latencySum: new Map<AITaskType, number>(),
  latencyCount: new Map<AITaskType, number>(),
};

/**
 * Record task metrics
 */
export function recordMetrics(
  taskType: AITaskType,
  latencyMs: number,
  success: boolean,
  usedFallback: boolean
): void {
  // Task count
  metrics.taskCounts.set(
    taskType,
    (metrics.taskCounts.get(taskType) || 0) + 1
  );

  // Error count
  if (!success) {
    metrics.errorCounts.set(
      taskType,
      (metrics.errorCounts.get(taskType) || 0) + 1
    );
  }

  // Fallback count
  if (usedFallback) {
    metrics.fallbackCounts.set(
      taskType,
      (metrics.fallbackCounts.get(taskType) || 0) + 1
    );
  }

  // Latency
  metrics.latencySum.set(
    taskType,
    (metrics.latencySum.get(taskType) || 0) + latencyMs
  );
  metrics.latencyCount.set(
    taskType,
    (metrics.latencyCount.get(taskType) || 0) + 1
  );
}

/**
 * Get metrics summary
 */
export function getMetricsSummary(): Record<string, unknown> {
  const summary: Record<string, unknown> = {};

  for (const taskType of metrics.taskCounts.keys()) {
    const count = metrics.taskCounts.get(taskType) || 0;
    const errors = metrics.errorCounts.get(taskType) || 0;
    const fallbacks = metrics.fallbackCounts.get(taskType) || 0;
    const latencySum = metrics.latencySum.get(taskType) || 0;
    const latencyCount = metrics.latencyCount.get(taskType) || 1;

    summary[taskType] = {
      totalTasks: count,
      errorRate: count > 0 ? (errors / count) * 100 : 0,
      fallbackRate: count > 0 ? (fallbacks / count) * 100 : 0,
      avgLatencyMs: latencySum / latencyCount,
    };
  }

  return summary;
}

// ============================================================================
// Rate Limiting
// ============================================================================

const rateLimits = new Map<string, { count: number; resetTime: number }>();

/**
 * Check and update rate limit for a user
 */
export function checkRateLimit(
  actorUserId: string,
  taskType: AITaskType,
  maxRequests: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetIn: number } {
  const key = `${actorUserId}:${taskType}`;
  const now = Date.now();

  const current = rateLimits.get(key);

  if (!current || now > current.resetTime) {
    rateLimits.set(key, { count: 1, resetTime: now + windowMs });
    return { allowed: true, remaining: maxRequests - 1, resetIn: windowMs };
  }

  if (current.count >= maxRequests) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: current.resetTime - now,
    };
  }

  current.count++;
  return {
    allowed: true,
    remaining: maxRequests - current.count,
    resetIn: current.resetTime - now,
  };
}
