/**
 * Mark Invite Opened API
 *
 * Track when a provider opens their invite link.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

interface InviteStatus {
  id: string;
  status: string;
  opened_at: string | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get current invite status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite, error } = (await (supabase.from("external_provider_invites") as any)
    .select("id, status, opened_at")
    .eq("token", token)
    .single()) as { data: InviteStatus | null; error: unknown };

  if (error || !invite) {
    return NextResponse.json(
      { error: "Invite not found" },
      { status: 404 }
    );
  }

  // Only update if not already opened or further along
  if (invite.status === "pending" || invite.status === "sent") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("external_provider_invites") as any)
      .update({
        status: "opened",
        opened_at: new Date().toISOString(),
      })
      .eq("id", invite.id);
  }

  return NextResponse.json({ success: true });
}
