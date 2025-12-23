/**
 * Diagnostic Fee Payment API
 *
 * Creates a payment intent for the diagnostic/trip fee.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureStripeCustomer } from "@/lib/stripe/subscriptions";
import { createDiagnosticFeePayment } from "@/lib/stripe/payments";
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
    // Get the service request
    const { data: serviceRequest } = await supabase
      .from("service_requests")
      .select(`
        id,
        customer_id,
        category,
        diagnostic_fee_paid
      `)
      .eq("id", serviceRequestId)
      .single() as {
        data: {
          id: string;
          customer_id: string;
          category: string;
          diagnostic_fee_paid: boolean;
        } | null;
      };

    if (!serviceRequest) {
      return NextResponse.json({ error: "Service request not found" }, { status: 404 });
    }

    // Verify the user owns this service request
    if (serviceRequest.customer_id !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Check if diagnostic fee is already paid
    if (serviceRequest.diagnostic_fee_paid) {
      return NextResponse.json(
        { error: "Diagnostic fee already paid" },
        { status: 400 }
      );
    }

    // Get diagnostic fee for this category
    const diagnosticFees = await getConfig("diagnostic_fees");
    const category = serviceRequest.category as keyof typeof diagnosticFees;
    const feeConfig = diagnosticFees[category] || diagnosticFees.default;
    const amountCents = feeConfig.fee_cents;

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

    // Create payment intent for diagnostic fee
    const { clientSecret, paymentIntentId } = await createDiagnosticFeePayment({
      customerId,
      serviceRequestId: serviceRequest.id,
      amountCents,
      category: serviceRequest.category,
    });

    return NextResponse.json({
      clientSecret,
      paymentIntentId,
      amountCents,
    });
  } catch (error) {
    console.error("Diagnostic fee error:", error);
    return NextResponse.json(
      { error: "Failed to create diagnostic fee payment" },
      { status: 500 }
    );
  }
}
