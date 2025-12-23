"use client";

/**
 * Fraud Review List Component
 *
 * Displays list of fraud reviews with filtering and action buttons.
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  User,
  Calendar,
} from "lucide-react";
import { FraudSignalCard } from "./fraud-signal-card";

type FraudReview = {
  id: string;
  referral_id: string;
  ai_risk_score: number;
  ai_signals: Array<{ flag: string; reason: string; severity: "high" | "medium" | "low" }>;
  ai_recommendation: string;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  decision_notes: string | null;
  created_at: string;
  sponsor_referrals: {
    id: string;
    referrer_id: string;
    referee_email: string;
    status: string;
    created_at: string;
    profiles: {
      full_name: string;
      email: string;
    } | null;
  } | null;
};

interface FraudReviewListProps {
  status: string;
  riskFilter?: "high" | "medium" | "low";
}

function getRiskColor(score: number): string {
  if (score >= 61) return "text-red-600";
  if (score >= 31) return "text-yellow-600";
  return "text-green-600";
}

function getRiskBadge(score: number) {
  if (score >= 61) {
    return <Badge variant="destructive">High Risk: {score}</Badge>;
  }
  if (score >= 31) {
    return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Medium: {score}</Badge>;
  }
  return <Badge className="bg-green-100 text-green-700 border-green-300">Low: {score}</Badge>;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function FraudReviewList({ status, riskFilter }: FraudReviewListProps) {
  const router = useRouter();
  const [reviews, setReviews] = useState<FraudReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState<FraudReview | null>(null);
  const [showDecisionDialog, setShowDecisionDialog] = useState(false);
  const [pendingDecision, setPendingDecision] = useState<"approved" | "rejected" | "escalated" | null>(null);
  const [decisionNotes, setDecisionNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function fetchReviews() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/fraud-review?status=${status}`);
        const data = await res.json();
        let reviewList = data.reviews || [];

        // Apply risk filter if provided
        if (riskFilter === "high") {
          reviewList = reviewList.filter((r: FraudReview) => r.ai_risk_score >= 61);
        } else if (riskFilter === "medium") {
          reviewList = reviewList.filter((r: FraudReview) => r.ai_risk_score >= 31 && r.ai_risk_score < 61);
        } else if (riskFilter === "low") {
          reviewList = reviewList.filter((r: FraudReview) => r.ai_risk_score < 31);
        }

        setReviews(reviewList);
      } catch (err) {
        console.error("Error fetching reviews:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReviews();
  }, [status, riskFilter]);

  const handleDecision = async () => {
    if (!selectedReview || !pendingDecision) return;

    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/fraud-review", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reviewId: selectedReview.id,
          decision: pendingDecision,
          notes: decisionNotes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // Remove from list or update status
        setReviews((prev) => prev.filter((r) => r.id !== selectedReview.id));
        setShowDecisionDialog(false);
        setSelectedReview(null);
        setPendingDecision(null);
        setDecisionNotes("");
        router.refresh();
      }
    } catch (err) {
      console.error("Error submitting decision:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const openDecisionDialog = (review: FraudReview, decision: "approved" | "rejected" | "escalated") => {
    setSelectedReview(review);
    setPendingDecision(decision);
    setShowDecisionDialog(true);
  };

  if (loading) {
    return (
      <div className="py-8 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
        <p className="text-sm text-muted-foreground mt-2">Loading reviews...</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No reviews in this category.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {reviews.map((review) => (
          <Card key={review.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    {getRiskBadge(review.ai_risk_score)}
                    <span className="text-sm text-muted-foreground">
                      {formatDate(review.created_at)}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Referrer: {review.sponsor_referrals?.profiles?.full_name || "Unknown"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Referee: {review.sponsor_referrals?.referee_email || "Unknown"}
                      </span>
                    </div>
                  </div>

                  {/* Signals Preview */}
                  {review.ai_signals && review.ai_signals.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {review.ai_signals.slice(0, 3).map((signal, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {signal.flag}
                        </Badge>
                      ))}
                      {review.ai_signals.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{review.ai_signals.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  {/* Risk Bar */}
                  <div className="mt-3 max-w-xs">
                    <Progress
                      value={review.ai_risk_score}
                      className={
                        review.ai_risk_score >= 61
                          ? "bg-red-500"
                          : review.ai_risk_score >= 31
                          ? "bg-yellow-500"
                          : "bg-green-500"
                      }
                    />
                  </div>
                </div>

                {/* Actions */}
                {status === "pending" && (
                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedReview(review)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Review
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => openDecisionDialog(review, "approved")}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openDecisionDialog(review, "rejected")}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openDecisionDialog(review, "escalated")}
                    >
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Escalate
                    </Button>
                  </div>
                )}

                {status !== "pending" && (
                  <div className="text-right">
                    <Badge
                      className={
                        review.status === "approved"
                          ? "bg-green-100 text-green-700"
                          : review.status === "rejected"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }
                    >
                      {review.status.charAt(0).toUpperCase() + review.status.slice(1)}
                    </Badge>
                    {review.decision_notes && (
                      <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                        {review.decision_notes}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Dialog */}
      <Dialog open={!!selectedReview && !showDecisionDialog} onOpenChange={() => setSelectedReview(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Fraud Review Details</DialogTitle>
            <DialogDescription>
              Review fraud signals for this referral
            </DialogDescription>
          </DialogHeader>
          {selectedReview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Referrer:</span>
                  <p className="font-medium">
                    {selectedReview.sponsor_referrals?.profiles?.full_name || "Unknown"}
                  </p>
                  <p className="text-muted-foreground">
                    {selectedReview.sponsor_referrals?.profiles?.email || ""}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Referee Email:</span>
                  <p className="font-medium">
                    {selectedReview.sponsor_referrals?.referee_email || "Unknown"}
                  </p>
                </div>
              </div>

              <FraudSignalCard
                riskScore={selectedReview.ai_risk_score}
                signals={selectedReview.ai_signals || []}
                recommendation={selectedReview.ai_recommendation}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedReview(null)}>
              Close
            </Button>
            {selectedReview?.status === "pending" && (
              <>
                <Button
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => openDecisionDialog(selectedReview, "approved")}
                >
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => openDecisionDialog(selectedReview, "rejected")}
                >
                  Reject
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Decision Confirmation Dialog */}
      <Dialog open={showDecisionDialog} onOpenChange={setShowDecisionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Decision</DialogTitle>
            <DialogDescription>
              {pendingDecision === "approved" && "Are you sure you want to approve this referral?"}
              {pendingDecision === "rejected" && "Are you sure you want to reject this referral?"}
              {pendingDecision === "escalated" && "Are you sure you want to escalate this referral?"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Decision Notes (Required)</Label>
              <Textarea
                id="notes"
                value={decisionNotes}
                onChange={(e) => setDecisionNotes(e.target.value)}
                placeholder="Provide reasoning for this decision..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowDecisionDialog(false);
                setPendingDecision(null);
                setDecisionNotes("");
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDecision}
              disabled={!decisionNotes.trim() || submitting}
              className={
                pendingDecision === "approved"
                  ? "bg-green-600 hover:bg-green-700"
                  : pendingDecision === "rejected"
                  ? "bg-red-600 hover:bg-red-700"
                  : ""
              }
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                `Confirm ${pendingDecision?.charAt(0).toUpperCase()}${pendingDecision?.slice(1)}`
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
