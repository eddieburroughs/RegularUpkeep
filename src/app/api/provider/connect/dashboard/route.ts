/**
 * Provider Stripe Connect Dashboard API
 *
 * Redirects to the Stripe Express Dashboard for the provider.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createDashboardLink } from "@/lib/stripe/connect";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(
      new URL("/auth/login?redirectTo=/provider/billing", process.env.NEXT_PUBLIC_APP_URL)
    );
  }

  try {
    // Get provider
    const { data: provider } = await supabase
      .from("providers")
      .select("id")
      .eq("profile_id", user.id)
      .single() as { data: { id: string } | null };

    if (!provider) {
      return NextResponse.redirect(
        new URL("/provider/onboarding/signup", process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Get Stripe account
    const { data: stripeAccount } = await supabase
      .from("provider_stripe_accounts")
      .select("stripe_account_id, onboarding_complete")
      .eq("provider_id", provider.id)
      .single() as { data: { stripe_account_id: string; onboarding_complete: boolean } | null };

    if (!stripeAccount?.stripe_account_id) {
      return NextResponse.redirect(
        new URL("/api/provider/connect/onboard", process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Create dashboard link
    const dashboardUrl = await createDashboardLink(stripeAccount.stripe_account_id);

    return NextResponse.redirect(dashboardUrl);
  } catch (error) {
    console.error("Connect dashboard error:", error);
    return NextResponse.redirect(
      new URL("/provider/billing?error=dashboard_failed", process.env.NEXT_PUBLIC_APP_URL)
    );
  }
}
