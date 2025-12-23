/**
 * Provider CRM Dashboard
 *
 * Displays customer pipeline, lead management, and key metrics.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  Users,
  TrendingUp,
  Clock,
  DollarSign,
  Star,
  ChevronRight,
  Phone,
  Mail,
  Calendar,
  FileText,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  MapPin,
} from "lucide-react";

type CustomerWithStats = {
  customer_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  total_jobs: number;
  total_spent: number;
  last_job_date: string | null;
  avg_rating: number | null;
  status: "lead" | "quoted" | "active" | "completed";
};

type PipelineStats = {
  leads: number;
  quoted: number;
  booked: number;
  completed: number;
  totalRevenue: number;
  avgTicket: number;
  conversionRate: number;
  avgResponseHours: number;
};

export default async function ProviderCRMPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/provider/crm");
  }

  // Get provider
  const { data: provider } = await supabase
    .from("providers")
    .select("id, tier, stripe_account_id")
    .eq("profile_id", user.id)
    .single() as { data: { id: string; tier: string; stripe_account_id: string | null } | null };

  if (!provider) {
    redirect("/provider/onboarding/signup");
  }

  // Fetch bookings to build customer data
  const { data: bookings } = await supabase
    .from("bookings")
    .select(`
      id,
      customer_id,
      status,
      total_amount,
      invoice_cents,
      scheduled_date,
      created_at,
      customers!inner(
        id,
        profile_id,
        profiles(full_name, email, phone)
      )
    `)
    .eq("provider_id", provider.id)
    .order("created_at", { ascending: false }) as {
      data: Array<{
        id: string;
        customer_id: string;
        status: string;
        total_amount: number;
        invoice_cents: number;
        scheduled_date: string;
        created_at: string;
        customers: {
          id: string;
          profile_id: string;
          profiles: { full_name: string | null; email: string; phone: string | null };
        };
      }> | null
    };

  // Fetch reviews
  const { data: reviews } = await supabase
    .from("reviews")
    .select("rating, booking_id")
    .eq("provider_id", provider.id) as { data: Array<{ rating: number; booking_id: string }> | null };

  const reviewMap = new Map<string, number>();
  reviews?.forEach((r) => reviewMap.set(r.booking_id, r.rating));

  // Calculate customer stats
  const customerMap = new Map<string, CustomerWithStats>();

  bookings?.forEach((booking) => {
    const customerId = booking.customer_id;
    const customer = booking.customers;
    const profile = customer?.profiles;

    if (!customerMap.has(customerId)) {
      customerMap.set(customerId, {
        customer_id: customerId,
        full_name: profile?.full_name || null,
        email: profile?.email || "",
        phone: profile?.phone || null,
        total_jobs: 0,
        total_spent: 0,
        last_job_date: null,
        avg_rating: null,
        status: "lead",
      });
    }

    const stats = customerMap.get(customerId)!;
    stats.total_jobs++;
    stats.total_spent += booking.invoice_cents || booking.total_amount || 0;

    if (!stats.last_job_date || booking.scheduled_date > stats.last_job_date) {
      stats.last_job_date = booking.scheduled_date;
    }

    // Determine status
    if (booking.status === "completed") {
      stats.status = "completed";
    } else if (booking.status === "confirmed" || booking.status === "in_progress") {
      stats.status = "active";
    } else if (booking.status === "pending") {
      stats.status = "quoted";
    }

    // Add review rating
    const rating = reviewMap.get(booking.id);
    if (rating) {
      if (stats.avg_rating === null) {
        stats.avg_rating = rating;
      } else {
        stats.avg_rating = (stats.avg_rating + rating) / 2;
      }
    }
  });

  const customers = Array.from(customerMap.values());

  // Calculate pipeline stats
  const pipelineStats: PipelineStats = {
    leads: customers.filter((c) => c.status === "lead").length,
    quoted: customers.filter((c) => c.status === "quoted").length,
    booked: customers.filter((c) => c.status === "active").length,
    completed: customers.filter((c) => c.status === "completed").length,
    totalRevenue: customers.reduce((acc, c) => acc + c.total_spent, 0),
    avgTicket:
      customers.length > 0
        ? customers.reduce((acc, c) => acc + c.total_spent, 0) / customers.filter((c) => c.total_jobs > 0).length
        : 0,
    conversionRate:
      customers.length > 0
        ? (customers.filter((c) => c.status === "completed" || c.status === "active").length / customers.length) * 100
        : 0,
    avgResponseHours: 2.5, // TODO: Calculate from actual response times
  };

  // Get recent leads (customers with pending quotes)
  const recentLeads = customers
    .filter((c) => c.status === "lead" || c.status === "quoted")
    .slice(0, 5);

  // Get top customers by spend
  const topCustomers = [...customers]
    .sort((a, b) => b.total_spent - a.total_spent)
    .slice(0, 5);

  // Get customers needing follow-up (no activity in 30+ days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const needsFollowUp = customers.filter(
    (c) => c.last_job_date && new Date(c.last_job_date) < thirtyDaysAgo
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer CRM</h1>
          <p className="text-muted-foreground">
            Manage leads, customers, and relationships
          </p>
        </div>
        {provider.tier === "basic" && (
          <Link href="/provider/billing">
            <Button variant="outline" size="sm">
              <ArrowUpRight className="h-4 w-4 mr-2" />
              Upgrade for More Features
            </Button>
          </Link>
        )}
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Customers</p>
                <p className="text-2xl font-bold">{customers.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <DollarSign className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Revenue</p>
                <p className="text-2xl font-bold">
                  ${(pipelineStats.totalRevenue / 100).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Conversion Rate</p>
                <p className="text-2xl font-bold">
                  {pipelineStats.conversionRate.toFixed(0)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Avg Response</p>
                <p className="text-2xl font-bold">
                  {pipelineStats.avgResponseHours.toFixed(1)}h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Sales Pipeline</CardTitle>
          <CardDescription>Track customers through your sales process</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <p className="text-3xl font-bold text-muted-foreground">
                {pipelineStats.leads}
              </p>
              <p className="text-sm text-muted-foreground">Leads</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-3xl font-bold text-blue-600">
                {pipelineStats.quoted}
              </p>
              <p className="text-sm text-blue-600">Quoted</p>
            </div>
            <div className="text-center p-4 bg-amber-50 rounded-lg">
              <p className="text-3xl font-bold text-amber-600">
                {pipelineStats.booked}
              </p>
              <p className="text-sm text-amber-600">Booked</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-3xl font-bold text-green-600">
                {pipelineStats.completed}
              </p>
              <p className="text-sm text-green-600">Completed</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs defaultValue="leads" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="leads">
            New Leads
            {recentLeads.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {recentLeads.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="customers">All Customers</TabsTrigger>
          <TabsTrigger value="followup">
            Follow-Up
            {needsFollowUp.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {needsFollowUp.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Recent Leads Tab */}
        <TabsContent value="leads" className="space-y-4">
          {recentLeads.length > 0 ? (
            recentLeads.map((customer) => (
              <CustomerCard key={customer.customer_id} customer={customer} />
            ))
          ) : (
            <EmptyState
              icon={Users}
              title="No pending leads"
              description="New service requests will appear here"
            />
          )}
        </TabsContent>

        {/* All Customers Tab */}
        <TabsContent value="customers" className="space-y-4">
          {topCustomers.length > 0 ? (
            <>
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Top Customers by Revenue</h3>
              </div>
              {topCustomers.map((customer) => (
                <CustomerCard key={customer.customer_id} customer={customer} />
              ))}
            </>
          ) : (
            <EmptyState
              icon={Users}
              title="No customers yet"
              description="Your customers will appear here after you complete jobs"
            />
          )}
        </TabsContent>

        {/* Follow-Up Tab */}
        <TabsContent value="followup" className="space-y-4">
          {needsFollowUp.length > 0 ? (
            <>
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-800">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {needsFollowUp.length} customers haven&apos;t booked in 30+ days
                  </span>
                </div>
              </div>
              {needsFollowUp.map((customer) => (
                <CustomerCard key={customer.customer_id} customer={customer} showFollowUp />
              ))}
            </>
          ) : (
            <EmptyState
              icon={CheckCircle2}
              title="All caught up!"
              description="No customers need follow-up right now"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CustomerCard({
  customer,
  showFollowUp = false,
}: {
  customer: CustomerWithStats;
  showFollowUp?: boolean;
}) {
  const statusColors = {
    lead: "secondary",
    quoted: "outline",
    active: "default",
    completed: "default",
  } as const;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-medium truncate">
                {customer.full_name || "Unknown Customer"}
              </span>
              <Badge variant={statusColors[customer.status]}>
                {customer.status}
              </Badge>
              {customer.avg_rating && (
                <div className="flex items-center gap-1 text-amber-500">
                  <Star className="h-3 w-3 fill-current" />
                  <span className="text-xs">{customer.avg_rating.toFixed(1)}</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
              {customer.email && (
                <div className="flex items-center gap-2">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}
              {customer.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  <span>{customer.phone}</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-4 mt-2 text-sm">
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3 text-muted-foreground" />
                <span>{customer.total_jobs} jobs</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-muted-foreground" />
                <span>${(customer.total_spent / 100).toLocaleString()}</span>
              </div>
              {customer.last_job_date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-muted-foreground" />
                  <span>
                    Last:{" "}
                    {new Date(customer.last_job_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </div>

            {showFollowUp && (
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline">
                  <Phone className="h-3 w-3 mr-1" />
                  Call
                </Button>
                <Button size="sm" variant="outline">
                  <Mail className="h-3 w-3 mr-1" />
                  Email
                </Button>
              </div>
            )}
          </div>

          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
}) {
  return (
    <div className="text-center py-12 text-muted-foreground">
      <Icon className="h-12 w-12 mx-auto mb-4 opacity-30" />
      <p className="font-medium">{title}</p>
      <p className="text-sm">{description}</p>
    </div>
  );
}
