/**
 * System Tasks API
 *
 * Get and sync maintenance tasks for a specific property system
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GET - Get maintenance tasks for a specific system
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; systemId: string }> }
) {
  const { id: propertyId, systemId } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user has access to this property
  const { data: membership } = await supabase
    .from("property_members")
    .select("id")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json(
      { error: "Not authorized to view this property" },
      { status: 403 }
    );
  }

  // Fetch tasks linked to this system
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tasks, error } = await (supabase.from("property_maintenance_tasks") as any)
    .select(`
      *,
      template:maintenance_task_templates(title, category),
      completions:maintenance_task_completions(id, completed_at, notes)
    `)
    .eq("property_id", propertyId)
    .eq("system_id", systemId)
    .eq("status", "active")
    .order("next_due_date", { ascending: true });

  if (error) {
    console.error("Error fetching system tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }

  return NextResponse.json({ tasks: tasks || [] });
}

// POST - Regenerate/sync tasks for this system
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; systemId: string }> }
) {
  const { id: propertyId, systemId } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user has owner/manager access
  const { data: membership } = await supabase
    .from("property_members")
    .select("role")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .single() as { data: { role: string } | null; error: unknown };

  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Not authorized to modify this property" },
      { status: 403 }
    );
  }

  // Verify system belongs to this property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: system } = await (supabase.from("property_systems") as any)
    .select("id, system_type, name")
    .eq("id", systemId)
    .eq("property_id", propertyId)
    .single();

  if (!system) {
    return NextResponse.json(
      { error: "System not found" },
      { status: 404 }
    );
  }

  // Call the database function to regenerate tasks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("generate_system_maintenance_tasks", {
    p_system_id: systemId,
  });

  if (error) {
    console.error("Error generating system tasks:", error);
    return NextResponse.json(
      { error: "Failed to generate tasks" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    tasks_generated: data,
    message: `Generated ${data} maintenance tasks for ${system.name}`,
  });
}
