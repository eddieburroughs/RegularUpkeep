/**
 * Provider Billing Checkout API
 *
 * Creates a Stripe checkout session for provider tier subscriptions.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  ensureStripeCustomer,
  createProviderCheckoutSession,
} from "@/lib/stripe/subscriptions";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tier } = await request.json();

    if (!["verified", "preferred"].includes(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    // Get provider
    const { data: provider } = await supabase
      .from("providers")
      .select("id, profile_id")
      .eq("profile_id", user.id)
      .single() as { data: { id: string; profile_id: string } | null };

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
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

    // Update provider with customer ID
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("providers") as any)
      .update({ stripe_customer_id: customerId })
      .eq("id", provider.id);

    // Create or update subscription record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("provider_subscriptions") as any).upsert({
      provider_id: provider.id,
      tier,
      status: "pending",
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "provider_id",
    });

    // Create checkout session
    const url = await createProviderCheckoutSession({
      customerId,
      providerId: provider.id,
      tier: tier as "verified" | "preferred",
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Provider checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
