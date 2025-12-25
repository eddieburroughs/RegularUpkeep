/**
 * Push Notification Test API
 *
 * Sends a test push notification to the current user.
 */

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";
import { sendPushNotification, isPushConfigured } from "@/lib/push";

// Use admin client for push subscriptions (table not in generated types)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPushConfigured()) {
    return NextResponse.json(
      { error: "Push notifications not configured" },
      { status: 503 }
    );
  }

  try {
    // Get user's active push subscriptions
    const { data: subscriptions, error } = await supabaseAdmin
      .from("push_subscriptions")
      .select("endpoint, p256dh_key, auth_key")
      .eq("profile_id", user.id)
      .eq("is_active", true);

    if (error) {
      console.error("Get subscriptions error:", error);
      return NextResponse.json(
        { error: "Failed to get subscriptions" },
        { status: 500 }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return NextResponse.json(
        { error: "No active push subscriptions found" },
        { status: 404 }
      );
    }

    // Send test notification to all subscriptions
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendPushNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh_key,
              auth: sub.auth_key,
            },
          },
          {
            title: "Test Notification",
            body: "Push notifications are working correctly!",
            url: "/app",
            tag: "test-notification",
          }
        )
      )
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - sent;

    return NextResponse.json({
      success: true,
      message: `Sent to ${sent} device(s)${failed > 0 ? `, ${failed} failed` : ""}`,
    });
  } catch (error) {
    console.error("Push test error:", error);
    return NextResponse.json(
      { error: "Failed to send test notification" },
      { status: 500 }
    );
  }
}
