"use client";

/**
 * Sponsor Billing Actions Component
 *
 * Handles subscription management for sponsors.
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
import { Loader2, CreditCard, ExternalLink, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";

interface SponsorBillingActionsProps {
  sponsorId: string;
  hasSubscription: boolean;
  customerId: string | null;
  status: string;
}

export function SponsorBillingActions({
  sponsorId,
  hasSubscription,
  customerId,
  status,
}: SponsorBillingActionsProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);

  const handleSubscribe = async () => {
    setLoading("subscribe");
    try {
      const response = await fetch("/api/sponsor/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to create checkout session");
      }

      const { url } = await response.json();
      window.location.href = url;
    } catch (error) {
      console.error("Subscribe error:", error);
      setLoading(null);
    }
  };

  const handlePortal = async () => {
    if (!customerId) return;

    setLoading("portal");
    try {
      const response = await fetch("/api/sponsor/billing/portal", {
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
      const response = await fetch("/api/sponsor/billing/cancel", {
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

  // No subscription yet
  if (!hasSubscription) {
    return (
      <Button onClick={handleSubscribe} disabled={loading === "subscribe"} className="w-full">
        {loading === "subscribe" ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Subscribe Now
          </>
        )}
      </Button>
    );
  }

  // Active subscription
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
              Are you sure you want to cancel your sponsor subscription?
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground">
              Your sponsor tile will be removed from homeowner dashboards at the
              end of your current billing period. You won&apos;t receive a refund
              for the remaining time.
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
