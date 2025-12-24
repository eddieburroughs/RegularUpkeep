/**
 * Change Order Rejection API
 *
 * Customer rejects a change order.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Get the change order
    const { data: changeOrder } = await supabase
      .from("change_orders")
      .select(`
        id,
        customer_id,
        status
      `)
      .eq("id", changeOrderId)
      .single() as {
        data: {
          id: string;
          customer_id: string;
          status: string;
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
        { error: `Change order is already ${changeOrder.status}` },
        { status: 400 }
      );
    }

    // Update change order status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("change_orders") as any)
      .update({
        status: "rejected",
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", changeOrderId);

    return NextResponse.json({
      success: true,
      changeOrderId,
      status: "rejected",
    });
  } catch (error) {
    console.error("Change order rejection error:", error);
    return NextResponse.json(
      { error: "Failed to reject change order" },
      { status: 500 }
    );
  }
}
