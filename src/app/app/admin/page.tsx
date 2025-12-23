/**
 * Admin KPI Dashboard
 *
 * Displays key performance indicators and business analytics.
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
  Home,
  Briefcase,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Star,
  Calendar,
  Clock,
  Building2,
  Wrench,
  Settings,
  ChevronRight,
  ArrowUpRight,
  ArrowDownRight,
  Bot,
} from "lucide-react";
import { AIOpsPanel } from "@/components/admin/ai-ops-panel";

type KPIData = {
  // User metrics
  totalHomeowners: number;
  activeHomeowners: number;
  newHomeownersThisMonth: number;
  homeownerGrowthRate: number;

  // Provider metrics
  totalProviders: number;
  verifiedProviders: number;
  preferredProviders: number;
  activeProviders: number;

  // Property metrics
  totalProperties: number;
  avgPropertiesPerUser: number;

  // Booking metrics
  totalBookings: number;
  completedBookings: number;
  pendingBookings: number;
  bookingsThisMonth: number;
  completionRate: number;

  // Revenue metrics
  totalRevenueCents: number;
  revenueThisMonthCents: number;
  avgTicketCents: number;
  platformFeesCents: number;

  // Quality metrics
  avgProviderRating: number;
  totalReviews: number;
  disputeRate: number;

  // Sponsor metrics
  activeSponsors: number;
  sponsorRevenueCents: number;
};

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Check if user is admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null };

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  // Get current date info
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

  // Fetch all data in parallel
  const [
    homeownersResult,
    newHomeownersResult,
    lastMonthHomeownersResult,
    providersResult,
    propertiesResult,
    bookingsResult,
    thisMonthBookingsResult,
    reviewsResult,
    sponsorsResult,
  ] = await Promise.all([
    // Total homeowners
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "customer"),
    // New homeowners this month
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer")
      .gte("created_at", thisMonthStart),
    // Homeowners last month (for growth rate)
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "customer")
      .gte("created_at", lastMonthStart)
      .lt("created_at", lastMonthEnd),
    // Providers
    supabase.from("providers").select("id, tier, is_online, verification_status"),
    // Properties
    supabase.from("properties").select("id", { count: "exact", head: true }),
    // All bookings
    supabase.from("bookings").select("id, status, total_amount, invoice_cents"),
    // This month's bookings
    supabase
      .from("bookings")
      .select("id, total_amount, invoice_cents")
      .gte("created_at", thisMonthStart),
    // Reviews
    supabase.from("reviews").select("rating"),
    // Sponsors
    supabase.from("sponsors").select("id, status"),
  ]);

  // Process data
  const totalHomeowners = homeownersResult.count || 0;
  const newHomeownersThisMonth = newHomeownersResult.count || 0;
  const lastMonthHomeowners = lastMonthHomeownersResult.count || 0;
  const homeownerGrowthRate =
    lastMonthHomeowners > 0
      ? ((newHomeownersThisMonth - lastMonthHomeowners) / lastMonthHomeowners) * 100
      : 0;

  const providers = (providersResult.data || []) as Array<{
    id: string;
    tier: string;
    is_online: boolean;
    verification_status: string;
  }>;
  const totalProviders = providers.length;
  const verifiedProviders = providers.filter(
    (p) => p.verification_status === "verified" || p.tier === "verified" || p.tier === "preferred"
  ).length;
  const preferredProviders = providers.filter((p) => p.tier === "preferred").length;
  const activeProviders = providers.filter((p) => p.is_online).length;

  const totalProperties = propertiesResult.count || 0;
  const avgPropertiesPerUser = totalHomeowners > 0 ? totalProperties / totalHomeowners : 0;

  const bookings = (bookingsResult.data || []) as Array<{
    id: string;
    status: string;
    total_amount: number;
    invoice_cents: number;
  }>;
  const totalBookings = bookings.length;
  const completedBookings = bookings.filter((b) => b.status === "completed").length;
  const pendingBookings = bookings.filter((b) => b.status === "pending").length;
  const completionRate = totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;

  const thisMonthBookings = (thisMonthBookingsResult.data || []) as Array<{
    id: string;
    total_amount: number;
    invoice_cents: number;
  }>;
  const bookingsThisMonth = thisMonthBookings.length;

  const totalRevenueCents = bookings.reduce(
    (acc, b) => acc + (b.invoice_cents || b.total_amount || 0),
    0
  );
  const revenueThisMonthCents = thisMonthBookings.reduce(
    (acc, b) => acc + (b.invoice_cents || b.total_amount || 0),
    0
  );
  const avgTicketCents = completedBookings > 0 ? totalRevenueCents / completedBookings : 0;
  const platformFeesCents = Math.floor(totalRevenueCents * 0.08); // 8% platform fee estimate

  const reviews = (reviewsResult.data || []) as Array<{ rating: number }>;
  const totalReviews = reviews.length;
  const avgProviderRating =
    totalReviews > 0 ? reviews.reduce((acc, r) => acc + r.rating, 0) / totalReviews : 0;

  const sponsors = (sponsorsResult.data || []) as Array<{ id: string; status: string }>;
  const activeSponsors = sponsors.filter((s) => s.status === "active").length;
  const sponsorRevenueCents = activeSponsors * 25000; // $250/year per sponsor

  const kpiData: KPIData = {
    totalHomeowners,
    activeHomeowners: totalHomeowners, // TODO: Track active users properly
    newHomeownersThisMonth,
    homeownerGrowthRate,
    totalProviders,
    verifiedProviders,
    preferredProviders,
    activeProviders,
    totalProperties,
    avgPropertiesPerUser,
    totalBookings,
    completedBookings,
    pendingBookings,
    bookingsThisMonth,
    completionRate,
    totalRevenueCents,
    revenueThisMonthCents,
    avgTicketCents,
    platformFeesCents,
    avgProviderRating,
    totalReviews,
    disputeRate: 0, // TODO: Calculate from disputes table
    activeSponsors,
    sponsorRevenueCents,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Key performance indicators and business analytics
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/admin/config">
            <Button variant="outline" size="sm">
              <Settings className="h-4 w-4 mr-2" />
              Config
            </Button>
          </Link>
          <Link href="/app/admin/users">
            <Button variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Users
            </Button>
          </Link>
        </div>
      </div>

      {/* Top-Level KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Monthly Revenue"
          value={`$${(kpiData.revenueThisMonthCents / 100).toLocaleString()}`}
          description="This month"
          icon={DollarSign}
          trend={kpiData.homeownerGrowthRate > 0 ? "up" : "down"}
          trendValue={`${Math.abs(kpiData.homeownerGrowthRate).toFixed(0)}%`}
        />
        <KPICard
          title="Active Homeowners"
          value={kpiData.totalHomeowners.toString()}
          description={`+${kpiData.newHomeownersThisMonth} this month`}
          icon={Users}
          trend="up"
          trendValue={`${kpiData.newHomeownersThisMonth}`}
        />
        <KPICard
          title="Active Providers"
          value={kpiData.totalProviders.toString()}
          description={`${kpiData.activeProviders} online now`}
          icon={Briefcase}
        />
        <KPICard
          title="Avg Provider Rating"
          value={kpiData.avgProviderRating.toFixed(1)}
          description={`${kpiData.totalReviews} reviews`}
          icon={Star}
        />
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="ai-ops">
            <Bot className="h-4 w-4 mr-1" />
            AI Ops
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* User Growth */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">User Growth</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Homeowners</span>
                  <span className="font-medium">{kpiData.totalHomeowners}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">New This Month</span>
                  <Badge variant="secondary">+{kpiData.newHomeownersThisMonth}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Avg Properties</span>
                  <span className="font-medium">{kpiData.avgPropertiesPerUser.toFixed(1)}</span>
                </div>
              </CardContent>
            </Card>

            {/* Provider Health */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Provider Network</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Providers</span>
                  <span className="font-medium">{kpiData.totalProviders}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Verified</span>
                  <Badge variant="default">{kpiData.verifiedProviders}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Preferred</span>
                  <Badge className="bg-amber-500">{kpiData.preferredProviders}</Badge>
                </div>
              </CardContent>
            </Card>

            {/* Booking Performance */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Booking Performance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Bookings</span>
                  <span className="font-medium">{kpiData.totalBookings}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">This Month</span>
                  <Badge variant="secondary">{kpiData.bookingsThisMonth}</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Completion Rate</span>
                  <span className="font-medium">{kpiData.completionRate.toFixed(0)}%</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-4">
                <Link href="/app/admin/users">
                  <Button variant="outline" className="w-full justify-start">
                    <Users className="h-4 w-4 mr-2" />
                    Manage Users
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                </Link>
                <Link href="/app/admin/config">
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Config
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  </Button>
                </Link>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Building2 className="h-4 w-4 mr-2" />
                  View Providers
                  <Badge variant="outline" className="ml-auto">Soon</Badge>
                </Button>
                <Button variant="outline" className="w-full justify-start" disabled>
                  <Wrench className="h-4 w-4 mr-2" />
                  View Bookings
                  <Badge variant="outline" className="ml-auto">Soon</Badge>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(kpiData.totalRevenueCents / 100).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Platform Fees</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(kpiData.platformFeesCents / 100).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">8% of GMV</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Ticket</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(kpiData.avgTicketCents / 100).toFixed(0)}
                </div>
                <p className="text-xs text-muted-foreground">Per completed job</p>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Streams</CardTitle>
              <CardDescription>Breakdown of platform revenue</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <DollarSign className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Provider Fees (8%)</p>
                    <p className="text-sm text-muted-foreground">Per completed job</p>
                  </div>
                </div>
                <span className="font-bold">
                  ${(kpiData.platformFeesCents / 100).toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Star className="h-4 w-4 text-amber-600" />
                  </div>
                  <div>
                    <p className="font-medium">Provider Subscriptions</p>
                    <p className="text-sm text-muted-foreground">
                      {kpiData.verifiedProviders} verified @ $10/mo + {kpiData.preferredProviders}{" "}
                      preferred @ $15/mo
                    </p>
                  </div>
                </div>
                <span className="font-bold">
                  ${(
                    (kpiData.verifiedProviders - kpiData.preferredProviders) * 10 +
                    kpiData.preferredProviders * 15
                  ).toLocaleString()}
                  /mo
                </span>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <Building2 className="h-4 w-4 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium">Sponsor Revenue</p>
                    <p className="text-sm text-muted-foreground">
                      {kpiData.activeSponsors} sponsors @ $250/year
                    </p>
                  </div>
                </div>
                <span className="font-bold">
                  ${(kpiData.sponsorRevenueCents / 100).toLocaleString()}/yr
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Providers Tab */}
        <TabsContent value="providers" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Briefcase className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-2xl font-bold">{kpiData.totalProviders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <div className="h-5 w-5 rounded-full bg-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Online Now</p>
                    <p className="text-2xl font-bold">{kpiData.activeProviders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 rounded-lg">
                    <Star className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Verified</p>
                    <p className="text-2xl font-bold">{kpiData.verifiedProviders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-lg">
                    <Star className="h-5 w-5 text-amber-600 fill-current" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Preferred</p>
                    <p className="text-2xl font-bold">{kpiData.preferredProviders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Provider Quality</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Average Rating</span>
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-amber-500 fill-current" />
                  <span className="font-bold">{kpiData.avgProviderRating.toFixed(2)}</span>
                  <span className="text-sm text-muted-foreground">
                    ({kpiData.totalReviews} reviews)
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span>Dispute Rate</span>
                <Badge variant={kpiData.disputeRate < 5 ? "default" : "destructive"}>
                  {kpiData.disputeRate.toFixed(1)}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Completion Rate</span>
                <Badge variant={kpiData.completionRate > 90 ? "default" : "secondary"}>
                  {kpiData.completionRate.toFixed(0)}%
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operations Tab */}
        <TabsContent value="operations" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.pendingBookings}</div>
                <p className="text-xs text-muted-foreground">Awaiting confirmation</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Completed Today</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {/* Would need to calculate this from bookings with today's date */}
                  --
                </div>
                <p className="text-xs text-muted-foreground">Jobs finished</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{kpiData.totalProperties}</div>
                <p className="text-xs text-muted-foreground">Registered homes</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Sponsor Network</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span>Active Sponsors</span>
                <Badge variant="default">{kpiData.activeSponsors}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Annual Revenue</span>
                <span className="font-bold">
                  ${(kpiData.sponsorRevenueCents / 100).toLocaleString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Ops Tab */}
        <TabsContent value="ai-ops" className="space-y-4">
          <AIOpsPanel />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPICard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  trendValue,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  trend?: "up" | "down";
  trendValue?: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="p-2 bg-muted rounded-lg">
              <Icon className="h-5 w-5" />
            </div>
            {trend && trendValue && (
              <div
                className={`flex items-center gap-1 text-xs ${
                  trend === "up" ? "text-green-600" : "text-red-600"
                }`}
              >
                {trend === "up" ? (
                  <ArrowUpRight className="h-3 w-3" />
                ) : (
                  <ArrowDownRight className="h-3 w-3" />
                )}
                {trendValue}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
