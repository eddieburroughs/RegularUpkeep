"use client";

/**
 * AI Dispute Summary Component
 *
 * Displays AI-generated dispute analysis with timeline, root cause,
 * policy violations, and refund recommendation.
 * All recommendations are non-binding - human decision required.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertTriangle,
  Brain,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  Loader2,
  Info,
} from "lucide-react";

type DisputeTimelineOutput = {
  summary: string;
  timeline: Array<{ date: string; event: string; relevance: "key" | "supporting" | "context" }>;
  keyIssues: string[];
  recommendedActions: string[];
  timelineBullets: string[];
  likelyRootCauseCategory: "scope" | "quality" | "billing" | "miscommunication" | "unknown";
  policyViolationsDetected: Array<{
    violation: string;
    evidence: string;
    severity: "minor" | "major" | "critical";
  }>;
  refundRecommendation: {
    type: "none" | "partial" | "full";
    rationale: string;
    suggestedAmount?: number;
  };
  confidence: "high" | "medium" | "low";
};

interface AIDisputeSummaryProps {
  disputeId: string;
}

function getRootCauseBadge(category: string) {
  const colors: Record<string, string> = {
    scope: "bg-purple-100 text-purple-700 border-purple-300",
    quality: "bg-orange-100 text-orange-700 border-orange-300",
    billing: "bg-blue-100 text-blue-700 border-blue-300",
    miscommunication: "bg-yellow-100 text-yellow-700 border-yellow-300",
    unknown: "bg-gray-100 text-gray-700 border-gray-300",
  };
  return colors[category] || colors.unknown;
}

function getConfidenceBadge(confidence: string) {
  switch (confidence) {
    case "high":
      return <Badge className="bg-green-100 text-green-700 border-green-300">High Confidence</Badge>;
    case "medium":
      return <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">Medium Confidence</Badge>;
    case "low":
      return <Badge className="bg-red-100 text-red-700 border-red-300">Low Confidence</Badge>;
    default:
      return null;
  }
}

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return <Badge variant="destructive">Critical</Badge>;
    case "major":
      return <Badge className="bg-orange-100 text-orange-700 border-orange-300">Major</Badge>;
    case "minor":
      return <Badge variant="outline">Minor</Badge>;
    default:
      return <Badge variant="outline">{severity}</Badge>;
  }
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

export function AIDisputeSummary({ disputeId }: AIDisputeSummaryProps) {
  const [summary, setSummary] = useState<DisputeTimelineOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing summary on mount
  useEffect(() => {
    async function fetchExisting() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/disputes/${disputeId}/ai-summary`);
        const data = await res.json();
        if (data.summary) {
          setSummary(data.summary);
        }
      } catch (err) {
        console.error("Error fetching summary:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchExisting();
  }, [disputeId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/disputes/${disputeId}/ai-summary`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.summary) {
        setSummary(data.summary);
      } else {
        setError("Failed to generate summary");
      }
    } catch (err) {
      setError("Failed to generate AI summary");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading AI summary...</p>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            AI Analysis
          </CardTitle>
          <CardDescription>
            Generate an AI-powered analysis of this dispute
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          <Button onClick={handleGenerate} disabled={generating} className="w-full">
            {generating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Brain className="h-4 w-4 mr-2" />
                Generate AI Summary
              </>
            )}
          </Button>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            AI analysis is advisory only. Human decision required.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            AI Analysis
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={generating}>
            <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {getConfidenceBadge(summary.confidence)}
          <Badge className={getRootCauseBadge(summary.likelyRootCauseCategory)}>
            {summary.likelyRootCauseCategory.charAt(0).toUpperCase() +
             summary.likelyRootCauseCategory.slice(1)} Issue
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div>
          <p className="text-sm">{summary.summary}</p>
        </div>

        <Separator />

        {/* Timeline Bullets */}
        {summary.timelineBullets && summary.timelineBullets.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Key Timeline Events
            </h4>
            <ul className="space-y-1">
              {summary.timelineBullets.map((bullet, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-blue-500 mt-1">•</span>
                  {bullet}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Key Issues */}
        {summary.keyIssues && summary.keyIssues.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              Key Issues Identified
            </h4>
            <ul className="space-y-1">
              {summary.keyIssues.map((issue, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-yellow-500 mt-1">!</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Policy Violations */}
        {summary.policyViolationsDetected && summary.policyViolationsDetected.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-600" />
              Potential Policy Violations
            </h4>
            <div className="space-y-2">
              {summary.policyViolationsDetected.map((violation, idx) => (
                <div key={idx} className="p-2 bg-red-50 rounded-md border border-red-200">
                  <div className="flex items-center gap-2 mb-1">
                    {getSeverityBadge(violation.severity)}
                    <span className="text-sm font-medium">{violation.violation}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{violation.evidence}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Refund Recommendation */}
        <div>
          <h4 className="text-sm font-medium mb-2">Refund Recommendation</h4>
          <div className="p-3 bg-muted rounded-md">
            <div className="flex items-center gap-2 mb-2">
              {summary.refundRecommendation.type === "none" && (
                <Badge variant="outline">No Refund</Badge>
              )}
              {summary.refundRecommendation.type === "partial" && (
                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-300">
                  Partial Refund
                  {summary.refundRecommendation.suggestedAmount &&
                    ` - ${formatCurrency(summary.refundRecommendation.suggestedAmount)}`}
                </Badge>
              )}
              {summary.refundRecommendation.type === "full" && (
                <Badge className="bg-green-100 text-green-700 border-green-300">Full Refund</Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {summary.refundRecommendation.rationale}
            </p>
          </div>
        </div>

        {/* Recommended Actions */}
        {summary.recommendedActions && summary.recommendedActions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Recommended Actions
            </h4>
            <ul className="space-y-1">
              {summary.recommendedActions.map((action, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-500 mt-1">→</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 bg-blue-50 rounded-md border border-blue-200">
          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
          <p className="text-xs text-blue-700">
            This AI analysis is advisory only. All recommendations are non-binding.
            Human judgment is required for final dispute resolution decisions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
