import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ProviderShell } from "./provider-shell";

export default async function ProviderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/provider/jobs");
  }

  // Check if user has a provider profile
  const { data: provider } = await supabase
    .from("providers")
    .select("*")
    .eq("profile_id", user.id)
    .single();

  // If no provider profile, redirect to onboarding (unless already on onboarding)
  // This will be handled by the shell component

  return (
    <ProviderShell provider={provider}>
      {children}
    </ProviderShell>
  );
}
