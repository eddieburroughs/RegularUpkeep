/**
 * Provider Billing Portal API
 *
 * Creates a Stripe billing portal session for managing subscriptions.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createBillingPortalSession } from "@/lib/stripe/subscriptions";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { returnUrl } = await request.json();

    // Get provider's Stripe customer ID
    const { data: provider } = await supabase
      .from("providers")
      .select("stripe_customer_id")
      .eq("profile_id", user.id)
      .single() as { data: { stripe_customer_id: string | null } | null };

    if (!provider?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found" },
        { status: 400 }
      );
    }

    const url = await createBillingPortalSession({
      customerId: provider.stripe_customer_id,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/provider/billing`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Provider portal session error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}
