/**
 * Stripe Subscriptions
 *
 * Manages subscriptions for homeowners and providers.
 */

import { getStripe } from "./client";
import { PRICE_IDS } from "./products";
import { createClient } from "@/lib/supabase/server";
import type Stripe from "stripe";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://app.regularupkeep.com";

/**
 * Create or retrieve a Stripe customer for a user
 */
export async function ensureStripeCustomer(params: {
  userId: string;
  email: string;
  name?: string;
}): Promise<string> {
  const stripe = getStripe();
  const supabase = await createClient();

  // Check if user already has a Stripe customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("stripe_customer_id")
    .eq("id", params.userId)
    .single() as { data: { stripe_customer_id: string | null } | null; error: unknown };

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email: params.email,
    name: params.name,
    metadata: {
      user_id: params.userId,
    },
  });

  // Save to profile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("profiles") as any)
    .update({ stripe_customer_id: customer.id })
    .eq("id", params.userId);

  return customer.id;
}

/**
 * Create a checkout session for homeowner subscription
 */
export async function createHomeownerCheckoutSession(params: {
  customerId: string;
  customerProfileId: string;
  additionalHomes: number;
  tenantAccessCount: number;
  sponsorFree: boolean;
}): Promise<string> {
  const stripe = getStripe();

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

  // Add additional homes
  if (params.additionalHomes > 0 && PRICE_IDS.HOMEOWNER_ADDITIONAL_HOME_MONTHLY) {
    lineItems.push({
      price: PRICE_IDS.HOMEOWNER_ADDITIONAL_HOME_MONTHLY,
      quantity: params.additionalHomes,
    });
  }

  // Add tenant access
  if (params.tenantAccessCount > 0 && PRICE_IDS.HOMEOWNER_TENANT_ACCESS_MONTHLY) {
    lineItems.push({
      price: PRICE_IDS.HOMEOWNER_TENANT_ACCESS_MONTHLY,
      quantity: params.tenantAccessCount,
    });
  }

  // Add sponsor-free
  if (params.sponsorFree && PRICE_IDS.HOMEOWNER_SPONSOR_FREE_YEARLY) {
    lineItems.push({
      price: PRICE_IDS.HOMEOWNER_SPONSOR_FREE_YEARLY,
      quantity: 1,
    });
  }

  if (lineItems.length === 0) {
    throw new Error("No subscription items selected");
  }

  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: "subscription",
    line_items: lineItems,
    success_url: `${BASE_URL}/app/billing?success=true`,
    cancel_url: `${BASE_URL}/app/billing?canceled=true`,
    metadata: {
      user_id: params.customerProfileId,
      type: "homeowner_subscription",
    },
  });

  return session.url!;
}

/**
 * Create a checkout session for provider subscription
 */
export async function createProviderCheckoutSession(params: {
  customerId: string;
  providerId: string;
  tier: "verified" | "preferred";
}): Promise<string> {
  const stripe = getStripe();

  const priceId =
    params.tier === "verified"
      ? PRICE_IDS.PROVIDER_VERIFIED_MONTHLY
      : PRICE_IDS.PROVIDER_PREFERRED_MONTHLY;

  if (!priceId) {
    throw new Error(`Price not configured for ${params.tier} tier`);
  }

  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: "subscription",
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${BASE_URL}/provider/billing?success=true`,
    cancel_url: `${BASE_URL}/provider/billing?canceled=true`,
    metadata: {
      provider_id: params.providerId,
      tier: params.tier,
      type: "provider_subscription",
    },
  });

  return session.url!;
}

/**
 * Create a checkout session for sponsor subscription
 */
export async function createSponsorCheckoutSession(params: {
  customerId: string;
  sponsorId: string;
}): Promise<string> {
  const stripe = getStripe();

  if (!PRICE_IDS.SPONSOR_LOCAL_YEARLY) {
    throw new Error("Sponsor price not configured");
  }

  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: "subscription",
    line_items: [
      {
        price: PRICE_IDS.SPONSOR_LOCAL_YEARLY,
        quantity: 1,
      },
    ],
    success_url: `${BASE_URL}/sponsor/billing?success=true`,
    cancel_url: `${BASE_URL}/sponsor/billing?canceled=true`,
    metadata: {
      sponsor_id: params.sponsorId,
      type: "sponsor_subscription",
    },
  });

  return session.url!;
}

/**
 * Create a billing portal session for managing subscription
 */
export async function createBillingPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return session.url;
}

/**
 * Get subscription status
 */
export async function getSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return await stripe.subscriptions.retrieve(subscriptionId);
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId);
  }

  return await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

/**
 * Update subscription quantity (e.g., number of additional homes)
 */
export async function updateSubscriptionQuantity(params: {
  subscriptionId: string;
  itemId: string;
  quantity: number;
}): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  return await stripe.subscriptions.update(params.subscriptionId, {
    items: [
      {
        id: params.itemId,
        quantity: params.quantity,
      },
    ],
  });
}

/**
 * Pause a subscription
 */
export async function pauseSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  return await stripe.subscriptions.update(subscriptionId, {
    pause_collection: {
      behavior: "mark_uncollectible",
    },
  });
}

/**
 * Resume a paused subscription
 */
export async function resumeSubscription(
  subscriptionId: string
): Promise<Stripe.Subscription> {
  const stripe = getStripe();

  return await stripe.subscriptions.update(subscriptionId, {
    pause_collection: null,
  });
}

/**
 * Get customer's payment methods
 */
export async function getPaymentMethods(
  customerId: string
): Promise<Stripe.PaymentMethod[]> {
  const stripe = getStripe();

  const methods = await stripe.paymentMethods.list({
    customer: customerId,
    type: "card",
  });

  return methods.data;
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethod(params: {
  customerId: string;
  paymentMethodId: string;
}): Promise<void> {
  const stripe = getStripe();

  await stripe.customers.update(params.customerId, {
    invoice_settings: {
      default_payment_method: params.paymentMethodId,
    },
  });
}

/**
 * Detach a payment method
 */
export async function detachPaymentMethod(
  paymentMethodId: string
): Promise<void> {
  const stripe = getStripe();
  await stripe.paymentMethods.detach(paymentMethodId);
}
