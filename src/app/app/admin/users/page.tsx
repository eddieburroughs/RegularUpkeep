import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { UsersTable } from "./users-table";

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

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

  // Get all customer users with their property counts
  interface UserProfile {
    id: string;
    email: string;
    full_name: string | null;
    phone: string | null;
    role: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  }

  const { data: users } = await supabase
    .from("profiles")
    .select(`
      id,
      email,
      full_name,
      phone,
      role,
      is_active,
      created_at,
      updated_at
    `)
    .eq("role", "customer")
    .order("created_at", { ascending: false }) as { data: UserProfile[] | null };

  // Get property counts for each user
  const userIds = users?.map(u => u.id) || [];
  const { data: propertyCounts } = await supabase
    .from("property_members")
    .select("user_id")
    .in("user_id", userIds) as { data: { user_id: string }[] | null };

  // Count properties per user
  const propertyCountMap: Record<string, number> = {};
  propertyCounts?.forEach(pm => {
    propertyCountMap[pm.user_id] = (propertyCountMap[pm.user_id] || 0) + 1;
  });

  const usersWithCounts = users?.map(u => ({
    ...u,
    propertyCount: propertyCountMap[u.id] || 0
  })) || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted-foreground">
          View and manage customer accounts
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{usersWithCounts.length}</div>
            <p className="text-xs text-muted-foreground">Customer accounts</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usersWithCounts.filter(u => u.is_active).length}
            </div>
            <p className="text-xs text-muted-foreground">Currently active</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Users with Properties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {usersWithCounts.filter(u => u.propertyCount > 0).length}
            </div>
            <p className="text-xs text-muted-foreground">Have added properties</p>
          </CardContent>
        </Card>
      </div>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <CardDescription>
            Search and manage customer accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UsersTable users={usersWithCounts} />
        </CardContent>
      </Card>
    </div>
  );
}
