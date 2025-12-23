/**
 * Task Registry
 *
 * Central registry of all AI tasks with their definitions.
 */

import type { AITaskType, TaskDefinition } from "../types";

// Import all tasks
import {
  intakeClassifyTask,
  intakeFollowupTask,
  providerBriefTask,
  mediaQualityTask,
} from "./intake";
import {
  providerEstimateTask,
  providerMessageTask,
  invoiceNarrativeTask,
} from "./provider";
import { disputeTimelineTask, fraudSignalTask } from "./admin";
import { crmNextActionTask } from "./crm";
import { maintenancePlanTask } from "./homeowner";
import { sponsorTileCopyTask } from "./sponsor";

// ============================================================================
// Task Registry Map
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const taskRegistry = new Map<AITaskType, TaskDefinition<any, any>>();

// Register all tasks
taskRegistry.set("INTAKE_CLASSIFY_AND_SUMMARIZE", intakeClassifyTask);
taskRegistry.set("INTAKE_FOLLOWUP_QUESTIONS", intakeFollowupTask);
taskRegistry.set("PROVIDER_BRIEF_GENERATE", providerBriefTask);
taskRegistry.set("MEDIA_QUALITY_CHECK", mediaQualityTask);
taskRegistry.set("PROVIDER_ESTIMATE_DRAFT", providerEstimateTask);
taskRegistry.set("PROVIDER_MESSAGE_DRAFT", providerMessageTask);
taskRegistry.set("INVOICE_NARRATIVE_DRAFT", invoiceNarrativeTask);
taskRegistry.set("DISPUTE_TIMELINE_SUMMARY", disputeTimelineTask);
taskRegistry.set("FRAUD_SIGNAL_REFERRALS", fraudSignalTask);
taskRegistry.set("CRM_NEXT_BEST_ACTION", crmNextActionTask);
taskRegistry.set("MAINTENANCE_PLAN_SUGGEST", maintenancePlanTask);
taskRegistry.set("SPONSOR_TILE_COPY", sponsorTileCopyTask);

// ============================================================================
// Registry Functions
// ============================================================================

/**
 * Get a task definition by type
 */
export function getTaskDefinition<TInput = unknown, TOutput = unknown>(
  taskType: AITaskType
): TaskDefinition<TInput, TOutput> | undefined {
  return taskRegistry.get(taskType) as TaskDefinition<TInput, TOutput> | undefined;
}

/**
 * Check if a task type exists
 */
export function isValidTaskType(taskType: string): taskType is AITaskType {
  return taskRegistry.has(taskType as AITaskType);
}

/**
 * Get all registered task types
 */
export function getAllTaskTypes(): AITaskType[] {
  return Array.from(taskRegistry.keys());
}

/**
 * Get task types by actor permission
 */
export function getTaskTypesForActor(
  actor: "customer" | "provider" | "admin" | "system"
): AITaskType[] {
  return Array.from(taskRegistry.entries())
    .filter(([, def]) => def.allowedActors.includes(actor))
    .map(([type]) => type);
}

/**
 * Check if an actor can execute a task
 */
export function canActorExecuteTask(
  actor: "customer" | "provider" | "admin" | "system",
  taskType: AITaskType
): boolean {
  const task = taskRegistry.get(taskType);
  return task?.allowedActors.includes(actor) || false;
}

/**
 * Get tasks that require vision (image input)
 */
export function getVisionTasks(): AITaskType[] {
  return Array.from(taskRegistry.entries())
    .filter(([, def]) => def.requiresVision)
    .map(([type]) => type);
}

// ============================================================================
// Exports
// ============================================================================

export {
  // Intake
  intakeClassifyTask,
  intakeFollowupTask,
  providerBriefTask,
  mediaQualityTask,
  // Provider
  providerEstimateTask,
  providerMessageTask,
  invoiceNarrativeTask,
  // Admin
  disputeTimelineTask,
  fraudSignalTask,
  // CRM
  crmNextActionTask,
  // Homeowner
  maintenancePlanTask,
  // Sponsor
  sponsorTileCopyTask,
};
