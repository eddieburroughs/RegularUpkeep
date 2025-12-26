/**
 * Provider Invite API
 *
 * Create and send invites to external providers discovered through Google Places.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  createProviderInvite,
  getProviderLeadById,
  sendInviteSms,
  sendInviteEmail,
  type CreateInviteParams,
} from "@/lib/google";
import { isFeatureEnabled } from "@/lib/config/admin-config";

interface InviteRequestBody {
  providerLeadId: string;
  propertyId: string;
  serviceType: string;
  sendVia: "sms" | "email" | "link";
  sendTo?: string; // Phone or email (optional if using link-only)
  message?: string;
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
    // Check if Google discovery is enabled
    const discoveryEnabled = await isFeatureEnabled(
      "google_provider_discovery"
    );

    if (!discoveryEnabled) {
      return NextResponse.json(
        {
          error: "Provider discovery is not enabled",
          featureDisabled: true,
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = (await request.json()) as InviteRequestBody;
    const { providerLeadId, propertyId, serviceType, sendVia, sendTo, message } =
      body;

    // Validate required fields
    if (!providerLeadId || !propertyId || !serviceType) {
      return NextResponse.json(
        { error: "providerLeadId, propertyId, and serviceType are required" },
        { status: 400 }
      );
    }

    // Validate sendTo if not link-only
    if (sendVia !== "link" && !sendTo) {
      return NextResponse.json(
        { error: "sendTo is required for SMS and email invites" },
        { status: 400 }
      );
    }

    // Verify user has access to this property
    const { data: propertyMember } = await supabase
      .from("property_members")
      .select("id")
      .eq("property_id", propertyId)
      .eq("user_id", user.id)
      .single();

    if (!propertyMember) {
      return NextResponse.json(
        { error: "You don't have access to this property" },
        { status: 403 }
      );
    }

    // Get the provider lead
    const providerLead = await getProviderLeadById(providerLeadId);

    if (!providerLead) {
      return NextResponse.json(
        { error: "Provider not found" },
        { status: 404 }
      );
    }

    // Determine the contact info
    let contactInfo = sendTo;
    if (!contactInfo && sendVia === "sms" && providerLead.phone) {
      contactInfo = providerLead.phone;
    } else if (!contactInfo && sendVia === "link") {
      contactInfo = "link-only";
    }

    if (!contactInfo) {
      return NextResponse.json(
        {
          error: `No ${sendVia === "sms" ? "phone number" : "email"} available for this provider`,
        },
        { status: 400 }
      );
    }

    // Get user's profile for personalization
    const { data: userProfile } = (await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single()) as { data: { full_name: string } | null; error: unknown };

    const homeownerName = userProfile?.full_name || "A homeowner";

    // Create the invite params
    const inviteParams: CreateInviteParams = {
      homeownerUserId: user.id,
      propertyId,
      providerLeadId,
      serviceType,
      sendVia: sendVia === "link" ? "link" : sendVia,
      sendTo: contactInfo,
      message,
    };

    // Create the invite
    const invite = await createProviderInvite(inviteParams);

    if (!invite) {
      return NextResponse.json(
        { error: "Failed to create invite" },
        { status: 500 }
      );
    }

    // Send the invite if not link-only
    let sendResult = { sent: false, message: "Invite link created" };

    if (sendVia === "sms" && providerLead.phone) {
      const success = await sendInviteSms(
        invite,
        providerLead.name,
        homeownerName
      );
      sendResult = {
        sent: success,
        message: success ? "SMS invite sent" : "Failed to send SMS",
      };
    } else if (sendVia === "email" && sendTo) {
      const success = await sendInviteEmail(
        invite,
        providerLead.name,
        homeownerName,
        sendTo
      );
      sendResult = {
        sent: success,
        message: success ? "Email invite sent" : "Failed to send email",
      };
    }

    // Build invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.regularupkeep.com"}/join-network/${invite.token}`;

    return NextResponse.json({
      invite: {
        id: invite.id,
        token: invite.token,
        status: invite.status,
        expiresAt: invite.expires_at,
        providerName: providerLead.name,
        serviceType,
      },
      inviteUrl,
      ...sendResult,
    });
  } catch (error) {
    console.error("Provider invite error:", error);
    return NextResponse.json(
      { error: "Failed to create invite" },
      { status: 500 }
    );
  }
}
