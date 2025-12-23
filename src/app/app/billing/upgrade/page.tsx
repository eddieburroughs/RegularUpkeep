/**
 * Billing Upgrade Page
 *
 * Allows users to add subscription options like tenant access or sponsor-free.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowLeft, Users, Sparkles, Check } from "lucide-react";
import { getConfig } from "@/lib/config/admin-config";
import { UpgradeForm } from "./upgrade-form";

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ addon?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get current subscription
  const { data: subscription } = await supabase
    .from("homeowner_subscriptions")
    .select("*")
    .eq("customer_id", user.id)
    .single() as {
      data: {
        id: string;
        tenant_access_count: number;
        sponsor_free: boolean;
        stripe_subscription_id: string | null;
      } | null
    };

  // Get pricing
  const pricing = await getConfig("homeowner_pricing");

  const addon = params.addon;

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/billing">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Upgrade Your Plan</h1>
          <p className="text-muted-foreground">
            Add features to your subscription
          </p>
        </div>
      </div>

      {/* Addon Selection */}
      {addon === "sponsor_free" && !subscription?.sponsor_free && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Sponsor-Free Experience</CardTitle>
                <CardDescription>Remove all sponsor content</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">No sponsor recommendations in your feed</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">No sponsored provider suggestions</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Clean, ad-free interface</span>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Annual subscription</span>
                <span className="text-2xl font-bold">
                  ${(pricing.sponsor_free_yearly_cents / 100).toFixed(2)}/year
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                That&apos;s just ${(pricing.sponsor_free_yearly_cents / 100 / 12).toFixed(2)}/month
              </p>
            </div>

            <UpgradeForm
              currentTenantAccess={subscription?.tenant_access_count || 0}
              currentSponsorFree={false}
              addSponsorFree={true}
              hasSubscription={!!subscription?.stripe_subscription_id}
            />
          </CardContent>
        </Card>
      )}

      {addon === "tenant_access" && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Tenant Access</CardTitle>
                <CardDescription>Let tenants manage their rental</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Tenants can view property details</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Submit maintenance requests</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Track service appointments</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-4 w-4 text-green-600" />
                <span className="text-sm">Access property documents</span>
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Per tenant seat</span>
                <span className="text-2xl font-bold">
                  ${(pricing.tenant_access_monthly_cents / 100).toFixed(2)}/month
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Current seats: {subscription?.tenant_access_count || 0}
              </p>
            </div>

            <UpgradeForm
              currentTenantAccess={subscription?.tenant_access_count || 0}
              currentSponsorFree={subscription?.sponsor_free || false}
              addTenantSeats={1}
              hasSubscription={!!subscription?.stripe_subscription_id}
            />
          </CardContent>
        </Card>
      )}

      {/* If no addon specified or already have it */}
      {(!addon || (addon === "sponsor_free" && subscription?.sponsor_free)) && (
        <Card>
          <CardContent className="py-8 text-center">
            {addon === "sponsor_free" && subscription?.sponsor_free ? (
              <p className="text-muted-foreground">
                You already have the sponsor-free experience active.
              </p>
            ) : (
              <p className="text-muted-foreground">
                Select an add-on from your billing page to upgrade.
              </p>
            )}
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/app/billing">Back to Billing</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
