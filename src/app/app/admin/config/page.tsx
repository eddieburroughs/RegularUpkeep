import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getAllConfig } from "@/lib/config/admin-config";
import { ConfigEditor } from "./config-editor";

export const dynamic = "force-dynamic";

export default async function AdminConfigPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/app/admin/config");
  }

  // Verify admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null; error: unknown };

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  const config = await getAllConfig();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform Configuration</h1>
        <p className="text-muted-foreground">
          Manage pricing, fees, and feature flags without redeploying
        </p>
      </div>

      <ConfigEditor initialConfig={config} />
    </div>
  );
}
