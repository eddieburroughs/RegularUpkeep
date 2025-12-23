"use client";

import { useState, useEffect, useCallback } from "react";
import { AIClassificationCard } from "./ai-classification-card";
import { AIFollowUpQuestions } from "./ai-follow-up-questions";
import { SafetyWarningCard } from "./safety-warning-card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Sparkles } from "lucide-react";
import type {
  IntakeClassifyOutput,
  IntakeFollowupOutput,
  ProviderBriefOutput,
} from "@/lib/ai/types";

export interface AIIntakeResult {
  classification: IntakeClassifyOutput;
  answers: Record<string, string>;
  providerBrief: ProviderBriefOutput;
}

interface UploadedMedia {
  url: string;
  type: "image" | "video";
  name?: string;
}

interface AIIntakeFlowProps {
  serviceRequestId: string;
  category: string;
  media: UploadedMedia[];
  description: string;
  isEmergency: boolean;
  onComplete: (data: AIIntakeResult) => void;
  onFallback: () => void;
}

type AIStep =
  | "idle"
  | "classifying"
  | "classification_done"
  | "safety_warning"
  | "questions"
  | "generating_brief"
  | "complete"
  | "fallback";

export function AIIntakeFlow({
  serviceRequestId,
  category,
  media,
  description,
  isEmergency,
  onComplete,
  onFallback,
}: AIIntakeFlowProps) {
  const [step, setStep] = useState<AIStep>("idle");
  const [classification, setClassification] = useState<IntakeClassifyOutput | null>(null);
  const [questions, setQuestions] = useState<IntakeFollowupOutput["questions"]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [providerBrief, setProviderBrief] = useState<ProviderBriefOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Run classification when media is ready
  const runClassification = useCallback(async () => {
    if (step !== "idle" || media.length === 0) return;

    setStep("classifying");
    setError(null);

    try {
      const response = await fetch(`/api/service-requests/${serviceRequestId}/ai-intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          imageUrls: media.filter((m) => m.type === "image").map((m) => m.url),
          userDescription: description,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to analyze your request");
      }

      const data = await response.json();

      if (data.fallback) {
        // AI was unavailable, use fallback
        setStep("fallback");
        onFallback();
        return;
      }

      setClassification(data.classification);

      // Check for safety flags
      if (data.classification.safetyFlags && data.classification.safetyFlags.length > 0) {
        setStep("safety_warning");
      } else {
        setStep("classification_done");
        // Automatically fetch questions
        await fetchQuestions(data.classification);
      }
    } catch (err) {
      console.error("Classification error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
      setStep("fallback");
      onFallback();
    }
  }, [step, media, serviceRequestId, category, description, onFallback]);

  // Fetch follow-up questions
  const fetchQuestions = async (classificationResult: IntakeClassifyOutput) => {
    setStep("questions");

    try {
      const response = await fetch(`/api/service-requests/${serviceRequestId}/ai-followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: classificationResult.suggestedCategory,
          summary: classificationResult.summary,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate questions");
      }

      const data = await response.json();
      setQuestions(data.questions || []);
    } catch (err) {
      console.error("Questions error:", err);
      // Continue without questions
      setQuestions([]);
    }
  };

  // Handle safety acknowledgment
  const handleSafetyAcknowledge = async () => {
    if (classification) {
      setStep("classification_done");
      await fetchQuestions(classification);
    }
  };

  // Handle question submission
  const handleQuestionsSubmit = async (submittedAnswers: Record<string, string>) => {
    setAnswers(submittedAnswers);
    setStep("generating_brief");

    try {
      // Save answers
      await fetch(`/api/service-requests/${serviceRequestId}/ai-followup`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: submittedAnswers }),
      });

      // Generate provider brief
      const response = await fetch(`/api/service-requests/${serviceRequestId}/provider-brief`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: classification?.suggestedCategory || category,
          summary: classification?.summary || description,
          userDescription: description,
          imageUrls: media.filter((m) => m.type === "image").map((m) => m.url),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate provider brief");
      }

      const data = await response.json();
      setProviderBrief(data.brief);
      setStep("complete");

      // Notify parent
      if (classification) {
        onComplete({
          classification,
          answers: submittedAnswers,
          providerBrief: data.brief,
        });
      }
    } catch (err) {
      console.error("Brief generation error:", err);
      // Complete without brief
      if (classification) {
        setStep("complete");
        onComplete({
          classification,
          answers: submittedAnswers,
          providerBrief: {
            briefSummary: classification.summary,
            keyObservations: classification.keyObservations,
            potentialCauses: [],
            recommendedQuestions: [],
            urgencyAssessment: classification.urgencyLevel === "emergency" ? "emergency" : "medium",
            estimatedComplexity: "moderate",
            safetyNotes: [],
          },
        });
      }
    }
  };

  // Auto-start classification when mounted
  useEffect(() => {
    if (step === "idle" && media.length > 0) {
      runClassification();
    }
  }, [step, media.length, runClassification]);

  // Render based on step
  if (step === "idle") {
    return null;
  }

  if (step === "classifying") {
    return (
      <div className="flex flex-col items-center justify-center py-8 space-y-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <Sparkles className="h-5 w-5 absolute -top-1 -right-1 text-yellow-500" />
        </div>
        <div className="text-center">
          <p className="font-medium">Analyzing your photos...</p>
          <p className="text-sm text-muted-foreground">
            Our AI is reviewing your images to understand the issue
          </p>
        </div>
      </div>
    );
  }

  if (step === "fallback") {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Our AI assistant is temporarily unavailable. Your request has been received
          and will be reviewed by our team.
        </AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Classification Result */}
      {classification && (step === "classification_done" || step === "questions" || step === "generating_brief" || step === "complete") && (
        <AIClassificationCard classification={classification} />
      )}

      {/* Safety Warning */}
      {step === "safety_warning" && classification?.safetyFlags && (
        <SafetyWarningCard
          flags={classification.safetyFlags}
          onAcknowledge={handleSafetyAcknowledge}
        />
      )}

      {/* Follow-up Questions */}
      {step === "questions" && questions.length > 0 && (
        <AIFollowUpQuestions
          questions={questions}
          initialAnswers={answers}
          onSubmit={handleQuestionsSubmit}
          isSubmitting={false}
        />
      )}

      {/* Skip questions if none */}
      {step === "questions" && questions.length === 0 && (
        <div className="text-center py-4">
          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Preparing your request...</p>
        </div>
      )}

      {/* Generating Brief */}
      {step === "generating_brief" && (
        <div className="flex flex-col items-center justify-center py-6 space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">
            Generating a detailed brief for providers...
          </p>
        </div>
      )}

      {/* Complete */}
      {step === "complete" && (
        <Alert className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <Sparkles className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 dark:text-green-300">
            AI analysis complete! You can now schedule your service.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
