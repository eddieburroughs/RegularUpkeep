"use client";

/**
 * Subscription Actions Component
 *
 * Handles subscription management actions like upgrading,
 * canceling, and managing the Stripe billing portal.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, ExternalLink, Plus, Minus, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface SubscriptionActionsProps {
  hasSubscription: boolean;
  customerId: string | null;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  currentHomes: number;
  currentTenantAccess: number;
  sponsorFree: boolean;
}

export function SubscriptionActions({
  hasSubscription,
  customerId,
  subscriptionStatus,
  cancelAtPeriodEnd,
  currentHomes,
  currentTenantAccess,
  sponsorFree,
}: SubscriptionActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handlePortal = async () => {
    if (!customerId) return;

    setLoading("portal");
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnUrl: window.location.href }),
      });

      if (!response.ok) {
        throw new Error("Failed to create portal session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Portal error:", error);
      setLoading(null);
    }
  };

  const handleCancel = async () => {
    setLoading("cancel");
    try {
      const response = await fetch("/api/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ immediately: false }),
      });

      if (!response.ok) {
        throw new Error("Failed to cancel subscription");
      }

      setCancelDialogOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Cancel error:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleReactivate = async () => {
    setLoading("reactivate");
    try {
      const response = await fetch("/api/billing/reactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to reactivate subscription");
      }

      router.refresh();
    } catch (error) {
      console.error("Reactivate error:", error);
    } finally {
      setLoading(null);
    }
  };

  const handleUpgrade = async () => {
    setLoading("upgrade");
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          additionalHomes: currentHomes,
          tenantAccessCount: currentTenantAccess,
          sponsorFree,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Upgrade error:", error);
    } finally {
      setLoading(null);
    }
  };

  // If no subscription yet, show start subscription button
  if (!hasSubscription && currentHomes > 0) {
    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleUpgrade} disabled={loading === "upgrade"}>
          {loading === "upgrade" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Start Subscription
        </Button>
        <p className="text-sm text-muted-foreground">
          Subscribe to add more than 2 properties
        </p>
      </div>
    );
  }

  // If cancelled, show reactivate
  if (cancelAtPeriodEnd) {
    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handleReactivate} disabled={loading === "reactivate"}>
          {loading === "reactivate" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Reactivate Subscription
        </Button>
        {customerId && (
          <Button variant="outline" onClick={handlePortal} disabled={loading === "portal"}>
            {loading === "portal" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Billing Portal
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    );
  }

  // Active subscription
  if (hasSubscription && subscriptionStatus === "active") {
    return (
      <div className="flex flex-col sm:flex-row gap-3">
        {customerId && (
          <Button variant="outline" onClick={handlePortal} disabled={loading === "portal"}>
            {loading === "portal" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Manage Subscription
            <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        )}

        <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="text-destructive hover:text-destructive">
              Cancel Subscription
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Cancel Subscription
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to cancel your subscription? You&apos;ll continue to have access until the end of your current billing period.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                If you have more than 2 properties, you&apos;ll need to remove some before you can continue using the platform without a subscription.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Keep Subscription
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={loading === "cancel"}
              >
                {loading === "cancel" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Minus className="mr-2 h-4 w-4" />
                )}
                Cancel at Period End
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Past due - prompt to update payment
  if (subscriptionStatus === "past_due") {
    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={handlePortal} disabled={loading === "portal"}>
          {loading === "portal" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Update Payment Method
          <ExternalLink className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Free plan, no action needed
  return null;
}
