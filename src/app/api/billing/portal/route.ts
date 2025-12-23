/**
 * Stripe Billing Portal API
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

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single() as { data: { stripe_customer_id: string | null } | null };

    if (!profile?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No billing account found" },
        { status: 400 }
      );
    }

    const url = await createBillingPortalSession({
      customerId: profile.stripe_customer_id,
      returnUrl: returnUrl || `${process.env.NEXT_PUBLIC_APP_URL}/app/billing`,
    });

    return NextResponse.json({ url });
  } catch (error) {
    console.error("Portal session error:", error);
    return NextResponse.json(
      { error: "Failed to create portal session" },
      { status: 500 }
    );
  }
}

// GET redirect for direct navigation
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/auth/login", process.env.NEXT_PUBLIC_APP_URL));
  }

  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single() as { data: { stripe_customer_id: string | null } | null };

    if (!profile?.stripe_customer_id) {
      return NextResponse.redirect(new URL("/app/billing", process.env.NEXT_PUBLIC_APP_URL));
    }

    const url = await createBillingPortalSession({
      customerId: profile.stripe_customer_id,
      returnUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing`,
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error("Portal redirect error:", error);
    return NextResponse.redirect(new URL("/app/billing", process.env.NEXT_PUBLIC_APP_URL));
  }
}
