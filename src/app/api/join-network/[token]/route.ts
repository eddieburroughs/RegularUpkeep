/**
 * Get Invite Details API
 *
 * Public endpoint to fetch invite details by token.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

// Invite data type for API responses
interface InviteData {
  id: string;
  service_type: string;
  status: string;
  expires_at: string;
  message: string | null;
  homeowner_user_id: string;
  provider_lead: {
    name: string;
    phone: string | null;
    rating: number | null;
    website: string | null;
  } | null;
  property: {
    address: string;
    city: string;
    state: string;
  } | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Fetch invite with related data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite, error } = (await (supabase.from("external_provider_invites") as any)
    .select(
      `
      id,
      service_type,
      status,
      expires_at,
      message,
      provider_lead:provider_leads (
        name,
        phone,
        rating,
        website
      ),
      property:properties (
        address,
        city,
        state
      ),
      homeowner_user_id
    `
    )
    .eq("token", token)
    .single()) as { data: InviteData | null; error: unknown };

  if (error || !invite) {
    return NextResponse.json(
      { error: "Invite not found or invalid" },
      { status: 404 }
    );
  }

  // Check if expired
  if (new Date(invite.expires_at) < new Date()) {
    // Update status if not already expired
    if (invite.status !== "expired") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("external_provider_invites") as any)
        .update({ status: "expired" })
        .eq("id", invite.id);
    }
    return NextResponse.json(
      { error: "This invite has expired" },
      { status: 410 }
    );
  }

  // Check if already accepted or declined
  if (invite.status === "accepted") {
    return NextResponse.json(
      { error: "This invite has already been accepted" },
      { status: 410 }
    );
  }

  if (invite.status === "declined") {
    return NextResponse.json(
      { error: "This invite was declined" },
      { status: 410 }
    );
  }

  // Get homeowner name for personalization
  let homeownerName = null;
  if (invite.homeowner_user_id) {
    const { data: profile } = (await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", invite.homeowner_user_id)
      .single()) as { data: { full_name: string } | null; error: unknown };
    homeownerName = profile?.full_name;
  }

  return NextResponse.json({
    invite: {
      id: invite.id,
      service_type: invite.service_type,
      status: invite.status,
      expires_at: invite.expires_at,
      message: invite.message,
      provider_lead: invite.provider_lead,
      property: invite.property,
      homeowner_name: homeownerName,
    },
  });
}
