"use client";

/**
 * AI-Assisted Description Component
 *
 * Uses AI to help users describe their service request
 * with guided questions and image analysis.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
} from "lucide-react";

interface AIAssistedDescriptionProps {
  category: string;
  mediaUrls: string[];
  initialDescription?: string;
  onDescriptionChange: (description: string) => void;
  onSuggestionsGenerated?: (suggestions: string[]) => void;
}

// Category-specific guided questions
const categoryQuestions: Record<string, string[]> = {
  hvac: [
    "Is your heating or cooling not working?",
    "Do you hear unusual noises from the system?",
    "Is there uneven temperature in different rooms?",
    "When did you last change your air filter?",
  ],
  plumbing: [
    "Is there a leak or drip?",
    "Is a drain clogged or slow?",
    "Is there low water pressure?",
    "Do you notice any unusual smells?",
  ],
  electrical: [
    "Are outlets or switches not working?",
    "Do you see flickering lights?",
    "Did a circuit breaker trip?",
    "Do you smell burning or see sparks?",
  ],
  appliances: [
    "Which appliance is having issues?",
    "Is it making unusual noises?",
    "Is it not turning on at all?",
    "Is it partially working?",
  ],
  exterior: [
    "Is there visible damage?",
    "Is it affecting your roof or siding?",
    "Was there recent storm damage?",
    "Is it urgent or can it wait?",
  ],
  interior: [
    "What type of repair is needed?",
    "Is there damage to walls or floors?",
    "Is it cosmetic or structural?",
    "How large is the affected area?",
  ],
  landscaping: [
    "What type of landscaping service?",
    "Is it maintenance or new work?",
    "How large is the area?",
    "Are there any specific plants involved?",
  ],
  pest_control: [
    "What type of pest are you seeing?",
    "Where are you seeing them?",
    "How long has this been happening?",
    "Have you tried any treatments?",
  ],
  other: [
    "What type of issue are you experiencing?",
    "Where in the home is it located?",
    "How urgent is the repair?",
    "Any additional details?",
  ],
};

export function AIAssistedDescription({
  category,
  mediaUrls,
  initialDescription = "",
  onDescriptionChange,
  onSuggestionsGenerated,
}: AIAssistedDescriptionProps) {
  const [description, setDescription] = useState(initialDescription);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [answeredQuestions, setAnsweredQuestions] = useState<Set<number>>(new Set());

  const questions = categoryQuestions[category] || categoryQuestions.other;

  // Analyze images with AI when media is uploaded
  useEffect(() => {
    if (mediaUrls.length > 0 && !aiSummary) {
      analyzeMedia();
    }
  }, [mediaUrls]);

  const analyzeMedia = async () => {
    if (mediaUrls.length === 0) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const response = await fetch("/api/ai/analyze-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrls: mediaUrls.filter((url) => !url.includes("video")),
          category,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze images");
      }

      const data = await response.json();
      setAiSummary(data.summary);
      setSuggestions(data.suggestions || []);

      if (onSuggestionsGenerated) {
        onSuggestionsGenerated(data.suggestions || []);
      }

      // If no description yet, pre-fill with AI summary
      if (!description && data.summary) {
        setDescription(data.summary);
        onDescriptionChange(data.summary);
      }
    } catch (err) {
      setError("Couldn't analyze images. Please describe the issue manually.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleQuestionClick = (question: string, index: number) => {
    // Add question context to description
    const addition = `\n\n${question}\n`;
    const newDescription = description + addition;
    setDescription(newDescription);
    onDescriptionChange(newDescription);
    setAnsweredQuestions(new Set([...answeredQuestions, index]));
  };

  const handleDescriptionChange = (value: string) => {
    setDescription(value);
    onDescriptionChange(value);
  };

  const handleRefreshAnalysis = () => {
    setAiSummary(null);
    analyzeMedia();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Describe the Issue
        </CardTitle>
        <CardDescription>
          Tell us what&apos;s happening so we can match you with the right provider
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Analysis Status */}
        {isAnalyzing && (
          <div className="flex items-center gap-2 p-3 bg-primary/5 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-sm text-primary">Analyzing your photos...</span>
          </div>
        )}

        {/* AI Summary */}
        {aiSummary && !isAnalyzing && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-primary">AI Analysis</p>
                  <p className="text-sm text-muted-foreground mt-1">{aiSummary}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRefreshAnalysis}
                className="shrink-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}

        {/* AI Suggestions */}
        {suggestions.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Suggested details to include:</p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((suggestion, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="cursor-pointer hover:bg-primary/10"
                  onClick={() => {
                    const newDesc = description + (description ? "\n" : "") + suggestion;
                    handleDescriptionChange(newDesc);
                  }}
                >
                  + {suggestion}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Description Textarea */}
        <Textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Describe what's happening in as much detail as possible..."
          rows={5}
          className="resize-none"
        />

        {/* Guided Questions */}
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">Helpful prompts:</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {questions.map((question, index) => (
              <Button
                key={index}
                type="button"
                variant={answeredQuestions.has(index) ? "secondary" : "outline"}
                size="sm"
                className="justify-start h-auto py-2 px-3 text-left"
                onClick={() => handleQuestionClick(question, index)}
              >
                {answeredQuestions.has(index) ? (
                  <CheckCircle2 className="h-3 w-3 mr-2 shrink-0 text-green-600" />
                ) : (
                  <HelpCircle className="h-3 w-3 mr-2 shrink-0" />
                )}
                <span className="text-xs">{question}</span>
              </Button>
            ))}
          </div>
        </div>

        {/* Error */}
        {error && (
          <Alert>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Character Count */}
        <p className="text-xs text-muted-foreground text-right">
          {description.length} characters
        </p>
      </CardContent>
    </Card>
  );
}
