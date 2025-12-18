import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  User,
  Briefcase,
  Mail,
  Phone,
  MapPin,
  Shield,
  FileCheck,
  ChevronRight,
  LogOut,
} from "lucide-react";
import type { MaintenanceCategory, VerificationStatus } from "@/types/database";

const categoryLabels: Record<MaintenanceCategory, string> = {
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  appliances: "Appliances",
  exterior: "Exterior",
  interior: "Interior",
  landscaping: "Landscaping",
  pest_control: "Pest Control",
  safety: "Safety",
  other: "Other",
};

const verificationBadges: Record<VerificationStatus, { label: string; variant: "default" | "secondary" | "outline" }> = {
  verified: { label: "Verified", variant: "default" },
  pending: { label: "Pending Review", variant: "secondary" },
  unverified: { label: "Unverified", variant: "outline" },
};

export default async function ProviderProfilePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/provider/profile");
  }

  // Get provider with profile
  type ProviderData = {
    id: string;
    business_name: string;
    contact_name: string;
    email: string;
    phone: string | null;
    service_categories: unknown;
    service_area: unknown;
    verification_status: string;
    profiles: { full_name: string | null } | null;
  };
  const { data: provider } = await supabase
    .from("providers")
    .select("*, profiles(*)")
    .eq("profile_id", user.id)
    .single() as { data: ProviderData | null };

  if (!provider) {
    redirect("/provider/onboarding/signup");
  }

  const categories = (provider.service_categories as MaintenanceCategory[]) || [];
  const serviceArea = provider.service_area as { zip_code?: string; radius_miles?: number } | null;
  const verification = verificationBadges[provider.verification_status as VerificationStatus] || verificationBadges.unverified;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your business profile
        </p>
      </div>

      {/* Business Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Briefcase className="h-8 w-8 text-primary" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <CardTitle>{provider.business_name}</CardTitle>
                <Badge variant={verification.variant}>{verification.label}</Badge>
              </div>
              <CardDescription>{provider.contact_name}</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{provider.email}</span>
          </div>
          {provider.phone && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{provider.phone}</span>
            </div>
          )}
          {serviceArea?.zip_code && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {serviceArea.zip_code} ({serviceArea.radius_miles} mile radius)
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Services */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Services Offered</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {categories.length > 0 ? (
              categories.map((cat) => (
                <Badge key={cat} variant="secondary">
                  {categoryLabels[cat] || cat}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                No services configured
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Verification */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Verification Status</CardTitle>
          <CardDescription>
            Upload documents to get verified
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Link
            href="/provider/onboarding/docs"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Liability Insurance</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
          <Link
            href="/provider/onboarding/docs"
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex items-center gap-3">
              <FileCheck className="h-5 w-5 text-muted-foreground" />
              <span className="text-sm font-medium">Business License</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* Actions */}
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
