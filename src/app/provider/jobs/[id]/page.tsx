import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { JobDetailClient } from "./job-detail-client";
import type { ProviderBriefOutput } from "@/lib/ai/types";
import type { PropertyMaintenanceTask } from "@/types/database";

type BookingWithDetails = {
  id: string;
  booking_number: string;
  status: string;
  travel_status: string;
  scheduled_date: string;
  scheduled_time: string;
  service_address: string;
  total_amount: number;
  invoice_cents: number;
  invoice_items: unknown;
  job_photos: unknown;
  customer_notes: string | null;
  provider_notes: string | null;
  completion_notes: string | null;
  actual_start_time: string | null;
  actual_end_time: string | null;
  service_request_id: string | null;
  services: { name: string; description: string | null } | null;
  properties: {
    nickname: string | null;
    address_line1: string;
    city: string;
    state: string;
    access_notes: string | null;
  } | null;
  customers: {
    profiles: { full_name: string | null; phone: string | null } | null;
  } | null;
};

export default async function ProviderJobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/provider/jobs");
  }

  // Get provider
  const { data: provider } = await supabase
    .from("providers")
    .select("id")
    .eq("profile_id", user.id)
    .single() as { data: { id: string } | null };

  if (!provider) {
    redirect("/provider/onboarding/signup");
  }

  // Fetch booking details
  const { data: booking, error } = await supabase
    .from("bookings")
    .select(`
      id, booking_number, status, travel_status, scheduled_date, scheduled_time,
      service_address, total_amount, invoice_cents, invoice_items, job_photos,
      customer_notes, provider_notes, completion_notes, actual_start_time, actual_end_time,
      service_request_id,
      services(name, description),
      properties(nickname, address_line1, city, state, access_notes),
      customers(profiles(full_name, phone))
    `)
    .eq("id", id)
    .eq("provider_id", provider.id)
    .single() as { data: BookingWithDetails | null; error: unknown };

  if (error || !booking) {
    notFound();
  }

  // Fetch AI provider brief if service request exists
  let providerBrief: ProviderBriefOutput | null = null;
  let linkedTasks: PropertyMaintenanceTask[] = [];

  if (booking.service_request_id) {
    const { data: serviceRequest } = await supabase
      .from("service_requests")
      .select("ai_provider_brief")
      .eq("id", booking.service_request_id)
      .single() as { data: { ai_provider_brief: ProviderBriefOutput | null } | null };

    if (serviceRequest?.ai_provider_brief) {
      providerBrief = serviceRequest.ai_provider_brief;
    }

    // Fetch linked maintenance tasks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: taskLinks } = await (supabase as any)
      .from("maintenance_task_request_links")
      .select(`
        property_task:property_maintenance_tasks(
          id, title, description, category, priority,
          skill_level, estimated_minutes, next_due_date,
          last_completed_at, status
        )
      `)
      .eq("request_id", booking.service_request_id) as { data: { property_task: PropertyMaintenanceTask | null }[] | null };

    if (taskLinks) {
      linkedTasks = taskLinks
        .map((link) => link.property_task)
        .filter(Boolean) as PropertyMaintenanceTask[];
    }
  }

  return (
    <JobDetailClient
      booking={booking}
      providerId={provider.id}
      providerBrief={providerBrief}
      linkedTasks={linkedTasks}
    />
  );
}
