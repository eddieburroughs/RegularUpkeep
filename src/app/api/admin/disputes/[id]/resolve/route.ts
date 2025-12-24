/**
 * Admin Dispute Resolution API
 *
 * Allows admins to resolve disputes in favor of customer or provider.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createRefund } from "@/lib/stripe/payments";
import { transferToProvider } from "@/lib/stripe/connect";

type ResolutionType = "customer_favor" | "provider_favor" | "split";

interface ResolveRequest {
  resolution: ResolutionType;
  refundAmount?: number; // For customer_favor or split
  notes: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: disputeId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const body: ResolveRequest = await request.json();
    const { resolution, refundAmount, notes } = body;

    if (!resolution || !notes) {
      return NextResponse.json(
        { error: "Resolution type and notes are required" },
        { status: 400 }
      );
    }

    // Get the dispute with related data
    const { data: dispute } = await supabase
      .from("disputes")
      .select(`
        id,
        dispute_number,
        invoice_id,
        service_request_id,
        customer_id,
        provider_id,
        disputed_amount_cents,
        status,
        invoices!inner(
          id,
          total_cents,
          stripe_payment_intent_id,
          stripe_charge_id,
          provider_fee_cents
        ),
        customers!inner(
          profile_id
        ),
        providers!inner(
          profile_id
        ),
        provider_stripe_accounts(
          stripe_account_id
        )
      `)
      .eq("id", disputeId)
      .single() as {
        data: {
          id: string;
          dispute_number: string;
          invoice_id: string;
          service_request_id: string;
          customer_id: string;
          provider_id: string;
          disputed_amount_cents: number;
          status: string;
          invoices: {
            id: string;
            total_cents: number;
            stripe_payment_intent_id: string;
            stripe_charge_id: string;
            provider_fee_cents: number;
          };
          customers: {
            profile_id: string;
          };
          providers: {
            profile_id: string;
          };
          provider_stripe_accounts: Array<{
            stripe_account_id: string;
          }>;
        } | null;
      };

    if (!dispute) {
      return NextResponse.json({ error: "Dispute not found" }, { status: 404 });
    }

    if (!["open", "under_review"].includes(dispute.status)) {
      return NextResponse.json(
        { error: `Dispute is already ${dispute.status}` },
        { status: 400 }
      );
    }

    let refundId: string | null = null;
    let transferId: string | null = null;
    let resolvedRefundAmount = 0;
    let providerPayout = 0;

    const paymentIntentId = dispute.invoices.stripe_payment_intent_id;
    const totalAmount = dispute.invoices.total_cents;
    const providerStripeAccount = dispute.provider_stripe_accounts?.[0]?.stripe_account_id;

    if (resolution === "customer_favor") {
      // Full refund to customer
      resolvedRefundAmount = refundAmount || dispute.disputed_amount_cents;

      if (paymentIntentId) {
        const refund = await createRefund({
          paymentIntentId,
          amountCents: resolvedRefundAmount,
          reason: "requested_by_customer",
          metadata: {
            dispute_id: disputeId,
            resolution: "customer_favor",
          },
        });
        refundId = refund.id;
      }

      // Update invoice status
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("invoices") as any)
        .update({
          status: "refunded",
          updated_at: new Date().toISOString(),
        })
        .eq("id", dispute.invoice_id);
    } else if (resolution === "provider_favor") {
      // Release funds to provider (if not already transferred)
      const providerFee = dispute.invoices.provider_fee_cents || 0;
      providerPayout = totalAmount - providerFee;

      if (providerStripeAccount) {
        const transfer = await transferToProvider({
          stripeAccountId: providerStripeAccount,
          amountCents: providerPayout,
          metadata: {
            dispute_id: disputeId,
            resolution: "provider_favor",
            invoice_id: dispute.invoice_id,
          },
        });
        transferId = transfer.id;
      }

      // Update invoice with transfer
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("invoices") as any)
        .update({
          stripe_transfer_id: transferId,
          provider_transferred_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", dispute.invoice_id);
    } else if (resolution === "split") {
      // Partial refund to customer, remainder to provider
      resolvedRefundAmount = refundAmount || Math.floor(dispute.disputed_amount_cents / 2);

      if (paymentIntentId && resolvedRefundAmount > 0) {
        const refund = await createRefund({
          paymentIntentId,
          amountCents: resolvedRefundAmount,
          reason: "requested_by_customer",
          metadata: {
            dispute_id: disputeId,
            resolution: "split",
          },
        });
        refundId = refund.id;
      }

      // Transfer remainder to provider
      const providerFee = dispute.invoices.provider_fee_cents || 0;
      providerPayout = totalAmount - resolvedRefundAmount - providerFee;

      if (providerStripeAccount && providerPayout > 0) {
        const transfer = await transferToProvider({
          stripeAccountId: providerStripeAccount,
          amountCents: providerPayout,
          metadata: {
            dispute_id: disputeId,
            resolution: "split",
            invoice_id: dispute.invoice_id,
          },
        });
        transferId = transfer.id;
      }
    }

    // Determine final status
    const finalStatus = resolution === "customer_favor"
      ? "resolved_customer_favor"
      : resolution === "provider_favor"
        ? "resolved_provider_favor"
        : "closed";

    // Update dispute record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("disputes") as any)
      .update({
        status: finalStatus,
        resolution_notes: notes,
        refund_amount_cents: resolvedRefundAmount || null,
        resolved_by: user.id,
        resolved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", disputeId);

    // Update service request status
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("service_requests") as any)
      .update({
        status: resolution === "customer_favor" ? "canceled" : "completed",
        updated_at: new Date().toISOString(),
      })
      .eq("id", dispute.service_request_id);

    // Record transactions
    if (resolvedRefundAmount > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("transactions") as any).insert({
        profile_id: dispute.customers.profile_id,
        service_request_id: dispute.service_request_id,
        stripe_refund_id: refundId,
        type: "dispute_credit",
        status: "succeeded",
        amount_cents: resolvedRefundAmount,
        fee_cents: 0,
        net_cents: resolvedRefundAmount,
        description: `Dispute resolution refund - ${dispute.dispute_number}`,
        metadata: {
          dispute_id: disputeId,
          resolution,
        },
        processed_at: new Date().toISOString(),
      });
    }

    if (providerPayout > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("transactions") as any).insert({
        service_request_id: dispute.service_request_id,
        stripe_transfer_id: transferId,
        type: "provider_payout",
        status: "succeeded",
        amount_cents: providerPayout,
        fee_cents: dispute.invoices.provider_fee_cents || 0,
        net_cents: providerPayout,
        description: `Provider payout after dispute resolution - ${dispute.dispute_number}`,
        metadata: {
          dispute_id: disputeId,
          resolution,
        },
        processed_at: new Date().toISOString(),
      });
    }

    // Create notifications
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("notifications") as any).insert([
      {
        user_id: dispute.customers.profile_id,
        type: "dispute_resolved",
        title: "Dispute Resolved",
        message: resolution === "customer_favor"
          ? `Your dispute has been resolved in your favor. A refund of $${(resolvedRefundAmount / 100).toFixed(2)} will be processed.`
          : resolution === "provider_favor"
            ? "Your dispute has been reviewed and resolved in favor of the provider."
            : `Your dispute has been resolved. A partial refund of $${(resolvedRefundAmount / 100).toFixed(2)} will be processed.`,
        action_url: `/app/requests/${dispute.service_request_id}`,
        created_at: new Date().toISOString(),
      },
      {
        user_id: dispute.providers.profile_id,
        type: "dispute_resolved",
        title: "Dispute Resolved",
        message: resolution === "provider_favor"
          ? `The dispute has been resolved in your favor. Payment of $${(providerPayout / 100).toFixed(2)} will be transferred.`
          : resolution === "customer_favor"
            ? "The dispute has been resolved in favor of the customer."
            : `The dispute has been resolved. Payment of $${(providerPayout / 100).toFixed(2)} will be transferred.`,
        action_url: `/provider/jobs/${dispute.service_request_id}`,
        created_at: new Date().toISOString(),
      },
    ]);

    // Update provider metrics if dispute was customer favor
    if (resolution === "customer_favor") {
      // Get current metrics to increment
      const { data: currentMetrics } = await supabase
        .from("provider_metrics")
        .select("total_jobs_disputed")
        .eq("provider_id", dispute.provider_id)
        .single() as { data: { total_jobs_disputed: number } | null };

      if (currentMetrics) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("provider_metrics") as any)
          .update({
            total_jobs_disputed: (currentMetrics.total_jobs_disputed || 0) + 1,
            updated_at: new Date().toISOString(),
          })
          .eq("provider_id", dispute.provider_id);
      }
    }

    return NextResponse.json({
      success: true,
      disputeId,
      resolution,
      refundAmount: resolvedRefundAmount,
      providerPayout,
      refundId,
      transferId,
    });
  } catch (error) {
    console.error("Dispute resolution error:", error);
    return NextResponse.json(
      { error: "Failed to resolve dispute" },
      { status: 500 }
    );
  }
}
