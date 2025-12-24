/**
 * Estimate Approval API
 *
 * Authorizes payment for an estimate and updates the status.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureStripeCustomer } from "@/lib/stripe/subscriptions";
import { authorizeEstimate } from "@/lib/stripe/payments";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: estimateId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the estimate with service request details
    const { data: estimate } = await supabase
      .from("estimates")
      .select(`
        id,
        service_request_id,
        total_cents,
        status,
        service_requests!inner(
          id,
          customer_id,
          property_id
        )
      `)
      .eq("id", estimateId)
      .single() as {
        data: {
          id: string;
          service_request_id: string;
          total_cents: number;
          status: string;
          service_requests: {
            id: string;
            customer_id: string;
            property_id: string;
          };
        } | null;
      };

    if (!estimate) {
      return NextResponse.json({ error: "Estimate not found" }, { status: 404 });
    }

    // Verify the user owns this service request
    if (estimate.service_requests.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check estimate is in a state that can be approved
    if (!["sent", "viewed"].includes(estimate.status)) {
      return NextResponse.json(
        { error: `Estimate cannot be approved in ${estimate.status} state` },
        { status: 400 }
      );
    }

    // Get user's profile for Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", user.id)
      .single() as { data: { id: string; email: string; full_name: string | null } | null };

    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }

    // Ensure Stripe customer exists
    const customerId = await ensureStripeCustomer({
      userId: user.id,
      email: profile.email,
      name: profile.full_name || undefined,
    });

    // Authorize the payment (uses config for buffer % and cap)
    const { clientSecret, paymentIntentId, authorizedAmount, bufferAmount, platformFee } =
      await authorizeEstimate({
        customerId,
        estimateId: estimate.id,
        serviceRequestId: estimate.service_request_id,
        amountCents: estimate.total_cents,
      });

    // Update estimate status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("estimates") as any)
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        stripe_payment_intent_id: paymentIntentId,
        authorized_amount_cents: authorizedAmount,
        buffer_amount_cents: bufferAmount,
        updated_at: new Date().toISOString(),
      })
      .eq("id", estimateId);

    // Update service request status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("service_requests") as any)
      .update({
        status: "estimate_approved",
        updated_at: new Date().toISOString(),
      })
      .eq("id", estimate.service_request_id);

    return NextResponse.json({
      success: true,
      clientSecret,
      paymentIntentId,
      estimateAmount: estimate.total_cents,
      bufferAmount,
      platformFee,
      authorizedAmount,
    });
  } catch (error) {
    console.error("Estimate approval error:", error);
    return NextResponse.json(
      { error: "Failed to approve estimate" },
      { status: 500 }
    );
  }
}
