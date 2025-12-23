"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ProviderEstimateOutput, ProviderBriefOutput } from "@/lib/ai/types";
import {
  Sparkles,
  Loader2,
  Plus,
  FileText,
  HelpCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
} from "lucide-react";

interface LineItemSuggestion {
  description: string;
  type: "labor" | "material";
  note?: string;
}

interface AIEstimateDraftProps {
  serviceRequestId: string;
  providerBrief: ProviderBriefOutput | null;
  category: string;
  providerNotes?: string;
  onInsertScope: (scope: string) => void;
  onInsertLineItems: (items: LineItemSuggestion[]) => void;
  onInsertExclusions?: (exclusions: string[]) => void;
  onInsertAssumptions?: (assumptions: string[]) => void;
}

export function AIEstimateDraft({
  serviceRequestId,
  providerBrief,
  category,
  providerNotes,
  onInsertScope,
  onInsertLineItems,
  onInsertExclusions,
  onInsertAssumptions,
}: AIEstimateDraftProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProviderEstimateOutput | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);

  const generateDraft = async () => {
    if (!providerBrief) {
      setError("Provider brief is required to generate estimate draft");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/provider/estimate-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceRequestId,
          category,
          providerBrief: providerBrief.briefSummary,
          providerNotes,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate draft");
      }

      if (data.draft) {
        setDraft(data.draft);
        setFallbackUsed(data.fallback || false);
      } else {
        setError(data.message || "AI copilot is not available");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate draft");
    } finally {
      setLoading(false);
    }
  };

  if (!draft) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">AI Estimate Assistant</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Generate a draft estimate with scope, line items, and questions to ask.
              </p>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              onClick={generateDraft}
              disabled={loading || !providerBrief}
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Generate AI Draft
                </>
              )}
            </Button>
            {!providerBrief && (
              <p className="text-xs text-muted-foreground">
                Provider brief is required before generating estimate draft
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Estimate Draft
          </CardTitle>
          <div className="flex items-center gap-2">
            {fallbackUsed && (
              <Badge variant="secondary" className="text-xs">
                Template Used
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={generateDraft}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Regenerate"
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scope of Work */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              Scope of Work
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onInsertScope(draft.scopeOfWork)}
              className="gap-1"
            >
              <Plus className="h-3 w-3" />
              Insert
            </Button>
          </div>
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
            {draft.scopeOfWork}
          </p>
        </div>

        {/* Line Item Suggestions */}
        {draft.lineItemSuggestions.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">Line Item Suggestions</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInsertLineItems(draft.lineItemSuggestions)}
                className="gap-1"
              >
                <Plus className="h-3 w-3" />
                Insert All
              </Button>
            </div>
            <div className="space-y-2">
              {draft.lineItemSuggestions.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-3 p-2 bg-muted/30 rounded-md"
                >
                  <Badge
                    variant="outline"
                    className={
                      item.type === "labor"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-amber-50 text-amber-700 border-amber-200"
                    }
                  >
                    {item.type}
                  </Badge>
                  <div className="flex-1">
                    <p className="text-sm">{item.description}</p>
                    {item.note && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {item.note}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground italic">
              Add your prices to each item before sending the estimate
            </p>
          </div>
        )}

        {/* Exclusions & Assumptions */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Exclusions */}
          {draft.exclusions && draft.exclusions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Exclusions
                </p>
                {onInsertExclusions && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onInsertExclusions(draft.exclusions || [])}
                    className="gap-1 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                )}
              </div>
              <ul className="text-sm space-y-1">
                {draft.exclusions.map((exclusion, index) => (
                  <li key={index} className="flex items-start gap-2 text-muted-foreground">
                    <span>•</span>
                    {exclusion}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Assumptions */}
          {draft.assumptions && draft.assumptions.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  Assumptions
                </p>
                {onInsertAssumptions && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onInsertAssumptions(draft.assumptions || [])}
                    className="gap-1 text-xs"
                  >
                    <Plus className="h-3 w-3" />
                    Add
                  </Button>
                )}
              </div>
              <ul className="text-sm space-y-1">
                {draft.assumptions.map((assumption, index) => (
                  <li key={index} className="flex items-start gap-2 text-muted-foreground">
                    <span>•</span>
                    {assumption}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Duration & Site Visit */}
        <div className="flex flex-wrap gap-4">
          {draft.estimatedDurationRange && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Duration:</span>
              <span>{draft.estimatedDurationRange}</span>
            </div>
          )}
          {draft.requiresSiteVisit && (
            <Badge variant="outline" className="gap-1">
              <MapPin className="h-3 w-3" />
              Site visit recommended
            </Badge>
          )}
          {draft.remoteEstimateOk && (
            <Badge variant="outline" className="gap-1 bg-green-50 text-green-700 border-green-200">
              <CheckCircle2 className="h-3 w-3" />
              Remote estimate OK
            </Badge>
          )}
        </div>

        {/* Clarifying Questions */}
        {draft.clarifyingQuestions.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium flex items-center gap-2">
              <HelpCircle className="h-4 w-4 text-primary" />
              Questions to Ask Customer
            </p>
            <ul className="space-y-2">
              {draft.clarifyingQuestions.map((question, index) => (
                <li
                  key={index}
                  className="text-sm flex items-start gap-2 p-2 bg-primary/5 rounded-md"
                >
                  <span className="text-primary font-medium">{index + 1}.</span>
                  {question}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Missing Info Requests */}
        {draft.missingInfoRequests && draft.missingInfoRequests.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-4 w-4" />
              Additional Info Would Help
            </p>
            <ul className="space-y-1">
              {draft.missingInfoRequests.map((info, index) => (
                <li
                  key={index}
                  className="text-sm flex items-start gap-2 text-muted-foreground"
                >
                  <span>•</span>
                  {info}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warranty Considerations */}
        {draft.warrantyConsiderations.length > 0 && (
          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Warranty Considerations</p>
            <ul className="space-y-1">
              {draft.warrantyConsiderations.map((warranty, index) => (
                <li
                  key={index}
                  className="text-sm flex items-start gap-2 text-muted-foreground"
                >
                  <span>•</span>
                  {warranty}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
