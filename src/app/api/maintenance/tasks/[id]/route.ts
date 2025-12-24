/**
 * Single Task API
 *
 * GET /api/maintenance/tasks/[id] - Get task details with history
 * PATCH /api/maintenance/tasks/[id] - Update task
 * DELETE /api/maintenance/tasks/[id] - Archive task
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTaskById, getTaskCompletions, computeNextDueDate } from "@/lib/maintenance";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const task = await getTaskById(supabase, id);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify access
    const { data: member } = await supabase
      .from("property_members")
      .select("role")
      .eq("property_id", task.property_id)
      .eq("user_id", user.id)
      .single() as { data: { role: string } | null };

    if (!member) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get completion history
    const completions = await getTaskCompletions(supabase, id);

    return NextResponse.json({
      task,
      completions,
    });
  } catch (error) {
    console.error("[Maintenance API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get existing task
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingTask } = await (supabase as any)
      .from("property_maintenance_tasks")
      .select("property_id, frequency_type, frequency_interval, suggested_months")
      .eq("id", id)
      .single() as { data: { property_id: string; frequency_type: string; frequency_interval: number; suggested_months: number[] | null } | null };

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify access
    const { data: member } = await supabase
      .from("property_members")
      .select("role")
      .eq("property_id", existingTask.property_id)
      .eq("user_id", user.id)
      .single() as { data: { role: string } | null };

    if (!member || !["owner", "manager"].includes(member.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const body = await request.json();
    const {
      title,
      description,
      category,
      frequency_type,
      frequency_interval,
      suggested_months,
      priority,
      estimated_minutes,
      skill_level,
      tags,
      default_assignee,
      instructions,
      pro_tips,
      warning_notes,
      custom_notes,
      status,
      next_due_date,
    } = body;

    // Build update object
    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (frequency_type !== undefined) updates.frequency_type = frequency_type;
    if (frequency_interval !== undefined) updates.frequency_interval = frequency_interval;
    if (suggested_months !== undefined) updates.suggested_months = suggested_months;
    if (priority !== undefined) updates.priority = priority;
    if (estimated_minutes !== undefined) updates.estimated_minutes = estimated_minutes;
    if (skill_level !== undefined) updates.skill_level = skill_level;
    if (tags !== undefined) updates.tags = tags;
    if (default_assignee !== undefined) updates.default_assignee = default_assignee;
    if (instructions !== undefined) updates.instructions = instructions;
    if (pro_tips !== undefined) updates.pro_tips = pro_tips;
    if (warning_notes !== undefined) updates.warning_notes = warning_notes;
    if (custom_notes !== undefined) updates.custom_notes = custom_notes;
    if (status !== undefined) updates.status = status;

    // Handle due date - either explicit or recalculate
    if (next_due_date !== undefined) {
      updates.next_due_date = next_due_date;
    } else if (frequency_type !== undefined || frequency_interval !== undefined || suggested_months !== undefined) {
      // Recalculate due date with new frequency settings
      const newDueDate = computeNextDueDate(
        frequency_type || existingTask.frequency_type,
        frequency_interval || existingTask.frequency_interval,
        suggested_months ?? existingTask.suggested_months
      );
      updates.next_due_date = newDueDate?.toISOString().split("T")[0] || null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: task, error } = await (supabase as any)
      .from("property_maintenance_tasks")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Maintenance API] Update error:", error);
      return NextResponse.json(
        { error: "Failed to update task" },
        { status: 500 }
      );
    }

    return NextResponse.json(task);
  } catch (error) {
    console.error("[Maintenance API] Error:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get existing task
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: task } = await (supabase as any)
      .from("property_maintenance_tasks")
      .select("property_id")
      .eq("id", id)
      .single() as { data: { property_id: string } | null };

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Verify owner access
    const { data: member } = await supabase
      .from("property_members")
      .select("role")
      .eq("property_id", task.property_id)
      .eq("user_id", user.id)
      .single() as { data: { role: string } | null };

    if (!member || member.role !== "owner") {
      return NextResponse.json({ error: "Only owner can delete tasks" }, { status: 403 });
    }

    // Archive instead of hard delete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("property_maintenance_tasks")
      .update({ status: "archived" })
      .eq("id", id);

    if (error) {
      console.error("[Maintenance API] Delete error:", error);
      return NextResponse.json(
        { error: "Failed to archive task" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Maintenance API] Error:", error);
    return NextResponse.json(
      { error: "Failed to archive task" },
      { status: 500 }
    );
  }
}
