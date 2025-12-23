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
import { calculateProviderFee } from "@/lib/config/admin-config";
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
 * This authorizes the estimate amount + buffer for later capture
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
  const authorizedAmount = params.amountCents + bufferAmount;

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
 * Captures up to the authorized amount
 */
export async function capturePayment(params: {
  paymentIntentId: string;
  amountToCapture: number;
  invoiceId: string;
  providerId: string;
  providerStripeAccountId: string;
}): Promise<{
  chargeId: string;
  providerTransferId: string;
  providerAmount: number;
  platformFee: number;
}> {
  const stripe = getStripe();
  const supabase = await createClient();

  // Calculate platform fee
  const providerFee = await calculateProviderFee(params.amountToCapture);
  const providerAmount = params.amountToCapture - providerFee;

  // Capture the payment
  const paymentIntent = await stripe.paymentIntents.capture(
    params.paymentIntentId,
    {
      amount_to_capture: params.amountToCapture,
    }
  );

  const chargeId = paymentIntent.latest_charge as string;

  // Create transfer to provider
  const transfer = await stripe.transfers.create({
    amount: providerAmount,
    currency: "usd",
    destination: params.providerStripeAccountId,
    source_transaction: chargeId,
    metadata: {
      invoice_id: params.invoiceId,
      provider_id: params.providerId,
    },
  });

  // Record the transaction
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase.from("transactions") as any).insert({
    booking_id: null,
    service_request_id: paymentIntent.metadata.service_request_id,
    stripe_payment_intent_id: params.paymentIntentId,
    stripe_charge_id: chargeId,
    stripe_transfer_id: transfer.id,
    type: "service_payment",
    status: "succeeded",
    amount_cents: params.amountToCapture,
    fee_cents: providerFee,
    net_cents: providerAmount,
    currency: "usd",
    description: `Payment for invoice`,
    metadata: {
      invoice_id: params.invoiceId,
      provider_id: params.providerId,
    },
    processed_at: new Date().toISOString(),
  });

  return {
    chargeId,
    providerTransferId: transfer.id,
    providerAmount,
    platformFee: providerFee,
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
