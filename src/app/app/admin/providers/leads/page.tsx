/**
 * Admin Provider Leads
 *
 * View and manage providers discovered through Google Places API.
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
import { Star, Phone, Globe, MapPin, Calendar, Users, ExternalLink } from "lucide-react";

interface ProviderLead {
  id: string;
  name: string;
  place_id: string;
  primary_service: string;
  rating: number | null;
  user_ratings_total: number | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  source: string;
  last_fetched_at: string;
  created_at: string;
  invite_count: number;
  accepted_count: number;
}

export default async function AdminProviderLeadsPage() {
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

  // Get provider leads with invite counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: leads, error } = (await (supabase.from("provider_leads") as any)
    .select(`
      id,
      name,
      place_id,
      primary_service,
      rating,
      user_ratings_total,
      phone,
      website,
      address,
      source,
      last_fetched_at,
      created_at
    `)
    .order("created_at", { ascending: false })
    .limit(100)) as { data: ProviderLead[] | null; error: unknown };

  // Get invite counts for each lead
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: inviteCounts } = (await (supabase.from("external_provider_invites") as any)
    .select("provider_lead_id, status")
  ) as { data: { provider_lead_id: string; status: string }[] | null; error: unknown };

  // Map invite counts to leads
  const inviteMap = new Map<string, { total: number; accepted: number }>();
  (inviteCounts || []).forEach((invite) => {
    const current = inviteMap.get(invite.provider_lead_id) || { total: 0, accepted: 0 };
    current.total++;
    if (invite.status === "accepted") {
      current.accepted++;
    }
    inviteMap.set(invite.provider_lead_id, current);
  });

  const leadsWithCounts = (leads || []).map((lead) => ({
    ...lead,
    invite_count: inviteMap.get(lead.id)?.total || 0,
    accepted_count: inviteMap.get(lead.id)?.accepted || 0,
  }));

  // Calculate stats
  const totalLeads = leadsWithCounts.length;
  const leadsWithInvites = leadsWithCounts.filter((l) => l.invite_count > 0).length;
  const convertedLeads = leadsWithCounts.filter((l) => l.accepted_count > 0).length;
  const avgRating =
    leadsWithCounts.filter((l) => l.rating).reduce((sum, l) => sum + (l.rating || 0), 0) /
    leadsWithCounts.filter((l) => l.rating).length || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Provider Leads</h1>
        <p className="text-muted-foreground">
          Providers discovered through Google Places API
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              Cached provider records
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Invited</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadsWithInvites}</div>
            <p className="text-xs text-muted-foreground">
              Leads with invites sent
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <Star className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{convertedLeads}</div>
            <p className="text-xs text-muted-foreground">
              Leads who joined platform
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Rating</CardTitle>
            <Star className="h-4 w-4 text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              Google rating average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Leads</CardTitle>
          <CardDescription>
            Provider leads from Google Places searches
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <p className="text-destructive">Error loading leads</p>
          ) : leadsWithCounts.length === 0 ? (
            <p className="text-muted-foreground">No provider leads found</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Rating</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Invites</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Added</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leadsWithCounts.map((lead) => (
                  <TableRow key={lead.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{lead.name}</p>
                        {lead.address && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="h-3 w-3" />
                            {lead.address.substring(0, 40)}...
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{lead.primary_service}</Badge>
                    </TableCell>
                    <TableCell>
                      {lead.rating ? (
                        <div className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          <span>{lead.rating.toFixed(1)}</span>
                          {lead.user_ratings_total && (
                            <span className="text-xs text-muted-foreground">
                              ({lead.user_ratings_total})
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {lead.phone && (
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-blue-600 hover:underline"
                          >
                            <Phone className="h-3 w-3" />
                          </a>
                        )}
                        {lead.website && (
                          <a
                            href={lead.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline"
                          >
                            <Globe className="h-3 w-3" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{lead.invite_count}</span>
                        {lead.accepted_count > 0 && (
                          <Badge variant="default" className="bg-green-500">
                            {lead.accepted_count} joined
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={lead.source === "google" ? "secondary" : "outline"}
                      >
                        {lead.source}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(lead.created_at).toLocaleDateString()}
                      </div>
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
