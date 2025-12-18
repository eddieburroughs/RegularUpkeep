"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowRight,
  Loader2,
  Briefcase,
  User,
  Mail,
  Phone,
  MapPin,
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

function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    business_name: "",
    contact_name: "",
    email: "",
    phone: "",
    password: "",
    zip_code: "",
    radius_miles: "25",
    categories: [] as MaintenanceCategory[],
  });

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

    if (step === 1) {
      // Validate step 1
      if (!formData.business_name || !formData.contact_name || !formData.email || !formData.phone || !formData.password) {
        setError("Please fill in all required fields");
        return;
      }
      setError(null);
      setStep(2);
      return;
    }

    // Step 2 - Submit
    if (formData.categories.length === 0) {
      setError("Please select at least one service category");
      return;
    }

    setLoading(true);
    setError(null);

    const supabase = createClient();

    // Create auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: {
          full_name: formData.contact_name,
          role: "provider",
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/provider/onboarding/docs`,
      },
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    if (!authData.user) {
      setError("Failed to create account");
      setLoading(false);
      return;
    }

    // Create provider record
    const providerData = {
      profile_id: authData.user.id,
      business_name: formData.business_name,
      contact_name: formData.contact_name,
      phone: formData.phone,
      email: formData.email,
      service_categories: formData.categories,
      service_area: {
        type: "radius",
        zip_code: formData.zip_code,
        radius_miles: parseInt(formData.radius_miles),
      },
      is_online: false,
      verification_status: "unverified",
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: providerError } = await (supabase.from("providers") as any)
      .insert(providerData);

    if (providerError) {
      setError(providerError.message);
      setLoading(false);
      return;
    }

    // Success - show confirmation
    router.push("/provider/onboarding/docs?new=true");
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Briefcase className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold">Become a Provider</h1>
        <p className="text-muted-foreground">
          {step === 1
            ? "Tell us about your business"
            : "What services do you offer?"}
        </p>
      </div>

      {/* Progress */}
      <div className="flex justify-center gap-2">
        <div className={`h-2 w-16 rounded-full ${step >= 1 ? "bg-primary" : "bg-muted"}`} />
        <div className={`h-2 w-16 rounded-full ${step >= 2 ? "bg-primary" : "bg-muted"}`} />
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 ? "Business Information" : "Services & Coverage"}
            </CardTitle>
            <CardDescription>
              {step === 1
                ? "We'll use this to set up your provider profile"
                : "Select the services you offer and your service area"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                {error}
              </div>
            )}

            {step === 1 ? (
              <>
                {/* Business Name */}
                <div className="space-y-2">
                  <Label htmlFor="business_name">Business Name *</Label>
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

                {/* Contact Name */}
                <div className="space-y-2">
                  <Label htmlFor="contact_name">Your Name *</Label>
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

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address *</Label>
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

                {/* Phone */}
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number *</Label>
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

                {/* Password */}
                <div className="space-y-2">
                  <Label htmlFor="password">Create Password *</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    minLength={6}
                    required
                  />
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters
                  </p>
                </div>
              </>
            ) : (
              <>
                {/* Service Categories */}
                <div className="space-y-3">
                  <Label>Service Categories *</Label>
                  <p className="text-sm text-muted-foreground">
                    Select all services you offer
                  </p>
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
                          onCheckedChange={() => handleCategoryToggle(category.value)}
                        />
                        <span className="text-sm font-medium">{category.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service Area */}
                <div className="space-y-4 pt-4 border-t">
                  <Label>Service Area</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="zip_code" className="text-sm text-muted-foreground">
                        Base ZIP Code
                      </Label>
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
                      <Label htmlFor="radius" className="text-sm text-muted-foreground">
                        Service Radius
                      </Label>
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
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              {step === 2 && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                >
                  Back
                </Button>
              )}
              <Button type="submit" className="flex-1" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {step === 1 ? "Continue" : "Create Account"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/auth/login?redirectTo=/provider/jobs" className="text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

export default function ProviderSignupPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  );
}
