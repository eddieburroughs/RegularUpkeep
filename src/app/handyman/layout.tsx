import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { HandymanShell } from "./handyman-shell";

type HandymanWithProvider = {
  id: string;
  is_available: boolean;
  bio: string | null;
  skills: string[] | null;
  hourly_rate: number | null;
  provider_id: string | null;
  providers: {
    id: string;
    business_name: string;
  } | null;
};

export default async function HandymanLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/handyman/jobs");
  }

  // Check if user has a handyman profile with provider info
  const { data: handyman } = await supabase
    .from("handymen")
    .select("id, is_available, bio, skills, hourly_rate, provider_id, providers:provider_id(id, business_name)")
    .eq("profile_id", user.id)
    .single() as { data: HandymanWithProvider | null };

  return (
    <HandymanShell handyman={handyman} provider={handyman?.providers || null}>
      {children}
    </HandymanShell>
  );
}
