"use client";

/**
 * Invoice Approval Component
 *
 * Allows customers to review and approve an invoice,
 * capturing the authorized payment, or dispute within the window.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Camera,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface InvoiceItem {
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
}

interface InvoiceApprovalProps {
  invoiceId: string;
  invoiceNumber: string;
  providerName: string;
  description: string | null;
  items: InvoiceItem[];
  laborCents: number;
  materialsCents: number;
  subtotalCents: number;
  taxCents: number;
  totalCents: number;
  estimateTotalCents: number;
  varianceReason: string | null;
  providerNotes: string | null;
  completionPhotos: string[];
  createdAt: string;
  disputeWindowHours: number;
  autoApproveHours: number;
  status: string;
}

const disputeReasons = [
  { value: "quality", label: "Quality of work not as expected" },
  { value: "incomplete", label: "Work not fully completed" },
  { value: "damage", label: "Damage to property" },
  { value: "pricing", label: "Pricing discrepancy" },
  { value: "other", label: "Other issue" },
];

export function InvoiceApproval({
  invoiceId,
  invoiceNumber,
  providerName,
  description,
  items,
  laborCents,
  materialsCents,
  subtotalCents,
  taxCents,
  totalCents,
  estimateTotalCents,
  varianceReason,
  providerNotes,
  completionPhotos,
  createdAt,
  disputeWindowHours,
  autoApproveHours,
  status,
}: InvoiceApprovalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [disputeDialogOpen, setDisputeDialogOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDescription, setDisputeDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const isPending = status === "pending_approval";
  const isPaid = status === "paid";
  const isDisputed = status === "disputed";
  const isAutoApproved = status === "auto_approved";

  // Calculate time remaining
  const invoiceCreated = new Date(createdAt);
  const now = new Date();
  const hoursElapsed = (now.getTime() - invoiceCreated.getTime()) / (1000 * 60 * 60);
  const autoApproveIn = Math.max(0, autoApproveHours - hoursElapsed);
  const disputeWindowRemaining = Math.max(0, disputeWindowHours - hoursElapsed);

  // Calculate variance from estimate
  const variance = totalCents - estimateTotalCents;
  const variancePercent = estimateTotalCents > 0
    ? ((variance / estimateTotalCents) * 100).toFixed(1)
    : 0;

  const handleApprove = async () => {
    setLoading("approve");
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to approve invoice");
      }

      setApproveDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  const handleDispute = async () => {
    if (!disputeReason || !disputeDescription) {
      setError("Please provide a reason and description for the dispute");
      return;
    }

    setLoading("dispute");
    setError(null);

    try {
      const response = await fetch(`/api/invoices/${invoiceId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: disputeReason,
          description: disputeDescription,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create dispute");
      }

      setDisputeDialogOpen(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Invoice #{invoiceNumber}</CardTitle>
            <CardDescription>From {providerName}</CardDescription>
          </div>
          <Badge
            variant={
              isPaid || isAutoApproved
                ? "default"
                : isDisputed
                ? "destructive"
                : "secondary"
            }
          >
            {status === "auto_approved" ? "Auto-Approved" : status.replace("_", " ")}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Auto-approve countdown */}
        {isPending && autoApproveIn > 0 && (
          <Alert>
            <Clock className="h-4 w-4" />
            <AlertDescription>
              This invoice will be auto-approved in{" "}
              <span className="font-medium">
                {autoApproveIn.toFixed(1)} hours
              </span>{" "}
              if no action is taken.
            </AlertDescription>
          </Alert>
        )}

        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}

        {/* Line Items */}
        {items && items.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Work Completed</h4>
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
            <span>Invoice Total</span>
            <span className="text-lg">${(totalCents / 100).toFixed(2)}</span>
          </div>
        </div>

        {/* Variance from estimate */}
        {variance !== 0 && (
          <div
            className={`p-3 rounded-lg ${
              variance > 0
                ? "bg-amber-50 border border-amber-200"
                : "bg-green-50 border border-green-200"
            }`}
          >
            <div className="flex items-start gap-2">
              <DollarSign
                className={`h-4 w-4 mt-0.5 ${
                  variance > 0 ? "text-amber-600" : "text-green-600"
                }`}
              />
              <div
                className={`text-sm ${
                  variance > 0 ? "text-amber-800" : "text-green-800"
                }`}
              >
                <p className="font-medium">
                  {variance > 0 ? "+" : ""}
                  ${(variance / 100).toFixed(2)} ({variancePercent}%) from
                  estimate
                </p>
                {varianceReason && (
                  <p className="mt-1 text-xs">{varianceReason}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Completion Photos */}
        {completionPhotos && completionPhotos.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Camera className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-medium">Completion Photos</h4>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {completionPhotos.slice(0, 6).map((photo, index) => (
                <div
                  key={index}
                  className="aspect-square bg-muted rounded-lg overflow-hidden"
                >
                  <img
                    src={photo}
                    alt={`Completion photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {providerNotes && (
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm font-medium">Provider Notes</p>
            </div>
            <p className="text-sm text-muted-foreground">{providerNotes}</p>
          </div>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>

      {isPending && (
        <CardFooter className="flex flex-col gap-3">
          <div className="flex gap-2 w-full">
            {/* Approve Dialog */}
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex-1">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve & Pay
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Approve Invoice</DialogTitle>
                  <DialogDescription>
                    This will complete the payment for this service.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Amount to Pay</p>
                      <p className="text-2xl font-bold">
                        ${(totalCents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    By approving, you confirm that the work has been completed
                    satisfactorily and authorize the payment to be captured.
                  </p>
                </div>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setApproveDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleApprove} disabled={loading === "approve"}>
                    {loading === "approve" ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                    )}
                    Confirm Payment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Dispute Dialog */}
            {disputeWindowRemaining > 0 && (
              <Dialog open={disputeDialogOpen} onOpenChange={setDisputeDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Dispute
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Open a Dispute</DialogTitle>
                    <DialogDescription>
                      Please describe the issue with the completed work.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Reason for Dispute</Label>
                      <Select value={disputeReason} onValueChange={setDisputeReason}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a reason" />
                        </SelectTrigger>
                        <SelectContent>
                          {disputeReasons.map((reason) => (
                            <SelectItem key={reason.value} value={reason.value}>
                              {reason.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={disputeDescription}
                        onChange={(e) => setDisputeDescription(e.target.value)}
                        placeholder="Please provide details about the issue..."
                        rows={4}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Our team will review your dispute and work with both
                      parties to reach a resolution.
                    </p>
                  </div>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setDisputeDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDispute}
                      disabled={loading === "dispute"}
                    >
                      {loading === "dispute" ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <AlertTriangle className="mr-2 h-4 w-4" />
                      )}
                      Submit Dispute
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}
          </div>

          <p className="text-xs text-center text-muted-foreground">
            Dispute window closes in {disputeWindowRemaining.toFixed(1)} hours
          </p>
        </CardFooter>
      )}

      {(isPaid || isAutoApproved) && (
        <CardFooter>
          <div className="w-full p-3 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-2 text-green-800">
              <CheckCircle2 className="h-4 w-4" />
              <span className="font-medium">
                {isAutoApproved
                  ? "Payment completed (auto-approved)"
                  : "Payment completed"}
              </span>
            </div>
          </div>
        </CardFooter>
      )}

      {isDisputed && (
        <CardFooter>
          <div className="w-full p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-center gap-2 text-amber-800">
              <AlertTriangle className="h-4 w-4" />
              <span className="font-medium">
                Dispute under review - Payment on hold
              </span>
            </div>
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
