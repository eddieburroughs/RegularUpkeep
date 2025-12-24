/**
 * Change Order Approval API
 *
 * Customer approves a change order, authorizing additional funds.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";
import { getConfig } from "@/lib/config/admin-config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: changeOrderId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the change order with related data
    const { data: changeOrder } = await supabase
      .from("change_orders")
      .select(`
        id,
        estimate_id,
        service_request_id,
        customer_id,
        additional_cents,
        new_total_cents,
        status,
        expires_at,
        estimates!inner(
          id,
          stripe_payment_intent_id,
          authorization_total_cents
        )
      `)
      .eq("id", changeOrderId)
      .single() as {
        data: {
          id: string;
          estimate_id: string;
          service_request_id: string;
          customer_id: string;
          additional_cents: number;
          new_total_cents: number;
          status: string;
          expires_at: string;
          estimates: {
            id: string;
            stripe_payment_intent_id: string | null;
            authorization_total_cents: number;
          };
        } | null;
      };

    if (!changeOrder) {
      return NextResponse.json({ error: "Change order not found" }, { status: 404 });
    }

    // Verify the user owns this change order
    if (changeOrder.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check change order is pending
    if (changeOrder.status !== "pending") {
      return NextResponse.json(
        { error: `Change order is ${changeOrder.status}` },
        { status: 400 }
      );
    }

    // Check if expired
    if (new Date(changeOrder.expires_at) < new Date()) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("change_orders") as any)
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", changeOrderId);

      return NextResponse.json(
        { error: "Change order has expired" },
        { status: 400 }
      );
    }

    // Get payment flow config for new buffer
    const paymentFlow = await getConfig("marketplace_payments");
    const bufferPercentage = paymentFlow.estimate_buffer_percentage;

    // Calculate new authorization amount
    const newBuffer = Math.ceil(changeOrder.new_total_cents * (bufferPercentage / 100));
    const newAuthorizationTotal = changeOrder.new_total_cents + newBuffer;

    // Update the existing payment intent with higher amount
    const stripe = getStripe();
    const originalPaymentIntentId = changeOrder.estimates.stripe_payment_intent_id;

    if (originalPaymentIntentId) {
      try {
        await stripe.paymentIntents.update(originalPaymentIntentId, {
          amount: newAuthorizationTotal,
          metadata: {
            change_order_id: changeOrderId,
            original_amount: changeOrder.estimates.authorization_total_cents.toString(),
            new_amount: newAuthorizationTotal.toString(),
          },
        });
      } catch (stripeError) {
        console.error("Failed to update payment intent:", stripeError);
        return NextResponse.json(
          { error: "Failed to update payment authorization" },
          { status: 500 }
        );
      }
    }

    // Update change order status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("change_orders") as any)
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", changeOrderId);

    // Update estimate with new authorized amount
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("estimates") as any)
      .update({
        total_cents: changeOrder.new_total_cents,
        authorization_total_cents: newAuthorizationTotal,
        buffer_cents: newBuffer,
        updated_at: new Date().toISOString(),
      })
      .eq("id", changeOrder.estimate_id);

    // Record transaction for audit trail
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("transactions") as any).insert({
      profile_id: user.id,
      service_request_id: changeOrder.service_request_id,
      stripe_payment_intent_id: originalPaymentIntentId,
      type: "service_payment",
      status: "pending",
      amount_cents: changeOrder.additional_cents,
      fee_cents: 0,
      net_cents: changeOrder.additional_cents,
      description: `Change order approved - additional $${(changeOrder.additional_cents / 100).toFixed(2)}`,
      metadata: {
        change_order_id: changeOrderId,
        original_amount: changeOrder.estimates.authorization_total_cents,
        new_authorization: newAuthorizationTotal,
      },
    });

    return NextResponse.json({
      success: true,
      changeOrderId,
      newTotal: changeOrder.new_total_cents,
      newAuthorizationAmount: newAuthorizationTotal,
    });
  } catch (error) {
    console.error("Change order approval error:", error);
    return NextResponse.json(
      { error: "Failed to approve change order" },
      { status: 500 }
    );
  }
}
