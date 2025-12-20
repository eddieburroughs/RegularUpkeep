import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Calendar,
  ClipboardList,
  MessageSquare,
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock,
  ClipboardCheck,
} from "lucide-react";

// Type definitions for joined queries
type TaskWithProperty = {
  id: string;
  name: string;
  due_date: string;
  status: string;
  properties: { nickname: string | null; address_line1: string } | null;
};

type QuoteWithProvider = {
  id: string;
  title: string | null;
  total_cents: number;
  providers: { business_name: string } | null;
};

type BookingWithDetails = {
  id: string;
  status: string;
  scheduled_date: string;
  services: { name: string } | null;
  providers: { business_name: string } | null;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch open items (tasks due soon, unread messages, pending quotes)
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const nextWeekDate = new Date(now);
  nextWeekDate.setDate(nextWeekDate.getDate() + 7);
  const nextWeek = nextWeekDate.toISOString().split("T")[0];

  // Get upcoming tasks
  const { data: upcomingTasks } = await supabase
    .from("maintenance_tasks")
    .select("id, name, due_date, status, properties(nickname, address_line1)")
    .gte("due_date", today)
    .lte("due_date", nextWeek)
    .in("status", ["scheduled", "upcoming", "due"])
    .order("due_date", { ascending: true })
    .limit(5) as { data: TaskWithProperty[] | null };

  // Get pending quotes (offers)
  const { data: pendingQuotes } = await supabase
    .from("quotes")
    .select("id, title, total_cents, providers(business_name)")
    .eq("status", "sent")
    .order("created_at", { ascending: false })
    .limit(5) as { data: QuoteWithProvider[] | null };

  // Get recent bookings
  const { data: recentBookings } = await supabase
    .from("bookings")
    .select("id, status, scheduled_date, services(name), providers(business_name)")
    .in("status", ["pending", "confirmed", "in_progress"])
    .order("scheduled_date", { ascending: true })
    .limit(5) as { data: BookingWithDetails[] | null };

  // Get unread message count
  const { count: unreadMessages } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("is_read", false);

  const openItemsCount =
    (upcomingTasks?.length || 0) +
    (pendingQuotes?.length || 0) +
    (unreadMessages || 0);

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back! Here&apos;s what needs your attention.
        </p>
      </div>

      {/* Open Items Alert */}
      {openItemsCount > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-amber-900">
                You have {openItemsCount} open item{openItemsCount !== 1 ? "s" : ""} requiring attention
              </p>
              <p className="text-sm text-amber-700">
                {upcomingTasks?.length || 0} tasks due soon, {pendingQuotes?.length || 0} quotes to review, {unreadMessages || 0} unread messages
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Tasks</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingTasks?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Due this week</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Quotes</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingQuotes?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Awaiting your review</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Unread Messages</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{unreadMessages || 0}</div>
            <p className="text-xs text-muted-foreground">New messages</p>
          </CardContent>
        </Card>
      </div>

      {/* Home Inspection CTA */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <ClipboardCheck className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-lg">Run a Home Inspection</p>
            <p className="text-sm text-muted-foreground">
              Walk through your property and document the condition of each area
            </p>
          </div>
          <Button asChild>
            <Link href="/app/inspection/new">
              Start Inspection <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Content Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Upcoming Tasks</CardTitle>
              <CardDescription>Maintenance due this week</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/calendar">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {upcomingTasks && upcomingTasks.length > 0 ? (
              <div className="space-y-3">
                {upcomingTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{task.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {task.properties?.nickname || task.properties?.address_line1}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {new Date(task.due_date).toLocaleDateString()}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No tasks due this week</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Active Bookings</CardTitle>
              <CardDescription>Your scheduled services</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/requests">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentBookings && recentBookings.length > 0 ? (
              <div className="space-y-3">
                {recentBookings.map((booking) => (
                  <Link
                    key={booking.id}
                    href={`/app/bookings/${booking.id}`}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  >
                    <div>
                      <p className="font-medium text-sm">{booking.services?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {booking.providers?.business_name}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge
                        variant={
                          booking.status === "confirmed"
                            ? "default"
                            : booking.status === "in_progress"
                            ? "secondary"
                            : "outline"
                        }
                      >
                        {booking.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(booking.scheduled_date).toLocaleDateString()}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No active bookings</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/app/requests/new">Create a request</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Quotes */}
      {pendingQuotes && pendingQuotes.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Quotes Awaiting Review</CardTitle>
              <CardDescription>Review and accept offers from providers</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/app/requests">
                View all <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div>
                    <p className="font-medium text-sm">{quote.title || "Service Quote"}</p>
                    <p className="text-xs text-muted-foreground">
                      From {quote.providers?.business_name}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${(quote.total_cents / 100).toFixed(2)}</p>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/app/requests?quote=${quote.id}`}>Review</Link>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
