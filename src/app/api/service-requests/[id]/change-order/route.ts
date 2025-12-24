/**
 * Change Order Submission API
 *
 * Provider submits a change order when work exceeds the estimate.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConfig } from "@/lib/config/admin-config";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: serviceRequestId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { reason, additionalCents, lineItems, photos } = await request.json();

    if (!reason || !additionalCents || additionalCents <= 0) {
      return NextResponse.json(
        { error: "Reason and additional amount are required" },
        { status: 400 }
      );
    }

    // Get the service request with estimate
    const { data: serviceRequest } = await supabase
      .from("service_requests")
      .select(`
        id,
        customer_id,
        provider_id,
        status,
        estimates!inner(
          id,
          total_cents,
          authorization_total_cents,
          status
        )
      `)
      .eq("id", serviceRequestId)
      .eq("estimates.status", "approved")
      .single() as {
        data: {
          id: string;
          customer_id: string;
          provider_id: string;
          status: string;
          estimates: {
            id: string;
            total_cents: number;
            authorization_total_cents: number;
            status: string;
          };
        } | null;
      };

    if (!serviceRequest) {
      return NextResponse.json(
        { error: "Service request not found or no approved estimate" },
        { status: 404 }
      );
    }

    // Verify the user is the provider for this service request
    const { data: provider } = await supabase
      .from("providers")
      .select("id")
      .eq("profile_id", user.id)
      .single() as { data: { id: string } | null };

    if (!provider || provider.id !== serviceRequest.provider_id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check service request is in a state that allows change orders
    if (!["estimate_approved", "in_progress"].includes(serviceRequest.status)) {
      return NextResponse.json(
        { error: `Cannot submit change order in ${serviceRequest.status} state` },
        { status: 400 }
      );
    }

    // Get payment flow config for threshold
    const paymentFlow = await getConfig("marketplace_payments");
    const threshold = paymentFlow.change_order_threshold_percentage;

    // Calculate if change order is needed
    const originalTotal = serviceRequest.estimates.total_cents;
    const percentageIncrease = (additionalCents / originalTotal) * 100;

    if (percentageIncrease <= threshold) {
      return NextResponse.json(
        {
          error: `Change order not required for increases under ${threshold}%. The authorized buffer covers this.`,
          percentageIncrease,
          threshold,
        },
        { status: 400 }
      );
    }

    // Create change order record
    const newTotal = originalTotal + additionalCents;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: changeOrder, error: changeOrderError } = await (supabase.from("change_orders") as any)
      .insert({
        estimate_id: serviceRequest.estimates.id,
        service_request_id: serviceRequestId,
        provider_id: provider.id,
        customer_id: serviceRequest.customer_id,
        original_total_cents: originalTotal,
        additional_cents: additionalCents,
        new_total_cents: newTotal,
        reason,
        line_items: lineItems || [],
        photos: photos || [],
        status: "pending",
        expires_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(), // 48 hour expiry
      })
      .select()
      .single();

    if (changeOrderError) {
      throw changeOrderError;
    }

    return NextResponse.json({
      success: true,
      changeOrderId: changeOrder.id,
      changeOrderNumber: changeOrder.change_order_number,
      originalTotal: originalTotal,
      additionalAmount: additionalCents,
      newTotal: newTotal,
      expiresAt: changeOrder.expires_at,
    });
  } catch (error) {
    console.error("Change order submission error:", error);
    return NextResponse.json(
      { error: "Failed to submit change order" },
      { status: 500 }
    );
  }
}
