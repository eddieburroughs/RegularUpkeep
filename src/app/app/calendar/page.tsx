import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { MaintenanceCalendarClient } from "./maintenance-calendar-client";

export default async function CalendarPage() {
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user's properties
  type PropertyMemberWithProperty = {
    property_id: string;
    role: string;
    properties: {
      id: string;
      nickname: string | null;
      address_line1: string;
      city: string;
      state: string;
    } | null;
  };

  const { data: propertyMembers } = await supabase
    .from("property_members")
    .select(`
      property_id,
      role,
      properties (
        id,
        nickname,
        address_line1,
        city,
        state
      )
    `)
    .eq("user_id", user.id)
    .in("role", ["owner", "manager"]) as { data: PropertyMemberWithProperty[] | null };

  const properties = (propertyMembers || [])
    .map((pm) => pm.properties)
    .filter(Boolean) as Array<{
      id: string;
      nickname: string | null;
      address_line1: string;
      city: string;
      state: string;
    }>;

  return <MaintenanceCalendarClient properties={properties} />;
}
