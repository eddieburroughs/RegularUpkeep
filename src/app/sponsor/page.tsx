/**
 * Sponsor Dashboard
 *
 * Main dashboard for sponsors to view their performance and manage their account.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  Eye,
  MousePointer,
  TrendingUp,
  Calendar,
  Settings,
  CreditCard,
  Building2,
  MapPin,
} from "lucide-react";

type SponsorWithStats = {
  id: string;
  business_name: string;
  tagline: string | null;
  logo_url: string | null;
  website_url: string | null;
  phone: string | null;
  email: string | null;
  sponsor_type: string;
  status: string;
  city: string | null;
  state: string | null;
  territory_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  territories: {
    name: string;
    zip_codes: string[];
  } | null;
};

type DailyStats = {
  date: string;
  impressions: number;
  clicks: number;
};

export default async function SponsorDashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/sponsor");
  }

  // Get sponsor
  const { data: sponsor } = await supabase
    .from("sponsors")
    .select(`
      *,
      territories(name, zip_codes)
    `)
    .eq("profile_id", user.id)
    .single() as { data: SponsorWithStats | null };

  if (!sponsor) {
    redirect("/sponsor/onboarding");
  }

  // Get stats for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: dailyStats } = await supabase
    .from("sponsor_daily_stats")
    .select("date, impressions, clicks")
    .eq("sponsor_id", sponsor.id)
    .gte("date", thirtyDaysAgo.toISOString().split("T")[0])
    .order("date", { ascending: false }) as { data: DailyStats[] | null };

  const stats = dailyStats || [];
  const totalImpressions = stats.reduce((sum, s) => sum + (s.impressions || 0), 0);
  const totalClicks = stats.reduce((sum, s) => sum + (s.clicks || 0), 0);
  const clickRate = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-800">Pending</Badge>;
      case "canceled":
        return <Badge className="bg-red-100 text-red-800">Canceled</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Sponsor Dashboard</h1>
            <p className="text-muted-foreground">{sponsor.business_name}</p>
          </div>
          <div className="flex items-center gap-2">
            {statusBadge(sponsor.status)}
            <Button variant="outline" size="sm" asChild>
              <Link href="/sponsor/settings">
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          </div>
        </div>

        {/* Status Alert */}
        {sponsor.status === "pending" && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                  <CreditCard className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-amber-900">Complete Your Subscription</p>
                  <p className="text-sm text-amber-700">
                    Finish setting up your payment to start appearing in your territory.
                  </p>
                </div>
                <Button asChild>
                  <Link href="/sponsor/billing">Complete Setup</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Impressions</CardTitle>
              <Eye className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalImpressions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Clicks</CardTitle>
              <MousePointer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Click Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{clickRate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">Engagement</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Next Billing</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {sponsor.current_period_end
                  ? new Date(sponsor.current_period_end).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground">
                {sponsor.stripe_subscription_id ? "Annual" : "Not subscribed"}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Territory Info */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Your Territory</CardTitle>
              <CardDescription>
                Your sponsor tile appears to homeowners in these areas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sponsor.territories ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{sponsor.territories.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {sponsor.territories.zip_codes?.length || 0} zip codes covered
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {sponsor.territories.zip_codes?.slice(0, 20).map((zip) => (
                      <Badge key={zip} variant="outline">
                        {zip}
                      </Badge>
                    ))}
                    {(sponsor.territories.zip_codes?.length || 0) > 20 && (
                      <Badge variant="secondary">
                        +{(sponsor.territories.zip_codes?.length || 0) - 20} more
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No territory assigned yet</p>
                  <p className="text-sm">Contact support to set up your territory.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Profile Preview */}
          <Card>
            <CardHeader>
              <CardTitle>Your Listing</CardTitle>
              <CardDescription>How homeowners see you</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {sponsor.logo_url ? (
                  <img
                    src={sponsor.logo_url}
                    alt={sponsor.business_name}
                    className="w-12 h-12 rounded-lg object-contain bg-muted p-1"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <Building2 className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div>
                  <p className="font-medium">{sponsor.business_name}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {sponsor.sponsor_type.replace("_", " ")}
                  </p>
                </div>
              </div>
              {sponsor.tagline && (
                <p className="text-sm text-muted-foreground">{sponsor.tagline}</p>
              )}
              <Button variant="outline" className="w-full" asChild>
                <Link href="/sponsor/profile">Edit Profile</Link>
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <Link href="/sponsor/billing">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Billing & Subscription</p>
                  <p className="text-sm text-muted-foreground">
                    Manage your payment and plan
                  </p>
                </div>
              </CardContent>
            </Link>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <Link href="/sponsor/profile">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Edit Profile</p>
                  <p className="text-sm text-muted-foreground">
                    Update your business info
                  </p>
                </div>
              </CardContent>
            </Link>
          </Card>
          <Card className="cursor-pointer hover:bg-muted/50 transition-colors">
            <Link href="/sponsor/analytics">
              <CardContent className="flex items-center gap-4 py-6">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <TrendingUp className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Analytics</p>
                  <p className="text-sm text-muted-foreground">
                    View detailed performance
                  </p>
                </div>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
