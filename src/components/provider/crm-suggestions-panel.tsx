"use client";

/**
 * CRM Suggestions Panel
 *
 * Displays AI-generated next best actions for customer engagement.
 * Used in provider CRM pipeline views.
 */

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Lightbulb,
  Loader2,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Calendar,
  Gift,
  Star,
  Phone,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { AIFeedback } from "@/components/ai/ai-feedback";
import type { CrmNextActionOutput, CrmActionType } from "@/lib/ai/types";

interface CrmSuggestionsPanelProps {
  customerId: string;
  customerName: string;
  bookingId?: string;
  /** Called when user creates a follow-up task from suggestion */
  onCreateTask?: (action: CrmNextActionOutput["nextActions"][0]) => void;
  /** Called when user wants to send a suggested message */
  onSendMessage?: (message: string) => void;
}

const actionTypeIcons: Record<CrmActionType, React.ReactNode> = {
  follow_up_call: <Phone className="h-4 w-4" />,
  send_message: <MessageSquare className="h-4 w-4" />,
  schedule_service: <Calendar className="h-4 w-4" />,
  offer_discount: <Gift className="h-4 w-4" />,
  request_review: <Star className="h-4 w-4" />,
  send_maintenance_reminder: <Calendar className="h-4 w-4" />,
  upsell_service: <TrendingUp className="h-4 w-4" />,
  win_back: <RefreshCw className="h-4 w-4" />,
  thank_you: <MessageSquare className="h-4 w-4" />,
};

const actionTypeLabels: Record<CrmActionType, string> = {
  follow_up_call: "Follow-up Call",
  send_message: "Send Message",
  schedule_service: "Schedule Service",
  offer_discount: "Offer Discount",
  request_review: "Request Review",
  send_maintenance_reminder: "Maintenance Reminder",
  upsell_service: "Upsell Opportunity",
  win_back: "Win Back",
  thank_you: "Thank You",
};

export function CrmSuggestionsPanel({
  customerId,
  customerName,
  bookingId,
  onCreateTask,
  onSendMessage,
}: CrmSuggestionsPanelProps) {
  const [suggestions, setSuggestions] = useState<CrmNextActionOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const fetchSuggestions = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/provider/crm/next-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, bookingId }),
      });

      if (!response.ok) {
        throw new Error("Failed to get suggestions");
      }

      const data = await response.json();
      setSuggestions(data.suggestions);
      setJobId(data.jobId || null);
    } catch (err) {
      setError("Unable to load suggestions. Please try again.");
      console.error("CRM suggestions error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, bookingId]);

  const handleCopyMessage = (message: string, index: number) => {
    navigator.clipboard.writeText(message);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getPriorityColor = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-700 border-red-300";
      case "medium":
        return "bg-yellow-100 text-yellow-700 border-yellow-300";
      case "low":
        return "bg-green-100 text-green-700 border-green-300";
    }
  };

  const getSeverityColor = (severity: "high" | "medium" | "low") => {
    switch (severity) {
      case "high":
        return "text-red-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-gray-600";
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 40) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-yellow-500" />
            <CardTitle className="text-lg">AI Suggestions</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchSuggestions}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : suggestions ? (
              <RefreshCw className="h-4 w-4" />
            ) : (
              "Generate"
            )}
          </Button>
        </div>
        <CardDescription>
          AI-powered recommendations for {customerName}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!suggestions && !isLoading && !error && (
          <p className="text-sm text-muted-foreground text-center py-4">
            Click &quot;Generate&quot; to get AI-powered suggestions for engaging with this customer.
          </p>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {suggestions && !isLoading && (
          <>
            {/* Health Score */}
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <span className="text-sm font-medium">Customer Health Score</span>
              <span className={`text-2xl font-bold ${getHealthScoreColor(suggestions.customerHealthScore)}`}>
                {suggestions.customerHealthScore}/100
              </span>
            </div>

            {/* Risks */}
            {suggestions.risks.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  Risks to Watch
                </h4>
                {suggestions.risks.map((risk, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 bg-yellow-50 rounded-lg text-sm"
                  >
                    <span className={`font-medium ${getSeverityColor(risk.severity)}`}>
                      [{risk.severity.toUpperCase()}]
                    </span>
                    <span>{risk.description}</span>
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Next Actions */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Recommended Actions</h4>
              {suggestions.nextActions.map((action, index) => (
                <div
                  key={index}
                  className="p-3 border rounded-lg space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {actionTypeIcons[action.actionType]}
                      <span className="font-medium text-sm">
                        {actionTypeLabels[action.actionType]}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={getPriorityColor(action.priority)}
                      >
                        {action.priority}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Due in {action.dueInDays} days
                      </span>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{action.reason}</p>

                  {action.suggestedMessage && (
                    <div className="bg-muted p-2 rounded text-sm">
                      <p className="italic">&quot;{action.suggestedMessage}&quot;</p>
                      <div className="flex gap-2 mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopyMessage(action.suggestedMessage, index)}
                        >
                          {copiedIndex === index ? (
                            <>
                              <Check className="h-3 w-3 mr-1" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3 mr-1" />
                              Copy
                            </>
                          )}
                        </Button>
                        {onSendMessage && (
                          <Button
                            size="sm"
                            onClick={() => onSendMessage(action.suggestedMessage)}
                          >
                            <MessageSquare className="h-3 w-3 mr-1" />
                            Send
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {onCreateTask && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => onCreateTask(action)}
                    >
                      Create Follow-up Task
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {/* Upsell Opportunities */}
            {suggestions.upsellOpportunities.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    Upsell Opportunities
                  </h4>
                  {suggestions.upsellOpportunities.map((opp, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2 bg-green-50 rounded-lg text-sm"
                    >
                      <div>
                        <span className="font-medium">{opp.service}</span>
                        <p className="text-muted-foreground">{opp.reason}</p>
                      </div>
                      <span className="text-green-600 font-medium">
                        {opp.estimatedValue}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Feedback */}
            {jobId && (
              <>
                <Separator />
                <AIFeedback
                  jobId={jobId}
                  endpoint="/api/provider/crm/next-action"
                />
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
