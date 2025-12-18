import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { JobDetailClient } from "./job-detail-client";

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

  return <JobDetailClient booking={booking} providerId={provider.id} />;
}
