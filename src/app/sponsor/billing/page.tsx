/**
 * Sponsor Billing Page
 *
 * Manages sponsor subscription and payment.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import {
  ArrowLeft,
  CreditCard,
  Calendar,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { getConfig } from "@/lib/config/admin-config";
import { SponsorBillingActions } from "./billing-actions";

type SponsorWithTerritory = {
  id: string;
  profile_id: string;
  business_name: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_start: string | null;
  current_period_end: string | null;
  territory_id: string | null;
  territories: {
    name: string;
  } | null;
};

export default async function SponsorBillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/sponsor/billing");
  }

  // Get sponsor with territory
  const { data: sponsor } = await supabase
    .from("sponsors")
    .select(`
      id, profile_id, business_name, status,
      stripe_customer_id, stripe_subscription_id,
      current_period_start, current_period_end,
      territory_id, territories(name)
    `)
    .eq("profile_id", user.id)
    .single() as { data: SponsorWithTerritory | null };

  if (!sponsor) {
    redirect("/sponsor/onboarding");
  }

  // Get pricing
  const pricing = await getConfig("sponsor_pricing");
  const annualPrice = pricing.local_sponsor_yearly_cents / 100;

  const isActive = sponsor.status === "active";
  const isPending = sponsor.status === "pending";
  const hasSubscription = !!sponsor.stripe_subscription_id;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/sponsor">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Billing & Subscription</h1>
            <p className="text-muted-foreground">Manage your sponsor subscription</p>
          </div>
        </div>

        {/* Status Alerts */}
        {isPending && !hasSubscription && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Complete Your Subscription</AlertTitle>
            <AlertDescription>
              Subscribe to start appearing to homeowners in your territory.
            </AlertDescription>
          </Alert>
        )}

        {/* Current Plan */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Sponsor Subscription</CardTitle>
                <CardDescription>Annual territory sponsorship</CardDescription>
              </div>
              <Badge
                variant={isActive ? "default" : isPending ? "secondary" : "outline"}
                className={isActive ? "bg-green-100 text-green-800" : ""}
              >
                {sponsor.status.charAt(0).toUpperCase() + sponsor.status.slice(1)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Plan Details */}
            <div className="p-4 border rounded-lg space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <MapPin className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Local Sponsor</p>
                    <p className="text-sm text-muted-foreground">
                      {sponsor.territories?.name || "Territory pending"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold">${annualPrice.toFixed(0)}</p>
                  <p className="text-sm text-muted-foreground">per year</p>
                </div>
              </div>

              <Separator />

              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Display on homeowner dashboards in your territory</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Up to {pricing.tiles_per_territory} sponsors per territory</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Click and impression tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Custom profile with logo and contact info</span>
                </div>
              </div>
            </div>

            {/* Billing Info */}
            {hasSubscription && (
              <>
                <Separator />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Current Period</p>
                      <p className="font-medium">
                        {sponsor.current_period_start
                          ? new Date(sponsor.current_period_start).toLocaleDateString()
                          : "—"}{" "}
                        -{" "}
                        {sponsor.current_period_end
                          ? new Date(sponsor.current_period_end).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Next Payment</p>
                      <p className="font-medium">
                        {sponsor.current_period_end
                          ? new Date(sponsor.current_period_end).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Actions */}
            <SponsorBillingActions
              sponsorId={sponsor.id}
              hasSubscription={hasSubscription}
              customerId={sponsor.stripe_customer_id}
              status={sponsor.status}
            />
          </CardContent>
        </Card>

        {/* Payment Methods */}
        {sponsor.stripe_customer_id && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Payment Method</CardTitle>
                  <CardDescription>Manage your billing details</CardDescription>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/api/sponsor/billing/portal">
                    Manage <ExternalLink className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
                <CreditCard className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Payment method on file</p>
                  <p className="text-sm text-muted-foreground">
                    Manage your cards and billing info in the Stripe portal
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
