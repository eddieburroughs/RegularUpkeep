import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Building2,
  Plus,
  ClipboardCheck,
  Edit
} from "lucide-react";
import { UserEditForm } from "./user-edit-form";
import { UserPropertiesList } from "./user-properties-list";
import type { Profile } from "@/types/database";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function AdminUserDetailPage({ params }: Props) {
  const { userId } = await params;
  const supabase = await createClient();
  const { data: { user: currentUser } } = await supabase.auth.getUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  // Check if current user is admin
  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", currentUser.id)
    .single() as { data: { role: string } | null };

  if (currentProfile?.role !== "admin") {
    redirect("/app");
  }

  // Get target user
  const { data: targetUser, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single() as { data: Profile | null; error: unknown };

  if (error || !targetUser) {
    notFound();
  }

  // Get user's properties with full details
  interface PropertyMemberWithProperty {
    id: string;
    member_role: string;
    properties: {
      id: string;
      nickname: string | null;
      property_type: string;
      address_line1: string;
      address_line2: string | null;
      city: string;
      state: string;
      postal_code: string;
      year_built: number | null;
      square_footage: number | null;
      bedrooms: number | null;
      bathrooms: number | null;
      created_at: string;
    } | null;
  }

  const { data: propertyMembers } = await supabase
    .from("property_members")
    .select(`
      id,
      member_role,
      properties (
        id,
        nickname,
        property_type,
        address_line1,
        address_line2,
        city,
        state,
        postal_code,
        year_built,
        square_footage,
        bedrooms,
        bathrooms,
        created_at
      )
    `)
    .eq("user_id", userId) as { data: PropertyMemberWithProperty[] | null };

  const properties = propertyMembers
    ?.filter(pm => pm.properties !== null)
    .map(pm => ({
      id: pm.properties!.id,
      nickname: pm.properties!.nickname,
      property_type: pm.properties!.property_type,
      address_line1: pm.properties!.address_line1,
      address_line2: pm.properties!.address_line2,
      city: pm.properties!.city,
      state: pm.properties!.state,
      postal_code: pm.properties!.postal_code,
      year_built: pm.properties!.year_built,
      square_footage: pm.properties!.square_footage,
      bedrooms: pm.properties!.bedrooms,
      bathrooms: pm.properties!.bathrooms,
      created_at: pm.properties!.created_at,
      memberRole: pm.member_role,
      memberId: pm.id
    })) || [];

  // Get user's recent activity
  const { data: recentBookings } = await supabase
    .from("bookings")
    .select("id, status, scheduled_date, services(name)")
    .eq("customer_id", userId)
    .order("created_at", { ascending: false })
    .limit(5);

  // Get user's recent maintenance tasks (for future use)
  const _recentTasksQuery = properties.length > 0 ? await supabase
    .from("maintenance_tasks")
    .select("id, name, status, created_at")
    .in("property_id", properties.map(p => p.id))
    .order("created_at", { ascending: false })
    .limit(5) : null;
  void _recentTasksQuery;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/admin/users">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">
              {targetUser.full_name || "No Name"}
            </h1>
            {!targetUser.is_active && (
              <Badge variant="secondary">Inactive</Badge>
            )}
          </div>
          <p className="text-muted-foreground">{targetUser.email}</p>
        </div>
      </div>

      {/* Admin Actions Banner */}
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="flex items-center gap-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
            <Edit className="h-5 w-5 text-amber-600" />
          </div>
          <div className="flex-1">
            <p className="font-medium text-amber-900">Admin Mode</p>
            <p className="text-sm text-amber-700">
              Changes made here will be logged as performed by admin on behalf of this user.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* User Info & Edit Form */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                User Information
              </CardTitle>
              <CardDescription>Edit user profile details</CardDescription>
            </CardHeader>
            <CardContent>
              <UserEditForm user={targetUser} />
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Account Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Properties</span>
                <span className="font-medium">{properties.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Bookings</span>
                <span className="font-medium">{recentBookings?.length || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Joined</span>
                <span className="font-medium">
                  {new Date(targetUser.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last Updated</span>
                <span className="font-medium">
                  {new Date(targetUser.updated_at).toLocaleDateString()}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Properties */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  Properties
                </CardTitle>
                <CardDescription>
                  Manage properties for this user
                </CardDescription>
              </div>
              <Button asChild>
                <Link href={`/app/admin/users/${userId}/properties/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <UserPropertiesList
                properties={properties}
                userId={userId}
              />
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>
                Perform common tasks on behalf of this user
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button variant="outline" asChild className="justify-start">
                <Link href={`/app/admin/users/${userId}/inspection/new`}>
                  <ClipboardCheck className="h-4 w-4 mr-2" />
                  Start Inspection
                </Link>
              </Button>
              <Button variant="outline" asChild className="justify-start">
                <Link href={`/app/admin/users/${userId}/properties/new`}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Property
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
