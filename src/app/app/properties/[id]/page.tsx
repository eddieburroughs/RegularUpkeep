import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { PropertyDetails } from "./property-details";
import type { Property, MaintenanceTask } from "@/types/database";

type TaskWithStatus = Pick<MaintenanceTask, "id" | "name" | "due_date" | "status" | "category">;

export default async function PropertyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: property, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .single() as { data: Property | null; error: unknown };

  if (error || !property) {
    notFound();
  }

  // Get upcoming maintenance tasks for this property
  const today = new Date().toISOString().split("T")[0];
  const { data: tasks } = await supabase
    .from("maintenance_tasks")
    .select("id, name, due_date, status, category")
    .eq("property_id", id)
    .gte("due_date", today)
    .in("status", ["scheduled", "upcoming", "due", "overdue"])
    .order("due_date", { ascending: true })
    .limit(10) as { data: TaskWithStatus[] | null };

  // Get recent bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, status, scheduled_date, services(name), providers(business_name)")
    .eq("property_id", id)
    .in("status", ["pending", "confirmed", "in_progress", "completed"])
    .order("scheduled_date", { ascending: false })
    .limit(5);

  return (
    <PropertyDetails
      property={property}
      tasks={tasks || []}
      bookings={bookings || []}
    />
  );
}
