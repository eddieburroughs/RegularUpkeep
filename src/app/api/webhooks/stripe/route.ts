/**
 * Stripe Webhook Handler
 *
 * Handles Stripe events with idempotency to prevent duplicate processing.
 * Events are logged to webhook_events table before processing.
 */

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createClient } from "@/lib/supabase/server";

// Webhook secret from Stripe dashboard
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

export async function POST(request: NextRequest) {
  if (!webhookSecret) {
    console.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const stripe = getStripe();
  const supabase = await createClient();

  // Get the raw body and signature
  const body = await request.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Check if event was already processed (idempotency)
  const { data: existingEvent } = await supabase
    .from("webhook_events")
    .select("id, processed")
    .eq("source", "stripe")
    .eq("event_id", event.id)
    .single() as { data: { id: string; processed: boolean } | null; error: unknown };

  if (existingEvent?.processed) {
    // Event already processed, return success
    return NextResponse.json({ received: true, already_processed: true });
  }

  // Log the event
  if (!existingEvent) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("webhook_events") as any).insert({
      source: "stripe",
      event_id: event.id,
      event_type: event.type,
      payload: event,
      processed: false,
    });
  }

  try {
    // Process the event based on type
    await processWebhookEvent(event, supabase);

    // Mark as processed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("webhook_events") as any)
      .update({
        processed: true,
        processed_at: new Date().toISOString(),
      })
      .eq("source", "stripe")
      .eq("event_id", event.id);

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error(`Error processing webhook ${event.type}:`, error);

    // Record error but don't fail - Stripe will retry
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("webhook_events") as any)
      .update({
        error: error instanceof Error ? error.message : "Unknown error",
        retry_count: existingEvent
          ? (await supabase
              .from("webhook_events")
              .select("retry_count")
              .eq("source", "stripe")
              .eq("event_id", event.id)
              .single() as { data: { retry_count: number } | null; error: unknown }).data?.retry_count || 0 + 1
          : 1,
      })
      .eq("source", "stripe")
      .eq("event_id", event.id);

    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processWebhookEvent(event: Stripe.Event, supabase: any) {
  switch (event.type) {
    // Checkout completed
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session, supabase);
      break;

    // Subscription events
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await handleSubscriptionUpdate(event.data.object as Stripe.Subscription, supabase);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionCanceled(event.data.object as Stripe.Subscription, supabase);
      break;

    // Invoice events
    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice, supabase);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, supabase);
      break;

    // Payment intent events
    case "payment_intent.succeeded":
      await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, supabase);
      break;

    case "payment_intent.payment_failed":
      await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, supabase);
      break;

    // Connect account events
    case "account.updated":
      await handleAccountUpdated(event.data.object as Stripe.Account, supabase);
      break;

    // Payout events
    case "payout.paid":
    case "payout.failed":
      await handlePayoutUpdate(event.data.object as Stripe.Payout, event.type, supabase);
      break;

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const metadata = session.metadata || {};
  const type = metadata.type;

  if (type === "homeowner_subscription") {
    // Update homeowner subscription record
    const customerId = session.customer as string;
    const subscriptionId = session.subscription as string;

    await supabase
      .from("homeowner_subscriptions")
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("customer_id", metadata.user_id);
  } else if (type === "provider_subscription") {
    // Update provider subscription record
    const subscriptionId = session.subscription as string;

    await supabase
      .from("provider_subscriptions")
      .update({
        stripe_subscription_id: subscriptionId,
        tier: metadata.tier,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("provider_id", metadata.provider_id);
  } else if (type === "sponsor_subscription") {
    // Update sponsor subscription record
    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    await supabase
      .from("sponsors")
      .update({
        stripe_subscription_id: subscriptionId,
        stripe_customer_id: customerId,
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", metadata.sponsor_id);
  }
}

async function handleSubscriptionUpdate(
  subscription: Stripe.Subscription,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const status = mapSubscriptionStatus(subscription.status);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sub = subscription as any;

  // Try to find matching subscription by stripe_subscription_id
  // First check homeowner subscriptions
  const { data: homeownerSub } = await supabase
    .from("homeowner_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (homeownerSub) {
    await supabase
      .from("homeowner_subscriptions")
      .update({
        status,
        current_period_start: sub.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString()
          : null,
        current_period_end: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq("id", homeownerSub.id);
    return;
  }

  // Check provider subscriptions
  const { data: providerSub } = await supabase
    .from("provider_subscriptions")
    .select("id")
    .eq("stripe_subscription_id", subscription.id)
    .single();

  if (providerSub) {
    await supabase
      .from("provider_subscriptions")
      .update({
        status,
        current_period_start: sub.current_period_start
          ? new Date(sub.current_period_start * 1000).toISOString()
          : null,
        current_period_end: sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null,
        cancel_at_period_end: subscription.cancel_at_period_end,
        updated_at: new Date().toISOString(),
      })
      .eq("id", providerSub.id);
    return;
  }

  // Check sponsor subscriptions
  await supabase
    .from("sponsors")
    .update({
      status: subscription.status === "active" ? "active" : "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

async function handleSubscriptionCanceled(
  subscription: Stripe.Subscription,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  // Update all matching subscriptions to canceled
  await supabase
    .from("homeowner_subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  await supabase
    .from("provider_subscriptions")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);

  await supabase
    .from("sponsors")
    .update({
      status: "canceled",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

async function handleInvoicePaid(
  invoice: Stripe.Invoice,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;

  // Record transaction
  await supabase.from("transactions").insert({
    profile_id: null, // Will be resolved from customer
    stripe_payment_intent_id: inv.payment_intent as string,
    stripe_charge_id: inv.charge as string,
    type: "subscription_payment",
    status: "succeeded",
    amount_cents: invoice.amount_paid,
    fee_cents: 0,
    net_cents: invoice.amount_paid,
    currency: invoice.currency,
    description: `Subscription payment - ${invoice.number}`,
    metadata: {
      invoice_id: invoice.id,
      subscription_id: inv.subscription,
    },
    processed_at: new Date().toISOString(),
  });
}

async function handleInvoicePaymentFailed(
  invoice: Stripe.Invoice,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const inv = invoice as any;

  // Update subscription status to past_due
  if (inv.subscription) {
    await supabase
      .from("homeowner_subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", inv.subscription);

    await supabase
      .from("provider_subscriptions")
      .update({
        status: "past_due",
        updated_at: new Date().toISOString(),
      })
      .eq("stripe_subscription_id", inv.subscription);
  }
}

async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const metadata = paymentIntent.metadata || {};

  if (metadata.type === "diagnostic_fee") {
    // Mark diagnostic fee as paid
    await supabase
      .from("service_requests")
      .update({
        diagnostic_fee_paid: true,
        diagnostic_payment_intent_id: paymentIntent.id,
        updated_at: new Date().toISOString(),
      })
      .eq("id", metadata.service_request_id);
  }
}

async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  // Record failed transaction
  await supabase.from("transactions").insert({
    stripe_payment_intent_id: paymentIntent.id,
    type: "service_payment",
    status: "failed",
    amount_cents: paymentIntent.amount,
    fee_cents: 0,
    net_cents: paymentIntent.amount,
    currency: paymentIntent.currency,
    failure_reason: paymentIntent.last_payment_error?.message,
    metadata: paymentIntent.metadata,
    processed_at: new Date().toISOString(),
  });
}

async function handleAccountUpdated(
  account: Stripe.Account,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  const isComplete = account.charges_enabled && account.payouts_enabled;

  await supabase
    .from("provider_stripe_accounts")
    .update({
      status: isComplete ? "active" : "pending",
      onboarding_complete: isComplete,
      charges_enabled: account.charges_enabled || false,
      payouts_enabled: account.payouts_enabled || false,
      details_submitted: account.details_submitted || false,
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_account_id", account.id);
}

async function handlePayoutUpdate(
  payout: Stripe.Payout,
  eventType: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
) {
  // Record payout transaction
  await supabase.from("transactions").insert({
    stripe_transfer_id: payout.id,
    type: "provider_payout",
    status: eventType === "payout.paid" ? "succeeded" : "failed",
    amount_cents: payout.amount,
    fee_cents: 0,
    net_cents: payout.amount,
    currency: payout.currency,
    description: payout.description || "Provider payout",
    failure_reason: eventType === "payout.failed" ? payout.failure_message : null,
    processed_at: new Date().toISOString(),
  });
}

function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): "trialing" | "active" | "past_due" | "canceled" | "paused" {
  switch (stripeStatus) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
    case "unpaid":
      return "past_due";
    case "canceled":
    case "incomplete_expired":
      return "canceled";
    case "paused":
      return "paused";
    default:
      return "active";
  }
}
