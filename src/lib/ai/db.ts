/**
 * AI Database Helpers
 *
 * Functions for persisting AI jobs, outputs, feedback, and policy events.
 *
 * Note: These functions use type assertions because the AI tables are defined
 * in a separate migration and the Supabase client may not have them in its
 * generated types yet. Once the migration is applied and types are regenerated,
 * these can be updated to use strict typing.
 */

import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AITaskType,
  AIEntityType,
  AIProvider,
  AIModel,
  AIPolicyEvent,
  AITaskResponse,
} from "./types";

// Helper to get an untyped client for AI tables (until types are regenerated)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

// ============================================================================
// Types
// ============================================================================

export type AIJobStatus = "queued" | "processing" | "success" | "failed" | "cached";

export interface AIJob {
  id: string;
  task_type: string;
  actor_user_id: string;
  entity_type: string;
  entity_id: string | null;
  status: AIJobStatus;
  provider: string | null;
  model: string | null;
  latency_ms: number | null;
  cost_estimate_cents: number;
  input_tokens: number | null;
  output_tokens: number | null;
  input_hash: string | null;
  used_cache: boolean;
  cache_source_job_id: string | null;
  correlation_id: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  completed_at: string | null;
  metadata: Record<string, unknown>;
}

export interface AIOutput {
  id: string;
  ai_job_id: string;
  entity_type: string;
  entity_id: string | null;
  output_json: Record<string, unknown>;
  version: string;
  is_current: boolean;
  superseded_by: string | null;
  created_at: string;
  expires_at: string | null;
}

export interface AIFeedback {
  id: string;
  ai_job_id: string;
  ai_output_id: string | null;
  actor_user_id: string;
  rating: "up" | "down";
  reason_code: string | null;
  comment: string | null;
  context_snapshot: Record<string, unknown> | null;
  created_at: string;
}

export interface AIPolicyEventRecord {
  id: string;
  ai_job_id: string;
  event_type: string;
  severity: "info" | "warning" | "critical";
  message: string | null;
  metadata: Record<string, unknown>;
  action_taken: string | null;
  created_at: string;
}

export interface CachedOutput {
  job_id: string;
  output_json: Record<string, unknown>;
  created_at: string;
}

// ============================================================================
// Input Hashing
// ============================================================================

/**
 * Generate a hash of the inputs for caching
 */
export function generateInputHash(inputs: unknown): string {
  // Normalize inputs by sorting keys
  const normalized = JSON.stringify(inputs, Object.keys(inputs as object).sort());
  return createHash("sha256").update(normalized).digest("hex");
}

// ============================================================================
// Job Management
// ============================================================================

/**
 * Create a new AI job record
 * Returns the job ID if new, or cached job info if cache hit
 */
export async function createAIJob(params: {
  taskType: AITaskType;
  actorUserId: string;
  entityType: AIEntityType;
  entityId: string | null;
  inputs: unknown;
  correlationId?: string;
  metadata?: Record<string, unknown>;
}): Promise<{ jobId: string; cached: boolean; cachedOutput?: Record<string, unknown> }> {
  const supabase = await createClient() as AnySupabaseClient;

  const inputHash = generateInputHash(params.inputs);

  // First check for cached result
  const { data: cached } = await supabase.rpc("get_cached_ai_output", {
    p_task_type: params.taskType,
    p_entity_type: params.entityType,
    p_entity_id: params.entityId,
    p_input_hash: inputHash,
  });

  if (cached && cached.length > 0) {
    // Create a cached job entry
    const { data: jobId } = await supabase.rpc("create_ai_job", {
      p_task_type: params.taskType,
      p_actor_user_id: params.actorUserId,
      p_entity_type: params.entityType,
      p_entity_id: params.entityId,
      p_input_hash: inputHash,
      p_correlation_id: params.correlationId || null,
      p_metadata: params.metadata || {},
    });

    return {
      jobId,
      cached: true,
      cachedOutput: (cached as CachedOutput[])[0].output_json,
    };
  }

  // Create new job
  const { data: jobId, error } = await supabase.rpc("create_ai_job", {
    p_task_type: params.taskType,
    p_actor_user_id: params.actorUserId,
    p_entity_type: params.entityType,
    p_entity_id: params.entityId,
    p_input_hash: inputHash,
    p_correlation_id: params.correlationId || null,
    p_metadata: params.metadata || {},
  });

  if (error) {
    console.error("Failed to create AI job:", error);
    throw new Error("Failed to create AI job record");
  }

  return { jobId, cached: false };
}

/**
 * Update job status to processing
 */
export async function markJobProcessing(jobId: string): Promise<void> {
  const supabase = await createClient() as AnySupabaseClient;

  await supabase
    .from("ai_jobs")
    .update({ status: "processing" })
    .eq("id", jobId);
}

/**
 * Complete an AI job with results
 */
export async function completeAIJob(params: {
  jobId: string;
  status: "success" | "failed";
  provider?: AIProvider;
  model?: AIModel;
  latencyMs?: number;
  costEstimateCents?: number;
  inputTokens?: number;
  outputTokens?: number;
  errorMessage?: string;
}): Promise<void> {
  const supabase = await createClient() as AnySupabaseClient;

  const { error } = await supabase.rpc("complete_ai_job", {
    p_job_id: params.jobId,
    p_status: params.status,
    p_provider: params.provider || null,
    p_model: params.model || null,
    p_latency_ms: params.latencyMs || null,
    p_cost_estimate_cents: params.costEstimateCents || 0,
    p_input_tokens: params.inputTokens || null,
    p_output_tokens: params.outputTokens || null,
    p_error_message: params.errorMessage || null,
  });

  if (error) {
    console.error("Failed to complete AI job:", error);
  }
}

// ============================================================================
// Output Management
// ============================================================================

/**
 * Save AI output to database
 */
export async function saveAIOutput(params: {
  jobId: string;
  entityType: AIEntityType;
  entityId: string | null;
  outputJson: Record<string, unknown>;
  version?: string;
}): Promise<string> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data: outputId, error } = await supabase.rpc("save_ai_output", {
    p_job_id: params.jobId,
    p_entity_type: params.entityType,
    p_entity_id: params.entityId,
    p_output_json: params.outputJson,
    p_version: params.version || "1.0",
  });

  if (error) {
    console.error("Failed to save AI output:", error);
    throw new Error("Failed to save AI output");
  }

  return outputId;
}

/**
 * Get current AI output for an entity
 */
export async function getCurrentAIOutput(
  entityType: AIEntityType,
  entityId: string
): Promise<AIOutput | null> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from("ai_outputs")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .eq("is_current", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data as AIOutput;
}

/**
 * Get AI output history for an entity
 */
export async function getAIOutputHistory(
  entityType: AIEntityType,
  entityId: string,
  limit: number = 10
): Promise<AIOutput[]> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from("ai_outputs")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("Failed to get AI output history:", error);
    return [];
  }

  return data as AIOutput[];
}

// ============================================================================
// Policy Event Logging
// ============================================================================

/**
 * Log policy events from an AI task
 */
export async function logPolicyEvents(
  jobId: string,
  events: AIPolicyEvent[]
): Promise<void> {
  const supabase = await createClient() as AnySupabaseClient;

  for (const event of events) {
    const { error } = await supabase.rpc("log_ai_policy_event", {
      p_job_id: jobId,
      p_event_type: event.type,
      p_severity: event.severity,
      p_message: event.message || null,
      p_metadata: event.metadata || {},
      p_action_taken: "logged",
    });

    if (error) {
      console.error("Failed to log policy event:", error);
    }
  }
}

// ============================================================================
// Feedback
// ============================================================================

/**
 * Submit feedback for an AI output
 */
export async function submitAIFeedback(params: {
  jobId: string;
  outputId?: string;
  actorUserId: string;
  rating: "up" | "down";
  reasonCode?: string;
  comment?: string;
  contextSnapshot?: Record<string, unknown>;
}): Promise<string> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from("ai_feedback")
    .insert({
      ai_job_id: params.jobId,
      ai_output_id: params.outputId || null,
      actor_user_id: params.actorUserId,
      rating: params.rating,
      reason_code: params.reasonCode || null,
      comment: params.comment || null,
      context_snapshot: params.contextSnapshot || null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to submit AI feedback:", error);
    throw new Error("Failed to submit feedback");
  }

  return data.id;
}

/**
 * Get feedback stats for a task type
 */
export async function getFeedbackStats(taskType: AITaskType): Promise<{
  total: number;
  upvotes: number;
  downvotes: number;
  upvoteRate: number;
}> {
  const supabase = await createClient() as AnySupabaseClient;

  const { data, error } = await supabase
    .from("ai_feedback")
    .select("rating, ai_jobs!inner(task_type)")
    .eq("ai_jobs.task_type", taskType);

  if (error || !data) {
    return { total: 0, upvotes: 0, downvotes: 0, upvoteRate: 0 };
  }

  interface FeedbackRow {
    rating: "up" | "down";
  }

  const upvotes = (data as FeedbackRow[]).filter((f) => f.rating === "up").length;
  const downvotes = (data as FeedbackRow[]).filter((f) => f.rating === "down").length;
  const total = data.length;

  return {
    total,
    upvotes,
    downvotes,
    upvoteRate: total > 0 ? upvotes / total : 0,
  };
}

// ============================================================================
// Full Task Persistence
// ============================================================================

/**
 * Persist a complete AI task response to the database
 * This is the main function to call after ai.runTask() completes
 */
export async function persistAITaskResponse<TOutput = Record<string, unknown>>(params: {
  taskType: AITaskType;
  actorUserId: string;
  entityType: AIEntityType;
  entityId: string | null;
  inputs: unknown;
  response: AITaskResponse<TOutput>;
}): Promise<{ jobId: string; outputId?: string }> {
  // Create job record
  const { jobId, cached, cachedOutput } = await createAIJob({
    taskType: params.taskType,
    actorUserId: params.actorUserId,
    entityType: params.entityType,
    entityId: params.entityId,
    inputs: params.inputs,
    correlationId: params.response.correlationId,
  });

  // If cached, we're done
  if (cached && cachedOutput) {
    return { jobId };
  }

  // Mark as processing (already done by createAIJob if not cached)
  await markJobProcessing(jobId);

  // Complete the job
  await completeAIJob({
    jobId,
    status: params.response.success ? "success" : "failed",
    provider: params.response.usedFallback ? "none" : undefined,
    model: params.response.model,
    latencyMs: params.response.latencyMs,
    costEstimateCents: Math.round(params.response.cost * 100),
    errorMessage: params.response.error,
  });

  // Save output if successful
  let outputId: string | undefined;
  if (params.response.success && params.entityId) {
    outputId = await saveAIOutput({
      jobId,
      entityType: params.entityType,
      entityId: params.entityId,
      outputJson: params.response.outputJson as Record<string, unknown>,
    });
  }

  // Log policy events
  if (params.response.policyEvents.length > 0) {
    await logPolicyEvents(jobId, params.response.policyEvents);
  }

  return { jobId, outputId };
}
