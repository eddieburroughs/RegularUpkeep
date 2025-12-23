"use client";

/**
 * Provider Tier Actions Component
 *
 * Handles tier upgrade/downgrade and subscription management.
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
import { Loader2, Shield, Star, ExternalLink, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface ProviderTierActionsProps {
  providerId: string;
  currentTier: string;
  hasSubscription: boolean;
  subscriptionStatus: string | null;
  cancelAtPeriodEnd: boolean;
  customerId: string | null;
  preferredEligible: boolean;
}

export function ProviderTierActions({
  providerId,
  currentTier,
  hasSubscription,
  subscriptionStatus,
  cancelAtPeriodEnd,
  customerId,
  preferredEligible,
}: ProviderTierActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [upgradeDialogOpen, setUpgradeDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleUpgrade = async (tier: "verified" | "preferred") => {
    setLoading(tier);
    try {
      const response = await fetch("/api/provider/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Upgrade error:", error);
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    if (!customerId) return;

    setLoading("portal");
    try {
      const response = await fetch("/api/provider/billing/portal", {
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
      const response = await fetch("/api/provider/billing/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      const response = await fetch("/api/provider/billing/reactivate", {
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

  // Basic tier - show upgrade options
  if (currentTier === "basic") {
    return (
      <div className="flex flex-col sm:flex-row gap-3">
        <Button onClick={() => handleUpgrade("verified")} disabled={loading === "verified"}>
          {loading === "verified" ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Shield className="mr-2 h-4 w-4" />
          )}
          Upgrade to Verified
        </Button>
      </div>
    );
  }

  // Cancelled subscription - show reactivate
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

  // Verified tier - show upgrade to Preferred or manage
  if (currentTier === "verified" && hasSubscription) {
    return (
      <div className="flex flex-col sm:flex-row gap-3">
        {preferredEligible && (
          <Button onClick={() => handleUpgrade("preferred")} disabled={loading === "preferred"}>
            {loading === "preferred" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Star className="mr-2 h-4 w-4" />
            )}
            Upgrade to Preferred
          </Button>
        )}
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
                Are you sure you want to cancel your Verified tier subscription?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                You&apos;ll lose your Verified badge and priority placement when your
                current billing period ends.
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
                ) : null}
                Cancel at Period End
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  // Preferred tier - just show manage
  if (currentTier === "preferred" && hasSubscription) {
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
              Downgrade to Verified
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Downgrade to Verified
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to downgrade from Preferred to Verified tier?
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <p className="text-sm text-muted-foreground">
                You&apos;ll lose featured placement and exclusive opportunities, but
                keep your Verified badge.
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)}>
                Stay Preferred
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={loading === "cancel"}
              >
                {loading === "cancel" ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Downgrade
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return null;
}
