/**
 * Provider Invite Management
 *
 * Handle creation and tracking of invites sent to external providers
 * discovered through Google Places.
 */

import { createServiceClient } from "@/lib/supabase/server";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";

export interface CreateInviteParams {
  homeownerUserId: string;
  propertyId: string;
  providerLeadId: string;
  serviceType: string;
  sendVia: "sms" | "email" | "manual" | "link";
  sendTo: string; // Phone or email
  message?: string;
}

export interface ProviderInvite {
  id: string;
  homeowner_user_id: string;
  property_id: string;
  provider_lead_id: string;
  service_type: string;
  token: string;
  status: "pending" | "sent" | "opened" | "accepted" | "declined" | "expired";
  sent_via: "sms" | "email" | "manual" | "link";
  sent_to: string;
  message: string | null;
  sent_at: string | null;
  opened_at: string | null;
  responded_at: string | null;
  expires_at: string;
  provider_id: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  provider_lead?: {
    name: string;
    phone: string | null;
    website: string | null;
    rating: number | null;
  };
  property?: {
    address: string;
    city: string;
    state: string;
  };
}

/**
 * Generate a secure invite token
 */
function generateToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Create a new provider invite
 */
export async function createProviderInvite(
  params: CreateInviteParams
): Promise<ProviderInvite | null> {
  const supabase = createServiceClient();

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from("external_provider_invites") as any)
    .insert({
      homeowner_user_id: params.homeownerUserId,
      property_id: params.propertyId,
      provider_lead_id: params.providerLeadId,
      service_type: params.serviceType,
      token,
      status: "pending",
      sent_via: params.sendVia,
      sent_to: params.sendTo,
      message: params.message || null,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating provider invite:", error);
    return null;
  }

  return data as ProviderInvite;
}

/**
 * Get invite by token (for public onboarding page)
 */
export async function getInviteByToken(
  token: string
): Promise<ProviderInvite | null> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("external_provider_invites")
    .select(
      `
      *,
      provider_lead:provider_leads(name, phone, website, rating),
      property:properties(address, city, state)
    `
    )
    .eq("token", token)
    .single();

  if (error || !data) {
    return null;
  }

  return data as ProviderInvite;
}

/**
 * Update invite status
 */
export async function updateInviteStatus(
  inviteId: string,
  status: ProviderInvite["status"],
  providerId?: string
): Promise<boolean> {
  const supabase = createServiceClient();

  const updates: Record<string, string | null> = {
    status,
  };

  // Set timestamp based on status
  const now = new Date().toISOString();
  switch (status) {
    case "sent":
      updates.sent_at = now;
      break;
    case "opened":
      updates.opened_at = now;
      break;
    case "accepted":
    case "declined":
      updates.responded_at = now;
      if (providerId) {
        updates.provider_id = providerId;
      }
      break;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("external_provider_invites") as any)
    .update(updates)
    .eq("id", inviteId);

  if (error) {
    console.error(`Error updating invite ${inviteId}:`, error);
    return false;
  }

  return true;
}

/**
 * Send invite via SMS
 */
export async function sendInviteSms(
  invite: ProviderInvite,
  providerName: string,
  homeownerName: string
): Promise<boolean> {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.regularupkeep.com"}/join-network/${invite.token}`;

  const message =
    invite.message ||
    `Hi ${providerName}! ${homeownerName} would like to invite you to join RegularUpkeep, a home maintenance platform. You've been recommended for ${invite.service_type} services. Join here: ${inviteUrl}`;

  try {
    const result = await sendSms(invite.sent_to, message);

    if (result.success) {
      await updateInviteStatus(invite.id, "sent");
      return true;
    }

    console.error("Failed to send invite SMS:", result.error);
    return false;
  } catch (error) {
    console.error("Error sending invite SMS:", error);
    return false;
  }
}

/**
 * Send invite via Email
 */
export async function sendInviteEmail(
  invite: ProviderInvite,
  providerName: string,
  homeownerName: string,
  providerEmail: string
): Promise<boolean> {
  const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://app.regularupkeep.com"}/join-network/${invite.token}`;

  const subject = `${homeownerName} invited you to join RegularUpkeep`;

  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>You've been invited to RegularUpkeep!</h2>

      <p>Hi ${providerName},</p>

      <p>${homeownerName} would like to work with you through RegularUpkeep,
      a home maintenance platform that connects homeowners with trusted service providers.</p>

      <p>You've been recommended for <strong>${invite.service_type}</strong> services.</p>

      ${invite.message ? `<p><em>"${invite.message}"</em></p>` : ""}

      <p>
        <a href="${inviteUrl}"
           style="display: inline-block; background: #2563eb; color: white;
                  padding: 12px 24px; text-decoration: none; border-radius: 6px;">
          Join RegularUpkeep
        </a>
      </p>

      <p style="color: #666; font-size: 14px;">
        This invite expires in 30 days.
      </p>

      <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />

      <p style="color: #666; font-size: 12px;">
        RegularUpkeep | AI-powered home maintenance made simple<br />
        <a href="https://regularupkeep.com">regularupkeep.com</a>
      </p>
    </div>
  `;

  try {
    const result = await sendEmail({
      to: providerEmail,
      subject,
      html,
    });

    if (result.success) {
      await updateInviteStatus(invite.id, "sent");
      return true;
    }

    console.error("Failed to send invite email:", result.error);
    return false;
  } catch (error) {
    console.error("Error sending invite email:", error);
    return false;
  }
}

/**
 * Get invites for a homeowner
 */
export async function getHomeownerInvites(
  userId: string
): Promise<ProviderInvite[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("external_provider_invites")
    .select(
      `
      *,
      provider_lead:provider_leads(name, phone, website, rating),
      property:properties(address, city, state)
    `
    )
    .eq("homeowner_user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching homeowner invites:", error);
    return [];
  }

  return (data || []) as ProviderInvite[];
}

/**
 * Check if an invite is still valid
 */
export function isInviteValid(invite: ProviderInvite): boolean {
  if (invite.status === "expired" || invite.status === "declined") {
    return false;
  }

  if (invite.status === "accepted") {
    return false;
  }

  const expiresAt = new Date(invite.expires_at);
  if (expiresAt < new Date()) {
    return false;
  }

  return true;
}
