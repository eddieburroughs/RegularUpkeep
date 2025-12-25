import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  User,
  Home,
  Building2,
  Mail,
  Phone,
  ChevronRight,
  Plus,
  Settings,
} from "lucide-react";
import type { Property, Profile } from "@/types/database";
import { AISettings } from "@/components/app/ai-settings";
import { NotificationPreferences } from "@/components/notifications";

type PropertyWithMember = Property & {
  property_members: { member_role: string }[];
};

export default async function ProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Get user profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single() as { data: Profile | null };

  // Get user's properties with membership role
  const { data: properties } = await supabase
    .from("properties")
    .select("*, property_members!inner(member_role)")
    .eq("property_members.user_id", user.id)
    .order("created_at", { ascending: false }) as { data: PropertyWithMember[] | null };

  const primaryProperty = properties?.[0];

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">My Profile</h1>
        <p className="text-muted-foreground">
          Manage your account and home details
        </p>
      </div>

      {/* User Info Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle>{profile?.full_name || "Homeowner"}</CardTitle>
              <CardDescription className="flex items-center gap-2 mt-1">
                <Mail className="h-3 w-3" />
                {profile?.email}
              </CardDescription>
              {profile?.phone && (
                <CardDescription className="flex items-center gap-2">
                  <Phone className="h-3 w-3" />
                  {profile.phone}
                </CardDescription>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* My Home Profile Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                My Home Profile
              </CardTitle>
              <CardDescription>
                Your primary property details
              </CardDescription>
            </div>
            {!primaryProperty && (
              <Button asChild>
                <Link href="/app/properties/new">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Home
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        {primaryProperty && (
          <CardContent>
            <Link
              href={`/app/properties/${primaryProperty.id}`}
              className="flex items-center justify-between p-4 -mx-2 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">
                    {primaryProperty.nickname || primaryProperty.address_line1}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {primaryProperty.city}, {primaryProperty.state} {primaryProperty.postal_code}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {primaryProperty.property_type.replace("_", " ")}
                    </Badge>
                    {primaryProperty.year_built && (
                      <span className="text-xs text-muted-foreground">
                        Built {primaryProperty.year_built}
                      </span>
                    )}
                    {primaryProperty.square_footage && (
                      <span className="text-xs text-muted-foreground">
                        {primaryProperty.square_footage.toLocaleString()} sq ft
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground" />
            </Link>
          </CardContent>
        )}
      </Card>

      {/* All Properties */}
      {properties && properties.length > 1 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">All Properties</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/app/properties">
                  View All
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            {properties.slice(1).map((property) => (
              <Link
                key={property.id}
                href={`/app/properties/${property.id}`}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
              >
                <div>
                  <p className="font-medium text-sm">
                    {property.nickname || property.address_line1}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {property.city}, {property.state}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Link
            href="/app/properties/new"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
          >
            <Plus className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-sm">Add New Property</span>
          </Link>
          <Link
            href="/app/binder"
            className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors"
          >
            <Settings className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium text-sm">Home Binder & Documents</span>
          </Link>
        </CardContent>
      </Card>

      {/* Notification Preferences */}
      <NotificationPreferences />

      {/* AI Settings */}
      <AISettings userId={user.id} />
    </div>
  );
}
