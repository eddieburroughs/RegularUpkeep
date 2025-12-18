import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Building2,
  Home,
  DollarSign,
  MessageSquare,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import type { BookingStatus, QuoteStatus } from "@/types/database";

type BookingDetails = {
  id: string;
  booking_number: string;
  status: BookingStatus;
  scheduled_date: string;
  scheduled_time: string;
  total_amount: number;
  base_price: number;
  customer_notes: string | null;
  provider_notes: string | null;
  priority: string;
  services: { name: string; description: string | null } | null;
  providers: { business_name: string; phone: string | null } | null;
  properties: { nickname: string | null; address_line1: string; city: string; state: string } | null;
};

type QuoteDetails = {
  id: string;
  quote_number: string;
  status: QuoteStatus;
  title: string | null;
  description: string | null;
  total_cents: number;
  subtotal_cents: number;
  tax_cents: number;
  valid_until: string | null;
  provider_notes: string | null;
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

export default async function RequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  const { id } = await params;
  const { type } = await searchParams;
  const supabase = await createClient();

  // Check if this is a quote or booking
  if (type === "quote") {
    const { data: quote, error } = await supabase
      .from("quotes")
      .select("*, providers(business_name), properties(nickname, address_line1)")
      .eq("id", id)
      .single() as { data: QuoteDetails | null; error: unknown };

    if (error || !quote) {
      notFound();
    }

    return <QuoteView quote={quote} />;
  }

  // Default to booking
  const { data: booking, error } = await supabase
    .from("bookings")
    .select("*, services(name, description), providers(business_name, phone), properties(nickname, address_line1, city, state)")
    .eq("id", id)
    .single() as { data: BookingDetails | null; error: unknown };

  if (error || !booking) {
    notFound();
  }

  return <BookingView booking={booking} />;
}

function BookingView({ booking }: { booking: BookingDetails }) {
  const isPending = booking.status === "pending";
  const isCompleted = booking.status === "completed";
  const isCancelled = booking.status === "cancelled";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app/requests">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{booking.services?.name}</h1>
              <Badge variant={bookingStatusColors[booking.status]}>
                {booking.status.replace("_", " ")}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Booking #{booking.booking_number}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Booking Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {booking.services?.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Service Description</p>
                  <p>{booking.services.description}</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled Date</p>
                    <p className="font-medium">
                      {new Date(booking.scheduled_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Scheduled Time</p>
                    <p className="font-medium">{booking.scheduled_time}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Provider</p>
                    <p className="font-medium">{booking.providers?.business_name}</p>
                    {booking.providers?.phone && (
                      <p className="text-sm text-muted-foreground">{booking.providers.phone}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Property</p>
                    <p className="font-medium">
                      {booking.properties?.nickname || booking.properties?.address_line1}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {booking.properties?.city}, {booking.properties?.state}
                    </p>
                  </div>
                </div>
              </div>

              {booking.customer_notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Your Notes</p>
                  <p>{booking.customer_notes}</p>
                </div>
              )}

              {booking.provider_notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Provider Notes</p>
                  <p>{booking.provider_notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {isCompleted && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="h-5 w-5" />
                  Service Completed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-green-700">
                  This service has been completed. Thank you for using RegularUpkeep!
                </p>
              </CardContent>
            </Card>
          )}

          {isCancelled && (
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-800">
                  <XCircle className="h-5 w-5" />
                  Booking Cancelled
                </CardTitle>
              </CardHeader>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Service</span>
                <span>${(booking.base_price / 100).toFixed(2)}</span>
              </div>
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Total</span>
                <span>${(booking.total_amount / 100).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <Link href="/app/messages">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Message Provider
                </Link>
              </Button>
              {isPending && (
                <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                  <XCircle className="mr-2 h-4 w-4" />
                  Cancel Booking
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function QuoteView({ quote }: { quote: QuoteDetails }) {
  const isPending = quote.status === "sent" || quote.status === "viewed";

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app/requests?tab=quotes">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{quote.title || "Service Quote"}</h1>
              <Badge variant={quoteStatusColors[quote.status]}>
                {quote.status}
              </Badge>
            </div>
            <p className="text-muted-foreground">
              Quote #{quote.quote_number}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quote Details</CardTitle>
              <CardDescription>
                From {quote.providers?.business_name}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p>{quote.description}</p>
                </div>
              )}

              {quote.provider_notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Provider Notes</p>
                  <p>{quote.provider_notes}</p>
                </div>
              )}

              {quote.valid_until && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>Valid until {new Date(quote.valid_until).toLocaleDateString()}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>${(quote.subtotal_cents / 100).toFixed(2)}</span>
              </div>
              {quote.tax_cents > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax</span>
                  <span>${(quote.tax_cents / 100).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between font-medium pt-2 border-t">
                <span>Total</span>
                <span className="text-lg">${(quote.total_cents / 100).toFixed(2)}</span>
              </div>
            </CardContent>
          </Card>

          {isPending && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Respond to Quote</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button className="w-full">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Accept Quote
                </Button>
                <Button variant="outline" className="w-full">
                  <XCircle className="mr-2 h-4 w-4" />
                  Decline
                </Button>
                <Button variant="outline" className="w-full" asChild>
                  <Link href="/app/messages">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Ask Questions
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
