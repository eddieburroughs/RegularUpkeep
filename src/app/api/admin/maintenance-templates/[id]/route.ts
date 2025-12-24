/**
 * Single Template API
 *
 * GET /api/admin/maintenance-templates/[id] - Get template details
 * PATCH /api/admin/maintenance-templates/[id] - Update template
 * DELETE /api/admin/maintenance-templates/[id] - Archive template
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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

  // Verify admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null };

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const { data: template, error } = await supabase
      .from("maintenance_task_templates")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    // Get usage count
    const { count } = await supabase
      .from("property_maintenance_tasks")
      .select("id", { count: "exact", head: true })
      .eq("template_id", id);

    return NextResponse.json({
      ...(template as Record<string, unknown>),
      usage_count: count || 0,
    });
  } catch (error) {
    console.error("[Admin Templates] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch template" },
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

  // Verify admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null };

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
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
      is_active,
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
    if (is_active !== undefined) updates.is_active = is_active;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "No updates provided" }, { status: 400 });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: template, error } = await (supabase as any)
      .from("maintenance_task_templates")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[Admin Templates] Update error:", error);
      return NextResponse.json(
        { error: "Failed to update template" },
        { status: 500 }
      );
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error("[Admin Templates] Error:", error);
    return NextResponse.json(
      { error: "Failed to update template" },
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

  // Verify admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null };

  if (!profile || profile.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    // Archive instead of hard delete
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("maintenance_task_templates")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      console.error("[Admin Templates] Delete error:", error);
      return NextResponse.json(
        { error: "Failed to archive template" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Admin Templates] Error:", error);
    return NextResponse.json(
      { error: "Failed to archive template" },
      { status: 500 }
    );
  }
}
