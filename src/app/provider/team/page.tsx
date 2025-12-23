import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  UserPlus,
  Mail,
  Crown,
  Shield,
  Wrench,
} from "lucide-react";
import { InviteDialog } from "./invite-dialog";
import { TeamMemberActions } from "./team-member-actions";

type TeamMemberWithProfile = {
  id: string;
  role: string;
  status: string;
  joined_at: string | null;
  created_at: string;
  profiles: {
    id: string;
    full_name: string | null;
    email: string;
    phone: string | null;
    avatar_url: string | null;
  } | null;
};

type InviteData = {
  id: string;
  invite_code: string;
  email: string | null;
  role: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  is_active: boolean;
  created_at: string;
};

const roleConfig = {
  owner: { label: "Owner", icon: Crown, variant: "default" as const },
  manager: { label: "Manager", icon: Shield, variant: "secondary" as const },
  technician: { label: "Technician", icon: Wrench, variant: "outline" as const },
};

export default async function ProviderTeamPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/provider/team");
  }

  // Get provider
  const { data: provider } = await supabase
    .from("providers")
    .select("id, business_name")
    .eq("profile_id", user.id)
    .single() as { data: { id: string; business_name: string } | null };

  if (!provider) {
    redirect("/provider/onboarding/signup");
  }

  // Get team members
  const { data: members } = await supabase
    .from("provider_members")
    .select(`
      id,
      role,
      status,
      joined_at,
      created_at,
      profiles:profile_id(id, full_name, email, phone, avatar_url)
    `)
    .eq("provider_id", provider.id)
    .eq("status", "active")
    .order("role", { ascending: true })
    .order("created_at", { ascending: true }) as { data: TeamMemberWithProfile[] | null };

  // Get pending invites
  const { data: invites } = await supabase
    .from("provider_invites")
    .select("id, invite_code, email, role, expires_at, max_uses, use_count, is_active, created_at")
    .eq("provider_id", provider.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false }) as { data: InviteData[] | null };

  const activeMembers = members?.filter(m => m.status === "active") || [];
  const pendingInvites = invites?.filter(i => i.is_active && (i.max_uses === null || i.use_count < i.max_uses)) || [];

  // Check if current user is owner or manager (can manage team)
  const currentMember = members?.find(m => m.profiles?.id === user.id);
  const canManageTeam = currentMember?.role === "owner" || currentMember?.role === "manager";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Team</h1>
          <p className="text-muted-foreground">
            Manage your team members
          </p>
        </div>
        {canManageTeam && (
          <InviteDialog providerId={provider.id} />
        )}
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{activeMembers.length}</p>
                <p className="text-xs text-muted-foreground">Team Members</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
                <UserPlus className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingInvites.length}</p>
                <p className="text-xs text-muted-foreground">Pending Invites</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Members */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>People who work at {provider.business_name}</CardDescription>
        </CardHeader>
        <CardContent>
          {activeMembers.length > 0 ? (
            <div className="space-y-3">
              {activeMembers.map((member) => {
                const role = roleConfig[member.role as keyof typeof roleConfig] || roleConfig.technician;
                const RoleIcon = role.icon;
                const isCurrentUser = member.profiles?.id === user.id;

                return (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 rounded-lg border"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <span className="text-lg font-semibold text-primary">
                          {member.profiles?.full_name?.charAt(0) || "?"}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">
                            {member.profiles?.full_name || "Unknown"}
                          </p>
                          {isCurrentUser && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                          {member.profiles?.email && (
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {member.profiles.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={role.variant}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {role.label}
                      </Badge>
                      {canManageTeam && !isCurrentUser && member.role !== "owner" && (
                        <TeamMemberActions member={member} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No team members yet</p>
              <p className="text-sm mt-1">Invite employees to join your team</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pending Invites */}
      {pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Pending Invites</CardTitle>
            <CardDescription>Invitations waiting to be accepted</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => {
                const role = roleConfig[invite.role as keyof typeof roleConfig] || roleConfig.technician;
                const inviteUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'https://app.regularupkeep.com' : 'http://localhost:3000'}/join/${invite.invite_code}`;

                return (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-dashed"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{role.label}</Badge>
                        {invite.email && (
                          <span className="text-sm text-muted-foreground">
                            for {invite.email}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 font-mono">
                        Code: {invite.invite_code}
                      </p>
                      {invite.max_uses && (
                        <p className="text-xs text-muted-foreground">
                          Used {invite.use_count}/{invite.max_uses} times
                        </p>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteUrl);
                      }}
                    >
                      Copy Link
                    </Button>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
