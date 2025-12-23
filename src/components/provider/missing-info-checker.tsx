"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Camera,
  FileText,
  MapPin,
  Clock,
} from "lucide-react";

interface HardCheck {
  id: string;
  label: string;
  passed: boolean;
  icon: React.ReactNode;
}

interface MissingInfoCheckerProps {
  /** Number of photos uploaded */
  photoCount: number;
  /** Minimum photos required */
  minPhotos?: number;
  /** User description length */
  descriptionLength: number;
  /** Minimum description length */
  minDescriptionLength?: number;
  /** Whether a category is selected */
  hasCategory: boolean;
  /** Whether a property is selected */
  hasProperty: boolean;
  /** Whether a preferred date is set */
  hasPreferredDate?: boolean;
  /** AI-suggested missing info (from estimate draft) */
  aiSuggestions?: string[];
  /** Whether to show blocking message */
  showBlockMessage?: boolean;
  /** Callback when all checks pass */
  onAllChecksPassed?: () => void;
}

export function MissingInfoChecker({
  photoCount,
  minPhotos = 1,
  descriptionLength,
  minDescriptionLength = 20,
  hasCategory,
  hasProperty,
  hasPreferredDate = true,
  aiSuggestions = [],
  showBlockMessage = true,
}: MissingInfoCheckerProps) {
  const hardChecks: HardCheck[] = useMemo(() => [
    {
      id: "photos",
      label: `At least ${minPhotos} photo${minPhotos > 1 ? "s" : ""} uploaded`,
      passed: photoCount >= minPhotos,
      icon: <Camera className="h-4 w-4" />,
    },
    {
      id: "description",
      label: "Description provided",
      passed: descriptionLength >= minDescriptionLength,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "category",
      label: "Service category selected",
      passed: hasCategory,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      id: "property",
      label: "Property selected",
      passed: hasProperty,
      icon: <MapPin className="h-4 w-4" />,
    },
    {
      id: "preferred_date",
      label: "Preferred date set",
      passed: hasPreferredDate,
      icon: <Clock className="h-4 w-4" />,
    },
  ], [photoCount, minPhotos, descriptionLength, minDescriptionLength, hasCategory, hasProperty, hasPreferredDate]);

  const failedChecks = hardChecks.filter(check => !check.passed);
  const allChecksPassed = failedChecks.length === 0;
  const hasAISuggestions = aiSuggestions.length > 0;

  // If all checks pass and no suggestions, show success state
  if (allChecksPassed && !hasAISuggestions) {
    return (
      <Card className="border-green-200 bg-green-50/50">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-green-700">
            <CheckCircle2 className="h-5 w-5" />
            <span className="font-medium">All required information provided</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={failedChecks.length > 0 ? "border-red-200" : "border-amber-200"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            {failedChecks.length > 0 ? (
              <>
                <AlertCircle className="h-5 w-5 text-red-500" />
                Missing Required Info
              </>
            ) : (
              <>
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Suggestions
              </>
            )}
          </CardTitle>
          {failedChecks.length > 0 && showBlockMessage && (
            <Badge variant="destructive" className="text-xs">
              Cannot send
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Hard Checks (Blocking) */}
        {failedChecks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-700">Required:</p>
            <ul className="space-y-2">
              {failedChecks.map((check) => (
                <li
                  key={check.id}
                  className="flex items-center gap-2 text-sm text-red-600"
                >
                  <span className="text-red-400">{check.icon}</span>
                  {check.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Passed Checks */}
        {failedChecks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Completed:</p>
            <ul className="space-y-1">
              {hardChecks.filter(c => c.passed).map((check) => (
                <li
                  key={check.id}
                  className="flex items-center gap-2 text-sm text-green-600"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  {check.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Suggestions (Non-blocking) */}
        {hasAISuggestions && (
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-medium text-amber-700">
                AI Suggestions (optional)
              </p>
            </div>
            <ul className="space-y-1">
              {aiSuggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className="flex items-start gap-2 text-sm text-muted-foreground"
                >
                  <span>•</span>
                  {suggestion}
                </li>
              ))}
            </ul>
            <p className="text-xs text-muted-foreground italic">
              These are suggestions only and do not block submission
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
