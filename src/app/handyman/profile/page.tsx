import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Mail,
  Phone,
  DollarSign,
  Star,
  Briefcase,
  Pencil,
  LogOut,
} from "lucide-react";

const skillLabels: Record<string, string> = {
  general_repairs: "General Repairs",
  plumbing_basic: "Basic Plumbing",
  electrical_basic: "Basic Electrical",
  painting: "Painting",
  drywall: "Drywall Repair",
  carpentry: "Carpentry",
  appliance_repair: "Appliance Repair",
  hvac_basic: "Basic HVAC",
  landscaping: "Landscaping",
  pressure_washing: "Pressure Washing",
  gutter_cleaning: "Gutter Cleaning",
  furniture_assembly: "Furniture Assembly",
};

export default async function HandymanProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/handyman/profile");
  }

  type HandymanData = {
    id: string;
    bio: string | null;
    skills: string[] | null;
    hourly_rate: number | null;
    rating_avg: number | null;
    rating_count: number | null;
    total_jobs: number | null;
    total_earnings: number | null;
    is_available: boolean;
    profiles: {
      full_name: string | null;
      email: string | null;
      phone: string | null;
    } | null;
  };

  const { data: handyman } = await supabase
    .from("handymen")
    .select("*, profiles(full_name, email, phone)")
    .eq("profile_id", user.id)
    .single() as { data: HandymanData | null };

  if (!handyman) {
    redirect("/handyman/onboarding/signup");
  }

  const skills = handyman.skills || [];
  const profile = handyman.profiles;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Profile</h1>
          <p className="text-muted-foreground">
            Manage your handyman profile
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link href="/handyman/profile/edit">
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </Button>
      </div>

      {/* Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle>{profile?.full_name || "Handyman"}</CardTitle>
                <Badge variant={handyman.is_available ? "default" : "secondary"}>
                  {handyman.is_available ? "Available" : "Unavailable"}
                </Badge>
              </div>
              <CardDescription>Independent Handyman</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {profile?.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{profile.email}</span>
            </div>
          )}
          {profile?.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{profile.phone}</span>
            </div>
          )}
          {handyman.hourly_rate && (
            <div className="flex items-center gap-3">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">${handyman.hourly_rate}/hour</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bio */}
      {handyman.bio && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">About</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{handyman.bio}</p>
          </CardContent>
        </Card>
      )}

      {/* Skills */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {skills.length > 0 ? (
              skills.map((skill) => (
                <Badge key={skill} variant="secondary">
                  {skillLabels[skill] || skill}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No skills added yet
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex items-center justify-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-2xl font-bold">
                  {handyman.rating_avg ? handyman.rating_avg.toFixed(1) : "—"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Rating ({handyman.rating_count || 0} reviews)
              </p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <Briefcase className="h-4 w-4 text-primary" />
                <span className="text-2xl font-bold">{handyman.total_jobs || 0}</span>
              </div>
              <p className="text-xs text-muted-foreground">Jobs Completed</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1">
                <DollarSign className="h-4 w-4 text-green-600" />
                <span className="text-2xl font-bold">
                  ${handyman.total_earnings ? handyman.total_earnings.toLocaleString() : "0"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Total Earned</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      <Card>
        <CardContent className="pt-6">
          <form action="/auth/signout" method="post">
            <Button variant="outline" className="w-full" type="submit">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
