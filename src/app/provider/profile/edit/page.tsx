"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowLeft,
  Loader2,
  Briefcase,
  User,
  Mail,
  Phone,
  MapPin,
  Save,
} from "lucide-react";
import type { MaintenanceCategory } from "@/types/database";

const serviceCategories: { value: MaintenanceCategory; label: string }[] = [
  { value: "hvac", label: "HVAC" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "appliances", label: "Appliances" },
  { value: "exterior", label: "Exterior/Roofing" },
  { value: "interior", label: "Interior/Handyman" },
  { value: "landscaping", label: "Landscaping" },
  { value: "pest_control", label: "Pest Control" },
  { value: "safety", label: "Safety/Security" },
  { value: "other", label: "Other Services" },
];

export default function EditProviderProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [providerId, setProviderId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    zip_code: "",
    radius_miles: "25",
    categories: [] as MaintenanceCategory[],
  });

  useEffect(() => {
    const loadProvider = async () => {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push("/auth/login?redirectTo=/provider/profile/edit");
        return;
      }

      type ProviderData = {
        id: string;
        business_name: string;
        contact_name: string;
        email: string;
        phone: string | null;
        service_categories: MaintenanceCategory[] | null;
        service_area: { zip_code?: string; radius_miles?: number } | null;
      };

      const { data: provider } = await supabase
        .from("providers")
        .select("id, business_name, contact_name, email, phone, service_categories, service_area")
        .eq("profile_id", user.id)
        .single() as { data: ProviderData | null };

      if (!provider) {
        router.push("/provider/onboarding/signup");
        return;
      }

      setProviderId(provider.id);
      setFormData({
        business_name: provider.business_name || "",
        contact_name: provider.contact_name || "",
        email: provider.email || "",
        phone: provider.phone || "",
        zip_code: provider.service_area?.zip_code || "",
        radius_miles: String(provider.service_area?.radius_miles || 25),
        categories: provider.service_categories || [],
      });
      setLoading(false);
    };

    loadProvider();
  }, [router]);

  const handleCategoryToggle = (category: MaintenanceCategory) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!providerId) return;

    setSaving(true);
    setError(null);
    setSuccess(false);

    const supabase = createClient();

    const updateData = {
      business_name: formData.business_name,
      contact_name: formData.contact_name,
      email: formData.email,
      phone: formData.phone,
      service_categories: formData.categories,
      service_area: {
        type: "radius",
        zip_code: formData.zip_code,
        radius_miles: parseInt(formData.radius_miles),
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase.from("providers") as any)
      .update(updateData)
      .eq("id", providerId);

    if (updateError) {
      setError(updateError.message);
      setSaving(false);
      return;
    }

    setSuccess(true);
    setSaving(false);

    // Redirect after short delay
    setTimeout(() => {
      router.push("/provider/profile");
    }, 1500);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/provider/profile">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Edit Profile</h1>
          <p className="text-muted-foreground">
            Update your business information
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 text-sm text-green-600 bg-green-50 rounded-md">
            Profile updated successfully! Redirecting...
          </div>
        )}

        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Business Information</CardTitle>
            <CardDescription>
              Your business details shown to customers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="business_name">Business Name</Label>
              <div className="relative">
                <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="business_name"
                  placeholder="Your Business Name"
                  value={formData.business_name}
                  onChange={(e) => updateField("business_name", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contact_name">Contact Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="contact_name"
                  placeholder="John Smith"
                  value={formData.contact_name}
                  onChange={(e) => updateField("contact_name", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@business.com"
                  value={formData.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="phone"
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={formData.phone}
                  onChange={(e) => updateField("phone", e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Services */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Services Offered</CardTitle>
            <CardDescription>
              Select all services you provide
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {serviceCategories.map((category) => (
                <div
                  key={category.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    formData.categories.includes(category.value)
                      ? "border-primary bg-primary/5"
                      : "border-muted hover:border-primary/50"
                  }`}
                  onClick={() => handleCategoryToggle(category.value)}
                >
                  <Checkbox
                    checked={formData.categories.includes(category.value)}
                    onClick={(e) => e.stopPropagation()}
                    onCheckedChange={() => handleCategoryToggle(category.value)}
                  />
                  <span className="text-sm font-medium">{category.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Service Area */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Service Area</CardTitle>
            <CardDescription>
              Define where you provide services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="zip_code">Base ZIP Code</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="zip_code"
                    placeholder="94105"
                    value={formData.zip_code}
                    onChange={(e) => updateField("zip_code", e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="radius">Service Radius</Label>
                <select
                  id="radius"
                  value={formData.radius_miles}
                  onChange={(e) => updateField("radius_miles", e.target.value)}
                  className="w-full h-10 px-3 rounded-md border bg-background text-sm"
                >
                  <option value="10">10 miles</option>
                  <option value="25">25 miles</option>
                  <option value="50">50 miles</option>
                  <option value="100">100 miles</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <Button type="submit" className="w-full" disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </form>
    </div>
  );
}
