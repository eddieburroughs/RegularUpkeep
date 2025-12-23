"use client";

/**
 * Upgrade Form Component
 *
 * Handles the checkout process for adding subscription features.
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Minus } from "lucide-react";

interface UpgradeFormProps {
  currentTenantAccess: number;
  currentSponsorFree: boolean;
  addSponsorFree?: boolean;
  addTenantSeats?: number;
  hasSubscription: boolean;
}

export function UpgradeForm({
  currentTenantAccess,
  currentSponsorFree,
  addSponsorFree = false,
  addTenantSeats = 0,
  hasSubscription,
}: UpgradeFormProps) {
  const [loading, setLoading] = useState(false);
  const [tenantSeats, setTenantSeats] = useState(currentTenantAccess + addTenantSeats);
  const [sponsorFree, setSponsorFree] = useState(currentSponsorFree || addSponsorFree);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (hasSubscription) {
        // Update existing subscription via portal
        const response = await fetch("/api/billing/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ returnUrl: window.location.origin + "/app/billing" }),
        });

        if (!response.ok) {
          throw new Error("Failed to open billing portal");
        }

        const { url } = await response.json();
        window.location.href = url;
      } else {
        // Create new checkout session
        const response = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            additionalHomes: 0,
            tenantAccessCount: tenantSeats,
            sponsorFree,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to create checkout session");
        }

        const { url } = await response.json();
        window.location.href = url;
      }
    } catch (error) {
      console.error("Upgrade error:", error);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {addTenantSeats !== undefined && addTenantSeats > 0 && (
        <div className="space-y-2">
          <Label>Number of Tenant Seats</Label>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setTenantSeats(Math.max(currentTenantAccess, tenantSeats - 1))}
              disabled={tenantSeats <= currentTenantAccess}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <Input
              type="number"
              min={currentTenantAccess}
              value={tenantSeats}
              onChange={(e) => setTenantSeats(Math.max(currentTenantAccess, parseInt(e.target.value) || 0))}
              className="w-20 text-center"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setTenantSeats(tenantSeats + 1)}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Adding {tenantSeats - currentTenantAccess} new seat(s)
          </p>
        </div>
      )}

      <Button onClick={handleSubmit} disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : hasSubscription ? (
          "Update Subscription"
        ) : (
          "Subscribe Now"
        )}
      </Button>

      <p className="text-xs text-center text-muted-foreground">
        {hasSubscription
          ? "You'll be redirected to manage your subscription"
          : "You'll be redirected to Stripe to complete payment"}
      </p>
    </div>
  );
}
