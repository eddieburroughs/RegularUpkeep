/**
 * Create Service Request from Tasks API
 *
 * POST /api/maintenance/create-request - Create a service request from selected maintenance tasks
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRequestFromTasks } from "@/lib/maintenance";

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
      task_ids,
      title,
      description,
      urgency,
      preferred_date,
      preferred_time_start,
      preferred_time_end,
      photos,
    } = body;

    // Validate required fields
    if (!property_id || !task_ids || !Array.isArray(task_ids) || task_ids.length === 0 || !title) {
      return NextResponse.json(
        { error: "Missing required fields: property_id, task_ids (array), title" },
        { status: 400 }
      );
    }

    // Verify property access
    const { data: member } = await supabase
      .from("property_members")
      .select("role")
      .eq("property_id", property_id)
      .eq("user_id", user.id)
      .single() as { data: { role: string } | null };

    if (!member || !["owner", "manager"].includes(member.role)) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Get customer ID
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("profile_id", user.id)
      .single() as { data: { id: string } | null };

    if (!customer) {
      return NextResponse.json(
        { error: "Customer profile not found" },
        { status: 400 }
      );
    }

    // Verify all tasks belong to the property
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tasks } = await (supabase as any)
      .from("property_maintenance_tasks")
      .select("id, property_id")
      .in("id", task_ids) as { data: { id: string; property_id: string }[] | null };

    if (!tasks || tasks.length !== task_ids.length) {
      return NextResponse.json(
        { error: "One or more tasks not found" },
        { status: 400 }
      );
    }

    const invalidTasks = tasks.filter((t) => t.property_id !== property_id);
    if (invalidTasks.length > 0) {
      return NextResponse.json(
        { error: "All tasks must belong to the specified property" },
        { status: 400 }
      );
    }

    const result = await createRequestFromTasks(
      supabase,
      property_id,
      task_ids,
      customer.id,
      {
        title,
        description,
        urgency,
        preferredDate: preferred_date,
        preferredTimeStart: preferred_time_start,
        preferredTimeEnd: preferred_time_end,
        photos,
      }
    );

    return NextResponse.json({
      success: true,
      request_id: result.requestId,
      request_number: result.requestNumber,
      linked_task_count: result.linkedCount,
    }, { status: 201 });
  } catch (error) {
    console.error("[Maintenance API] Create request error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create request" },
      { status: 500 }
    );
  }
}
