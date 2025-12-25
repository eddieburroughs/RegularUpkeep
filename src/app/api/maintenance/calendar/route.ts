/**
 * Calendar View API
 *
 * GET /api/maintenance/calendar - Get tasks formatted for calendar view
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCalendarTasks } from "@/lib/maintenance";

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get("year") || String(new Date().getFullYear()));
    const month = parseInt(searchParams.get("month") || String(new Date().getMonth() + 1));
    const propertyId = searchParams.get("property_id");

    // Get user's properties
    const { data: propertyMembers } = await supabase
      .from("property_members")
      .select("property_id")
      .eq("user_id", user.id)
      .in("member_role", ["owner", "manager"]) as { data: { property_id: string }[] | null };

    let propertyIds = (propertyMembers || []).map((pm) => pm.property_id);

    if (propertyIds.length === 0) {
      return NextResponse.json({
        year,
        month,
        days: [],
      });
    }

    // Filter to specific property if requested
    if (propertyId) {
      if (!propertyIds.includes(propertyId)) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
      propertyIds = [propertyId];
    }

    const calendar = await getCalendarTasks(supabase, propertyIds, year, month);

    return NextResponse.json(calendar);
  } catch (error) {
    console.error("[Maintenance API] Calendar error:", error);
    return NextResponse.json(
      { error: "Failed to fetch calendar" },
      { status: 500 }
    );
  }
}
