import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Wrench,
  Calendar,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";

const statusConfig = {
  scheduled: { label: "Scheduled", variant: "default" as const, icon: Calendar },
  in_progress: { label: "In Progress", variant: "secondary" as const, icon: Clock },
  completed: { label: "Completed", variant: "outline" as const, icon: CheckCircle2 },
  cancelled: { label: "Cancelled", variant: "destructive" as const, icon: AlertCircle },
};

export default async function HandymanJobsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/handyman/jobs");
  }

  // Get handyman profile
  type HandymanProfile = {
    id: string;
    is_available: boolean;
    bio: string | null;
    skills: string[] | null;
  };

  const { data: handyman } = await supabase
    .from("handymen")
    .select("id, is_available, bio, skills")
    .eq("profile_id", user.id)
    .single() as { data: HandymanProfile | null };

  if (!handyman) {
    redirect("/handyman/onboarding/signup");
  }

  // Get assigned jobs
  type BookingData = {
    id: string;
    status: string;
    scheduled_date: string;
    scheduled_time: string | null;
    notes: string | null;
    properties: {
      address_line1: string;
      city: string;
      state: string;
    } | null;
    maintenance_tasks: {
      title: string;
      category: string;
    } | null;
  };

  const { data: jobs } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      scheduled_date,
      scheduled_time,
      notes,
      properties(address_line1, city, state),
      maintenance_tasks(title, category)
    `)
    .eq("assigned_tech_user_id", user.id)
    .in("status", ["scheduled", "in_progress"])
    .order("scheduled_date", { ascending: true })
    .limit(20) as { data: BookingData[] | null };

  const hasIncompleteProfile = !handyman.bio || !handyman.skills?.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Your Jobs</h1>
        <p className="text-muted-foreground">
          View and manage your assigned work
        </p>
      </div>

      {/* Profile Completion Alert */}
      {hasIncompleteProfile && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 py-4">
            <AlertCircle className="h-8 w-8 text-amber-600" />
            <div className="flex-1">
              <p className="font-medium text-amber-800">Complete Your Profile</p>
              <p className="text-sm text-amber-700">
                Add your skills and bio to get more job assignments
              </p>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href="/handyman/profile/edit">
                Complete Profile
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Availability Status */}
      <Card>
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className={`h-3 w-3 rounded-full ${handyman.is_available ? "bg-green-500" : "bg-gray-400"}`} />
            <span className="font-medium">
              {handyman.is_available ? "You're available for jobs" : "You're currently unavailable"}
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Toggle availability in the header
          </p>
        </CardContent>
      </Card>

      {/* Jobs List */}
      {jobs && jobs.length > 0 ? (
        <div className="space-y-4">
          <h2 className="font-semibold">Upcoming Jobs</h2>
          {jobs.map((job) => {
            const status = statusConfig[job.status as keyof typeof statusConfig] || statusConfig.scheduled;
            const StatusIcon = status.icon;

            return (
              <Card key={job.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-base">
                        {job.maintenance_tasks?.title || "Service Call"}
                      </CardTitle>
                      <CardDescription>
                        {job.maintenance_tasks?.category || "General"}
                      </CardDescription>
                    </div>
                    <Badge variant={status.variant}>
                      <StatusIcon className="mr-1 h-3 w-3" />
                      {status.label}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {new Date(job.scheduled_date).toLocaleDateString("en-US", {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {job.scheduled_time && ` at ${job.scheduled_time}`}
                    </span>
                  </div>
                  {job.properties && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>
                        {job.properties.address_line1}, {job.properties.city}, {job.properties.state}
                      </span>
                    </div>
                  )}
                  <Button asChild variant="outline" className="w-full mt-2">
                    <Link href={`/handyman/jobs/${job.id}`}>
                      View Details
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 text-center">
            <Wrench className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg">No Jobs Assigned</h3>
            <p className="text-sm text-muted-foreground mt-2 max-w-sm">
              {handyman.is_available
                ? "You're available and will be notified when new jobs are assigned to you."
                : "Set yourself as available to start receiving job assignments."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
