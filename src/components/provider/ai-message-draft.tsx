"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ProviderMessageOutput } from "@/lib/ai/types";
import {
  Sparkles,
  Loader2,
  RefreshCw,
  Check,
  MessageSquare,
} from "lucide-react";

type MessageContext = "introduction" | "update" | "scheduling" | "completion" | "followup";

interface AIMessageDraftProps {
  threadId: string;
  context: MessageContext;
  customerName: string;
  serviceCategory: string;
  keyPoints?: string[];
  onDraftGenerated: (draft: string) => void;
  compact?: boolean;
}

const contextLabels: Record<MessageContext, string> = {
  introduction: "Introduction",
  update: "Status Update",
  scheduling: "Scheduling",
  completion: "Job Complete",
  followup: "Follow-up",
};

const toneColors: Record<string, string> = {
  professional: "bg-blue-100 text-blue-800 border-blue-200",
  friendly: "bg-green-100 text-green-800 border-green-200",
  urgent: "bg-red-100 text-red-800 border-red-200",
};

export function AIMessageDraft({
  threadId,
  context,
  customerName,
  serviceCategory,
  keyPoints = [],
  onDraftGenerated,
  compact = false,
}: AIMessageDraftProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<ProviderMessageOutput | null>(null);
  const [fallbackUsed, setFallbackUsed] = useState(false);

  const generateDraft = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/provider/message-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          threadId,
          context,
          customerName,
          serviceCategory,
          keyPoints,
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

  const useDraft = () => {
    if (draft) {
      onDraftGenerated(draft.message);
      setDraft(null);
    }
  };

  // Compact mode - just a button
  if (compact && !draft) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={generateDraft}
        disabled={loading}
        className="gap-2"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Sparkles className="h-4 w-4" />
        )}
        Draft Reply
      </Button>
    );
  }

  // No draft yet - show button
  if (!draft) {
    return (
      <Card className="border-dashed">
        <CardContent className="pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <MessageSquare className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">AI Message Assistant</p>
                <p className="text-xs text-muted-foreground">
                  {contextLabels[context]} message for {customerName}
                </p>
              </div>
            </div>
            <Button
              onClick={generateDraft}
              disabled={loading}
              size="sm"
              className="gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Drafting...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Draft Reply
                </>
              )}
            </Button>
          </div>
          {error && (
            <p className="text-sm text-destructive mt-2">{error}</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Show draft
  return (
    <Card className="border-l-4 border-l-primary">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">AI Draft</span>
            <Badge variant="outline" className={toneColors[draft.tone]}>
              {draft.tone}
            </Badge>
            {fallbackUsed && (
              <Badge variant="secondary" className="text-xs">
                Template
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={generateDraft}
            disabled={loading}
            className="gap-1"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </>
            )}
          </Button>
        </div>

        {/* Draft Message */}
        <div className="bg-muted/50 p-3 rounded-md">
          <p className="text-sm whitespace-pre-wrap">{draft.message}</p>
        </div>

        {/* Alternatives */}
        {draft.suggestedAlternatives && draft.suggestedAlternatives.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Alternative versions:</p>
            {draft.suggestedAlternatives.map((alt, index) => (
              <button
                key={index}
                onClick={() => onDraftGenerated(alt)}
                className="w-full text-left text-sm p-2 bg-muted/30 rounded border border-transparent hover:border-primary/20 transition-colors"
              >
                {alt}
              </button>
            ))}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDraft(null)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={useDraft}
            className="gap-2"
          >
            <Check className="h-4 w-4" />
            Use Draft
          </Button>
        </div>

        <p className="text-xs text-muted-foreground italic text-center">
          Review and edit before sending. Never includes pricing.
        </p>
      </CardContent>
    </Card>
  );
}
