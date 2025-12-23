"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import type { InvoiceNarrativeOutput } from "@/lib/ai/types";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  FileText,
  Star,
  AlertTriangle,
} from "lucide-react";

interface AIInvoiceNarrativeProps {
  bookingId: string;
  category: string;
  scopeOfWork: string;
  completedWork: string[];
  materialsUsed?: string[];
  technician?: string;
  onNarrativeGenerated: (narrative: string) => void;
}

export function AIInvoiceNarrative({
  bookingId,
  category,
  scopeOfWork,
  completedWork,
  materialsUsed,
  technician,
  onNarrativeGenerated,
}: AIInvoiceNarrativeProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [narrative, setNarrative] = useState<InvoiceNarrativeOutput | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);
  const [codeCompliantConfirmed, setCodeCompliantConfirmed] = useState(false);

  const generateNarrative = async () => {
    if (completedWork.length === 0) {
      setError("Please add at least one completed work item");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/provider/invoice-narrative", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          category,
          scopeOfWork,
          completedWork,
          materialsUsed,
          technician,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate narrative");
      }

      if (data.narrative) {
        setNarrative(data.narrative);
        setFallbackUsed(data.fallback || false);
      } else {
        setError(data.message || "AI copilot is not available");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate narrative");
    } finally {
      setLoading(false);
    }
  };

  const useNarrative = () => {
    if (narrative) {
      let finalNarrative = narrative.narrative;

      // Add code compliance statement if provider confirmed
      if (codeCompliantConfirmed) {
        finalNarrative += "\n\nAll work performed in accordance with applicable building codes and industry standards.";
      }

      onNarrativeGenerated(finalNarrative);
      setNarrative(null);
      setCodeCompliantConfirmed(false);
    }
  };

  // Initial state - show button
  if (!narrative) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-6">
          <div className="text-center space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-medium">AI Work Summary</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Generate a professional narrative describing the completed work.
              </p>
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button
              onClick={generateNarrative}
              disabled={loading || completedWork.length === 0}
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
                  Generate Work Summary
                </>
              )}
            </Button>
            {completedWork.length === 0 && (
              <p className="text-xs text-muted-foreground">
                Add completed work items first
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show generated narrative
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Work Summary
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
              onClick={generateNarrative}
              disabled={loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <RefreshCw className="h-3 w-3 mr-1" />
                  Regenerate
                </>
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Main Narrative */}
        <div className="bg-muted/50 p-4 rounded-md">
          <p className="text-sm whitespace-pre-wrap">{narrative.narrative}</p>
        </div>

        {/* Highlights */}
        {narrative.highlights.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2">
              <Star className="h-4 w-4 text-amber-500" />
              Key Highlights
            </p>
            <ul className="space-y-1">
              {narrative.highlights.map((highlight, index) => (
                <li
                  key={index}
                  className="text-sm flex items-start gap-2 text-muted-foreground"
                >
                  <span>•</span>
                  {highlight}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Code Compliance Confirmation */}
        <div className="border rounded-md p-3 bg-amber-50/50">
          <div className="flex items-start gap-3">
            <Checkbox
              id="code-compliant"
              checked={codeCompliantConfirmed}
              onCheckedChange={(checked) => setCodeCompliantConfirmed(checked === true)}
            />
            <label
              htmlFor="code-compliant"
              className="text-sm cursor-pointer"
            >
              <span className="font-medium">Add code compliance statement</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                Check this only if you confirm all work was performed in accordance with applicable building codes
              </p>
            </label>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="flex items-start gap-2 p-3 bg-muted/30 rounded-md">
          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <div className="text-xs text-muted-foreground">
            <p className="font-medium">AI-Generated Content</p>
            <p>{narrative.disclaimer}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setNarrative(null);
              setCodeCompliantConfirmed(false);
            }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={useNarrative}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Use Summary
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
