/**
 * Sponsor Tracking API
 *
 * Tracks impressions and clicks for sponsor tiles.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  try {
    const { sponsorId, action } = await request.json();

    if (!sponsorId || !["impression", "click"].includes(action)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const supabase = await createClient();
    const today = new Date().toISOString().split("T")[0];

    // Get current stats for today
    const { data: existing } = await supabase
      .from("sponsor_daily_stats")
      .select("impressions, clicks")
      .eq("sponsor_id", sponsorId)
      .eq("date", today)
      .single() as { data: { impressions: number; clicks: number } | null };

    if (existing) {
      // Update existing record
      const updates =
        action === "click"
          ? { clicks: (existing.clicks || 0) + 1 }
          : { impressions: (existing.impressions || 0) + 1 };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("sponsor_daily_stats") as any)
        .update(updates)
        .eq("sponsor_id", sponsorId)
        .eq("date", today);
    } else {
      // Insert new record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("sponsor_daily_stats") as any).insert({
        sponsor_id: sponsorId,
        date: today,
        impressions: action === "impression" ? 1 : 0,
        clicks: action === "click" ? 1 : 0,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    // Don't fail on tracking errors, just log
    console.error("Sponsor tracking error:", error);
    return NextResponse.json({ success: true });
  }
}
