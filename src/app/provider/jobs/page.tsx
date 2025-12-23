import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  Calendar,
  Clock,
  MapPin,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import type { BookingStatus } from "@/types/database";

type BookingWithDetails = {
  id: string;
  booking_number: string;
  status: BookingStatus;
  travel_status: string;
  scheduled_date: string;
  scheduled_time: string;
  service_address: string;
  total_amount: number;
  invoice_cents: number;
  customer_notes: string | null;
  services: { name: string } | null;
  properties: { nickname: string | null; address_line1: string } | null;
  profiles: { full_name: string | null } | null;
};

const statusColors: Record<BookingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "default",
  in_progress: "secondary",
  completed: "default",
  cancelled: "destructive",
};

const formatTime = (time: string) => {
  const [hours, minutes] = time.split(":");
  const h = parseInt(hours);
  const ampm = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${minutes} ${ampm}`;
};

const EmptyState = ({ message }: { message: string }) => (
  <div className="text-center py-12 text-muted-foreground">
    <CheckCircle2 className="h-12 w-12 mx-auto mb-4 opacity-30" />
    <p>{message}</p>
  </div>
);

const JobCard = ({ booking }: { booking: BookingWithDetails }) => (
  <Link
    href={`/provider/jobs/${booking.id}`}
    className="block"
  >
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="flex items-center gap-4 py-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium truncate">
              {booking.services?.name || "Service"}
            </span>
            <Badge variant={statusColors[booking.status]}>
              {booking.status.replace("_", " ")}
            </Badge>
          </div>

          <div className="space-y-1 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                {new Date(booking.scheduled_date).toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <Clock className="h-4 w-4 ml-2" />
              <span>{formatTime(booking.scheduled_time)}</span>
            </div>

            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span className="truncate">
                {booking.properties?.nickname || booking.service_address}
              </span>
            </div>
          </div>

          {booking.customer_notes && (
            <p className="mt-2 text-sm text-muted-foreground line-clamp-1">
              Note: {booking.customer_notes}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          <span className="font-semibold">
            ${((booking.invoice_cents || booking.total_amount) / 100).toFixed(0)}
          </span>
          <ChevronRight className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  </Link>
);

export default async function ProviderJobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/provider/jobs");
  }

  // Get provider
  const { data: provider } = await supabase
    .from("providers")
    .select("id, is_online, verification_status")
    .eq("profile_id", user.id)
    .single() as { data: { id: string; is_online: boolean; verification_status: string } | null };

  if (!provider) {
    redirect("/provider/onboarding/signup");
  }

  const today = new Date().toISOString().split("T")[0];

  // Fetch bookings for this provider
  const { data: allBookings } = await supabase
    .from("bookings")
    .select(`
      id, booking_number, status, travel_status, scheduled_date, scheduled_time,
      service_address, total_amount, invoice_cents, customer_notes,
      services(name),
      properties(nickname, address_line1)
    `)
    .eq("provider_id", provider.id)
    .order("scheduled_date", { ascending: true })
    .order("scheduled_time", { ascending: true }) as { data: BookingWithDetails[] | null };

  const bookings = allBookings || [];

  // Categorize bookings
  const todayJobs = bookings.filter(
    (b) => b.scheduled_date === today && !["completed", "cancelled"].includes(b.status)
  );

  const upcomingJobs = bookings.filter(
    (b) => b.scheduled_date > today && !["completed", "cancelled"].includes(b.status)
  );

  const completedJobs = bookings.filter((b) => b.status === "completed");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Jobs</h1>
        <p className="text-muted-foreground">
          Manage your scheduled work
        </p>
      </div>

      {/* Verification Warning */}
      {provider.verification_status === "unverified" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="h-8 w-8 text-amber-600 shrink-0" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">Complete Your Profile</p>
              <p className="text-sm text-amber-700">
                Upload your insurance and license to receive job invitations.
              </p>
            </div>
            <Link
              href="/provider/onboarding/docs"
              className="text-sm font-medium text-amber-800 hover:underline"
            >
              Upload Now
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Jobs Tabs */}
      <Tabs defaultValue="today" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today" className="relative">
            Today
            {todayJobs.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">
                {todayJobs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">
            Upcoming
            {upcomingJobs.length > 0 && (
              <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 justify-center">
                {upcomingJobs.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-3">
          {todayJobs.length > 0 ? (
            todayJobs.map((booking) => (
              <JobCard key={booking.id} booking={booking} />
            ))
          ) : (
            <EmptyState message="No jobs scheduled for today" />
          )}
        </TabsContent>

        <TabsContent value="upcoming" className="space-y-3">
          {upcomingJobs.length > 0 ? (
            upcomingJobs.map((booking) => (
              <JobCard key={booking.id} booking={booking} />
            ))
          ) : (
            <EmptyState message="No upcoming jobs scheduled" />
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-3">
          {completedJobs.length > 0 ? (
            completedJobs.slice(0, 20).map((booking) => (
              <JobCard key={booking.id} booking={booking} />
            ))
          ) : (
            <EmptyState message="No completed jobs yet" />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
