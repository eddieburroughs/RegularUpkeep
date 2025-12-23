"use client";

/**
 * Diagnostic Fee Payment Component
 *
 * Allows customers to pay the diagnostic/trip fee for a service request.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CreditCard, CheckCircle2, Info } from "lucide-react";
import { useRouter } from "next/navigation";

interface DiagnosticFeePaymentProps {
  serviceRequestId: string;
  category: string;
  feeCents: number;
  isPaid: boolean;
}

export function DiagnosticFeePayment({
  serviceRequestId,
  category,
  feeCents,
  isPaid,
}: DiagnosticFeePaymentProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handlePayFee = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/service-requests/${serviceRequestId}/diagnostic-fee`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to process payment");
      }

      const { clientSecret } = await response.json();

      // In a real implementation, you would use Stripe Elements here
      // to collect the payment details and confirm the payment intent.
      // For now, we'll redirect to a payment page.
      window.location.href = `/app/requests/${serviceRequestId}/pay-diagnostic?secret=${clientSecret}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setLoading(false);
    }
  };

  if (isPaid) {
    return (
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">Diagnostic fee paid</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Diagnostic Fee Required</CardTitle>
        <CardDescription>
          A diagnostic fee is required before a provider can visit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground capitalize">
              {category.replace("_", " ")} diagnostic
            </p>
            <p className="text-2xl font-bold">${(feeCents / 100).toFixed(2)}</p>
          </div>
          <CreditCard className="h-8 w-8 text-muted-foreground" />
        </div>

        <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <p className="text-sm text-blue-800">
            This fee covers the provider&apos;s trip to diagnose the issue. If you
            proceed with the repair, this fee may be applied to your final
            invoice.
          </p>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        <Button onClick={handlePayFee} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay Diagnostic Fee
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
