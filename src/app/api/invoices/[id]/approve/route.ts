/**
 * Invoice Approval API
 *
 * Captures the authorized payment for a completed invoice.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { capturePayment } from "@/lib/stripe/payments";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: invoiceId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the invoice with related data
    const { data: invoice } = await supabase
      .from("invoices")
      .select(`
        id,
        service_request_id,
        estimate_id,
        provider_id,
        total_cents,
        status,
        stripe_payment_intent_id,
        service_requests!inner(
          id,
          customer_id
        ),
        estimates!inner(
          id,
          stripe_payment_intent_id,
          authorized_amount_cents
        )
      `)
      .eq("id", invoiceId)
      .single() as {
        data: {
          id: string;
          service_request_id: string;
          estimate_id: string;
          provider_id: string;
          total_cents: number;
          status: string;
          stripe_payment_intent_id: string | null;
          service_requests: {
            id: string;
            customer_id: string;
          };
          estimates: {
            id: string;
            stripe_payment_intent_id: string | null;
            authorized_amount_cents: number | null;
          };
        } | null;
      };

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    // Verify the user owns this service request
    if (invoice.service_requests.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check invoice is in a state that can be approved
    if (invoice.status !== "pending_approval") {
      return NextResponse.json(
        { error: `Invoice cannot be approved in ${invoice.status} state` },
        { status: 400 }
      );
    }

    // Get payment intent from estimate
    const paymentIntentId = invoice.estimates.stripe_payment_intent_id;
    if (!paymentIntentId) {
      return NextResponse.json(
        { error: "No payment authorization found" },
        { status: 400 }
      );
    }

    // Verify the invoice amount doesn't exceed authorized amount
    const authorizedAmount = invoice.estimates.authorized_amount_cents || 0;
    if (invoice.total_cents > authorizedAmount) {
      return NextResponse.json(
        { error: "Invoice amount exceeds authorized amount" },
        { status: 400 }
      );
    }

    // Get provider's Stripe account
    const { data: providerAccount } = await supabase
      .from("provider_stripe_accounts")
      .select("stripe_account_id")
      .eq("provider_id", invoice.provider_id)
      .single() as { data: { stripe_account_id: string } | null };

    if (!providerAccount?.stripe_account_id) {
      return NextResponse.json(
        { error: "Provider payment account not configured" },
        { status: 400 }
      );
    }

    // Capture the payment
    const { chargeId, providerTransferId, providerAmount, platformFee } =
      await capturePayment({
        paymentIntentId,
        amountToCapture: invoice.total_cents,
        invoiceId: invoice.id,
        providerId: invoice.provider_id,
        providerStripeAccountId: providerAccount.stripe_account_id,
      });

    // Update invoice status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("invoices") as any)
      .update({
        status: "paid",
        stripe_charge_id: chargeId,
        stripe_transfer_id: providerTransferId,
        platform_fee_cents: platformFee,
        provider_payout_cents: providerAmount,
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    // Update service request status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("service_requests") as any)
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.service_request_id);

    return NextResponse.json({
      success: true,
      chargeId,
      providerTransferId,
      providerAmount,
      platformFee,
    });
  } catch (error) {
    console.error("Invoice approval error:", error);
    return NextResponse.json(
      { error: "Failed to approve invoice" },
      { status: 500 }
    );
  }
}
