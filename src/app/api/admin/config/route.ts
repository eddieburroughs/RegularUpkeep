import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { CONFIG_KEYS, type ConfigKey, type ConfigTypeMap } from "@/lib/config/admin-config";

export async function PUT(request: NextRequest) {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null; error: unknown };

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Parse request body
  const body = await request.json();
  const { key, value } = body as { key: ConfigKey; value: ConfigTypeMap[ConfigKey] };

  // Validate key
  if (!Object.values(CONFIG_KEYS).includes(key)) {
    return NextResponse.json({ error: "Invalid config key" }, { status: 400 });
  }

  // Upsert the config
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("admin_config") as any).upsert(
    {
      config_key: key,
      config_value: value,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "config_key" }
  );

  if (error) {
    console.error("Failed to update config:", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

export async function GET() {
  const supabase = await createClient();

  // Verify authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null; error: unknown };

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Fetch all config
  const { data, error } = await supabase
    .from("admin_config")
    .select("config_key, config_value, description, updated_at, updated_by") as {
      data: unknown[] | null;
      error: unknown;
    };

  if (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }

  return NextResponse.json({ config: data });
}
