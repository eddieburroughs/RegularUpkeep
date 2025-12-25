/**
 * Notification Preferences API
 *
 * GET - Fetch user's notification preferences
 * POST - Update notification preferences
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export interface NotificationPreferences {
  maintenance_reminders: boolean;
  maintenance_frequency: "daily" | "weekly" | "never";
  overdue_alerts: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
}

const DEFAULT_PREFERENCES: NotificationPreferences = {
  maintenance_reminders: true,
  maintenance_frequency: "daily",
  overdue_alerts: true,
  email_enabled: true,
  push_enabled: false,
};

export async function GET() {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get current preferences
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: profile, error } = await (supabase as any)
    .from("profiles")
    .select("notification_preferences")
    .eq("id", user.id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Merge with defaults
  const preferences = {
    ...DEFAULT_PREFERENCES,
    ...(profile?.notification_preferences || {}),
  };

  return NextResponse.json({ preferences });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { preferences } = body;

  if (!preferences || typeof preferences !== "object") {
    return NextResponse.json({ error: "Invalid preferences" }, { status: 400 });
  }

  // Validate preferences
  const validatedPrefs: Partial<NotificationPreferences> = {};

  if (typeof preferences.maintenance_reminders === "boolean") {
    validatedPrefs.maintenance_reminders = preferences.maintenance_reminders;
  }
  if (["daily", "weekly", "never"].includes(preferences.maintenance_frequency)) {
    validatedPrefs.maintenance_frequency = preferences.maintenance_frequency;
  }
  if (typeof preferences.overdue_alerts === "boolean") {
    validatedPrefs.overdue_alerts = preferences.overdue_alerts;
  }
  if (typeof preferences.email_enabled === "boolean") {
    validatedPrefs.email_enabled = preferences.email_enabled;
  }
  if (typeof preferences.push_enabled === "boolean") {
    validatedPrefs.push_enabled = preferences.push_enabled;
  }

  // Get current preferences and merge
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: currentProfile } = await (supabase as any)
    .from("profiles")
    .select("notification_preferences")
    .eq("id", user.id)
    .single();

  const mergedPrefs = {
    ...DEFAULT_PREFERENCES,
    ...(currentProfile?.notification_preferences || {}),
    ...validatedPrefs,
  };

  // Update preferences
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("profiles")
    .update({ notification_preferences: mergedPrefs })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, preferences: mergedPrefs });
}
