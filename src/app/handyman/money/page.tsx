import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Briefcase,
  Clock,
  CheckCircle2,
} from "lucide-react";

export default async function HandymanMoneyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/handyman/money");
  }

  // Get handyman profile with earnings
  type HandymanData = {
    id: string;
    hourly_rate: number | null;
    total_earnings: number | null;
    total_jobs: number | null;
  };

  const { data: handyman } = await supabase
    .from("handymen")
    .select("id, hourly_rate, total_earnings, total_jobs")
    .eq("profile_id", user.id)
    .single() as { data: HandymanData | null };

  if (!handyman) {
    redirect("/handyman/onboarding/signup");
  }

  // Get completed jobs for earnings history
  type BookingData = {
    id: string;
    status: string;
    scheduled_date: string;
    completed_at: string | null;
    total_amount: number | null;
    maintenance_tasks: {
      title: string;
    } | null;
    properties: {
      address_line1: string;
      city: string;
    } | null;
  };

  const { data: completedJobs } = await supabase
    .from("bookings")
    .select(`
      id,
      status,
      scheduled_date,
      completed_at,
      total_amount,
      maintenance_tasks(title),
      properties(address_line1, city)
    `)
    .eq("assigned_tech_user_id", user.id)
    .eq("status", "completed")
    .order("completed_at", { ascending: false })
    .limit(10) as { data: BookingData[] | null };

  // Calculate this month's earnings
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthJobs = completedJobs?.filter(job => {
    const completedDate = job.completed_at ? new Date(job.completed_at) : null;
    return completedDate && completedDate >= firstOfMonth;
  }) || [];
  const thisMonthEarnings = thisMonthJobs.reduce((sum, job) => sum + (job.total_amount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Earnings</h1>
        <p className="text-muted-foreground">
          Track your income and payment history
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${handyman.total_earnings?.toLocaleString() || "0"}
                </p>
                <p className="text-xs text-muted-foreground">Total Earned</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${thisMonthEarnings.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <Briefcase className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{handyman.total_jobs || 0}</p>
                <p className="text-xs text-muted-foreground">Jobs Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  ${handyman.hourly_rate || "—"}
                </p>
                <p className="text-xs text-muted-foreground">Hourly Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Earnings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Earnings</CardTitle>
          <CardDescription>
            Your completed jobs and payments
          </CardDescription>
        </CardHeader>
        <CardContent>
          {completedJobs && completedJobs.length > 0 ? (
            <div className="space-y-4">
              {completedJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between py-3 border-b last:border-0"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {job.maintenance_tasks?.title || "Service Call"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {job.properties?.address_line1}, {job.properties?.city}
                      </p>
                      <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {job.completed_at
                          ? new Date(job.completed_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : new Date(job.scheduled_date).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">
                      +${job.total_amount?.toLocaleString() || "0"}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Paid
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <DollarSign className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-semibold">No Earnings Yet</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-sm">
                Complete jobs to start earning. Your payment history will appear here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Information</CardTitle>
          <CardDescription>
            How you get paid
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Payments are processed after each completed job. Earnings are typically deposited within 2-3 business days after job completion.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
