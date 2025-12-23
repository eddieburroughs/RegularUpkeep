/**
 * Reactivate Subscription API
 *
 * Reactivates a subscription that was set to cancel at period end.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get user's subscription
    const { data: subscription } = await supabase
      .from("homeowner_subscriptions")
      .select("stripe_subscription_id, cancel_at_period_end")
      .eq("customer_id", user.id)
      .single() as { data: { stripe_subscription_id: string | null; cancel_at_period_end: boolean } | null };

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No subscription found" },
        { status: 400 }
      );
    }

    if (!subscription.cancel_at_period_end) {
      return NextResponse.json(
        { error: "Subscription is not scheduled for cancellation" },
        { status: 400 }
      );
    }

    // Reactivate in Stripe
    const stripe = getStripe();
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: false,
    });

    // Update local record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("homeowner_subscriptions") as any)
      .update({
        cancel_at_period_end: false,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("customer_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Reactivate error:", error);
    return NextResponse.json(
      { error: "Failed to reactivate subscription" },
      { status: 500 }
    );
  }
}
