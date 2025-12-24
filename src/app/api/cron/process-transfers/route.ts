/**
 * Delayed Transfer Processing Cron Job
 *
 * Processes provider transfers after the dispute window has passed.
 * Should be run every hour via external cron.
 *
 * Logic:
 * 1. Find invoices with status='paid' and paid_at > dispute_window (72h default)
 * 2. Check no open disputes
 * 3. Execute transfer to provider
 * 4. Update transaction records
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { transferToProvider } from "@/lib/stripe/connect";
import { getConfig, calculateProviderFee } from "@/lib/config/admin-config";

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    // Get marketplace payment config
    const paymentConfig = await getConfig("marketplace_payments");
    const holdPeriodHours = paymentConfig.hold_period_hours || 72;

    // Calculate cutoff time
    const cutoffTime = new Date(Date.now() - holdPeriodHours * 60 * 60 * 1000);

    // Find invoices ready for transfer
    const { data: invoices, error: invoicesError } = await supabase
      .from("invoices")
      .select(`
        id,
        invoice_number,
        service_request_id,
        provider_id,
        total_cents,
        provider_fee_cents,
        provider_net_cents,
        paid_at,
        stripe_payment_intent_id,
        provider_stripe_accounts!inner(
          stripe_account_id,
          status
        )
      `)
      .eq("status", "paid")
      .lt("paid_at", cutoffTime.toISOString())
      .is("stripe_transfer_id", null) as {
        data: Array<{
          id: string;
          invoice_number: string;
          service_request_id: string;
          provider_id: string;
          total_cents: number;
          provider_fee_cents: number;
          provider_net_cents: number;
          paid_at: string;
          stripe_payment_intent_id: string;
          provider_stripe_accounts: {
            stripe_account_id: string;
            status: string;
          };
        }> | null;
        error: unknown;
      };

    if (invoicesError) {
      console.error("Error fetching invoices:", invoicesError);
      throw invoicesError;
    }

    if (!invoices || invoices.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No invoices ready for transfer",
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const invoice of invoices) {
      try {
        // Check for open disputes
        const { data: disputes } = await supabase
          .from("disputes")
          .select("id, status")
          .eq("invoice_id", invoice.id)
          .in("status", ["open", "under_review"]) as {
            data: Array<{ id: string; status: string }> | null;
          };

        if (disputes && disputes.length > 0) {
          console.log(`Skipping invoice ${invoice.invoice_number} - has open disputes`);
          results.skipped++;
          continue;
        }

        // Verify provider stripe account is active
        if (invoice.provider_stripe_accounts.status !== "active") {
          console.log(`Skipping invoice ${invoice.invoice_number} - provider account not active`);
          results.skipped++;
          continue;
        }

        // Calculate transfer amount (total - platform fee)
        const providerFee = invoice.provider_fee_cents || await calculateProviderFee(invoice.total_cents);
        const transferAmount = invoice.total_cents - providerFee;

        // Execute transfer
        const transfer = await transferToProvider({
          stripeAccountId: invoice.provider_stripe_accounts.stripe_account_id,
          amountCents: transferAmount,
          sourceTransactionId: invoice.stripe_payment_intent_id,
          metadata: {
            invoice_id: invoice.id,
            invoice_number: invoice.invoice_number,
            service_request_id: invoice.service_request_id,
          },
        });

        // Update invoice with transfer ID
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("invoices") as any)
          .update({
            stripe_transfer_id: transfer.id,
            provider_net_cents: transferAmount,
            provider_transferred_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", invoice.id);

        // Record transaction
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("transactions") as any).insert({
          service_request_id: invoice.service_request_id,
          stripe_transfer_id: transfer.id,
          type: "provider_payout",
          status: "succeeded",
          amount_cents: transferAmount,
          fee_cents: providerFee,
          net_cents: transferAmount,
          description: `Provider transfer for invoice ${invoice.invoice_number}`,
          metadata: {
            invoice_id: invoice.id,
            provider_id: invoice.provider_id,
            platform_fee: providerFee,
          },
          processed_at: new Date().toISOString(),
        });

        // Update provider balance
        const { data: currentAccount } = await supabase
          .from("provider_stripe_accounts")
          .select("pending_balance_cents")
          .eq("provider_id", invoice.provider_id)
          .single() as { data: { pending_balance_cents: number } | null };

        if (currentAccount) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("provider_stripe_accounts") as any)
            .update({
              pending_balance_cents: (currentAccount.pending_balance_cents || 0) + transferAmount,
              updated_at: new Date().toISOString(),
            })
            .eq("provider_id", invoice.provider_id);
        }

        console.log(`Transferred $${(transferAmount / 100).toFixed(2)} for invoice ${invoice.invoice_number}`);
        results.processed++;
      } catch (error) {
        console.error(`Error processing invoice ${invoice.invoice_number}:`, error);
        results.errors.push(`${invoice.invoice_number}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Log cron run
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("cron_job_runs") as any).insert({
      job_name: "process-transfers",
      status: results.errors.length > 0 ? "partial" : "success",
      records_processed: results.processed,
      records_skipped: results.skipped,
      error_count: results.errors.length,
      error_details: results.errors.length > 0 ? results.errors : null,
      run_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      ...results,
    });
  } catch (error) {
    console.error("Process transfers cron error:", error);
    return NextResponse.json(
      { error: "Failed to process transfers" },
      { status: 500 }
    );
  }
}

// Allow POST for manual trigger
export async function POST(request: NextRequest) {
  return GET(request);
}
