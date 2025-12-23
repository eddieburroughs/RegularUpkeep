"use client";

/**
 * AI Feedback Component
 *
 * Reusable thumbs up/down feedback for AI outputs.
 * Can be used in any AI-powered feature.
 */

import { useState } from "react";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface AIFeedbackProps {
  jobId: string;
  /** Custom feedback endpoint. Defaults to /api/ai/feedback */
  endpoint?: string;
  /** Called when feedback is submitted successfully */
  onFeedbackSubmitted?: (rating: "up" | "down") => void;
  /** Show text labels next to icons */
  showLabels?: boolean;
  /** Size variant */
  size?: "sm" | "default";
  /** Additional CSS classes */
  className?: string;
}

export function AIFeedback({
  jobId,
  endpoint = "/api/ai/feedback",
  onFeedbackSubmitted,
  showLabels = false,
  size = "default",
  className,
}: AIFeedbackProps) {
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleFeedback = async (newRating: "up" | "down") => {
    // If clicking same rating, toggle comment input
    if (rating === newRating) {
      setShowComment(!showComment);
      return;
    }

    setRating(newRating);
    setIsSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          rating: newRating,
          comment: comment || undefined,
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        onFeedbackSubmitted?.(newRating);
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentSubmit = async () => {
    if (!rating || !comment.trim()) return;

    setIsSubmitting(true);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          rating,
          comment: comment.trim(),
        }),
      });

      if (response.ok) {
        setSubmitted(true);
        setShowComment(false);
        onFeedbackSubmitted?.(rating);
      }
    } catch (error) {
      console.error("Failed to submit feedback:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={cn("flex items-center gap-2 text-sm text-muted-foreground", className)}>
        <span>Thanks for your feedback!</span>
        {rating === "up" ? (
          <ThumbsUp className="h-4 w-4 text-green-600" />
        ) : (
          <ThumbsDown className="h-4 w-4 text-red-600" />
        )}
      </div>
    );
  }

  const iconSize = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";
  const buttonSize = size === "sm" ? "h-7 px-2" : "h-8 px-3";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <span className="text-sm text-muted-foreground">Was this helpful?</span>

      <div className="flex items-center gap-1">
        <Button
          variant={rating === "up" ? "default" : "outline"}
          size="sm"
          className={cn(buttonSize, rating === "up" && "bg-green-600 hover:bg-green-700")}
          onClick={() => handleFeedback("up")}
          disabled={isSubmitting}
        >
          {isSubmitting && rating === "up" ? (
            <Loader2 className={cn(iconSize, "animate-spin")} />
          ) : (
            <ThumbsUp className={iconSize} />
          )}
          {showLabels && <span className="ml-1">Yes</span>}
        </Button>

        <Popover open={showComment} onOpenChange={setShowComment}>
          <PopoverTrigger asChild>
            <Button
              variant={rating === "down" ? "default" : "outline"}
              size="sm"
              className={cn(buttonSize, rating === "down" && "bg-red-600 hover:bg-red-700")}
              onClick={() => handleFeedback("down")}
              disabled={isSubmitting}
            >
              {isSubmitting && rating === "down" ? (
                <Loader2 className={cn(iconSize, "animate-spin")} />
              ) : (
                <ThumbsDown className={iconSize} />
              )}
              {showLabels && <span className="ml-1">No</span>}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-80" align="end">
            <div className="space-y-3">
              <p className="text-sm font-medium">What could be improved?</p>
              <Textarea
                placeholder="Optional: Tell us what went wrong..."
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
              />
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComment(false)}
                >
                  Skip
                </Button>
                <Button
                  size="sm"
                  onClick={handleCommentSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Submit"
                  )}
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

// Compact inline version for tight spaces
export function AIFeedbackInline({
  jobId,
  endpoint,
  onFeedbackSubmitted,
}: Pick<AIFeedbackProps, "jobId" | "endpoint" | "onFeedbackSubmitted">) {
  return (
    <AIFeedback
      jobId={jobId}
      endpoint={endpoint}
      onFeedbackSubmitted={onFeedbackSubmitted}
      size="sm"
      showLabels={false}
    />
  );
}
