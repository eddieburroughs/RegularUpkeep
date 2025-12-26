/**
 * Admin Providers Dashboard
 *
 * Overview of provider discovery and invite metrics.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Send,
  UserCheck,
  TrendingUp,
  ArrowRight,
  Building,
  Star,
} from "lucide-react";

export default async function AdminProvidersPage() {
  const supabase = await createClient();

  // Verify admin access
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: { role: string } | null; error: unknown };

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  // Get counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: leadsCount } = await (supabase.from("provider_leads") as any)
    .select("id", { count: "exact", head: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: invitesCount } = await (supabase.from("external_provider_invites") as any)
    .select("id", { count: "exact", head: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: acceptedCount } = await (supabase.from("external_provider_invites") as any)
    .select("id", { count: "exact", head: true })
    .eq("status", "accepted");

  const { count: providersCount } = await supabase
    .from("providers")
    .select("id", { count: "exact", head: true });

  const conversionRate = invitesCount && invitesCount > 0
    ? ((acceptedCount || 0) / invitesCount * 100).toFixed(1)
    : "0";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Provider Management</h1>
        <p className="text-muted-foreground">
          Manage provider discovery, invites, and onboarding
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Providers</CardTitle>
            <Building className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{providersCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              On the platform
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Google Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Discovered providers
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invites Sent</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{invitesCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              By homeowners
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Invite to join rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Provider Leads
            </CardTitle>
            <CardDescription>
              View providers discovered through Google Places searches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app/admin/providers/leads">
              <Button className="w-full">
                View Leads
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Provider Invites
            </CardTitle>
            <CardDescription>
              Track invites sent by homeowners and conversion funnel
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/app/admin/providers/invites">
              <Button className="w-full">
                View Invites
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Discovery Funnel */}
      <Card>
        <CardHeader>
          <CardTitle>Discovery Funnel</CardTitle>
          <CardDescription>
            How providers join the platform through Google Discovery
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 text-center p-4 rounded-lg bg-blue-50">
              <Star className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <p className="text-2xl font-bold">{leadsCount || 0}</p>
              <p className="text-sm text-muted-foreground">Google Leads</p>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            <div className="flex-1 text-center p-4 rounded-lg bg-purple-50">
              <Send className="h-8 w-8 mx-auto text-purple-600 mb-2" />
              <p className="text-2xl font-bold">{invitesCount || 0}</p>
              <p className="text-sm text-muted-foreground">Invites Sent</p>
            </div>
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
            <div className="flex-1 text-center p-4 rounded-lg bg-green-50">
              <UserCheck className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <p className="text-2xl font-bold">{acceptedCount || 0}</p>
              <p className="text-sm text-muted-foreground">Joined Platform</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
