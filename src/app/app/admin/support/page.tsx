/**
 * Admin Support Tickets Page
 *
 * "Open Items" inbox for managing support tickets.
 */

// Helper to calculate date range for queries (extracted to module scope)
function getOneWeekAgo(): string {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  Inbox,
  Clock,
  CheckCircle,
  AlertTriangle,
  Users,
  MessageSquare,
  RefreshCw,
} from "lucide-react";
import { TicketList } from "./ticket-list";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/app/admin/support");
  }

  // Verify admin
  const { data: profile } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: { role: string } | null };

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  // Fetch ticket stats
  const oneWeekAgo = getOneWeekAgo();
  const [openResult, inProgressResult, resolvedResult, urgentResult] = await Promise.all([
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "in_progress"),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "resolved")
      .gte("resolved_at", oneWeekAgo),
    supabase
      .from("support_tickets")
      .select("id", { count: "exact", head: true })
      .eq("status", "open")
      .eq("priority", "urgent"),
  ]);

  const stats = {
    open: openResult.count || 0,
    inProgress: inProgressResult.count || 0,
    resolvedThisWeek: resolvedResult.count || 0,
    urgent: urgentResult.count || 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Support Inbox</h1>
          <p className="text-muted-foreground">
            Manage support tickets and customer conversations
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/admin/knowledge-base">
            <Button variant="outline" size="sm">
              Knowledge Base
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-500/10 rounded-lg">
                <Inbox className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Open</p>
                <p className="text-2xl font-bold">{stats.open}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">In Progress</p>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Resolved (7d)</p>
                <p className="text-2xl font-bold">{stats.resolvedThisWeek}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={stats.urgent > 0 ? "border-red-500" : ""}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Urgent</p>
                <p className="text-2xl font-bold">{stats.urgent}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="open" className="space-y-4">
        <TabsList>
          <TabsTrigger value="open">
            Open
            {stats.open > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.open}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            In Progress
            {stats.inProgress > 0 && (
              <Badge variant="secondary" className="ml-2">
                {stats.inProgress}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>

        <TabsContent value="open">
          <TicketList status={["open"]} adminId={user.id} />
        </TabsContent>

        <TabsContent value="in_progress">
          <TicketList status={["in_progress", "waiting"]} adminId={user.id} />
        </TabsContent>

        <TabsContent value="resolved">
          <TicketList status={["resolved", "closed"]} adminId={user.id} />
        </TabsContent>

        <TabsContent value="all">
          <TicketList adminId={user.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
