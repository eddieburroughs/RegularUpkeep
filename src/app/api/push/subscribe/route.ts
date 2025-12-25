/**
 * Push Subscription API
 *
 * Handles user push notification subscriptions.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

// Use admin client for push subscriptions (table not in generated types)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { subscription, deviceName } = body;

    if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
      return NextResponse.json(
        { error: "Invalid subscription data" },
        { status: 400 }
      );
    }

    // Upsert the subscription
    const { error } = await supabaseAdmin
      .from("push_subscriptions")
      .upsert(
        {
          profile_id: user.id,
          endpoint: subscription.endpoint,
          p256dh_key: subscription.keys.p256dh,
          auth_key: subscription.keys.auth,
          user_agent: request.headers.get("user-agent") || null,
          device_name: deviceName || null,
          is_active: true,
          error_count: 0,
          last_used_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "profile_id,endpoint",
        }
      );

    if (error) {
      console.error("Subscription upsert error:", error);
      return NextResponse.json(
        { error: "Failed to save subscription" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push subscribe error:", error);
    return NextResponse.json(
      { error: "Failed to process subscription" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { endpoint } = body;

    if (!endpoint) {
      // Delete all subscriptions for user
      const { error } = await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .eq("profile_id", user.id);

      if (error) {
        console.error("Delete all subscriptions error:", error);
        return NextResponse.json(
          { error: "Failed to delete subscriptions" },
          { status: 500 }
        );
      }
    } else {
      // Delete specific subscription
      const { error } = await supabaseAdmin
        .from("push_subscriptions")
        .delete()
        .eq("profile_id", user.id)
        .eq("endpoint", endpoint);

      if (error) {
        console.error("Delete subscription error:", error);
        return NextResponse.json(
          { error: "Failed to delete subscription" },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Push unsubscribe error:", error);
    return NextResponse.json(
      { error: "Failed to process unsubscription" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: subscriptions, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("id, device_name, created_at, last_used_at, is_active")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Get subscriptions error:", error);
      return NextResponse.json(
        { error: "Failed to get subscriptions" },
        { status: 500 }
      );
    }

    return NextResponse.json({ subscriptions });
  } catch (error) {
    console.error("Get push subscriptions error:", error);
    return NextResponse.json(
      { error: "Failed to get subscriptions" },
      { status: 500 }
    );
  }
}
