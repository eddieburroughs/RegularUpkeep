/**
 * Accept Invite API
 *
 * Complete the provider onboarding process and create provider record.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createConnectAccount } from "@/lib/stripe";

interface AcceptRequestBody {
  business_name: string;
  contact_name: string;
  phone?: string;
  email: string;
  categories: string[];
  zip_code?: string;
  radius_miles?: number;
}

interface InviteWithLead {
  id: string;
  status: string;
  expires_at: string;
  provider_lead_id: string;
  homeowner_user_id: string;
  service_type: string;
  provider_lead: {
    id: string;
    name: string;
    phone: string | null;
    place_id: string;
  } | null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json({ error: "Token is required" }, { status: 400 });
  }

  // Get the authenticated user
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();

  // Fetch and validate invite
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invite, error: inviteError } = (await (serviceClient.from("external_provider_invites") as any)
    .select(
      `
      id,
      status,
      expires_at,
      provider_lead_id,
      homeowner_user_id,
      service_type,
      provider_lead:provider_leads (
        id,
        name,
        phone,
        place_id
      )
    `
    )
    .eq("token", token)
    .single()) as { data: InviteWithLead | null; error: unknown };

  if (inviteError || !invite) {
    return NextResponse.json(
      { error: "Invite not found or invalid" },
      { status: 404 }
    );
  }

  // Check if expired
  if (new Date(invite.expires_at) < new Date()) {
    return NextResponse.json(
      { error: "This invite has expired" },
      { status: 410 }
    );
  }

  // Check if already processed
  if (invite.status === "accepted" || invite.status === "declined") {
    return NextResponse.json(
      { error: "This invite has already been processed" },
      { status: 410 }
    );
  }

  // Parse request body
  const body = (await request.json()) as AcceptRequestBody;
  const {
    business_name,
    contact_name,
    phone,
    email,
    categories,
    zip_code,
    radius_miles,
  } = body;

  // Validate required fields
  if (!business_name || !contact_name || !categories || categories.length === 0) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    // Check if provider already exists for this user
    const { data: existingProvider } = (await serviceClient
      .from("providers")
      .select("id")
      .eq("profile_id", user.id)
      .single()) as { data: { id: string } | null; error: unknown };

    let providerId: string;

    if (existingProvider) {
      // Use existing provider
      providerId = existingProvider.id;
    } else {
      // Create new provider record
      const providerData = {
        profile_id: user.id,
        business_name,
        contact_name,
        phone: phone || invite.provider_lead?.phone || null,
        email,
        service_categories: categories,
        service_area: zip_code
          ? {
              type: "radius",
              zip_code,
              radius_miles: radius_miles || 25,
            }
          : null,
        is_online: false,
        verification_status: "unverified",
        joined_via: "invite",
        invite_id: invite.id,
        provider_lead_id: invite.provider_lead_id,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: newProvider, error: providerError } = (await (serviceClient.from("providers") as any)
        .insert(providerData)
        .select()
        .single()) as { data: { id: string } | null; error: unknown };

      if (providerError) {
        console.error("Error creating provider:", providerError);
        return NextResponse.json(
          { error: "Failed to create provider account" },
          { status: 500 }
        );
      }

      providerId = newProvider!.id;
    }

    // Update profile role to provider if not already
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (serviceClient.from("profiles") as any)
      .update({ role: "provider" })
      .eq("id", user.id);

    // Create network agreement
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: agreementError } = await (serviceClient.from("provider_network_agreements") as any)
      .insert({
        provider_id: providerId,
        agreement_version: "2025-01",
        ip_address: request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip"),
        user_agent: request.headers.get("user-agent"),
        platform_fee_bps: 800, // 8%
      });

    if (agreementError) {
      console.error("Error creating agreement:", agreementError);
    }

    // Update invite status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (serviceClient.from("external_provider_invites") as any)
      .update({
        status: "accepted",
        responded_at: new Date().toISOString(),
        provider_id: providerId,
      })
      .eq("id", invite.id);

    // Try to create Stripe Connect account
    let stripeOnboardingUrl = null;

    try {
      const stripeResult = await createConnectAccount({
        providerId,
        email,
        businessName: business_name,
      });

      if (stripeResult) {
        // Update provider with Stripe account ID
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (serviceClient.from("providers") as any)
          .update({ stripe_account_id: stripeResult.accountId })
          .eq("id", providerId);

        stripeOnboardingUrl = stripeResult.onboardingUrl;
      }
    } catch (stripeError) {
      console.error("Stripe Connect error:", stripeError);
      // Continue without Stripe - they can set it up later
    }

    return NextResponse.json({
      success: true,
      providerId,
      stripeOnboardingUrl,
      message: "Welcome to RegularUpkeep!",
    });
  } catch (error) {
    console.error("Accept invite error:", error);
    return NextResponse.json(
      { error: "Failed to accept invite" },
      { status: 500 }
    );
  }
}
