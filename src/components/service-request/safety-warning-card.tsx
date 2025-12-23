"use client";

import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import type { SafetyFlag } from "@/lib/ai/types";
import {
  AlertTriangle,
  Flame,
  Zap,
  Droplets,
  Building2,
  Wind,
  Bug,
  Phone,
  ShieldAlert,
} from "lucide-react";

interface SafetyWarningCardProps {
  flags: SafetyFlag[];
  onAcknowledge: () => void;
}

const safetyIconMap: Record<string, React.ElementType> = {
  gas_smell: Wind,
  electrical_sparking: Zap,
  active_flooding: Droplets,
  structural_damage: Building2,
  fire_hazard: Flame,
  carbon_monoxide: Wind,
  mold_visible: Bug,
  asbestos_suspected: ShieldAlert,
  water_near_electrical: Droplets,
  exposed_wiring: Zap,
};

export function SafetyWarningCard({ flags, onAcknowledge }: SafetyWarningCardProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  const hasCritical = flags.some((f) => f.severity === "critical");
  const hasEmergencyRecommendation = flags.some((f) => f.recommendEmergencyServices);

  return (
    <div className="space-y-4">
      {/* Emergency Services Banner */}
      {hasEmergencyRecommendation && (
        <Alert className="border-red-500 bg-red-50 dark:bg-red-950/20">
          <Phone className="h-5 w-5 text-red-600" />
          <AlertTitle className="text-red-800 dark:text-red-400">
            Consider Calling Emergency Services
          </AlertTitle>
          <AlertDescription className="text-red-700 dark:text-red-300">
            Based on the detected hazards, you may want to contact emergency services (911)
            if you feel unsafe. Your safety is the priority.
          </AlertDescription>
        </Alert>
      )}

      {/* Safety Flags */}
      <div className={`rounded-lg border p-4 ${hasCritical ? "border-red-300 bg-red-50 dark:bg-red-950/10" : "border-orange-300 bg-orange-50 dark:bg-orange-950/10"}`}>
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className={`h-6 w-6 mt-0.5 ${hasCritical ? "text-red-600" : "text-orange-600"}`} />
          <div>
            <h3 className={`font-semibold ${hasCritical ? "text-red-800 dark:text-red-400" : "text-orange-800 dark:text-orange-400"}`}>
              {hasCritical ? "Critical Safety Warning" : "Safety Notice"}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">
              Our AI detected potential safety concerns with your request. Please review before proceeding.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {flags.map((flag, index) => {
            const Icon = safetyIconMap[flag.type] || AlertTriangle;
            const isCritical = flag.severity === "critical";

            return (
              <div
                key={index}
                className={`p-3 rounded-md ${isCritical ? "bg-red-100 dark:bg-red-950/30" : "bg-orange-100 dark:bg-orange-950/30"}`}
              >
                <div className="flex items-start gap-3">
                  <Icon className={`h-5 w-5 mt-0.5 ${isCritical ? "text-red-600" : "text-orange-600"}`} />
                  <div className="flex-1">
                    <p className={`font-medium text-sm ${isCritical ? "text-red-800 dark:text-red-300" : "text-orange-800 dark:text-orange-300"}`}>
                      {flag.description}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {flag.guidance}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Acknowledgement */}
      <div className="flex items-start space-x-3 p-4 bg-muted rounded-lg">
        <Checkbox
          id="safety-acknowledge"
          checked={acknowledged}
          onCheckedChange={(checked) => setAcknowledged(checked === true)}
        />
        <div className="grid gap-1.5 leading-none">
          <Label htmlFor="safety-acknowledge" className="cursor-pointer">
            I understand these safety concerns
          </Label>
          <p className="text-sm text-muted-foreground">
            I have read the warnings above and understand the potential risks. I wish to continue
            with my service request.
          </p>
        </div>
      </div>

      <Button
        onClick={onAcknowledge}
        disabled={!acknowledged}
        className="w-full"
        variant={hasCritical ? "destructive" : "default"}
      >
        {acknowledged ? "Continue with Request" : "Please acknowledge the warnings above"}
      </Button>
    </div>
  );
}
