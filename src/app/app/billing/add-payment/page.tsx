/**
 * Add Payment Method Page
 *
 * Redirects to Stripe checkout in setup mode to collect payment method.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ensureStripeCustomer } from "@/lib/stripe/subscriptions";
import { createSetupCheckoutSession } from "@/lib/stripe/payments";

export default async function AddPaymentPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user's profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name")
    .eq("id", user.id)
    .single() as { data: { id: string; email: string; full_name: string | null } | null };

  if (!profile) {
    redirect("/app/billing");
  }

  try {
    // Ensure Stripe customer exists
    const customerId = await ensureStripeCustomer({
      userId: user.id,
      email: profile.email,
      name: profile.full_name || undefined,
    });

    // Create setup checkout session
    const url = await createSetupCheckoutSession({
      customerId,
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing?payment_added=true`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/app/billing`,
    });

    redirect(url);
  } catch (error) {
    console.error("Add payment error:", error);
    redirect("/app/billing?error=payment_setup_failed");
  }
}
