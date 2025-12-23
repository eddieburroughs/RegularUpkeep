"use client";

/**
 * Estimate Approval Component
 *
 * Allows customers to review and approve an estimate,
 * authorizing payment with Stripe.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, CheckCircle2, XCircle, Info, ShieldCheck, CreditCard } from "lucide-react";
import { useRouter } from "next/navigation";

interface EstimateItem {
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

interface EstimateApprovalProps {
  estimateId: string;
  estimateNumber: string;
  providerName: string;
  description: string | null;
  items: EstimateItem[];
  laborCents: number;
  materialsCents: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  bufferPercentage: number;
  validUntil: string | null;
  providerNotes: string | null;
  status: string;
}

export function EstimateApproval({
  estimateId,
  estimateNumber,
  providerName,
  description,
  items,
  laborCents,
  materialsCents,
  subtotalCents,
  taxCents,
  totalCents,
  bufferPercentage,
  validUntil,
  providerNotes,
  status,
}: EstimateApprovalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isPending = ["sent", "viewed"].includes(status);
  const isApproved = status === "approved";
  const authorizedAmount = Math.ceil(totalCents * (1 + bufferPercentage / 100));

  const handleApprove = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/estimates/${estimateId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve estimate");
      }

      setDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleDecline = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/estimates/${estimateId}/decline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to decline estimate");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Estimate #{estimateNumber}</CardTitle>
            <CardDescription>From {providerName}</CardDescription>
          </div>
          <Badge
            variant={
              isApproved ? "default" : isPending ? "secondary" : "outline"
            }
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        {/* Line Items */}
        {items && items.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Work Items</h4>
            <div className="border rounded-lg divide-y">
              {items.map((item, index) => (
                <div key={index} className="p-3 flex justify-between">
                  <div>
                    <p className="font-medium text-sm">{item.description}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.quantity} x ${(item.unit_price_cents / 100).toFixed(2)}
                    </p>
                  </div>
                  <p className="font-medium">
                    ${(item.total_cents / 100).toFixed(2)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cost Breakdown */}
        <div className="border rounded-lg p-4 space-y-2">
          {laborCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Labor</span>
              <span>${(laborCents / 100).toFixed(2)}</span>
            </div>
          )}
          {materialsCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Materials</span>
              <span>${(materialsCents / 100).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span>${(subtotalCents / 100).toFixed(2)}</span>
          </div>
          {taxCents > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Tax</span>
              <span>${(taxCents / 100).toFixed(2)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Estimate Total</span>
            <span className="text-lg">${(totalCents / 100).toFixed(2)}</span>
          </div>
        </div>

        {providerNotes && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm font-medium mb-1">Provider Notes</p>
            <p className="text-sm text-muted-foreground">{providerNotes}</p>
          </div>
        )}

        {validUntil && (
          <p className="text-xs text-muted-foreground">
            Valid until {new Date(validUntil).toLocaleDateString()}
          </p>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      {isPending && (
        <CardFooter className="flex flex-col gap-3">
          {/* Authorization Info */}
          <div className="w-full p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Payment Authorization</p>
                <p>
                  Approving this estimate authorizes a hold of{" "}
                  <span className="font-semibold">
                    ${(authorizedAmount / 100).toFixed(2)}
                  </span>{" "}
                  (includes {bufferPercentage}% buffer for change orders). You&apos;ll only be
                  charged the final amount after work is completed.
                </p>
              </div>
            </div>
          </div>

          <div className="flex gap-2 w-full">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve Estimate
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve Estimate</DialogTitle>
                  <DialogDescription>
                    You&apos;re about to authorize payment for this estimate.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Authorization Amount</p>
                      <p className="text-2xl font-bold">
                        ${(authorizedAmount / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 text-sm">
                    <ShieldCheck className="h-4 w-4 text-green-600 mt-0.5" />
                    <p className="text-muted-foreground">
                      This is a hold only. Your card won&apos;t be charged until
                      you approve the final invoice after work is completed.
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleApprove} disabled={loading}>
                    {loading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Authorize Payment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button
              variant="outline"
              onClick={handleDecline}
              disabled={loading}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Decline
            </Button>
          </div>
        </CardFooter>
      )}

      {isApproved && (
        <CardFooter>
          <div className="w-full p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">
                Estimate approved - Payment authorized
              </span>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
