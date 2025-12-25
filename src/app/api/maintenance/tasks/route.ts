/**
 * Maintenance Tasks API
 *
 * GET /api/maintenance/tasks - Get tasks for user's properties
 * POST /api/maintenance/tasks - Create custom task for a property
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getPropertyTasks, getTasksForProperties, computeNextDueDate } from "@/lib/maintenance";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get query params
  const { searchParams } = new URL(request.url);
  const propertyId = searchParams.get("property_id");

  try {
    // Get user's properties
    const { data: propertyMembers } = await supabase
      .from("property_members")
      .select("property_id")
      .eq("user_id", user.id)
      .in("member_role", ["owner", "manager"]) as { data: { property_id: string }[] | null };

    const propertyIds = (propertyMembers || []).map((pm) => pm.property_id);

    if (propertyIds.length === 0) {
      return NextResponse.json({
        overdue: [],
        due_soon: [],
        upcoming: [],
        completed: [],
      });
    }

    // If specific property requested, validate access
    if (propertyId) {
      if (!propertyIds.includes(propertyId)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      const tasks = await getPropertyTasks(supabase, propertyId);
      return NextResponse.json(tasks);
    }

    // Get tasks for all properties
    const tasks = await getTasksForProperties(supabase, propertyIds);
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("[Maintenance API] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      property_id,
      title,
      description,
      category,
      frequency_type,
      frequency_interval = 1,
      suggested_months,
      priority = "normal",
      estimated_minutes,
      skill_level = "diy",
      tags = [],
      default_assignee = "homeowner",
      instructions,
      pro_tips,
      warning_notes,
      custom_notes,
    } = body;

    // Validate required fields
    if (!property_id || !title || !category || !frequency_type) {
      return NextResponse.json(
        { error: "Missing required fields: property_id, title, category, frequency_type" },
        { status: 400 }
      );
    }

    // Verify property access
    const { data: member } = await supabase
      .from("property_members")
      .select("member_role")
      .eq("property_id", property_id)
      .eq("user_id", user.id)
      .single() as { data: { member_role: string } | null };

    if (!member || !["owner", "manager"].includes(member.member_role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Calculate initial due date
    const nextDueDate = computeNextDueDate(
      frequency_type,
      frequency_interval,
      suggested_months
    );

    // Create the task
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: task, error } = await (supabase as any)
      .from("property_maintenance_tasks")
      .insert({
        property_id,
        template_id: null, // Custom task
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
        next_due_date: nextDueDate?.toISOString().split("T")[0] || null,
      })
      .select()
      .single();

    if (error) {
      console.error("[Maintenance API] Create error:", error);
      return NextResponse.json(
        { error: "Failed to create task" },
        { status: 500 }
      );
    }

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    console.error("[Maintenance API] Error:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
