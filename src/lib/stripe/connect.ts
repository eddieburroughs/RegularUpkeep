/**
 * Stripe Connect for Providers
 *
 * Handles provider onboarding to Stripe Connect for receiving payouts.
 */

import { getStripe } from "./client";
import { createClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.regularupkeep.com";

/**
 * Create a new Stripe Connect account for a provider
 */
export async function createConnectAccount(params: {
  providerId: string;
  email: string;
  businessName: string;
}): Promise<{ accountId: string; onboardingUrl: string }> {
  const stripe = getStripe();
  const supabase = await createClient();

  // Create Express Connect account
  const account = await stripe.accounts.create({
    type: "express",
    email: params.email,
    business_type: "company",
    company: {
      name: params.businessName,
    },
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    metadata: {
      provider_id: params.providerId,
    },
  });

  // Save to database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("provider_stripe_accounts") as any).upsert({
    provider_id: params.providerId,
    stripe_account_id: account.id,
    status: "pending",
    onboarding_complete: false,
    charges_enabled: false,
    payouts_enabled: false,
    details_submitted: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: "provider_id" });

  // Create onboarding link
  const accountLink = await stripe.accountLinks.create({
    account: account.id,
    refresh_url: `${BASE_URL}/provider/onboarding/stripe?refresh=true`,
    return_url: `${BASE_URL}/provider/onboarding/stripe/complete`,
    type: "account_onboarding",
  });

  return {
    accountId: account.id,
    onboardingUrl: accountLink.url,
  };
}

/**
 * Create a new onboarding link for an existing account
 */
export async function createOnboardingLink(
  stripeAccountId: string
): Promise<string> {
  const stripe = getStripe();

  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: `${BASE_URL}/provider/onboarding/stripe?refresh=true`,
    return_url: `${BASE_URL}/provider/onboarding/stripe/complete`,
    type: "account_onboarding",
  });

  return accountLink.url;
}

/**
 * Create a login link for provider's Stripe dashboard
 */
export async function createDashboardLink(
  stripeAccountId: string
): Promise<string> {
  const stripe = getStripe();

  const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
  return loginLink.url;
}

/**
 * Sync account status from Stripe
 */
export async function syncAccountStatus(
  stripeAccountId: string
): Promise<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  isComplete: boolean;
}> {
  const stripe = getStripe();
  const supabase = await createClient();

  const account = await stripe.accounts.retrieve(stripeAccountId);

  const status = {
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
    isComplete: (account.charges_enabled && account.payouts_enabled) ?? false,
  };

  // Update database
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("provider_stripe_accounts") as any)
    .update({
      status: status.isComplete ? "active" : "pending",
      onboarding_complete: status.isComplete,
      charges_enabled: status.chargesEnabled,
      payouts_enabled: status.payoutsEnabled,
      details_submitted: status.detailsSubmitted,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_account_id", stripeAccountId);

  return status;
}

/**
 * Get account balance
 */
export async function getAccountBalance(
  stripeAccountId: string
): Promise<{ available: number; pending: number }> {
  const stripe = getStripe();

  const balance = await stripe.balance.retrieve({
    stripeAccount: stripeAccountId,
  });

  // Sum up USD amounts
  const available = balance.available
    .filter((b) => b.currency === "usd")
    .reduce((sum, b) => sum + b.amount, 0);

  const pending = balance.pending
    .filter((b) => b.currency === "usd")
    .reduce((sum, b) => sum + b.amount, 0);

  return { available, pending };
}

/**
 * Create a payout to the provider's bank account
 */
export async function createPayout(params: {
  stripeAccountId: string;
  amountCents: number;
  description?: string;
}): Promise<Stripe.Payout> {
  const stripe = getStripe();

  return await stripe.payouts.create(
    {
      amount: params.amountCents,
      currency: "usd",
      description: params.description,
    },
    {
      stripeAccount: params.stripeAccountId,
    }
  );
}

/**
 * Transfer funds to a connected account
 */
export async function transferToProvider(params: {
  stripeAccountId: string;
  amountCents: number;
  sourceTransactionId?: string;
  metadata?: Stripe.MetadataParam;
}): Promise<Stripe.Transfer> {
  const stripe = getStripe();

  return await stripe.transfers.create({
    amount: params.amountCents,
    currency: "usd",
    destination: params.stripeAccountId,
    source_transaction: params.sourceTransactionId,
    metadata: params.metadata,
  });
}

/**
 * Get the provider's Stripe account info from database
 */
export async function getProviderStripeAccount(
  providerId: string
): Promise<{
  id: string;
  stripeAccountId: string | null;
  status: string;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
} | null> {
  const supabase = await createClient();

  const { data } = await supabase
    .from("provider_stripe_accounts")
    .select("id, stripe_account_id, status, charges_enabled, payouts_enabled")
    .eq("provider_id", providerId)
    .single() as {
      data: {
        id: string;
        stripe_account_id: string | null;
        status: string;
        charges_enabled: boolean;
        payouts_enabled: boolean;
      } | null;
      error: unknown;
    };

  if (!data) return null;

  return {
    id: data.id,
    stripeAccountId: data.stripe_account_id,
    status: data.status,
    chargesEnabled: data.charges_enabled,
    payoutsEnabled: data.payouts_enabled,
  };
}
