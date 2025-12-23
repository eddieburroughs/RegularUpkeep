/**
 * Sponsor Cancel Subscription API
 *
 * Cancels the sponsor's subscription at period end.
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
    // Get sponsor
    const { data: sponsor } = await supabase
      .from("sponsors")
      .select("id, stripe_subscription_id")
      .eq("profile_id", user.id)
      .single() as { data: { id: string; stripe_subscription_id: string | null } | null };

    if (!sponsor) {
      return NextResponse.json({ error: "Sponsor not found" }, { status: 404 });
    }

    if (!sponsor.stripe_subscription_id) {
      return NextResponse.json(
        { error: "No active subscription found" },
        { status: 400 }
      );
    }

    // Cancel in Stripe at period end
    await cancelSubscription(sponsor.stripe_subscription_id, false);

    // Update local record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("sponsors") as any)
      .update({
        status: "canceling",
        updated_at: new Date().toISOString(),
      })
      .eq("id", sponsor.id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Sponsor cancel error:", error);
    return NextResponse.json(
      { error: "Failed to cancel subscription" },
      { status: 500 }
    );
  }
}
