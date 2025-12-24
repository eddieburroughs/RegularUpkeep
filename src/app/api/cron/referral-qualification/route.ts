/**
 * Referral Qualification Cron Job
 *
 * Checks and qualifies referrals based on anti-fraud rules.
 * Awards free sponsor year when threshold is reached.
 * Should be run daily via external cron.
 *
 * Qualification rules (from admin_config.realtor_referral.anti_fraud):
 * - min_days_active: 30 (must be active for 30 days)
 * - min_properties: 1 (must have at least 1 property)
 * - require_verified_email: true (email must be verified)
 *
 * Reward: At 50 qualified referrals, sponsor gets free sponsor year
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getConfig } from "@/lib/config/admin-config";

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
    // Get referral config
    const referralConfig = await getConfig("realtor_referral");
    const threshold = referralConfig.qualified_homeowners_threshold;
    const antiFraud = referralConfig.anti_fraud;

    // Get unqualified referrals
    const { data: referrals, error: referralsError } = await supabase
      .from("sponsor_referrals")
      .select(`
        id,
        sponsor_id,
        referred_customer_id,
        days_active,
        properties_added,
        created_at,
        customers!inner(
          id,
          profile_id,
          profiles!inner(
            id,
            email_verified,
            email
          )
        )
      `)
      .eq("is_qualified", false) as {
        data: Array<{
          id: string;
          sponsor_id: string;
          referred_customer_id: string;
          days_active: number;
          properties_added: number;
          created_at: string;
          customers: {
            id: string;
            profile_id: string;
            profiles: {
              id: string;
              email_verified: boolean;
              email: string;
            };
          };
        }> | null;
        error: unknown;
      };

    if (referralsError) {
      console.error("Error fetching referrals:", referralsError);
      throw referralsError;
    }

    const results = {
      checked: 0,
      qualified: 0,
      sponsorsAwarded: 0,
      errors: [] as string[],
    };

    if (!referrals || referrals.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No unqualified referrals to check",
        ...results,
      });
    }

    for (const referral of referrals) {
      try {
        results.checked++;

        // Calculate days active
        const createdAt = new Date(referral.created_at);
        const now = new Date();
        const daysActive = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

        // Get property count
        const { count: propertyCount } = await supabase
          .from("properties")
          .select("*", { count: "exact", head: true })
          .eq("customer_id", referral.referred_customer_id);

        // Update referral with current stats
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("sponsor_referrals") as any)
          .update({
            days_active: daysActive,
            properties_added: propertyCount || 0,
            updated_at: new Date().toISOString(),
          })
          .eq("id", referral.id);

        // Check qualification
        const meetsMinDays = daysActive >= antiFraud.min_days_active;
        const meetsMinProperties = (propertyCount || 0) >= antiFraud.min_properties;
        const meetsEmailVerified = !antiFraud.require_verified_email || referral.customers.profiles.email_verified;

        if (meetsMinDays && meetsMinProperties && meetsEmailVerified) {
          // Qualify the referral
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          await (supabase.from("sponsor_referrals") as any)
            .update({
              is_qualified: true,
              qualified_at: new Date().toISOString(),
              qualification_reason: "Met all anti-fraud criteria",
              updated_at: new Date().toISOString(),
            })
            .eq("id", referral.id);

          // Update sponsor's qualified count
          const { data: currentSponsor } = await supabase
            .from("sponsors")
            .select("qualified_homeowners_count")
            .eq("id", referral.sponsor_id)
            .single() as { data: { qualified_homeowners_count: number } | null };

          if (currentSponsor) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from("sponsors") as any)
              .update({
                qualified_homeowners_count: (currentSponsor.qualified_homeowners_count || 0) + 1,
                updated_at: new Date().toISOString(),
              })
              .eq("id", referral.sponsor_id);
          }

          results.qualified++;

          // Check if sponsor has reached threshold
          const { data: sponsor } = await supabase
            .from("sponsors")
            .select("id, profile_id, qualified_homeowners_count, free_year_earned")
            .eq("id", referral.sponsor_id)
            .single() as {
              data: {
                id: string;
                profile_id: string;
                qualified_homeowners_count: number;
                free_year_earned: boolean;
              } | null;
            };

          if (sponsor && !sponsor.free_year_earned && sponsor.qualified_homeowners_count >= threshold) {
            // Award free sponsor year
            const freeYearExpiry = new Date();
            freeYearExpiry.setFullYear(freeYearExpiry.getFullYear() + 1);

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from("sponsors") as any)
              .update({
                free_year_earned: true,
                free_year_expires_at: freeYearExpiry.toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("id", sponsor.id);

            // Create notification
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            await (supabase.from("notifications") as any).insert({
              user_id: sponsor.profile_id,
              type: "sponsor_free_year_earned",
              title: "Congratulations! You earned a free sponsor year!",
              message: `You've referred ${threshold} qualified homeowners and earned a free year of sponsorship. Your free year is active until ${freeYearExpiry.toLocaleDateString()}.`,
              action_url: "/sponsor/dashboard",
              created_at: new Date().toISOString(),
            });

            results.sponsorsAwarded++;
            console.log(`Awarded free sponsor year to sponsor ${sponsor.id}`);
          }
        }
      } catch (error) {
        console.error(`Error processing referral ${referral.id}:`, error);
        results.errors.push(`${referral.id}: ${error instanceof Error ? error.message : "Unknown error"}`);
      }
    }

    // Log cron run
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("cron_job_runs") as any).insert({
      job_name: "referral-qualification",
      status: results.errors.length > 0 ? "partial" : "success",
      records_processed: results.checked,
      metadata: {
        qualified: results.qualified,
        sponsors_awarded: results.sponsorsAwarded,
        threshold,
        anti_fraud: antiFraud,
      },
      error_count: results.errors.length,
      error_details: results.errors.length > 0 ? results.errors : null,
      run_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      ...results,
      threshold,
    });
  } catch (error) {
    console.error("Referral qualification cron error:", error);
    return NextResponse.json(
      { error: "Failed to process referral qualifications" },
      { status: 500 }
    );
  }
}

// Allow POST for manual trigger
export async function POST(request: NextRequest) {
  return GET(request);
}
