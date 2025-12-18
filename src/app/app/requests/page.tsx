import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  Plus,
  ClipboardList,
  FileText,
  Calendar,
  Clock,
  DollarSign,
  Building2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { BookingStatus, QuoteStatus } from "@/types/database";

type BookingWithDetails = {
  id: string;
  booking_number: string;
  status: BookingStatus;
  scheduled_date: string;
  scheduled_time: string;
  total_amount: number;
  customer_notes: string | null;
  services: { name: string } | null;
  providers: { business_name: string } | null;
  properties: { nickname: string | null; address_line1: string } | null;
};

type QuoteWithDetails = {
  id: string;
  quote_number: string;
  status: QuoteStatus;
  title: string | null;
  description: string | null;
  total_cents: number;
  valid_until: string | null;
  providers: { business_name: string } | null;
  properties: { nickname: string | null; address_line1: string } | null;
};

const bookingStatusColors: Record<BookingStatus, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  confirmed: "default",
  in_progress: "secondary",
  completed: "default",
  cancelled: "destructive",
};

const quoteStatusColors: Record<QuoteStatus, "default" | "secondary" | "destructive" | "outline"> = {
  draft: "outline",
  sent: "secondary",
  viewed: "secondary",
  accepted: "default",
  rejected: "destructive",
  expired: "outline",
};

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const defaultTab = params.tab || "bookings";
  const supabase = await createClient();

  // Get bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, booking_number, status, scheduled_date, scheduled_time, total_amount, customer_notes, services(name), providers(business_name), properties(nickname, address_line1)")
    .order("scheduled_date", { ascending: false })
    .limit(50) as { data: BookingWithDetails[] | null };

  // Get quotes
  const { data: quotes } = await supabase
    .from("quotes")
    .select("id, quote_number, status, title, description, total_cents, valid_until, providers(business_name), properties(nickname, address_line1)")
    .order("created_at", { ascending: false })
    .limit(50) as { data: QuoteWithDetails[] | null };

  const pendingQuotes = quotes?.filter((q) => q.status === "sent" || q.status === "viewed") || [];
  const activeBookings = bookings?.filter((b) => b.status !== "completed" && b.status !== "cancelled") || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Service Requests</h1>
          <p className="text-muted-foreground">
            Manage your bookings and review quotes from providers
          </p>
        </div>
        <Button asChild>
          <Link href="/app/requests/new">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <ClipboardList className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{activeBookings.length}</p>
              <p className="text-sm text-muted-foreground">Active Bookings</p>
            </div>
          </CardContent>
        </Card>
        <Card className={pendingQuotes.length > 0 ? "border-amber-200 bg-amber-50" : ""}>
          <CardContent className="flex items-center gap-3 py-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full ${pendingQuotes.length > 0 ? "bg-amber-100" : "bg-muted"}`}>
              <FileText className={`h-5 w-5 ${pendingQuotes.length > 0 ? "text-amber-600" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingQuotes.length}</p>
              <p className="text-sm text-muted-foreground">Quotes to Review</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">
                {bookings?.filter((b) => b.status === "completed").length || 0}
              </p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="bookings">
            Bookings
            {activeBookings.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeBookings.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="quotes">
            Quotes
            {pendingQuotes.length > 0 && (
              <Badge variant="default" className="ml-2">
                {pendingQuotes.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bookings">
          <Card>
            <CardHeader>
              <CardTitle>Your Bookings</CardTitle>
              <CardDescription>View and manage your service bookings</CardDescription>
            </CardHeader>
            <CardContent>
              {bookings && bookings.length > 0 ? (
                <div className="space-y-3">
                  {bookings.map((booking) => (
                    <Link
                      key={booking.id}
                      href={`/app/requests/${booking.id}`}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                          <ClipboardList className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{booking.services?.name || "Service"}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span>{booking.providers?.business_name}</span>
                            <span>·</span>
                            <span>
                              {booking.properties?.nickname || booking.properties?.address_line1}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(booking.scheduled_date).toLocaleDateString()}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {booking.scheduled_time}
                          </div>
                        </div>
                        <Badge variant={bookingStatusColors[booking.status]}>
                          {booking.status.replace("_", " ")}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-1">No bookings yet</p>
                  <p className="text-sm mb-4">Request a service to get started</p>
                  <Button asChild>
                    <Link href="/app/requests/new">
                      <Plus className="mr-2 h-4 w-4" />
                      New Request
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes">
          <Card>
            <CardHeader>
              <CardTitle>Quotes from Providers</CardTitle>
              <CardDescription>Review and respond to quotes</CardDescription>
            </CardHeader>
            <CardContent>
              {quotes && quotes.length > 0 ? (
                <div className="space-y-3">
                  {quotes.map((quote) => (
                    <Link
                      key={quote.id}
                      href={`/app/requests/${quote.id}?type=quote`}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                          <FileText className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">{quote.title || `Quote #${quote.quote_number}`}</p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Building2 className="h-3 w-3" />
                            <span>{quote.providers?.business_name}</span>
                            {quote.properties && (
                              <>
                                <span>·</span>
                                <span>
                                  {quote.properties.nickname || quote.properties.address_line1}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1 font-medium">
                            <DollarSign className="h-4 w-4" />
                            {(quote.total_cents / 100).toFixed(2)}
                          </div>
                          {quote.valid_until && (
                            <p className="text-xs text-muted-foreground">
                              Valid until {new Date(quote.valid_until).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <Badge variant={quoteStatusColors[quote.status]}>
                          {quote.status}
                        </Badge>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-1">No quotes yet</p>
                  <p className="text-sm">Quotes from providers will appear here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
