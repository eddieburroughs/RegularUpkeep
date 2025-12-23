"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { IntakeClassifyOutput } from "@/lib/ai/types";
import { CheckCircle2, AlertCircle, Clock, Zap } from "lucide-react";

interface AIClassificationCardProps {
  classification: IntakeClassifyOutput;
  showConfidence?: boolean;
}

const urgencyConfig = {
  emergency: {
    label: "Emergency",
    color: "bg-red-500 text-white",
    icon: Zap,
    description: "Immediate safety risk or active damage",
  },
  urgent: {
    label: "Urgent",
    color: "bg-orange-500 text-white",
    icon: AlertCircle,
    description: "Should be addressed within 24-48 hours",
  },
  standard: {
    label: "Standard",
    color: "bg-blue-500 text-white",
    icon: Clock,
    description: "Normal scheduling, within a week",
  },
  flexible: {
    label: "Flexible",
    color: "bg-green-500 text-white",
    icon: CheckCircle2,
    description: "Can be scheduled at your convenience",
  },
};

const confidenceConfig = {
  high: { label: "High confidence", color: "bg-green-100 text-green-800" },
  medium: { label: "Medium confidence", color: "bg-yellow-100 text-yellow-800" },
  low: { label: "Low confidence", color: "bg-gray-100 text-gray-800" },
};

export function AIClassificationCard({
  classification,
  showConfidence = true,
}: AIClassificationCardProps) {
  const urgency = urgencyConfig[classification.urgencyLevel];
  const confidence = confidenceConfig[classification.confidence];
  const UrgencyIcon = urgency.icon;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            AI Analysis Complete
          </CardTitle>
          {showConfidence && (
            <Badge className={confidence.color} variant="secondary">
              {confidence.label}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div>
          <p className="text-sm text-muted-foreground mb-1">Summary</p>
          <p className="text-foreground">{classification.summary}</p>
        </div>

        {/* Summary Bullets */}
        {classification.summaryBullets && classification.summaryBullets.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Key Points</p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              {classification.summaryBullets.map((bullet, index) => (
                <li key={index}>{bullet}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Urgency and Category */}
        <div className="flex flex-wrap gap-3">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Urgency</p>
            <Badge className={urgency.color}>
              <UrgencyIcon className="h-3 w-3 mr-1" />
              {urgency.label}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Category</p>
            <Badge variant="outline" className="capitalize">
              {classification.suggestedCategory.replace(/_/g, " ")}
            </Badge>
          </div>
        </div>

        {/* Key Observations */}
        {classification.keyObservations.length > 0 && (
          <div>
            <p className="text-sm text-muted-foreground mb-2">Observations</p>
            <ul className="space-y-1">
              {classification.keyObservations.map((observation, index) => (
                <li
                  key={index}
                  className="text-sm flex items-start gap-2"
                >
                  <span className="text-muted-foreground">•</span>
                  {observation}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Urgency Description */}
        <p className="text-xs text-muted-foreground italic">
          {urgency.description}
        </p>
      </CardContent>
    </Card>
  );
}
