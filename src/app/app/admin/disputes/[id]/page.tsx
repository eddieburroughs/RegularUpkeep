/**
 * Admin Dispute Detail Page
 *
 * Shows full dispute details with AI Summary panel.
 * AI provides non-binding recommendations - admin makes final decision.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import {
  ArrowLeft,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  MessageSquare,
  FileText,
  User,
  Building2,
  Calendar,
} from "lucide-react";
import { AIDisputeSummary } from "@/components/admin/ai-dispute-summary";
import { AdminDecisionForm } from "@/components/admin/admin-decision-form";

type DisputeDetails = {
  id: string;
  reason: string;
  description: string | null;
  disputed_amount: number;
  status: string;
  created_at: string;
  booking_id: string;
  bookings: {
    id: string;
    booking_number: string;
    status: string;
    scheduled_at: string;
    started_at: string | null;
    completed_at: string | null;
    created_at: string;
    total_amount: number;
    provider_id: string;
    customer_id: string;
    providers: {
      business_name: string;
      profiles: {
        full_name: string;
        email: string;
      } | null;
    } | null;
    customers: {
      profiles: {
        full_name: string;
        email: string;
      } | null;
    } | null;
    service_requests: {
      category: string;
      description: string;
    } | null;
    invoices: Array<{
      id: string;
      amount: number;
      status: string;
    }>;
    quotes: Array<{
      id: string;
      amount: number;
      change_orders: Array<{
        description: string;
        amount: number;
        approved: boolean;
      }>;
    }>;
  } | null;
};

type MessageRecord = {
  id: string;
  content: string;
  created_at: string;
  sender_id: string;
  profiles: { full_name?: string; role?: string } | null;
};

type AdminDecisionRecord = {
  id: string;
  admin_decision: string;
  decision_notes: string | null;
  created_at: string;
  profiles: { full_name?: string } | null;
};

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    case "under_review":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><AlertTriangle className="h-3 w-3 mr-1" /> Under Review</Badge>;
    case "resolved":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" /> Resolved</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function AdminDisputeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: disputeId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const { data: profile } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: { role: string } | null };

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  // Fetch dispute with all related data
  const { data: dispute } = (await supabase
    .from("disputes")
    .select(
      `
      id,
      reason,
      description,
      disputed_amount,
      status,
      created_at,
      booking_id,
      bookings (
        id,
        booking_number,
        status,
        scheduled_at,
        started_at,
        completed_at,
        created_at,
        total_amount,
        provider_id,
        customer_id,
        providers (
          business_name,
          profiles (
            full_name,
            email
          )
        ),
        customers (
          profiles (
            full_name,
            email
          )
        ),
        service_requests (
          category,
          description
        ),
        invoices (
          id,
          amount,
          status
        ),
        quotes (
          id,
          amount,
          change_orders:quote_change_orders (
            description,
            amount,
            approved
          )
        )
      )
    `
    )
    .eq("id", disputeId)
    .single()) as { data: DisputeDetails | null };

  if (!dispute) {
    redirect("/app/admin/disputes");
  }

  // Get message history
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: messagesData } = await (supabase as any)
    .from("messages")
    .select(
      `
      id,
      content,
      created_at,
      sender_id,
      profiles:sender_id (
        full_name,
        role
      )
    `
    )
    .eq("thread_id", dispute.booking_id)
    .order("created_at", { ascending: true })
    .limit(20);

  const messages = (messagesData || []) as MessageRecord[];

  // Get previous admin decisions on this dispute
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: previousDecisionsData } = await (supabase as any)
    .from("admin_decisions")
    .select(
      `
      id,
      admin_decision,
      decision_notes,
      created_at,
      profiles:admin_id (
        full_name
      )
    `
    )
    .eq("entity_type", "dispute")
    .eq("entity_id", disputeId)
    .order("created_at", { ascending: false });

  const previousDecisions = (previousDecisionsData || []) as AdminDecisionRecord[];

  const booking = dispute.bookings;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/admin/disputes">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Dispute Details</h1>
            {getStatusBadge(dispute.status)}
          </div>
          <p className="text-muted-foreground">
            Booking #{booking?.booking_number || "N/A"} &bull; Filed {formatDate(dispute.created_at)}
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-2xl font-bold">
            <DollarSign className="h-5 w-5" />
            {formatCurrency(dispute.disputed_amount)}
          </div>
          <span className="text-sm text-muted-foreground">Disputed Amount</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Dispute Info */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Dispute Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Reason</label>
                <p className="font-medium">{dispute.reason}</p>
              </div>
              {dispute.description && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Description</label>
                  <p className="whitespace-pre-wrap">{dispute.description}</p>
                </div>
              )}
              <Separator />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Invoice Amount</label>
                  <p className="font-medium">
                    {formatCurrency(booking?.invoices?.[0]?.amount || booking?.total_amount || 0)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Disputed Amount</label>
                  <p className="font-medium text-red-600">{formatCurrency(dispute.disputed_amount)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Booking Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Booking Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <span className="font-medium">Booking Created</span>
                    <p className="text-sm text-muted-foreground">
                      {booking?.created_at ? formatDate(booking.created_at) : "N/A"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <div className="flex-1">
                    <span className="font-medium">Scheduled</span>
                    <p className="text-sm text-muted-foreground">
                      {booking?.scheduled_at ? formatDate(booking.scheduled_at) : "N/A"}
                    </p>
                  </div>
                </div>
                {booking?.started_at && (
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <div className="flex-1">
                      <span className="font-medium">Work Started</span>
                      <p className="text-sm text-muted-foreground">{formatDate(booking.started_at)}</p>
                    </div>
                  </div>
                )}
                {booking?.completed_at && (
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                    <div className="flex-1">
                      <span className="font-medium">Work Completed</span>
                      <p className="text-sm text-muted-foreground">{formatDate(booking.completed_at)}</p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="flex-1">
                    <span className="font-medium">Dispute Filed</span>
                    <p className="text-sm text-muted-foreground">{formatDate(dispute.created_at)}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Change Orders */}
          {booking?.quotes?.[0]?.change_orders && booking.quotes[0].change_orders.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Change Orders
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {booking.quotes[0].change_orders.map((co, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <p className="font-medium">{co.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {co.approved ? "Approved" : "Pending/Rejected"}
                        </p>
                      </div>
                      <span className="font-medium">{formatCurrency(co.amount)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Message History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Message History
              </CardTitle>
              <CardDescription>Recent messages between customer and provider</CardDescription>
            </CardHeader>
            <CardContent>
              {messages && messages.length > 0 ? (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {messages.map((msg) => {
                    const msgProfile = msg.profiles as { full_name?: string; role?: string } | null;
                    return (
                      <div key={msg.id} className="p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">
                            {msgProfile?.full_name || "Unknown"}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {msgProfile?.role || "unknown"}
                          </Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDate(msg.created_at)}
                          </span>
                        </div>
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No messages found.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Parties */}
          <Card>
            <CardHeader>
              <CardTitle>Parties Involved</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <label className="text-sm text-muted-foreground">Customer</label>
                  <p className="font-medium">
                    {booking?.customers?.profiles?.full_name || "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {booking?.customers?.profiles?.email || ""}
                  </p>
                </div>
              </div>
              <Separator />
              <div className="flex items-start gap-3">
                <Building2 className="h-5 w-5 mt-0.5 text-muted-foreground" />
                <div>
                  <label className="text-sm text-muted-foreground">Provider</label>
                  <p className="font-medium">
                    {booking?.providers?.business_name || "Unknown"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {booking?.providers?.profiles?.full_name || ""}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Summary Panel */}
          <AIDisputeSummary disputeId={disputeId} />

          {/* Admin Decision Form */}
          {dispute.status !== "resolved" && dispute.status !== "rejected" && (
            <AdminDecisionForm
              entityType="dispute"
              entityId={disputeId}
              currentStatus={dispute.status}
              disputedAmount={dispute.disputed_amount}
            />
          )}

          {/* Previous Decisions */}
          {previousDecisions && previousDecisions.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Decision History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {previousDecisions.map((decision) => {
                    const adminProfile = decision.profiles as { full_name?: string } | null;
                    return (
                      <div key={decision.id} className="p-3 border rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge>{decision.admin_decision}</Badge>
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatDate(decision.created_at)}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          by {adminProfile?.full_name || "Admin"}
                        </p>
                        {decision.decision_notes && (
                          <p className="text-sm mt-1">{decision.decision_notes}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
