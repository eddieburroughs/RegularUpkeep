"use client";

/**
 * Admin Decision Form Component
 *
 * Form for admins to make decisions on disputes, fraud reviews, etc.
 * All decisions are logged for audit purposes.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { CheckCircle, XCircle, Loader2, Gavel } from "lucide-react";

interface AdminDecisionFormProps {
  entityType: "dispute" | "fraud_review" | "provider_tier";
  entityId: string;
  currentStatus: string;
  disputedAmount?: number;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function AdminDecisionForm({
  entityType,
  entityId,
  currentStatus,
  disputedAmount,
}: AdminDecisionFormProps) {
  const router = useRouter();
  const [decision, setDecision] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [refundAmount, setRefundAmount] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!decision) {
      setError("Please select a decision");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      let endpoint = "";
      let body: Record<string, unknown> = {
        entityId,
        decision,
        notes,
      };

      if (entityType === "dispute") {
        endpoint = `/api/admin/disputes/${entityId}/resolve`;
        // Map decision values to API resolution types
        let resolution: string;
        if (decision === "resolved_full_refund") {
          resolution = "customer_favor";
          body.refundAmount = disputedAmount; // Full refund
        } else if (decision === "resolved_partial_refund") {
          resolution = "split";
          body.refundAmount = refundAmount ? Math.round(parseFloat(refundAmount) * 100) : 0;
        } else if (decision === "resolved_no_refund" || decision === "reject") {
          resolution = "provider_favor";
        } else {
          resolution = decision; // escalate or other
        }
        body = {
          resolution,
          refundAmount: body.refundAmount,
          notes,
        };
      } else if (entityType === "fraud_review") {
        endpoint = "/api/admin/fraud-review";
        body = {
          reviewId: entityId,
          decision,
          notes,
        };
      }

      const res = await fetch(endpoint, {
        method: entityType === "fraud_review" ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError("Failed to submit decision");
    } finally {
      setSubmitting(false);
    }
  };

  const getDecisionOptions = () => {
    if (entityType === "dispute") {
      return [
        { value: "resolved_full_refund", label: "Resolve - Full Refund", description: "Issue full refund to customer" },
        { value: "resolved_partial_refund", label: "Resolve - Partial Refund", description: "Issue partial refund" },
        { value: "resolved_no_refund", label: "Resolve - No Refund", description: "Resolve in favor of provider" },
        { value: "escalate", label: "Escalate", description: "Escalate for further investigation" },
        { value: "reject", label: "Reject Dispute", description: "Dispute is invalid or fraudulent" },
      ];
    }
    if (entityType === "fraud_review") {
      return [
        { value: "approved", label: "Approve", description: "Referral is legitimate" },
        { value: "rejected", label: "Reject", description: "Referral is fraudulent" },
        { value: "escalated", label: "Escalate", description: "Needs further investigation" },
      ];
    }
    return [];
  };

  const options = getDecisionOptions();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-5 w-5" />
          Admin Decision
        </CardTitle>
        <CardDescription>
          Make a final decision on this {entityType.replace("_", " ")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <Label>Decision</Label>
          <RadioGroup value={decision} onValueChange={setDecision}>
            {options.map((option) => (
              <div key={option.value} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-muted/50">
                <RadioGroupItem value={option.value} id={option.value} className="mt-1" />
                <div className="flex-1">
                  <Label htmlFor={option.value} className="font-medium cursor-pointer">
                    {option.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{option.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>
        </div>

        {/* Partial refund amount input */}
        {entityType === "dispute" && decision === "resolved_partial_refund" && (
          <div className="space-y-2">
            <Label htmlFor="refundAmount">
              Refund Amount (Max: {disputedAmount ? formatCurrency(disputedAmount) : "N/A"})
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
              <Input
                id="refundAmount"
                type="number"
                step="0.01"
                min="0"
                max={disputedAmount ? disputedAmount / 100 : undefined}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
                className="pl-7"
                placeholder="0.00"
              />
            </div>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="notes">Decision Notes (Required)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Provide reasoning for this decision..."
            rows={3}
          />
          <p className="text-xs text-muted-foreground">
            Notes will be logged for audit purposes.
          </p>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              className="w-full"
              disabled={!decision || !notes.trim() || submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Decision"
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Decision</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to submit this decision? This action will be
                logged and may trigger automated processes (e.g., refunds, notifications).
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">
                  {options.find((o) => o.value === decision)?.label}
                </p>
                <p className="text-sm text-muted-foreground mt-1">{notes}</p>
                {refundAmount && (
                  <p className="text-sm font-medium mt-2">
                    Refund: ${refundAmount}
                  </p>
                )}
              </div>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleSubmit}>
                Confirm Decision
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
