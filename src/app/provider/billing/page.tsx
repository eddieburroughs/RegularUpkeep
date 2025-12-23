/**
 * Provider Billing Page
 *
 * Displays provider tier status, subscription management, and Stripe Connect status.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import Link from "next/link";
import {
  Shield,
  Star,
  CheckCircle2,
  XCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  CreditCard,
  Award,
} from "lucide-react";
import { getConfig } from "@/lib/config/admin-config";
import { ProviderTierActions } from "./tier-actions";

type ProviderWithSubscription = {
  id: string;
  profile_id: string;
  business_name: string;
  tier: string;
  stripe_customer_id: string | null;
  provider_subscriptions: {
    id: string;
    status: string;
    tier: string;
    stripe_subscription_id: string | null;
    current_period_end: string | null;
    cancel_at_period_end: boolean;
  }[] | null;
  provider_stripe_accounts: {
    id: string;
    stripe_account_id: string;
    status: string;
    onboarding_complete: boolean;
    charges_enabled: boolean;
    payouts_enabled: boolean;
  }[] | null;
};

type ProviderStats = {
  average_rating: number | null;
  total_reviews: number;
  completed_jobs: number;
  disputed_jobs: number;
  avg_response_hours: number | null;
};

export default async function ProviderBillingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/provider/billing");
  }

  // Get provider with subscription and Stripe account
  const { data: provider } = await supabase
    .from("providers")
    .select(`
      id, profile_id, business_name, tier, stripe_customer_id,
      provider_subscriptions(*),
      provider_stripe_accounts(*)
    `)
    .eq("profile_id", user.id)
    .single() as { data: ProviderWithSubscription | null };

  if (!provider) {
    redirect("/provider/onboarding/signup");
  }

  // Get provider stats for tier eligibility
  // TODO: Implement get_provider_stats RPC function
  // For now, calculate stats manually from completed bookings and reviews
  const { count: completedJobs } = await supabase
    .from("bookings")
    .select("*", { count: "exact", head: true })
    .eq("provider_id", provider.id)
    .eq("status", "completed");

  const { data: reviewData } = await supabase
    .from("reviews")
    .select("rating")
    .eq("provider_id", provider.id) as { data: { rating: number }[] | null };

  const reviews = reviewData || [];
  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const stats: ProviderStats = {
    average_rating: averageRating,
    total_reviews: reviews.length,
    completed_jobs: completedJobs || 0,
    disputed_jobs: 0, // TODO: Get from disputes table
    avg_response_hours: null, // TODO: Calculate from response times
  };

  // Get tier config
  const tierConfig = await getConfig("provider_tiers");

  // Get subscription and Stripe account
  const subscription = provider.provider_subscriptions?.[0];
  const stripeAccount = provider.provider_stripe_accounts?.[0];

  // Calculate tier eligibility
  const currentTier = provider.tier || "basic";
  const isVerified = currentTier === "verified" || currentTier === "preferred";
  const isPreferred = currentTier === "preferred";

  // Preferred tier requirements
  const preferredThresholds = tierConfig.preferred.performance_thresholds;
  const meetsRating = (stats?.average_rating || 0) >= preferredThresholds.min_rating;
  const meetsCompletedJobs = (stats?.completed_jobs || 0) >= preferredThresholds.min_completed_jobs;
  const meetsDisputeRate =
    stats?.completed_jobs && stats.completed_jobs > 0
      ? (stats.disputed_jobs || 0) / stats.completed_jobs <= preferredThresholds.max_dispute_rate
      : true;
  const meetsResponseTime =
    (stats?.avg_response_hours || 24) <= preferredThresholds.min_response_time_hours;

  const preferredEligible = isVerified && meetsRating && meetsCompletedJobs && meetsDisputeRate && meetsResponseTime;

  const tierBadge = (tier: string) => {
    switch (tier) {
      case "preferred":
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-amber-600">
            <Star className="mr-1 h-3 w-3" /> Preferred
          </Badge>
        );
      case "verified":
        return (
          <Badge className="bg-gradient-to-r from-blue-500 to-blue-600">
            <Shield className="mr-1 h-3 w-3" /> Verified
          </Badge>
        );
      default:
        return <Badge variant="secondary">Basic</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        <p className="text-muted-foreground">
          Manage your tier and payment settings
        </p>
      </div>

      {/* Stripe Connect Status */}
      {(!stripeAccount || !stripeAccount.onboarding_complete) && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Complete Payment Setup</AlertTitle>
          <AlertDescription>
            You need to connect your bank account to receive payments from completed jobs.
          </AlertDescription>
          <Button className="mt-2" size="sm" asChild>
            <Link href="/api/provider/connect/onboard">
              Complete Setup <ExternalLink className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </Alert>
      )}

      {/* Current Tier Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Tier</CardTitle>
              <CardDescription>Your provider membership level</CardDescription>
            </div>
            {tierBadge(currentTier)}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Tier Benefits */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span className="font-medium">Basic</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Receive job requests</li>
                <li>Basic profile listing</li>
                <li>Standard support</li>
              </ul>
            </div>
            <div className={`p-4 border rounded-lg ${isVerified ? "border-blue-300 bg-blue-50/50" : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-blue-600" />
                </div>
                <span className="font-medium">Verified</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Verified badge on profile</li>
                <li>Priority in search results</li>
                <li>Background check badge</li>
                <li>${(tierConfig.verified.monthly_cents / 100).toFixed(2)}/month</li>
              </ul>
            </div>
            <div className={`p-4 border rounded-lg ${isPreferred ? "border-amber-300 bg-amber-50/50" : ""}`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="h-8 w-8 rounded-full bg-amber-100 flex items-center justify-center">
                  <Star className="h-4 w-4 text-amber-600" />
                </div>
                <span className="font-medium">Preferred</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Featured in recommendations</li>
                <li>Top placement in listings</li>
                <li>Exclusive job opportunities</li>
                <li>${(tierConfig.preferred.monthly_cents / 100).toFixed(2)}/month</li>
              </ul>
            </div>
          </div>

          {subscription && (
            <>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Subscription Status</p>
                  <p className="font-medium capitalize">{subscription.status}</p>
                </div>
                {subscription.current_period_end && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Next billing</p>
                    <p className="font-medium">
                      {new Date(subscription.current_period_end).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          <ProviderTierActions
            providerId={provider.id}
            currentTier={currentTier}
            hasSubscription={!!subscription?.stripe_subscription_id}
            subscriptionStatus={subscription?.status || null}
            cancelAtPeriodEnd={subscription?.cancel_at_period_end || false}
            customerId={provider.stripe_customer_id}
            preferredEligible={preferredEligible}
          />
        </CardContent>
      </Card>

      {/* Preferred Eligibility */}
      {isVerified && !isPreferred && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-amber-500" />
              <CardTitle>Preferred Tier Eligibility</CardTitle>
            </div>
            <CardDescription>
              Meet these requirements to upgrade to Preferred status
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {/* Rating */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Average Rating</span>
                  {meetsRating ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={Math.min(100, ((stats?.average_rating || 0) / preferredThresholds.min_rating) * 100)}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium">
                    {(stats?.average_rating || 0).toFixed(1)} / {preferredThresholds.min_rating}
                  </span>
                </div>
              </div>

              {/* Completed Jobs */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Completed Jobs</span>
                  {meetsCompletedJobs ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Progress
                    value={Math.min(100, ((stats?.completed_jobs || 0) / preferredThresholds.min_completed_jobs) * 100)}
                    className="flex-1"
                  />
                  <span className="text-sm font-medium">
                    {stats?.completed_jobs || 0} / {preferredThresholds.min_completed_jobs}
                  </span>
                </div>
              </div>

              {/* Dispute Rate */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Dispute Rate</span>
                  {meetsDisputeRate ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm">
                  {stats?.completed_jobs && stats.completed_jobs > 0
                    ? `${(((stats.disputed_jobs || 0) / stats.completed_jobs) * 100).toFixed(1)}%`
                    : "0%"}{" "}
                  <span className="text-muted-foreground">
                    (max {(preferredThresholds.max_dispute_rate * 100).toFixed(0)}%)
                  </span>
                </p>
              </div>

              {/* Response Time */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Avg Response Time</span>
                  {meetsResponseTime ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <p className="text-sm">
                  {stats?.avg_response_hours?.toFixed(1) || "N/A"} hours{" "}
                  <span className="text-muted-foreground">
                    (max {preferredThresholds.min_response_time_hours}h)
                  </span>
                </p>
              </div>
            </div>

            {preferredEligible && (
              <Alert className="border-amber-200 bg-amber-50">
                <Star className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">You&apos;re eligible for Preferred!</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Upgrade now to get featured placement and exclusive opportunities.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stripe Connect Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Payment Account</CardTitle>
              <CardDescription>Your Stripe Connect account for receiving payments</CardDescription>
            </div>
            {stripeAccount?.onboarding_complete ? (
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
            ) : (
              <Badge variant="outline">Pending</Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {stripeAccount ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Charges</p>
                    <p className="font-medium">
                      {stripeAccount.charges_enabled ? "Enabled" : "Pending"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <TrendingUp className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Payouts</p>
                    <p className="font-medium">
                      {stripeAccount.payouts_enabled ? "Enabled" : "Pending"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="font-medium capitalize">{stripeAccount.status}</p>
                  </div>
                </div>
              </div>
              <Button variant="outline" asChild>
                <Link href="/api/provider/connect/dashboard">
                  Manage Stripe Account <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          ) : (
            <div className="text-center py-6">
              <CreditCard className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground mb-4">
                Connect your bank account to receive payments
              </p>
              <Button asChild>
                <Link href="/api/provider/connect/onboard">
                  Connect Bank Account <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
