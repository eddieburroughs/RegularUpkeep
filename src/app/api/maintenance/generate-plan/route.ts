/**
 * Generate Maintenance Plan API
 *
 * POST /api/maintenance/generate-plan - Generate maintenance plan for a property from templates
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePropertyPlan } from "@/lib/maintenance";

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
    const { property_id } = body;

    if (!property_id) {
      return NextResponse.json(
        { error: "property_id is required" },
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

    const result = await generatePropertyPlan(supabase, property_id);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Maintenance API] Generate plan error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate plan" },
      { status: 500 }
    );
  }
}
