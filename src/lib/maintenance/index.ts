/**
 * Maintenance Calendar Library
 *
 * Core utilities for maintenance plan generation, task completion, and request creation.
 */

import { SupabaseClient } from "@supabase/supabase-js";
import type {
  MaintenanceFrequencyType,
  PropertyMaintenanceTask,
  PropertyMaintenanceTaskWithProperty,
  MaintenanceTaskCompletion,
  MaintenanceTaskCompletionWithUser,
  MaintenanceAttachment,
  TaskListResponse,
  CalendarTask,
  CalendarMonth,
} from "@/types/database";

// ============================================================================
// DATE UTILITIES
// ============================================================================

/**
 * Compute the next due date based on frequency type and interval
 */
export function computeNextDueDate(
  frequencyType: MaintenanceFrequencyType,
  frequencyInterval: number,
  suggestedMonths: number[] | null,
  fromDate: Date = new Date()
): Date | null {
  const date = new Date(fromDate);

  switch (frequencyType) {
    case "weekly":
      date.setDate(date.getDate() + frequencyInterval * 7);
      return date;

    case "monthly":
      date.setMonth(date.getMonth() + frequencyInterval);
      return date;

    case "seasonal":
      if (suggestedMonths && suggestedMonths.length > 0) {
        const currentMonth = date.getMonth() + 1; // 1-indexed
        let year = date.getFullYear();

        // Find next suggested month
        const nextMonth = suggestedMonths.find((m) => m > currentMonth);

        if (nextMonth) {
          return new Date(year, nextMonth - 1, 1);
        } else {
          // Wrap to next year
          return new Date(year + 1, suggestedMonths[0] - 1, 1);
        }
      }
      // Default: 3 months
      date.setMonth(date.getMonth() + 3);
      return date;

    case "annual":
      date.setFullYear(date.getFullYear() + frequencyInterval);
      return date;

    case "multi_year":
      date.setFullYear(date.getFullYear() + frequencyInterval);
      return date;

    case "one_time":
      return null; // No next date for one-time tasks

    default:
      date.setFullYear(date.getFullYear() + 1);
      return date;
  }
}

/**
 * Format a due date for display
 */
export function formatDueDate(date: string | null): string {
  if (!date) return "Not scheduled";

  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const taskDate = new Date(d);
  taskDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (taskDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    if (absDays === 1) return "Yesterday";
    if (absDays < 7) return `${absDays} days overdue`;
    if (absDays < 30) return `${Math.floor(absDays / 7)} weeks overdue`;
    return `${Math.floor(absDays / 30)} months overdue`;
  }

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `In ${diffDays} days`;
  if (diffDays < 30) return `In ${Math.ceil(diffDays / 7)} weeks`;
  if (diffDays < 365) return `In ${Math.ceil(diffDays / 30)} months`;

  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

/**
 * Get task status based on due date
 */
export function getTaskStatus(
  nextDueDate: string | null,
  lastCompletedAt: string | null
): "overdue" | "due" | "upcoming" | "completed" {
  if (!nextDueDate) {
    return lastCompletedAt ? "completed" : "upcoming";
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dueDate = new Date(nextDueDate);
  dueDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor(
    (dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffDays < 0) return "overdue";
  if (diffDays <= 7) return "due"; // Due within a week
  return "upcoming";
}

/**
 * Get frequency type display label
 */
export function getFrequencyLabel(
  type: MaintenanceFrequencyType,
  interval: number
): string {
  switch (type) {
    case "weekly":
      return interval === 1 ? "Weekly" : `Every ${interval} weeks`;
    case "monthly":
      return interval === 1 ? "Monthly" : `Every ${interval} months`;
    case "seasonal":
      return "Seasonal";
    case "annual":
      return interval === 1 ? "Annual" : `Every ${interval} years`;
    case "multi_year":
      return `Every ${interval} years`;
    case "one_time":
      return "One-time";
    default:
      return type;
  }
}

// ============================================================================
// TASK QUERIES
// ============================================================================

/**
 * Get all tasks for a property, organized by status
 */
export async function getPropertyTasks(
  supabase: SupabaseClient,
  propertyId: string
): Promise<TaskListResponse> {
  const { data: tasks, error } = await supabase
    .from("property_maintenance_tasks")
    .select(`
      *,
      property:properties(id, nickname, address_line1, city, state),
      last_completed_by_profile:profiles!property_maintenance_tasks_last_completed_by_fkey(full_name, avatar_url)
    `)
    .eq("property_id", propertyId)
    .eq("status", "active")
    .order("next_due_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[Maintenance] Error fetching tasks:", error);
    throw new Error("Failed to fetch maintenance tasks");
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekFromNow = new Date(today);
  weekFromNow.setDate(weekFromNow.getDate() + 7);

  const result: TaskListResponse = {
    overdue: [],
    due_soon: [],
    upcoming: [],
    completed: [],
  };

  for (const task of tasks || []) {
    const status = getTaskStatus(task.next_due_date, task.last_completed_at);

    switch (status) {
      case "overdue":
        result.overdue.push(task);
        break;
      case "due":
        result.due_soon.push(task);
        break;
      case "upcoming":
        result.upcoming.push(task);
        break;
      case "completed":
        result.completed.push(task);
        break;
    }
  }

  return result;
}

/**
 * Get tasks for multiple properties
 */
export async function getTasksForProperties(
  supabase: SupabaseClient,
  propertyIds: string[]
): Promise<TaskListResponse> {
  const { data: tasks, error } = await supabase
    .from("property_maintenance_tasks")
    .select(`
      *,
      property:properties(id, nickname, address_line1, city, state),
      last_completed_by_profile:profiles!property_maintenance_tasks_last_completed_by_fkey(full_name, avatar_url)
    `)
    .in("property_id", propertyIds)
    .eq("status", "active")
    .order("next_due_date", { ascending: true, nullsFirst: false });

  if (error) {
    console.error("[Maintenance] Error fetching tasks:", error);
    throw new Error("Failed to fetch maintenance tasks");
  }

  const result: TaskListResponse = {
    overdue: [],
    due_soon: [],
    upcoming: [],
    completed: [],
  };

  for (const task of tasks || []) {
    const status = getTaskStatus(task.next_due_date, task.last_completed_at);

    switch (status) {
      case "overdue":
        result.overdue.push(task);
        break;
      case "due":
        result.due_soon.push(task);
        break;
      case "upcoming":
        result.upcoming.push(task);
        break;
      case "completed":
        result.completed.push(task);
        break;
    }
  }

  return result;
}

/**
 * Get task by ID with full details
 */
export async function getTaskById(
  supabase: SupabaseClient,
  taskId: string
): Promise<PropertyMaintenanceTaskWithProperty | null> {
  const { data, error } = await supabase
    .from("property_maintenance_tasks")
    .select(`
      *,
      property:properties(id, nickname, address_line1, city, state),
      last_completed_by_profile:profiles!property_maintenance_tasks_last_completed_by_fkey(full_name, avatar_url)
    `)
    .eq("id", taskId)
    .single();

  if (error) {
    if (error.code === "PGRST116") return null;
    console.error("[Maintenance] Error fetching task:", error);
    throw new Error("Failed to fetch task");
  }

  return data;
}

/**
 * Get completion history for a task
 */
export async function getTaskCompletions(
  supabase: SupabaseClient,
  taskId: string
): Promise<MaintenanceTaskCompletionWithUser[]> {
  const { data, error } = await supabase
    .from("maintenance_task_completions")
    .select(`
      *,
      completed_by_profile:profiles!maintenance_task_completions_completed_by_fkey(full_name, avatar_url, role),
      related_request:service_requests(request_number, title, status)
    `)
    .eq("property_task_id", taskId)
    .order("completed_at", { ascending: false });

  if (error) {
    console.error("[Maintenance] Error fetching completions:", error);
    throw new Error("Failed to fetch task history");
  }

  return data || [];
}

// ============================================================================
// PLAN GENERATION
// ============================================================================

/**
 * Generate maintenance plan for a property from templates
 */
export async function generatePropertyPlan(
  supabase: SupabaseClient,
  propertyId: string
): Promise<{ count: number; message: string }> {
  // Get all active templates
  const { data: templates, error: templatesError } = await supabase
    .from("maintenance_task_templates")
    .select("*")
    .eq("is_active", true);

  if (templatesError) {
    console.error("[Maintenance] Error fetching templates:", templatesError);
    throw new Error("Failed to fetch templates");
  }

  if (!templates || templates.length === 0) {
    return { count: 0, message: "No active templates found" };
  }

  // Check existing tasks for this property
  const { data: existingTasks } = await supabase
    .from("property_maintenance_tasks")
    .select("template_id")
    .eq("property_id", propertyId);

  const existingTemplateIds = new Set(
    (existingTasks || []).map((t) => t.template_id).filter(Boolean)
  );

  // Create tasks for templates not already assigned
  const newTasks = templates
    .filter((t) => !existingTemplateIds.has(t.id))
    .map((template) => ({
      property_id: propertyId,
      template_id: template.id,
      title: template.title,
      description: template.description,
      category: template.category,
      frequency_type: template.frequency_type,
      frequency_interval: template.frequency_interval,
      suggested_months: template.suggested_months,
      priority: template.priority,
      estimated_minutes: template.estimated_minutes,
      skill_level: template.skill_level,
      tags: template.tags,
      default_assignee: template.default_assignee,
      instructions: template.instructions,
      pro_tips: template.pro_tips,
      warning_notes: template.warning_notes,
      next_due_date: computeNextDueDate(
        template.frequency_type,
        template.frequency_interval,
        template.suggested_months
      )?.toISOString().split("T")[0],
    }));

  if (newTasks.length === 0) {
    return { count: 0, message: "All templates already assigned to this property" };
  }

  const { error: insertError } = await supabase
    .from("property_maintenance_tasks")
    .insert(newTasks);

  if (insertError) {
    console.error("[Maintenance] Error creating tasks:", insertError);
    throw new Error("Failed to create maintenance tasks");
  }

  return {
    count: newTasks.length,
    message: `Added ${newTasks.length} maintenance tasks to property`,
  };
}

// ============================================================================
// TASK COMPLETION
// ============================================================================

/**
 * Mark a task as completed and schedule the next due date
 */
export async function markTaskComplete(
  supabase: SupabaseClient,
  taskId: string,
  userId: string,
  options: {
    notes?: string;
    costCents?: number;
    attachments?: MaintenanceAttachment[];
    relatedRequestId?: string;
    completionSource?: "manual" | "provider_job" | "auto";
  } = {}
): Promise<{ completion: MaintenanceTaskCompletion; nextDueDate: string | null }> {
  // Get the task
  const { data: task, error: taskError } = await supabase
    .from("property_maintenance_tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (taskError || !task) {
    throw new Error("Task not found");
  }

  const now = new Date();

  // Create completion record
  const { data: completion, error: completionError } = await supabase
    .from("maintenance_task_completions")
    .insert({
      property_task_id: taskId,
      completed_by: userId,
      completed_at: now.toISOString(),
      notes: options.notes || null,
      cost_cents: options.costCents || 0,
      attachments: options.attachments || [],
      related_request_id: options.relatedRequestId || null,
      completion_source: options.completionSource || "manual",
    })
    .select()
    .single();

  if (completionError) {
    console.error("[Maintenance] Error creating completion:", completionError);
    throw new Error("Failed to record completion");
  }

  // Calculate next due date
  const nextDueDate = computeNextDueDate(
    task.frequency_type,
    task.frequency_interval,
    task.suggested_months,
    now
  );

  // Update task with completion info and next due date
  const { error: updateError } = await supabase
    .from("property_maintenance_tasks")
    .update({
      last_completed_at: now.toISOString(),
      last_completed_by: userId,
      next_due_date: nextDueDate?.toISOString().split("T")[0] || null,
    })
    .eq("id", taskId);

  if (updateError) {
    console.error("[Maintenance] Error updating task:", updateError);
    throw new Error("Failed to update task");
  }

  return {
    completion,
    nextDueDate: nextDueDate?.toISOString().split("T")[0] || null,
  };
}

// ============================================================================
// REQUEST CREATION
// ============================================================================

/**
 * Create a service request from selected maintenance tasks
 */
export async function createRequestFromTasks(
  supabase: SupabaseClient,
  propertyId: string,
  taskIds: string[],
  customerId: string,
  options: {
    title: string;
    description?: string;
    urgency?: "emergency" | "urgent" | "standard" | "flexible";
    preferredDate?: string;
    preferredTimeStart?: string;
    preferredTimeEnd?: string;
    photos?: string[];
  }
): Promise<{ requestId: string; requestNumber: string; linkedCount: number }> {
  // Get the tasks to build description
  const { data: tasks, error: tasksError } = await supabase
    .from("property_maintenance_tasks")
    .select("*")
    .in("id", taskIds);

  if (tasksError) {
    console.error("[Maintenance] Error fetching tasks:", tasksError);
    throw new Error("Failed to fetch tasks");
  }

  if (!tasks || tasks.length === 0) {
    throw new Error("No valid tasks found");
  }

  // Determine category from most common task category
  const categoryCounts: Record<string, number> = {};
  for (const task of tasks) {
    categoryCounts[task.category] = (categoryCounts[task.category] || 0) + 1;
  }
  const primaryCategory = Object.entries(categoryCounts).sort(
    (a, b) => b[1] - a[1]
  )[0][0];

  // Build description if not provided
  const description =
    options.description ||
    `Maintenance tasks to be completed:\n\n${tasks
      .map((t) => `• ${t.title}${t.description ? `: ${t.description}` : ""}`)
      .join("\n")}`;

  // Create the service request
  const { data: request, error: requestError } = await supabase
    .from("service_requests")
    .insert({
      customer_id: customerId,
      property_id: propertyId,
      category: primaryCategory,
      title: options.title,
      description,
      urgency: options.urgency || "standard",
      status: "submitted",
      photos: options.photos || [],
      preferred_date: options.preferredDate || null,
      preferred_time_start: options.preferredTimeStart || null,
      preferred_time_end: options.preferredTimeEnd || null,
      submitted_at: new Date().toISOString(),
    })
    .select("id, request_number")
    .single();

  if (requestError) {
    console.error("[Maintenance] Error creating request:", requestError);
    throw new Error("Failed to create service request");
  }

  // Create task-request links
  const links = taskIds.map((taskId) => ({
    property_task_id: taskId,
    request_id: request.id,
    included_in_scope: true,
  }));

  const { error: linksError } = await supabase
    .from("maintenance_task_request_links")
    .insert(links);

  if (linksError) {
    console.error("[Maintenance] Error creating links:", linksError);
    // Don't throw - request was created, links failed
  }

  return {
    requestId: request.id,
    requestNumber: request.request_number,
    linkedCount: taskIds.length,
  };
}

/**
 * Get linked tasks for a service request
 */
export async function getLinkedTasksForRequest(
  supabase: SupabaseClient,
  requestId: string
): Promise<PropertyMaintenanceTask[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("maintenance_task_request_links")
    .select(`
      property_task:property_maintenance_tasks(*)
    `)
    .eq("request_id", requestId) as { data: { property_task: PropertyMaintenanceTask | null }[] | null; error: Error | null };

  if (error) {
    console.error("[Maintenance] Error fetching linked tasks:", error);
    throw new Error("Failed to fetch linked tasks");
  }

  return (data || [])
    .map((link) => link.property_task)
    .filter((task): task is PropertyMaintenanceTask => task !== null);
}

// ============================================================================
// CALENDAR UTILITIES
// ============================================================================

/**
 * Get tasks formatted for calendar view
 */
export async function getCalendarTasks(
  supabase: SupabaseClient,
  propertyIds: string[],
  year: number,
  month: number
): Promise<CalendarMonth> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month

  const { data: tasks, error } = await supabase
    .from("property_maintenance_tasks")
    .select("id, title, category, priority, skill_level, next_due_date, last_completed_at")
    .in("property_id", propertyIds)
    .eq("status", "active")
    .gte("next_due_date", startDate.toISOString().split("T")[0])
    .lte("next_due_date", endDate.toISOString().split("T")[0])
    .order("next_due_date");

  if (error) {
    console.error("[Maintenance] Error fetching calendar tasks:", error);
    throw new Error("Failed to fetch calendar tasks");
  }

  // Group by date
  const tasksByDate: Record<string, CalendarTask[]> = {};

  for (const task of tasks || []) {
    if (!task.next_due_date) continue;

    const date = task.next_due_date;
    if (!tasksByDate[date]) {
      tasksByDate[date] = [];
    }

    tasksByDate[date].push({
      id: task.id,
      title: task.title,
      date: task.next_due_date,
      category: task.category,
      priority: task.priority,
      skill_level: task.skill_level,
      status: getTaskStatus(task.next_due_date, task.last_completed_at),
    });
  }

  // Build days array
  const days: { date: string; tasks: CalendarTask[] }[] = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const dateStr = current.toISOString().split("T")[0];
    days.push({
      date: dateStr,
      tasks: tasksByDate[dateStr] || [],
    });
    current.setDate(current.getDate() + 1);
  }

  return {
    year,
    month,
    days,
  };
}

// ============================================================================
// TEMPLATE MANAGEMENT
// ============================================================================

/**
 * Get all templates (admin)
 */
export async function getAllTemplates(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("maintenance_task_templates")
    .select("*")
    .order("category")
    .order("title");

  if (error) {
    console.error("[Maintenance] Error fetching templates:", error);
    throw new Error("Failed to fetch templates");
  }

  return data || [];
}

/**
 * Get template counts by category
 */
export async function getTemplateCounts(
  supabase: SupabaseClient
): Promise<Record<string, number>> {
  const { data, error } = await supabase
    .from("maintenance_task_templates")
    .select("category")
    .eq("is_active", true);

  if (error) {
    console.error("[Maintenance] Error counting templates:", error);
    return {};
  }

  const counts: Record<string, number> = {};
  for (const t of data || []) {
    counts[t.category] = (counts[t.category] || 0) + 1;
  }

  return counts;
}

// ============================================================================
// UTILITY EXPORTS
// ============================================================================

export const CATEGORIES = [
  { value: "hvac", label: "HVAC & Climate" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "appliances", label: "Appliances" },
  { value: "exterior", label: "Exterior" },
  { value: "interior", label: "Interior" },
  { value: "landscaping", label: "Landscaping" },
  { value: "pest_control", label: "Pest Control" },
  { value: "safety", label: "Safety & Security" },
  { value: "other", label: "Other" },
] as const;

export const PRIORITIES = [
  { value: "urgent", label: "Urgent", color: "text-red-600" },
  { value: "high", label: "High", color: "text-orange-600" },
  { value: "normal", label: "Normal", color: "text-blue-600" },
  { value: "low", label: "Low", color: "text-gray-600" },
] as const;

export const SKILL_LEVELS = [
  { value: "diy", label: "DIY", description: "Can be done by most homeowners" },
  { value: "pro_recommended", label: "Pro Recommended", description: "Professional help advised" },
  { value: "pro_required", label: "Pro Required", description: "Must be done by a licensed professional" },
] as const;

export const FREQUENCY_TYPES = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "seasonal", label: "Seasonal" },
  { value: "annual", label: "Annual" },
  { value: "multi_year", label: "Multi-Year" },
  { value: "one_time", label: "One-Time" },
] as const;
