/**
 * Sponsor Billing Checkout API
 *
 * Creates a Stripe checkout session for sponsor subscription.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ensureStripeCustomer,
  createSponsorCheckoutSession,
} from "@/lib/stripe/subscriptions";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get sponsor
    const { data: sponsor } = await supabase
      .from("sponsors")
      .select("id, profile_id")
      .eq("profile_id", user.id)
      .single() as { data: { id: string; profile_id: string } | null };

    if (!sponsor) {
      return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
    }

    // Get user's profile for Stripe customer
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

    // Update sponsor with customer ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("sponsors") as any)
      .update({ stripe_customer_id: customerId })
      .eq("id", sponsor.id);

    // Create checkout session
    const url = await createSponsorCheckoutSession({
      customerId,
      sponsorId: sponsor.id,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Sponsor checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
