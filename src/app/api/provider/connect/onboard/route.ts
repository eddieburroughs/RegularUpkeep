/**
 * Provider Stripe Connect Onboarding API
 *
 * Creates or continues Stripe Connect onboarding for a provider.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createConnectAccount, createOnboardingLink } from "@/lib/stripe/connect";

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
      .select("id, business_name")
      .eq("profile_id", user.id)
      .single() as { data: { id: string; business_name: string } | null };

    if (!provider) {
      return NextResponse.redirect(
        new URL("/provider/onboarding/signup", process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Get profile email
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .single() as { data: { email: string } | null };

    if (!profile) {
      return NextResponse.redirect(
        new URL("/provider/billing?error=profile_not_found", process.env.NEXT_PUBLIC_APP_URL)
      );
    }

    // Check if provider already has a Stripe account
    const { data: existingAccount } = await supabase
      .from("provider_stripe_accounts")
      .select("stripe_account_id, onboarding_complete")
      .eq("provider_id", provider.id)
      .single() as { data: { stripe_account_id: string; onboarding_complete: boolean } | null };

    let stripeAccountId: string;
    let onboardingUrl: string;

    if (existingAccount?.stripe_account_id) {
      // Continue onboarding for existing account
      stripeAccountId = existingAccount.stripe_account_id;
      onboardingUrl = await createOnboardingLink(stripeAccountId);
    } else {
      // Create new Connect account
      const result = await createConnectAccount({
        providerId: provider.id,
        email: profile.email,
        businessName: provider.business_name,
      });

      stripeAccountId = result.accountId;
      onboardingUrl = result.onboardingUrl;
    }

    return NextResponse.redirect(onboardingUrl);
  } catch (error) {
    console.error("Connect onboarding error:", error);
    return NextResponse.redirect(
      new URL("/provider/billing?error=connect_failed", process.env.NEXT_PUBLIC_APP_URL)
    );
  }
}
