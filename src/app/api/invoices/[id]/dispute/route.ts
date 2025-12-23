/**
 * Invoice Dispute API
 *
 * Opens a dispute for an invoice within the dispute window.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConfig } from "@/lib/config/admin-config";

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
    const { reason, description } = await request.json();

    if (!reason || !description) {
      return NextResponse.json(
        { error: "Reason and description are required" },
        { status: 400 }
      );
    }

    // Get the invoice with related data
    const { data: invoice } = await supabase
      .from("invoices")
      .select(`
        id,
        service_request_id,
        provider_id,
        total_cents,
        status,
        created_at,
        service_requests!inner(
          id,
          customer_id
        )
      `)
      .eq("id", invoiceId)
      .single() as {
        data: {
          id: string;
          service_request_id: string;
          provider_id: string;
          total_cents: number;
          status: string;
          created_at: string;
          service_requests: {
            id: string;
            customer_id: string;
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

    // Check invoice is in a state that can be disputed
    if (!["pending_approval", "paid"].includes(invoice.status)) {
      return NextResponse.json(
        { error: `Invoice cannot be disputed in ${invoice.status} state` },
        { status: 400 }
      );
    }

    // Check dispute window
    const paymentFlow = await getConfig("marketplace_payments");
    const invoiceCreated = new Date(invoice.created_at);
    const now = new Date();
    const hoursElapsed =
      (now.getTime() - invoiceCreated.getTime()) / (1000 * 60 * 60);

    if (hoursElapsed > paymentFlow.dispute_window_hours) {
      return NextResponse.json(
        { error: "Dispute window has expired" },
        { status: 400 }
      );
    }

    // Create dispute record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: dispute, error: disputeError } = await (supabase.from("disputes") as any)
      .insert({
        invoice_id: invoiceId,
        service_request_id: invoice.service_request_id,
        customer_id: user.id,
        provider_id: invoice.provider_id,
        reason,
        description,
        amount_disputed_cents: invoice.total_cents,
        status: "open",
      })
      .select()
      .single();

    if (disputeError) {
      throw disputeError;
    }

    // Update invoice status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("invoices") as any)
      .update({
        status: "disputed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoiceId);

    // Update service request status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("service_requests") as any)
      .update({
        status: "disputed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", invoice.service_request_id);

    return NextResponse.json({
      success: true,
      disputeId: dispute.id,
    });
  } catch (error) {
    console.error("Invoice dispute error:", error);
    return NextResponse.json(
      { error: "Failed to create dispute" },
      { status: 500 }
    );
  }
}
