"use client";

import { useState, useEffect, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  ArrowRight,
  Loader2,
  Briefcase,
  User,
  Mail,
  Phone,
  MapPin,
  Star,
  CheckCircle2,
  XCircle,
  FileText,
  CreditCard,
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

type InviteData = {
  id: string;
  service_type: string;
  status: string;
  expires_at: string;
  provider_lead: {
    name: string;
    phone: string | null;
    rating: number | null;
  } | null;
  property: {
    address: string;
    city: string;
    state: string;
  } | null;
  homeowner_name: string | null;
};

function JoinNetworkForm() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invite, setInvite] = useState<InviteData | null>(null);
  const [step, setStep] = useState(1); // 1: Review, 2: Account, 3: Services, 4: Terms
  const [isSignIn, setIsSignIn] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

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

  // Fetch invite details
  useEffect(() => {
    async function fetchInvite() {
      try {
        const response = await fetch(`/api/join-network/${token}`);
        const data = await response.json();

        if (!response.ok) {
          setError(data.error || "Invalid or expired invite");
          setLoading(false);
          return;
        }

        setInvite(data.invite);
        // Pre-fill from invite data
        if (data.invite.provider_lead) {
          setFormData((prev) => ({
            ...prev,
            business_name: data.invite.provider_lead.name || "",
            phone: data.invite.provider_lead.phone || "",
          }));
        }

        // Mark as opened
        await fetch(`/api/join-network/${token}/opened`, { method: "POST" });
      } catch (err) {
        setError("Failed to load invite");
      } finally {
        setLoading(false);
      }
    }

    fetchInvite();
  }, [token]);

  const handleCategoryToggle = (category: MaintenanceCategory) => {
    setFormData((prev) => ({
      ...prev,
      categories: prev.categories.includes(category)
        ? prev.categories.filter((c) => c !== category)
        : [...prev.categories, category],
    }));
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });

    if (signInError) {
      setError(signInError.message);
      setSubmitting(false);
      return;
    }

    // Skip to terms step
    setStep(4);
    setSubmitting(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === 1) {
      // Move to account step
      setStep(2);
      return;
    }

    if (step === 2 && !isSignIn) {
      // Validate account info
      if (
        !formData.business_name ||
        !formData.contact_name ||
        !formData.email ||
        !formData.password
      ) {
        setError("Please fill in all required fields");
        return;
      }
      setError(null);
      setStep(3);
      return;
    }

    if (step === 3) {
      // Validate services
      if (formData.categories.length === 0) {
        setError("Please select at least one service category");
        return;
      }
      setError(null);
      setStep(4);
      return;
    }

    // Step 4 - Final submission
    if (!termsAccepted) {
      setError("You must accept the terms to continue");
      return;
    }

    setSubmitting(true);
    setError(null);

    const supabase = createClient();

    // Check if user is already signed in
    const {
      data: { user: existingUser },
    } = await supabase.auth.getUser();

    let userId = existingUser?.id;

    if (!userId) {
      // Create new auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.contact_name,
            role: "provider",
          },
        },
      });

      if (authError) {
        setError(authError.message);
        setSubmitting(false);
        return;
      }

      if (!authData.user) {
        setError("Failed to create account");
        setSubmitting(false);
        return;
      }

      userId = authData.user.id;
    }

    // Accept the invite via API
    try {
      const response = await fetch(`/api/join-network/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          business_name: formData.business_name,
          contact_name: formData.contact_name,
          phone: formData.phone || invite?.provider_lead?.phone,
          email: formData.email,
          categories: formData.categories,
          zip_code: formData.zip_code,
          radius_miles: parseInt(formData.radius_miles),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to accept invite");
        setSubmitting(false);
        return;
      }

      // Redirect to Stripe Connect onboarding or provider dashboard
      if (data.stripeOnboardingUrl) {
        window.location.href = data.stripeOnboardingUrl;
      } else {
        router.push("/provider/jobs?welcome=true");
      }
    } catch (err) {
      setError("An error occurred while accepting the invite");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error && !invite) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Invalid Invite</h1>
          <p className="text-muted-foreground mt-2">{error}</p>
        </div>
        <Button asChild>
          <Link href="/provider/onboarding/signup">
            Sign up as a Provider
          </Link>
        </Button>
      </div>
    );
  }

  if (!invite) return null;

  const isExpired = new Date(invite.expires_at) < new Date();
  if (isExpired) {
    return (
      <div className="space-y-6 text-center">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-amber-100">
            <XCircle className="h-8 w-8 text-amber-600" />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Invite Expired</h1>
          <p className="text-muted-foreground mt-2">
            This invite has expired. Please contact the homeowner for a new
            invitation.
          </p>
        </div>
        <Button asChild>
          <Link href="/provider/onboarding/signup">
            Sign up as a Provider
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {step === 4 ? (
              <FileText className="h-8 w-8 text-primary" />
            ) : (
              <Briefcase className="h-8 w-8 text-primary" />
            )}
          </div>
        </div>
        <h1 className="text-2xl font-bold">
          {step === 1
            ? "You're Invited!"
            : step === 2
              ? isSignIn
                ? "Sign In"
                : "Create Your Account"
              : step === 3
                ? "Your Services"
                : "Accept Terms"}
        </h1>
        <p className="text-muted-foreground">
          {step === 1
            ? `${invite.homeowner_name || "A homeowner"} wants to work with you on RegularUpkeep`
            : step === 2
              ? isSignIn
                ? "Sign in to your existing account"
                : "Set up your provider account"
              : step === 3
                ? "Tell us what services you offer"
                : "Review and accept the network terms"}
        </p>
      </div>

      {/* Progress */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div
            key={s}
            className={`h-2 w-12 rounded-full ${step >= s ? "bg-primary" : "bg-muted"}`}
          />
        ))}
      </div>

      <form onSubmit={isSignIn && step === 2 ? handleSignIn : handleSubmit}>
        {step === 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Invitation Details</CardTitle>
              <CardDescription>
                Review the details of your invitation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Provider Info */}
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-background">
                    <Briefcase className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {invite.provider_lead?.name || "Your Business"}
                    </p>
                    {invite.provider_lead?.rating && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {invite.provider_lead.rating.toFixed(1)} on Google
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Service & Location */}
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-3 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Service</p>
                  <p className="font-medium capitalize">
                    {invite.service_type.replace("_", " ")}
                  </p>
                </div>
                {invite.property && (
                  <div className="p-3 rounded-lg border">
                    <p className="text-xs text-muted-foreground mb-1">
                      Location
                    </p>
                    <p className="font-medium">
                      {invite.property.city}, {invite.property.state}
                    </p>
                  </div>
                )}
              </div>

              {/* Benefits */}
              <div className="space-y-2 pt-4 border-t">
                <p className="font-medium">Why Join RegularUpkeep?</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Get quality leads from verified homeowners
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Simple 8% commission on completed jobs
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Secure payments via Stripe
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    AI-powered tools for estimates and messaging
                  </li>
                </ul>
              </div>

              <Button type="submit" className="w-full">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 2 && (
          <Card>
            <CardHeader>
              <CardTitle>
                {isSignIn ? "Sign In" : "Business Information"}
              </CardTitle>
              <CardDescription>
                {isSignIn
                  ? "Sign in to your existing provider account"
                  : "We'll use this to set up your provider profile"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

              {!isSignIn && (
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
                        onChange={(e) =>
                          updateField("business_name", e.target.value)
                        }
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
                        onChange={(e) =>
                          updateField("contact_name", e.target.value)
                        }
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </>
              )}

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

              {!isSignIn && (
                /* Phone */
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
                    />
                  </div>
                </div>
              )}

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">
                  {isSignIn ? "Password" : "Create Password"} *
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  minLength={6}
                  required
                />
                {!isSignIn && (
                  <p className="text-xs text-muted-foreground">
                    Must be at least 6 characters
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={submitting}>
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSignIn ? "Sign In" : "Continue"}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>

              <p className="text-center text-sm text-muted-foreground pt-2">
                {isSignIn ? (
                  <>
                    Don&apos;t have an account?{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setIsSignIn(false)}
                    >
                      Create one
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      className="text-primary hover:underline"
                      onClick={() => setIsSignIn(true)}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </CardContent>
          </Card>
        )}

        {step === 3 && (
          <Card>
            <CardHeader>
              <CardTitle>Services & Coverage</CardTitle>
              <CardDescription>
                Select the services you offer and your service area
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

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
                        onCheckedChange={() =>
                          handleCategoryToggle(category.value)
                        }
                      />
                      <span className="text-sm font-medium">
                        {category.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Service Area */}
              <div className="space-y-4 pt-4 border-t">
                <Label>Service Area</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="zip_code"
                      className="text-sm text-muted-foreground"
                    >
                      Base ZIP Code
                    </Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="zip_code"
                        placeholder="94105"
                        value={formData.zip_code}
                        onChange={(e) =>
                          updateField("zip_code", e.target.value)
                        }
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="radius"
                      className="text-sm text-muted-foreground"
                    >
                      Service Radius
                    </Label>
                    <select
                      id="radius"
                      value={formData.radius_miles}
                      onChange={(e) =>
                        updateField("radius_miles", e.target.value)
                      }
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

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                  Back
                </Button>
                <Button type="submit" className="flex-1">
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {step === 4 && (
          <Card>
            <CardHeader>
              <CardTitle>Network Terms</CardTitle>
              <CardDescription>
                Review and accept the provider network agreement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
                  {error}
                </div>
              )}

              {/* Terms Summary */}
              <div className="p-4 rounded-lg bg-muted/50 space-y-3 max-h-64 overflow-y-auto">
                <h4 className="font-semibold">Provider Network Agreement</h4>
                <div className="text-sm text-muted-foreground space-y-2">
                  <p>
                    By joining the RegularUpkeep Provider Network, you agree to:
                  </p>
                  <ul className="list-disc pl-4 space-y-1">
                    <li>
                      <strong>Platform Fee:</strong> 8% commission on completed
                      jobs (minimum $3.50)
                    </li>
                    <li>
                      <strong>Payment Terms:</strong> Homeowners pay
                      RegularUpkeep. You receive payout after job completion
                      confirmation, minus platform fee.
                    </li>
                    <li>
                      <strong>Quality Standards:</strong> Maintain professional
                      service quality and respond to jobs promptly.
                    </li>
                    <li>
                      <strong>Photo Documentation:</strong> Provide before and
                      after photos for applicable job categories.
                    </li>
                    <li>
                      <strong>Dispute Resolution:</strong> Work with
                      RegularUpkeep to resolve any customer disputes fairly.
                    </li>
                    <li>
                      <strong>Insurance & Licensing:</strong> Maintain
                      appropriate insurance and licenses for your services.
                    </li>
                  </ul>
                  <p className="pt-2">
                    Full terms available at{" "}
                    <Link
                      href="/legal/provider-terms"
                      className="text-primary hover:underline"
                      target="_blank"
                    >
                      regularupkeep.com/legal/provider-terms
                    </Link>
                  </p>
                </div>
              </div>

              {/* Accept Checkbox */}
              <div
                className="flex items-start gap-3 p-4 rounded-lg border cursor-pointer"
                onClick={() => setTermsAccepted(!termsAccepted)}
              >
                <Checkbox
                  checked={termsAccepted}
                  onCheckedChange={(checked) =>
                    setTermsAccepted(checked as boolean)
                  }
                  className="mt-0.5"
                />
                <div className="text-sm">
                  <p className="font-medium">
                    I accept the Provider Network Agreement
                  </p>
                  <p className="text-muted-foreground">
                    I have read and agree to the terms and conditions above.
                  </p>
                </div>
              </div>

              {/* Stripe Connect Info */}
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50 flex items-start gap-3">
                <CreditCard className="h-5 w-5 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-900">
                    Secure Payments via Stripe
                  </p>
                  <p className="text-blue-700">
                    After accepting, you&apos;ll set up Stripe Connect to receive
                    secure payouts directly to your bank account.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(isSignIn ? 2 : 3)}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1"
                  disabled={submitting || !termsAccepted}
                >
                  {submitting && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Accept & Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </form>
    </div>
  );
}

export default function JoinNetworkPage() {
  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <Suspense
          fallback={
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          }
        >
          <JoinNetworkForm />
        </Suspense>

        <p className="text-center text-xs text-muted-foreground mt-6">
          <Link href="/" className="hover:underline">
            RegularUpkeep
          </Link>{" "}
          · AI-powered home maintenance made simple
        </p>
      </div>
    </div>
  );
}
