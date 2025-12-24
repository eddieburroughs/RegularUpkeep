/**
 * Stripe Payments
 *
 * Handles marketplace payment flows:
 * - Diagnostic fee collection
 * - Estimate authorization (with buffer)
 * - Manual capture after work completion
 * - Refunds and disputes
 */

import { getStripe } from "./client";
import { createClient } from "@/lib/supabase/server";
import { calculateProviderFee, calculateHomeownerPlatformFee, getConfig } from "@/lib/config/admin-config";
import type Stripe from "stripe";

/**
 * Create a payment intent for diagnostic fee
 */
export async function createDiagnosticFeePayment(params: {
  customerId: string;
  serviceRequestId: string;
  amountCents: number;
  category: string;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create({
    customer: params.customerId,
    amount: params.amountCents,
    currency: "usd",
    capture_method: "automatic", // Diagnostic fees are captured immediately
    metadata: {
      type: "diagnostic_fee",
      service_request_id: params.serviceRequestId,
      category: params.category,
    },
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * Create a payment intent for estimate authorization (manual capture)
 * This authorizes the estimate amount + buffer + max platform fee for later capture
 */
export async function authorizeEstimate(params: {
  customerId: string;
  estimateId: string;
  serviceRequestId: string;
  amountCents: number;
  bufferPercentage: number;
}): Promise<{ clientSecret: string; paymentIntentId: string; authorizedAmount: number }> {
  const stripe = getStripe();

  // Calculate authorization amount with buffer
  const bufferAmount = Math.ceil(params.amountCents * (params.bufferPercentage / 100));
  const estimateWithBuffer = params.amountCents + bufferAmount;

  // Include max possible platform fee in authorization (based on buffered amount)
  const maxPlatformFee = await calculateHomeownerPlatformFee(estimateWithBuffer);
  const authorizedAmount = estimateWithBuffer + maxPlatformFee;

  const paymentIntent = await stripe.paymentIntents.create({
    customer: params.customerId,
    amount: authorizedAmount,
    currency: "usd",
    capture_method: "manual", // Manual capture for marketplace flow
    metadata: {
      type: "estimate_authorization",
      estimate_id: params.estimateId,
      service_request_id: params.serviceRequestId,
      original_amount: params.amountCents.toString(),
      buffer_amount: bufferAmount.toString(),
      max_platform_fee: maxPlatformFee.toString(),
    },
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
    authorizedAmount,
  };
}

/**
 * Capture an authorized payment after work completion
 * Captures invoice amount + homeowner platform fee
 * Provider gets invoice amount minus commission
 */
export async function capturePayment(params: {
  paymentIntentId: string;
  amountToCapture: number; // Invoice total (work cost)
  invoiceId: string;
  providerId: string;
  providerStripeAccountId: string;
  useInstantPayout?: boolean; // Optional: instant payout (+1% fee)
}): Promise<{
  chargeId: string;
  providerTransferId: string | null; // null if using delayed transfer
  providerAmount: number;
  providerFee: number; // Commission taken from provider
  homeownerPlatformFee: number; // Fee charged to homeowner
  totalCaptured: number; // Total amount captured from customer
}> {
  const stripe = getStripe();
  const supabase = await createClient();

  // Calculate homeowner platform fee (charged on top of invoice)
  const homeownerPlatformFee = await calculateHomeownerPlatformFee(params.amountToCapture);
  const totalCaptured = params.amountToCapture + homeownerPlatformFee;

  // Calculate provider fee (commission from invoice amount)
  let providerFee = await calculateProviderFee(params.amountToCapture);

  // Add instant payout fee if requested (ADDENDUM C3)
  if (params.useInstantPayout) {
    const payoutConfig = await getConfig("provider_payout");
    const instantPayoutFee = Math.ceil(params.amountToCapture * (payoutConfig.instant_payout_fee_percentage / 100));
    providerFee += instantPayoutFee;
  }

  const providerAmount = params.amountToCapture - providerFee;

  // Capture the payment (invoice + platform fee)
  const paymentIntent = await stripe.paymentIntents.capture(
    params.paymentIntentId,
    {
      amount_to_capture: totalCaptured,
    }
  );

  const chargeId = paymentIntent.latest_charge as string;

  // For standard flow: provider transfer is delayed (handled by cron after dispute window)
  // For instant payout: create immediate transfer
  let transferId: string | null = null;
  if (params.useInstantPayout) {
    const transfer = await stripe.transfers.create({
      amount: providerAmount,
      currency: "usd",
      destination: params.providerStripeAccountId,
      source_transaction: chargeId,
      metadata: {
        invoice_id: params.invoiceId,
        provider_id: params.providerId,
        instant_payout: "true",
      },
    });
    transferId = transfer.id;
  }

  // Record the transaction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("transactions") as any).insert({
    booking_id: null,
    service_request_id: paymentIntent.metadata.service_request_id,
    stripe_payment_intent_id: params.paymentIntentId,
    stripe_charge_id: chargeId,
    stripe_transfer_id: transferId,
    type: "service_payment",
    status: "succeeded",
    amount_cents: totalCaptured,
    fee_cents: providerFee + homeownerPlatformFee, // Total fees collected
    net_cents: providerAmount,
    currency: "usd",
    description: `Payment for invoice`,
    metadata: {
      invoice_id: params.invoiceId,
      provider_id: params.providerId,
      invoice_amount: params.amountToCapture,
      homeowner_platform_fee: homeownerPlatformFee,
      provider_commission: providerFee,
      instant_payout: params.useInstantPayout ? "true" : "false",
    },
    processed_at: new Date().toISOString(),
  });

  return {
    chargeId,
    providerTransferId: transferId,
    providerAmount,
    providerFee,
    homeownerPlatformFee,
    totalCaptured,
  };
}

/**
 * Cancel an uncaptured authorization
 */
export async function cancelAuthorization(
  paymentIntentId: string
): Promise<void> {
  const stripe = getStripe();
  await stripe.paymentIntents.cancel(paymentIntentId);
}

/**
 * Create a refund for a captured payment
 */
export async function createRefund(params: {
  paymentIntentId: string;
  amountCents?: number; // Full refund if not specified
  reason?: "requested_by_customer" | "duplicate" | "fraudulent";
  metadata?: Record<string, string>;
}): Promise<Stripe.Refund> {
  const stripe = getStripe();
  const supabase = await createClient();

  const refund = await stripe.refunds.create({
    payment_intent: params.paymentIntentId,
    amount: params.amountCents,
    reason: params.reason,
    metadata: params.metadata,
  });

  // Record the refund transaction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("transactions") as any).insert({
    stripe_payment_intent_id: params.paymentIntentId,
    stripe_refund_id: refund.id,
    type: "refund",
    status: refund.status === "succeeded" ? "succeeded" : "processing",
    amount_cents: -(refund.amount || 0),
    fee_cents: 0,
    net_cents: -(refund.amount || 0),
    currency: "usd",
    description: `Refund`,
    metadata: params.metadata || {},
    processed_at: new Date().toISOString(),
  });

  return refund;
}

/**
 * Reverse a transfer to a provider (for disputes)
 */
export async function reverseTransfer(params: {
  transferId: string;
  amountCents?: number;
  description?: string;
}): Promise<Stripe.TransferReversal> {
  const stripe = getStripe();

  return await stripe.transfers.createReversal(params.transferId, {
    amount: params.amountCents,
    description: params.description,
  });
}

/**
 * Create a payment intent for a one-time charge (e.g., additional fees)
 */
export async function createOneTimePayment(params: {
  customerId: string;
  amountCents: number;
  description: string;
  metadata?: Record<string, string>;
}): Promise<{ clientSecret: string; paymentIntentId: string }> {
  const stripe = getStripe();

  const paymentIntent = await stripe.paymentIntents.create({
    customer: params.customerId,
    amount: params.amountCents,
    currency: "usd",
    capture_method: "automatic",
    description: params.description,
    metadata: params.metadata,
  });

  return {
    clientSecret: paymentIntent.client_secret!,
    paymentIntentId: paymentIntent.id,
  };
}

/**
 * Get payment intent status
 */
export async function getPaymentIntent(
  paymentIntentId: string
): Promise<Stripe.PaymentIntent> {
  const stripe = getStripe();
  return await stripe.paymentIntents.retrieve(paymentIntentId);
}

/**
 * Create a setup intent for saving payment method without charging
 */
export async function createSetupIntent(
  customerId: string
): Promise<{ clientSecret: string; setupIntentId: string }> {
  const stripe = getStripe();

  const setupIntent = await stripe.setupIntents.create({
    customer: customerId,
    payment_method_types: ["card"],
  });

  return {
    clientSecret: setupIntent.client_secret!,
    setupIntentId: setupIntent.id,
  };
}

/**
 * Create a Stripe Checkout session for collecting payment method
 */
export async function createSetupCheckoutSession(params: {
  customerId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    customer: params.customerId,
    mode: "setup",
    payment_method_types: ["card"],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
  });

  return session.url!;
}
