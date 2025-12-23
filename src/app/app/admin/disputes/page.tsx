/**
 * Admin Disputes List Page
 *
 * Lists all disputes with status filters and links to detail view.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  ChevronRight,
  XCircle,
} from "lucide-react";

type Dispute = {
  id: string;
  reason: string;
  description: string | null;
  disputed_amount: number;
  status: string;
  created_at: string;
  booking_id: string;
  bookings: {
    booking_number: string;
    provider_id: string;
    providers: {
      business_name: string;
    } | null;
    customers: {
      profiles: {
        full_name: string;
      } | null;
    } | null;
  } | null;
};

function getStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
    case "under_review":
      return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300"><AlertTriangle className="h-3 w-3 mr-1" /> Under Review</Badge>;
    case "resolved":
      return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" /> Resolved</Badge>;
    case "rejected":
      return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
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
  });
}

export default async function AdminDisputesPage() {
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

  // Fetch disputes with related data
  const { data: disputes } = (await supabase
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
        booking_number,
        provider_id,
        providers (
          business_name
        ),
        customers (
          profiles (
            full_name
          )
        )
      )
    `
    )
    .order("created_at", { ascending: false })) as { data: Dispute[] | null };

  // Group by status
  const pending = (disputes || []).filter((d) => d.status === "pending");
  const underReview = (disputes || []).filter((d) => d.status === "under_review");
  const resolved = (disputes || []).filter((d) => d.status === "resolved");
  const rejected = (disputes || []).filter((d) => d.status === "rejected");

  // Calculate stats
  const totalAmount = (disputes || []).reduce((sum, d) => sum + d.disputed_amount, 0);
  const pendingAmount = pending.reduce((sum, d) => sum + d.disputed_amount, 0);

  const renderDisputeList = (disputeList: Dispute[]) => {
    if (disputeList.length === 0) {
      return (
        <div className="text-center py-8 text-muted-foreground">
          No disputes in this category.
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {disputeList.map((dispute) => (
          <Card key={dispute.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {getStatusBadge(dispute.status)}
                    <span className="text-sm text-muted-foreground">
                      {formatDate(dispute.created_at)}
                    </span>
                  </div>
                  <h3 className="font-medium truncate">{dispute.reason}</h3>
                  {dispute.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                      {dispute.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span>
                      Booking #{dispute.bookings?.booking_number || "N/A"}
                    </span>
                    <span>
                      Provider: {dispute.bookings?.providers?.business_name || "Unknown"}
                    </span>
                    <span>
                      Customer: {dispute.bookings?.customers?.profiles?.full_name || "Unknown"}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="flex items-center gap-1 text-lg font-semibold">
                      <DollarSign className="h-4 w-4" />
                      {formatCurrency(dispute.disputed_amount)}
                    </div>
                    <span className="text-xs text-muted-foreground">Disputed</span>
                  </div>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/app/admin/disputes/${dispute.id}`}>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dispute Management</h1>
          <p className="text-muted-foreground">
            Review and resolve customer disputes
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Disputes</CardDescription>
            <CardTitle className="text-2xl">{disputes?.length || 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Review</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{pending.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Disputed</CardDescription>
            <CardTitle className="text-2xl">{formatCurrency(totalAmount)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending Amount</CardDescription>
            <CardTitle className="text-2xl text-yellow-600">{formatCurrency(pendingAmount)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="pending" className="w-full">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pending.length > 0 && (
              <Badge variant="secondary" className="ml-1">{pending.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="under_review" className="gap-2">
            Under Review
            {underReview.length > 0 && (
              <Badge variant="secondary" className="ml-1">{underReview.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="rejected">Rejected</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          {renderDisputeList(pending)}
        </TabsContent>

        <TabsContent value="under_review" className="mt-4">
          {renderDisputeList(underReview)}
        </TabsContent>

        <TabsContent value="resolved" className="mt-4">
          {renderDisputeList(resolved)}
        </TabsContent>

        <TabsContent value="rejected" className="mt-4">
          {renderDisputeList(rejected)}
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          {renderDisputeList(disputes || [])}
        </TabsContent>
      </Tabs>
    </div>
  );
}
