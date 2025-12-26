import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  Users,
  UserPlus,
  Clock,
  CheckCircle2,
  XCircle,
  Briefcase,
} from "lucide-react";
import { ProviderSearch } from "./provider-search";
import { ConnectedProviders } from "./connected-providers";

type PropertyWithLocation = {
  id: string;
  nickname: string | null;
  address: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
};

type InviteWithLead = {
  id: string;
  status: "pending" | "sent" | "opened" | "accepted" | "declined" | "expired";
  service_type: string;
  sent_at: string | null;
  created_at: string;
  provider_lead: {
    name: string;
    rating: number | null;
    phone: string | null;
  } | null;
  property: {
    nickname: string | null;
    address: string;
  } | null;
};

const inviteStatusColors: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "outline",
  sent: "secondary",
  opened: "secondary",
  accepted: "default",
  declined: "destructive",
  expired: "outline",
};

const inviteStatusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-3 w-3" />,
  sent: <Clock className="h-3 w-3" />,
  opened: <Users className="h-3 w-3" />,
  accepted: <CheckCircle2 className="h-3 w-3" />,
  declined: <XCircle className="h-3 w-3" />,
  expired: <Clock className="h-3 w-3" />,
};

export default async function ProvidersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  // Default to "my-providers" tab, or use URL param if specified
  const defaultTab = params.tab || "my-providers";
  const supabase = await createClient();

  // Get user's properties
  interface PropertyMemberWithProperty {
    property_id: string;
    properties: PropertyWithLocation;
  }
  const { data: propertyMembers } = (await supabase
    .from("property_members")
    .select(
      `
      property_id,
      properties:properties (
        id,
        nickname,
        address,
        city,
        state,
        lat,
        lng
      )
    `
    )
    .order("created_at", { ascending: true })) as { data: PropertyMemberWithProperty[] | null; error: unknown };

  const properties: PropertyWithLocation[] = (propertyMembers || [])
    .map((pm) => pm.properties as unknown as PropertyWithLocation)
    .filter(Boolean);

  // Get user's invites
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: invites } = await (supabase.from("external_provider_invites") as any)
    .select(
      `
      id,
      status,
      service_type,
      sent_at,
      created_at,
      provider_lead:provider_leads (
        name,
        rating,
        phone
      ),
      property:properties (
        nickname,
        address
      )
    `
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const typedInvites = (invites || []) as unknown as InviteWithLead[];
  const pendingInvites = typedInvites.filter(
    (i) => i.status === "pending" || i.status === "sent" || i.status === "opened"
  );
  const acceptedInvites = typedInvites.filter((i) => i.status === "accepted");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Find Providers</h1>
        <p className="text-muted-foreground">
          Search for trusted service providers in your area
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{properties.length}</p>
              <p className="text-sm text-muted-foreground">Properties</p>
            </div>
          </CardContent>
        </Card>
        <Card
          className={
            pendingInvites.length > 0 ? "border-amber-200 bg-amber-50" : ""
          }
        >
          <CardContent className="flex items-center gap-3 py-4">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full ${
                pendingInvites.length > 0 ? "bg-amber-100" : "bg-muted"
              }`}
            >
              <UserPlus
                className={`h-5 w-5 ${
                  pendingInvites.length > 0
                    ? "text-amber-600"
                    : "text-muted-foreground"
                }`}
              />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingInvites.length}</p>
              <p className="text-sm text-muted-foreground">Pending Invites</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{acceptedInvites.length}</p>
              <p className="text-sm text-muted-foreground">Joined Providers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-providers">
            <Briefcase className="h-4 w-4 mr-1" />
            My Providers
            {acceptedInvites.length > 0 && (
              <Badge variant="default" className="ml-2 bg-green-500">
                {acceptedInvites.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="search">Search Providers</TabsTrigger>
          <TabsTrigger value="invites">
            My Invites
            {pendingInvites.length > 0 && (
              <Badge variant="secondary" className="ml-2">
                {pendingInvites.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="my-providers">
          <ConnectedProviders />
        </TabsContent>

        <TabsContent value="search">
          <ProviderSearch properties={properties} />
        </TabsContent>

        <TabsContent value="invites">
          <Card>
            <CardHeader>
              <CardTitle>Your Invites</CardTitle>
              <CardDescription>
                Track the status of invites you&apos;ve sent to providers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {typedInvites.length > 0 ? (
                <div className="space-y-3">
                  {typedInvites.map((invite) => (
                    <div
                      key={invite.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-background">
                          <Users className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {invite.provider_lead?.name || "Unknown Provider"}
                          </p>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="capitalize">
                              {invite.service_type.replace("_", " ")}
                            </span>
                            {invite.property && (
                              <>
                                <span>·</span>
                                <span>
                                  {invite.property.nickname ||
                                    invite.property.address}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          {invite.provider_lead?.rating && (
                            <p className="text-sm font-medium">
                              ⭐ {invite.provider_lead.rating.toFixed(1)}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {invite.sent_at
                              ? `Sent ${new Date(
                                  invite.sent_at
                                ).toLocaleDateString()}`
                              : `Created ${new Date(
                                  invite.created_at
                                ).toLocaleDateString()}`}
                          </p>
                        </div>
                        <Badge
                          variant={inviteStatusColors[invite.status]}
                          className="flex items-center gap-1"
                        >
                          {inviteStatusIcons[invite.status]}
                          {invite.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <UserPlus className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-1">No invites yet</p>
                  <p className="text-sm">
                    Search for providers and send invites to get started
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
