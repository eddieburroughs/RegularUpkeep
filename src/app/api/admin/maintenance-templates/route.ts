/**
 * Admin Maintenance Templates API
 *
 * GET /api/admin/maintenance-templates - List all templates
 * POST /api/admin/maintenance-templates - Create new template
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAllTemplates } from "@/lib/maintenance";

export async function GET(request: NextRequest) {
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
    const templates = await getAllTemplates(supabase);
    return NextResponse.json({ templates });
  } catch (error) {
    console.error("[Admin Templates] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch templates" },
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
    } = body;

    // Validate required fields
    if (!title || !category || !frequency_type) {
      return NextResponse.json(
        { error: "Missing required fields: title, category, frequency_type" },
        { status: 400 }
      );
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: template, error } = await (supabase as any)
      .from("maintenance_task_templates")
      .insert({
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
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error("[Admin Templates] Create error:", error);
      return NextResponse.json(
        { error: "Failed to create template" },
        { status: 500 }
      );
    }

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error("[Admin Templates] Error:", error);
    return NextResponse.json(
      { error: "Failed to create template" },
      { status: 500 }
    );
  }
}
