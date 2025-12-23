/**
 * Homeowner Billing Page
 *
 * Displays subscription status, usage, and billing management options.
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
  CreditCard,
  Home,
  Users,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { SubscriptionActions } from "./subscription-actions";
import { getConfig } from "@/lib/config/admin-config";

type SubscriptionWithDetails = {
  id: string;
  status: string;
  stripe_subscription_id: string | null;
  stripe_customer_id: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  additional_homes: number;
  tenant_access_count: number;
  sponsor_free: boolean;
  trial_ends_at: string | null;
};

export default async function BillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  // Get user's profile with stripe customer ID
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, stripe_customer_id")
    .eq("id", user.id)
    .single() as { data: { id: string; email: string; full_name: string | null; stripe_customer_id: string | null } | null };

  // Get user's subscription
  const { data: subscription } = await supabase
    .from("homeowner_subscriptions")
    .select("*")
    .eq("customer_id", user.id)
    .single() as { data: SubscriptionWithDetails | null };

  // Get user's properties count
  const { count: propertyCount } = await supabase
    .from("properties")
    .select("*", { count: "exact", head: true })
    .eq("property_members.user_id", user.id);

  // Get pricing config
  const pricing = await getConfig("homeowner_pricing");

  // Calculate billing
  const freeHomes = pricing.free_homes_limit;
  const totalHomes = propertyCount || 0;
  const billableHomes = Math.max(0, totalHomes - freeHomes);
  const additionalHomeCost = (pricing.additional_home_monthly_cents / 100) * billableHomes;
  const tenantAccessCost = subscription?.tenant_access_count
    ? (pricing.tenant_access_monthly_cents / 100) * subscription.tenant_access_count
    : 0;
  const sponsorFreeCost = subscription?.sponsor_free
    ? pricing.sponsor_free_yearly_cents / 100 / 12
    : 0;
  const monthlyTotal = additionalHomeCost + tenantAccessCost + sponsorFreeCost;

  const statusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case "trialing":
        return <Badge className="bg-blue-100 text-blue-800">Trial</Badge>;
      case "past_due":
        return <Badge className="bg-amber-100 text-amber-800">Past Due</Badge>;
      case "canceled":
        return <Badge className="bg-red-100 text-red-800">Canceled</Badge>;
      case "paused":
        return <Badge className="bg-gray-100 text-gray-800">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your subscription and payment methods
        </p>
      </div>

      {/* Subscription Status Alert */}
      {subscription?.status === "past_due" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Payment Past Due</AlertTitle>
          <AlertDescription>
            Your payment is past due. Please update your payment method to continue using premium features.
          </AlertDescription>
        </Alert>
      )}

      {subscription?.cancel_at_period_end && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>Subscription Ending</AlertTitle>
          <AlertDescription>
            Your subscription will end on {new Date(subscription.current_period_end!).toLocaleDateString()}.
            You can reactivate anytime before then.
          </AlertDescription>
        </Alert>
      )}

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your subscription details</CardDescription>
            </div>
            {subscription && statusBadge(subscription.status)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Free Tier Info */}
          {!subscription || monthlyTotal === 0 ? (
            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="font-semibold text-green-900">Free Plan</p>
                <p className="text-sm text-green-700">
                  You&apos;re on our free plan with up to {freeHomes} homes included.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Billing Summary */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Home className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Properties</p>
                    <p className="font-semibold">
                      {totalHomes} total ({billableHomes} billable)
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Tenant Access</p>
                    <p className="font-semibold">{subscription?.tenant_access_count || 0} seats</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-lg">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Sponsor-Free</p>
                    <p className="font-semibold">{subscription?.sponsor_free ? "Active" : "Not active"}</p>
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base plan ({freeHomes} homes included)</span>
                  <span>Free</span>
                </div>
                {billableHomes > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Additional homes ({billableHomes} x ${(pricing.additional_home_monthly_cents / 100).toFixed(2)})
                    </span>
                    <span>${additionalHomeCost.toFixed(2)}/mo</span>
                  </div>
                )}
                {(subscription?.tenant_access_count || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tenant access ({subscription?.tenant_access_count} x ${(pricing.tenant_access_monthly_cents / 100).toFixed(2)})
                    </span>
                    <span>${tenantAccessCost.toFixed(2)}/mo</span>
                  </div>
                )}
                {subscription?.sponsor_free && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Sponsor-free experience (${(pricing.sponsor_free_yearly_cents / 100).toFixed(2)}/year)
                    </span>
                    <span>${sponsorFreeCost.toFixed(2)}/mo</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold">
                  <span>Monthly Total</span>
                  <span>${monthlyTotal.toFixed(2)}/mo</span>
                </div>
              </div>

              {subscription?.current_period_end && (
                <p className="text-sm text-muted-foreground">
                  Next billing date: {new Date(subscription.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
          )}

          <Separator />

          {/* Subscription Actions */}
          <SubscriptionActions
            hasSubscription={!!subscription?.stripe_subscription_id}
            customerId={profile?.stripe_customer_id || null}
            subscriptionStatus={subscription?.status || null}
            cancelAtPeriodEnd={subscription?.cancel_at_period_end || false}
            currentHomes={billableHomes}
            currentTenantAccess={subscription?.tenant_access_count || 0}
            sponsorFree={subscription?.sponsor_free || false}
          />
        </CardContent>
      </Card>

      {/* Upgrade Options */}
      {(!subscription?.sponsor_free || billableHomes === 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Available Add-ons</CardTitle>
            <CardDescription>Enhance your experience with these options</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!subscription?.sponsor_free && (
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Sponsor-Free Experience</p>
                    <p className="text-sm text-muted-foreground">
                      Remove all sponsor recommendations and ads
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${(pricing.sponsor_free_yearly_cents / 100).toFixed(2)}/year</p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/app/billing/upgrade?addon=sponsor_free">Add</Link>
                  </Button>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Tenant Access</p>
                  <p className="text-sm text-muted-foreground">
                    Allow tenants to view and manage their rental property
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold">${(pricing.tenant_access_monthly_cents / 100).toFixed(2)}/seat/mo</p>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/app/billing/upgrade?addon=tenant_access">Add</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Payment Methods */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Methods</CardTitle>
              <CardDescription>Manage your payment methods</CardDescription>
            </div>
            {profile?.stripe_customer_id && (
              <Button variant="outline" size="sm" asChild>
                <Link href="/api/billing/portal">
                  Manage <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {profile?.stripe_customer_id ? (
            <div className="flex items-center gap-4 p-4 bg-muted/50 rounded-lg">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Payment method on file</p>
                <p className="text-sm text-muted-foreground">
                  Manage your cards and billing info in the Stripe portal
                </p>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">No payment method on file</p>
              <Button asChild>
                <Link href="/app/billing/add-payment">Add Payment Method</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Billing History */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View past invoices and transactions</CardDescription>
            </div>
            {profile?.stripe_customer_id && (
              <Button variant="ghost" size="sm" asChild>
                <Link href="/api/billing/portal">
                  View All <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <p>Your invoices and payment history will appear here</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
