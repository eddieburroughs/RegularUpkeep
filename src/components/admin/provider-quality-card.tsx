"use client";

/**
 * Provider Quality Card Component
 *
 * Displays AI-generated provider quality insights with metrics summary.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  Star,
  Clock,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Loader2,
  TrendingUp,
  TrendingDown,
  ArrowRight,
} from "lucide-react";

type ProviderQualityOutput = {
  qualitySummary: string;
  strengths: string[];
  concerns: string[];
  tierRecommendation: "preferred" | "verified" | "basic" | "probation";
  humanReviewRequired: boolean;
  reviewReason?: string;
};

type ProviderMetrics = {
  rating: number;
  totalJobs: number;
  disputeRate: number;
  cancellationRate: number;
  avgResponseTimeHours: number;
  onTimeRate: number;
};

interface ProviderQualityCardProps {
  providerId: string;
  showGenerateButton?: boolean;
}

function getTierBadge(tier: string) {
  switch (tier) {
    case "preferred":
      return <Badge className="bg-purple-100 text-purple-700 border-purple-300">Preferred</Badge>;
    case "verified":
      return <Badge className="bg-blue-100 text-blue-700 border-blue-300">Verified</Badge>;
    case "basic":
      return <Badge variant="outline">Basic</Badge>;
    case "probation":
      return <Badge variant="destructive">Probation</Badge>;
    default:
      return <Badge variant="outline">{tier}</Badge>;
  }
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function ProviderQualityCard({ providerId, showGenerateButton = true }: ProviderQualityCardProps) {
  const [insights, setInsights] = useState<ProviderQualityOutput | null>(null);
  const [metrics, setMetrics] = useState<ProviderMetrics | null>(null);
  const [currentTier, setCurrentTier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing insights on mount
  useEffect(() => {
    async function fetchExisting() {
      setLoading(true);
      try {
        const res = await fetch(`/api/admin/providers/${providerId}/quality-insights`);
        const data = await res.json();
        if (data.insights) {
          setInsights(data.insights);
          setMetrics(data.metrics);
          setCurrentTier(data.currentTier);
        }
      } catch (err) {
        console.error("Error fetching insights:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchExisting();
  }, [providerId]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/quality-insights`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else if (data.insights) {
        setInsights(data.insights);
        setMetrics(data.metrics);
        setCurrentTier(data.currentTier);
      }
    } catch (err) {
      setError("Failed to generate insights");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-2">Loading insights...</p>
        </CardContent>
      </Card>
    );
  }

  if (!insights && showGenerateButton) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Quality Insights
          </CardTitle>
          <CardDescription>
            Generate AI-powered quality analysis for this provider
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
                Generate Quality Insights
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!insights) {
    return null;
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-600" />
            Quality Insights
          </CardTitle>
          {showGenerateButton && (
            <Button variant="ghost" size="sm" onClick={handleGenerate} disabled={generating}>
              <RefreshCw className={`h-4 w-4 ${generating ? "animate-spin" : ""}`} />
            </Button>
          )}
        </div>
        {currentTier && insights.tierRecommendation && (
          <div className="flex items-center gap-2 mt-2">
            <span className="text-sm text-muted-foreground">Current:</span>
            {getTierBadge(currentTier)}
            {currentTier !== insights.tierRecommendation && (
              <>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Suggested:</span>
                {getTierBadge(insights.tierRecommendation)}
              </>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <p className="text-sm">{insights.qualitySummary}</p>

        {/* Metrics */}
        {metrics && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-500" />
                <span className="text-muted-foreground">Rating:</span>
                <span className="font-medium">{metrics.rating.toFixed(1)}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-muted-foreground">Jobs:</span>
                <span className="font-medium">{metrics.totalJobs}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-blue-500" />
                <span className="text-muted-foreground">On-time:</span>
                <span className="font-medium">{formatPercent(metrics.onTimeRate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-muted-foreground">Disputes:</span>
                <span className="font-medium">{formatPercent(metrics.disputeRate)}</span>
              </div>
            </div>
          </>
        )}

        {/* Strengths */}
        {insights.strengths && insights.strengths.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <TrendingUp className="h-4 w-4 text-green-600" />
              Strengths
            </h4>
            <ul className="space-y-1">
              {insights.strengths.map((strength, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-green-500 mt-1">+</span>
                  {strength}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Concerns */}
        {insights.concerns && insights.concerns.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2 flex items-center gap-1">
              <TrendingDown className="h-4 w-4 text-orange-600" />
              Areas of Concern
            </h4>
            <ul className="space-y-1">
              {insights.concerns.map((concern, idx) => (
                <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-orange-500 mt-1">-</span>
                  {concern}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Human Review Required */}
        {insights.humanReviewRequired && (
          <div className="p-3 bg-yellow-50 rounded-md border border-yellow-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Human Review Required</p>
                {insights.reviewReason && (
                  <p className="text-xs text-yellow-700 mt-1">{insights.reviewReason}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground">
          AI insights are advisory only. Tier changes require human approval.
        </p>
      </CardContent>
    </Card>
  );
}
