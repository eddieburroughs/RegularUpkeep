/**
 * Connected Providers API
 *
 * List providers who have accepted invites from the current homeowner.
 * These are providers the homeowner can directly request service from.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface ConnectedProvider {
  id: string;
  business_name: string;
  contact_name: string;
  phone: string | null;
  email: string | null;
  service_categories: string[];
  verification_status: string;
  rating: number | null;
  reviews_count: number;
  is_online: boolean;
  invite_id: string;
  service_type: string;
  connected_at: string;
  property: {
    id: string;
    nickname: string | null;
    address: string;
    city: string;
    state: string;
  } | null;
}

interface InviteWithProvider {
  id: string;
  service_type: string;
  responded_at: string | null;
  provider_id: string;
  property_id: string;
  provider: {
    id: string;
    business_name: string;
    contact_name: string;
    phone: string | null;
    email: string | null;
    service_categories: string[];
    verification_status: string;
    is_online: boolean;
  } | null;
  property: {
    id: string;
    nickname: string | null;
    address: string;
    city: string;
    state: string;
  } | null;
}

export async function GET() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get accepted invites with provider details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invites, error } = (await (supabase.from("external_provider_invites") as any)
    .select(`
      id,
      service_type,
      responded_at,
      provider_id,
      property_id,
      provider:providers (
        id,
        business_name,
        contact_name,
        phone,
        email,
        service_categories,
        verification_status,
        is_online
      ),
      property:properties (
        id,
        nickname,
        address,
        city,
        state
      )
    `)
    .eq("homeowner_user_id", user.id)
    .eq("status", "accepted")
    .not("provider_id", "is", null)
    .order("responded_at", { ascending: false })) as { data: InviteWithProvider[] | null; error: unknown };

  if (error) {
    console.error("Error fetching connected providers:", error);
    return NextResponse.json(
      { error: "Failed to fetch connected providers" },
      { status: 500 }
    );
  }

  // Get provider ratings from reviews (if we have a reviews table)
  // For now, we'll use placeholder values
  const connectedProviders: ConnectedProvider[] = (invites || [])
    .filter((invite) => invite.provider)
    .map((invite) => ({
      id: invite.provider!.id,
      business_name: invite.provider!.business_name,
      contact_name: invite.provider!.contact_name,
      phone: invite.provider!.phone,
      email: invite.provider!.email,
      service_categories: invite.provider!.service_categories || [],
      verification_status: invite.provider!.verification_status,
      rating: null, // TODO: Calculate from reviews
      reviews_count: 0, // TODO: Count from reviews
      is_online: invite.provider!.is_online,
      invite_id: invite.id,
      service_type: invite.service_type,
      connected_at: invite.responded_at || new Date().toISOString(),
      property: invite.property,
    }));

  // Dedupe by provider ID (a provider might have multiple accepted invites)
  const uniqueProviders = Array.from(
    new Map(connectedProviders.map((p) => [p.id, p])).values()
  );

  return NextResponse.json({
    providers: uniqueProviders,
    total: uniqueProviders.length,
  });
}
