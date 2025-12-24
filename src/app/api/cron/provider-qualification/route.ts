/**
 * Provider Tier Qualification Cron Job
 *
 * Checks provider metrics against Preferred tier thresholds.
 * Should be run weekly via external cron.
 *
 * Logic:
 * 1. Get all verified providers
 * 2. Check metrics against preferred thresholds
 * 3. Update qualifies_for_preferred flag
 * 4. Notify providers of status changes
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConfig } from "@/lib/config/admin-config";

// Verify cron secret to prevent unauthorized access
const CRON_SECRET = process.env.CRON_SECRET;

interface PreferredThresholds {
  min_rating: number;
  min_completed_jobs: number;
  max_dispute_rate: number;
  min_response_time_hours: number;
}

export async function GET(request: NextRequest) {
  // Verify authorization
  const authHeader = request.headers.get("authorization");
  if (CRON_SECRET && authHeader !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = await createClient();

  try {
    // Get provider tier config
    const tierConfig = await getConfig("provider_tiers");
    const thresholds = tierConfig.preferred.performance_thresholds as PreferredThresholds;

    // Get all verified providers with their metrics
    const { data: providers, error: providersError } = await supabase
      .from("provider_subscriptions")
      .select(`
        id,
        provider_id,
        tier,
        providers!inner(
          id,
          profile_id,
          business_name
        ),
        provider_metrics(
          average_rating,
          total_jobs_completed,
          dispute_rate,
          avg_response_time_hours,
          qualifies_for_preferred
        )
      `)
      .in("tier", ["verified", "preferred"])
      .eq("status", "active") as {
        data: Array<{
          id: string;
          provider_id: string;
          tier: string;
          providers: {
            id: string;
            profile_id: string;
            business_name: string;
          };
          provider_metrics: Array<{
            average_rating: number;
            total_jobs_completed: number;
            dispute_rate: number;
            avg_response_time_hours: number;
            qualifies_for_preferred: boolean;
          }>;
        }> | null;
        error: unknown;
      };

    if (providersError) {
      console.error("Error fetching providers:", providersError);
      throw providersError;
    }

    if (!providers || providers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No verified providers to check",
        processed: 0,
      });
    }

    const results = {
      processed: 0,
      newlyQualified: 0,
      newlyDisqualified: 0,
      errors: [] as string[],
    };

    for (const provider of providers) {
      try {
        const metrics = provider.provider_metrics?.[0];

        if (!metrics) {
          // Create metrics record if doesn't exist
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("provider_metrics") as any).insert({
            provider_id: provider.provider_id,
            qualifies_for_preferred: false,
            last_qualification_check: new Date().toISOString(),
          });
          results.processed++;
          continue;
        }

        // Check qualification
        const qualifies =
          metrics.average_rating >= thresholds.min_rating &&
          metrics.total_jobs_completed >= thresholds.min_completed_jobs &&
          metrics.dispute_rate <= thresholds.max_dispute_rate &&
          metrics.avg_response_time_hours <= thresholds.min_response_time_hours;

        const previouslyQualified = metrics.qualifies_for_preferred;

        // Update qualification status
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("provider_metrics") as any)
          .update({
            qualifies_for_preferred: qualifies,
            last_qualification_check: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("provider_id", provider.provider_id);

        // Track changes and log status history (ADDENDUM E)
        if (qualifies && !previouslyQualified) {
          results.newlyQualified++;

          // Log status change to history
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("provider_tier_history") as any).insert({
            provider_id: provider.provider_id,
            previous_status: "not_qualified",
            new_status: "qualified",
            trigger: "cron_check",
            metrics_snapshot: {
              average_rating: metrics.average_rating,
              total_jobs_completed: metrics.total_jobs_completed,
              dispute_rate: metrics.dispute_rate,
              avg_response_time_hours: metrics.avg_response_time_hours,
              thresholds,
            },
            created_at: new Date().toISOString(),
          });

          // Create notification for provider
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("notifications") as any).insert({
            user_id: provider.providers.profile_id,
            type: "provider_qualified_preferred",
            title: "You qualify for Preferred tier!",
            message: "Congratulations! Based on your performance, you now qualify for our Preferred provider tier. Upgrade to unlock priority placement and more leads.",
            action_url: "/provider/billing",
            created_at: new Date().toISOString(),
          });
        } else if (!qualifies && previouslyQualified) {
          results.newlyDisqualified++;

          // Log status change to history
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("provider_tier_history") as any).insert({
            provider_id: provider.provider_id,
            previous_status: "qualified",
            new_status: "not_qualified",
            trigger: "cron_check",
            metrics_snapshot: {
              average_rating: metrics.average_rating,
              total_jobs_completed: metrics.total_jobs_completed,
              dispute_rate: metrics.dispute_rate,
              avg_response_time_hours: metrics.avg_response_time_hours,
              thresholds,
            },
            created_at: new Date().toISOString(),
          });

          // If currently on preferred tier, they'll lose access at next billing
          if (provider.tier === "preferred") {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from("notifications") as any).insert({
              user_id: provider.providers.profile_id,
              type: "provider_disqualified_preferred",
              title: "Preferred tier status at risk",
              message: `Your metrics no longer meet Preferred tier requirements. Improve your rating (${metrics.average_rating.toFixed(1)}/${thresholds.min_rating}), complete more jobs (${metrics.total_jobs_completed}/${thresholds.min_completed_jobs}), or reduce dispute rate to maintain your status.`,
              action_url: "/provider/profile",
              created_at: new Date().toISOString(),
            });
          }
        }

        results.processed++;
      } catch (error) {
        console.error(`Error processing provider ${provider.provider_id}:`, error);
        results.errors.push(`${provider.provider_id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Log cron run
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("cron_job_runs") as any).insert({
      job_name: "provider-qualification",
      status: results.errors.length > 0 ? "partial" : "success",
      records_processed: results.processed,
      metadata: {
        newly_qualified: results.newlyQualified,
        newly_disqualified: results.newlyDisqualified,
        thresholds,
      },
      error_count: results.errors.length,
      error_details: results.errors.length > 0 ? results.errors : null,
      run_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      ...results,
      thresholds,
    });
  } catch (error) {
    console.error("Provider qualification cron error:", error);
    return NextResponse.json(
      { error: "Failed to check provider qualifications" },
      { status: 500 }
    );
  }
}

// Allow POST for manual trigger
export async function POST(request: NextRequest) {
  return GET(request);
}
