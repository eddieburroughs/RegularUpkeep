/**
 * Admin Provider Invites
 *
 * View and manage invites sent by homeowners to external providers.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Mail,
  MessageSquare,
  Link,
  User,
  Home,
} from "lucide-react";

interface InviteWithDetails {
  id: string;
  status: string;
  service_type: string;
  sent_via: string;
  sent_to: string;
  message: string | null;
  sent_at: string | null;
  opened_at: string | null;
  responded_at: string | null;
  expires_at: string;
  created_at: string;
  provider_lead: {
    name: string;
    phone: string | null;
    rating: number | null;
  } | null;
  property: {
    address: string;
    city: string;
    state: string;
  } | null;
  homeowner: {
    full_name: string;
    email: string;
  } | null;
}

const statusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  sent: <Send className="h-3 w-3" />,
  opened: <Eye className="h-3 w-3" />,
  accepted: <CheckCircle className="h-3 w-3" />,
  declined: <XCircle className="h-3 w-3" />,
  expired: <Clock className="h-3 w-3" />,
};

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  sent: "bg-blue-100 text-blue-800",
  opened: "bg-purple-100 text-purple-800",
  accepted: "bg-green-100 text-green-800",
  declined: "bg-red-100 text-red-800",
  expired: "bg-gray-100 text-gray-800",
};

const viaIcons: Record<string, React.ReactNode> = {
  sms: <MessageSquare className="h-3 w-3" />,
  email: <Mail className="h-3 w-3" />,
  link: <Link className="h-3 w-3" />,
};

export default async function AdminProviderInvitesPage() {
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

  // Get all invites with details
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invites, error } = (await (supabase.from("external_provider_invites") as any)
    .select(`
      id,
      status,
      service_type,
      sent_via,
      sent_to,
      message,
      sent_at,
      opened_at,
      responded_at,
      expires_at,
      created_at,
      homeowner_user_id,
      provider_lead:provider_leads (
        name,
        phone,
        rating
      ),
      property:properties (
        address,
        city,
        state
      )
    `)
    .order("created_at", { ascending: false })
    .limit(100)) as { data: (InviteWithDetails & { homeowner_user_id: string })[] | null; error: unknown };

  // Get homeowner names
  const homeownerIds = [...new Set((invites || []).map((i) => i.homeowner_user_id))];
  const { data: homeowners } = (await supabase
    .from("profiles")
    .select("id, full_name, email")
    .in("id", homeownerIds)) as { data: { id: string; full_name: string; email: string }[] | null; error: unknown };

  const homeownerMap = new Map(
    (homeowners || []).map((h) => [h.id, { full_name: h.full_name, email: h.email }])
  );

  const invitesWithHomeowners = (invites || []).map((invite) => ({
    ...invite,
    homeowner: homeownerMap.get(invite.homeowner_user_id) || null,
  }));

  // Calculate stats
  const totalInvites = invitesWithHomeowners.length;
  const pendingInvites = invitesWithHomeowners.filter(
    (i) => i.status === "pending" || i.status === "sent"
  ).length;
  const openedInvites = invitesWithHomeowners.filter((i) => i.status === "opened").length;
  const acceptedInvites = invitesWithHomeowners.filter((i) => i.status === "accepted").length;
  const conversionRate = totalInvites > 0 ? (acceptedInvites / totalInvites) * 100 : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Provider Invites</h1>
        <p className="text-muted-foreground">
          Invites sent by homeowners to external providers
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invites</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvites}</div>
            <p className="text-xs text-muted-foreground">
              All time invites sent
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvites}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting response
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Opened</CardTitle>
            <Eye className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openedInvites}</div>
            <p className="text-xs text-muted-foreground">
              Link clicked
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {acceptedInvites} joined platform
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Invites Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invites</CardTitle>
          <CardDescription>
            Track invite status and conversion funnel
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive">Error loading invites</p>
          ) : invitesWithHomeowners.length === 0 ? (
            <p className="text-muted-foreground">No invites found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Homeowner</TableHead>
                  <TableHead>Property</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Sent Via</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invitesWithHomeowners.map((invite) => (
                  <TableRow key={invite.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">
                          {invite.provider_lead?.name || "Unknown"}
                        </p>
                        {invite.provider_lead?.rating && (
                          <p className="text-xs text-muted-foreground">
                            Rating: {invite.provider_lead.rating.toFixed(1)}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-3 w-3 text-muted-foreground" />
                        <span>
                          {invite.homeowner?.full_name || "Unknown"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {invite.property ? (
                        <div className="flex items-center gap-2">
                          <Home className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {invite.property.city}, {invite.property.state}
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{invite.service_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {viaIcons[invite.sent_via]}
                        <span className="capitalize">{invite.sent_via}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusColors[invite.status] || "bg-gray-100"}
                      >
                        <span className="flex items-center gap-1">
                          {statusIcons[invite.status]}
                          {invite.status}
                        </span>
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(invite.created_at).toLocaleDateString()}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
