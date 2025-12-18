import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AppShell } from "./app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Fetch user's properties (check if user has any property memberships)
  const { data: properties } = await supabase
    .from("properties")
    .select("*, property_members!inner(user_id)")
    .eq("property_members.user_id", user.id)
    .order("created_at", { ascending: false });

  // If user has no properties, redirect to onboarding
  if (!properties || properties.length === 0) {
    redirect("/onboarding/home-details");
  }

  // Fetch unread notification count
  const { count: unreadCount } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("profile_id", user.id)
    .eq("is_read", false);

  return (
    <AppShell
      properties={properties || []}
      unreadCount={unreadCount || 0}
    >
      {children}
    </AppShell>
  );
}
