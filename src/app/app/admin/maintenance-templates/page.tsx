import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TemplatesManagerClient } from "./templates-manager-client";

export default async function AdminMaintenanceTemplatesPage() {
  const supabase = await createClient();

  // Check auth and admin role
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null };

  if (!profile || profile.role !== "admin") {
    redirect("/app");
  }

  return <TemplatesManagerClient />;
}
