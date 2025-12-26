/**
 * Provider Invites List API
 *
 * List and manage invites sent by the current user.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getHomeownerInvites } from "@/lib/google";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get status filter from query params
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");

    // Get all invites for this user
    let invites = await getHomeownerInvites(user.id);

    // Filter by status if provided
    if (status && status !== "all") {
      invites = invites.filter((invite) => invite.status === status);
    }

    return NextResponse.json({
      invites,
      count: invites.length,
    });
  } catch (error) {
    console.error("Get invites error:", error);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 }
    );
  }
}
