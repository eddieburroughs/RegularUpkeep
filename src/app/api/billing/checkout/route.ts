/**
 * Stripe Checkout API
 *
 * Creates a Stripe checkout session for homeowner subscriptions.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ensureStripeCustomer,
  createHomeownerCheckoutSession,
} from "@/lib/stripe/subscriptions";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { additionalHomes, tenantAccessCount, sponsorFree } = await request.json();

    // Get user's profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", user.id)
      .single() as { data: { id: string; email: string; full_name: string | null } | null };

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Ensure Stripe customer exists
    const customerId = await ensureStripeCustomer({
      userId: user.id,
      email: profile.email,
      name: profile.full_name || undefined,
    });

    // Create or update subscription record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("homeowner_subscriptions") as any).upsert({
      customer_id: user.id,
      stripe_customer_id: customerId,
      additional_homes: additionalHomes || 0,
      tenant_access_count: tenantAccessCount || 0,
      sponsor_free: sponsorFree || false,
      status: "pending",
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "customer_id",
    });

    // Create checkout session
    const url = await createHomeownerCheckoutSession({
      customerId,
      customerProfileId: user.id,
      additionalHomes: additionalHomes || 0,
      tenantAccessCount: tenantAccessCount || 0,
      sponsorFree: sponsorFree || false,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
