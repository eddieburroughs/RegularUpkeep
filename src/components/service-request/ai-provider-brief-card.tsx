"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import type { ProviderBriefOutput } from "@/lib/ai/types";
import {
  Sparkles,
  AlertTriangle,
  ClipboardList,
  Lightbulb,
  HelpCircle,
  Wrench,
  MapPin,
  Monitor,
  AlertCircle,
} from "lucide-react";

interface AIProviderBriefCardProps {
  brief: ProviderBriefOutput;
  showTitle?: boolean;
}

const urgencyColors = {
  low: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
  high: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
  emergency: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

const complexityColors = {
  simple: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",
  moderate: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400",
  complex: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
};

export function AIProviderBriefCard({ brief, showTitle = true }: AIProviderBriefCardProps) {
  return (
    <Card className="border-primary/20">
      {showTitle && (
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            AI Provider Brief
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className="space-y-5">
        {/* Summary */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Summary</p>
          <p className="text-foreground">{brief.briefSummary}</p>
        </div>

        {/* Badges Row */}
        <div className="flex flex-wrap gap-2">
          <Badge className={urgencyColors[brief.urgencyAssessment]}>
            Urgency: {brief.urgencyAssessment}
          </Badge>
          <Badge className={complexityColors[brief.estimatedComplexity]}>
            Complexity: {brief.estimatedComplexity}
          </Badge>
          {brief.remoteEstimatePossible !== undefined && (
            <Badge variant="outline" className="gap-1">
              <Monitor className="h-3 w-3" />
              {brief.remoteEstimatePossible ? "Remote estimate possible" : "Site visit needed"}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Key Observations */}
        {brief.keyObservations.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <ClipboardList className="h-4 w-4 text-primary" />
              Key Observations
            </h4>
            <ul className="space-y-1">
              {brief.keyObservations.map((obs, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  {obs}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Potential Causes */}
        {brief.potentialCauses.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <Lightbulb className="h-4 w-4 text-yellow-600" />
              Potential Causes
            </h4>
            <ul className="space-y-1">
              {brief.potentialCauses.map((cause, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground">•</span>
                  {cause}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommended Questions */}
        {brief.recommendedQuestions.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <HelpCircle className="h-4 w-4 text-blue-600" />
              Questions to Ask Customer
            </h4>
            <ul className="space-y-1">
              {brief.recommendedQuestions.map((question, index) => (
                <li key={index} className="text-sm flex items-start gap-2">
                  <span className="text-muted-foreground">{index + 1}.</span>
                  {question}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Suggested Tools/Parts */}
        {brief.suggestedToolsOrParts && brief.suggestedToolsOrParts.length > 0 && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2">
              <Wrench className="h-4 w-4 text-gray-600" />
              Suggested Tools & Parts
            </h4>
            <div className="flex flex-wrap gap-2">
              {brief.suggestedToolsOrParts.map((item, index) => (
                <Badge key={index} variant="outline">
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Site Visit Recommendation */}
        {brief.siteVisitRecommended && (
          <div className="flex items-start gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <MapPin className="h-4 w-4 text-blue-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-800 dark:text-blue-400">
                Site Visit Recommended
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-300">
                An on-site assessment is recommended to properly diagnose this issue
              </p>
            </div>
          </div>
        )}

        {/* Safety Notes */}
        {brief.safetyNotes.length > 0 && (
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
            <h4 className="text-sm font-medium flex items-center gap-2 mb-2 text-orange-800 dark:text-orange-400">
              <AlertTriangle className="h-4 w-4" />
              Safety Considerations
            </h4>
            <ul className="space-y-1">
              {brief.safetyNotes.map((note, index) => (
                <li key={index} className="text-sm flex items-start gap-2 text-orange-700 dark:text-orange-300">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  {note}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* AI Disclaimer */}
        <p className="text-xs text-muted-foreground italic pt-2">
          This brief was generated by AI based on customer photos and description.
          Use professional judgment when assessing the actual situation.
        </p>
      </CardContent>
    </Card>
  );
}
