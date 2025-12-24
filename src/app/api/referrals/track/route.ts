/**
 * Referral Tracking API
 *
 * Tracks when a new user signs up with a referral code from a sponsor.
 * Called after user registration if a referral code was used.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { referralCode } = await request.json();

    if (!referralCode) {
      return NextResponse.json(
        { error: "Referral code is required" },
        { status: 400 }
      );
    }

    // Find the sponsor with this referral code
    const { data: sponsor } = await supabase
      .from("sponsors")
      .select("id, status, sponsor_type")
      .eq("referral_code", referralCode.toUpperCase())
      .single() as {
        data: {
          id: string;
          status: string;
          sponsor_type: string;
        } | null;
      };

    if (!sponsor) {
      return NextResponse.json(
        { error: "Invalid referral code" },
        { status: 404 }
      );
    }

    if (sponsor.status !== "active") {
      return NextResponse.json(
        { error: "Referral code is no longer active" },
        { status: 400 }
      );
    }

    // Get the customer record for this user
    const { data: customer } = await supabase
      .from("customers")
      .select("id")
      .eq("profile_id", user.id)
      .single() as { data: { id: string } | null };

    if (!customer) {
      return NextResponse.json(
        { error: "Customer record not found" },
        { status: 404 }
      );
    }

    // Check if referral already exists
    const { data: existingReferral } = await supabase
      .from("sponsor_referrals")
      .select("id")
      .eq("sponsor_id", sponsor.id)
      .eq("referred_customer_id", customer.id)
      .single() as { data: { id: string } | null };

    if (existingReferral) {
      return NextResponse.json({
        success: true,
        message: "Referral already tracked",
        referralId: existingReferral.id,
      });
    }

    // Get request IP for anti-fraud
    const forwardedFor = request.headers.get("x-forwarded-for");
    const signupIp = forwardedFor?.split(",")[0]?.trim() || "unknown";

    // Create referral record
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: referral, error: referralError } = await (supabase.from("sponsor_referrals") as any)
      .insert({
        sponsor_id: sponsor.id,
        referred_customer_id: customer.id,
        is_qualified: false,
        signup_ip: signupIp,
        days_active: 0,
        properties_added: 0,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (referralError) {
      throw referralError;
    }

    // Update sponsor's referred count
    const { data: currentSponsor } = await supabase
      .from("sponsors")
      .select("referred_homeowners_count")
      .eq("id", sponsor.id)
      .single() as { data: { referred_homeowners_count: number } | null };

    if (currentSponsor) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("sponsors") as any)
        .update({
          referred_homeowners_count: (currentSponsor.referred_homeowners_count || 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sponsor.id);
    }

    return NextResponse.json({
      success: true,
      referralId: referral.id,
      sponsorType: sponsor.sponsor_type,
    });
  } catch (error) {
    console.error("Referral tracking error:", error);
    return NextResponse.json(
      { error: "Failed to track referral" },
      { status: 500 }
    );
  }
}
