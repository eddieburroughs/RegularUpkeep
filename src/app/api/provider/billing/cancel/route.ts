/**
 * Provider Cancel Subscription API
 *
 * Cancels the provider's tier subscription at period end.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cancelSubscription } from "@/lib/stripe/subscriptions";

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get provider
    const { data: provider } = await supabase
      .from("providers")
      .select("id")
      .eq("profile_id", user.id)
      .single() as { data: { id: string } | null };

    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    // Get provider's subscription
    const { data: subscription } = await supabase
      .from("provider_subscriptions")
      .select("stripe_subscription_id")
      .eq("provider_id", provider.id)
      .single() as { data: { stripe_subscription_id: string | null } | null };

    if (!subscription?.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Cancel in Stripe at period end
    await cancelSubscription(subscription.stripe_subscription_id, false);

    // Update local record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("provider_subscriptions") as any)
      .update({
        cancel_at_period_end: true,
        updated_at: new Date().toISOString(),
      })
      .eq("provider_id", provider.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Provider cancel error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
