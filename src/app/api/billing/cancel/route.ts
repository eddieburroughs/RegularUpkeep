/**
 * Cancel Subscription API
 *
 * Cancels the user's subscription at period end or immediately.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelSubscription } from "@/lib/stripe/subscriptions";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { immediately } = await request.json();

    // Get user's subscription
    const { data: subscription } = await supabase
      .from("homeowner_subscriptions")
      .select("stripe_subscription_id")
      .eq("customer_id", user.id)
      .single() as { data: { stripe_subscription_id: string | null } | null };

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Cancel in Stripe
    await cancelSubscription(subscription.stripe_subscription_id, immediately);

    // Update local record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("homeowner_subscriptions") as any)
      .update({
        cancel_at_period_end: !immediately,
        status: immediately ? "canceled" : undefined,
        canceled_at: immediately ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq("customer_id", user.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Cancel error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
