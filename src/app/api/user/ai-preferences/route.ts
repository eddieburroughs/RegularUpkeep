/**
 * User AI Preferences API
 *
 * GET - Fetch user's AI preferences
 * POST - Update user's AI preferences
 */

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { isAIEnabledForUser, setAIEnabledForUser } from "@/lib/ai/ops";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const aiEnabled = await isAIEnabledForUser(user.id);
    return NextResponse.json({ aiEnabled });
  } catch (error) {
    console.error("Failed to fetch AI preferences:", error);
    return NextResponse.json(
      { error: "Failed to fetch preferences" },
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
    const { aiEnabled } = body;

    if (typeof aiEnabled !== "boolean") {
      return NextResponse.json(
        { error: "Invalid aiEnabled value" },
        { status: 400 }
      );
    }

    await setAIEnabledForUser(user.id, aiEnabled);
    return NextResponse.json({ success: true, aiEnabled });
  } catch (error) {
    console.error("Failed to update AI preferences:", error);
    return NextResponse.json(
      { error: "Failed to update preferences" },
      { status: 500 }
    );
  }
}
