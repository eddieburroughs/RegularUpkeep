"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { AlertTriangle, ArrowRight, ShieldCheck } from "lucide-react";

interface EmergencyChecklistProps {
  category: string;
  onComplete: (answers: Record<string, boolean>) => void;
}

type ChecklistItem = {
  id: string;
  question: string;
  critical?: boolean;
};

const categoryChecklists: Record<string, ChecklistItem[]> = {
  electrical: [
    { id: "power_off", question: "I have turned off power at the breaker if safe to do so", critical: true },
    { id: "no_water", question: "There is no water near the electrical issue" },
    { id: "no_sparks", question: "I am not seeing active sparking or flames" },
    { id: "safe_distance", question: "I am staying at a safe distance from the problem" },
    { id: "ventilated", question: "The area is well ventilated (no burning smell)" },
  ],
  plumbing: [
    { id: "water_off", question: "I have turned off the water supply if possible", critical: true },
    { id: "no_sewage", question: "There is no sewage backup or biohazard" },
    { id: "contained", question: "I have contained the water as much as possible" },
    { id: "electrical_safe", question: "No electrical outlets or appliances are in contact with water" },
    { id: "accessible", question: "The affected area is accessible for a technician" },
  ],
  hvac: [
    { id: "gas_off", question: "If gas smell detected, I have left the area and called 911", critical: true },
    { id: "no_fire", question: "There is no smoke or fire coming from the unit" },
    { id: "co_detector", question: "My carbon monoxide detector is working (if applicable)" },
    { id: "unit_off", question: "I have turned off the HVAC system" },
    { id: "accessible", question: "The unit is accessible for inspection" },
  ],
  general: [
    { id: "safe_area", question: "I am in a safe location away from the hazard", critical: true },
    { id: "documented", question: "I have taken photos/video of the issue" },
    { id: "accessible", question: "The problem area is accessible for a technician" },
    { id: "no_immediate_danger", question: "There is no immediate danger to people or property" },
    { id: "utilities_checked", question: "I have checked relevant utilities (water, gas, electric)" },
  ],
};

export function EmergencyChecklist({ category, onComplete }: EmergencyChecklistProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const checklist = useMemo(() => {
    return categoryChecklists[category.toLowerCase()] || categoryChecklists.general;
  }, [category]);

  const allCriticalChecked = useMemo(() => {
    return checklist
      .filter((item) => item.critical)
      .every((item) => checked[item.id]);
  }, [checklist, checked]);

  const allChecked = useMemo(() => {
    return checklist.every((item) => checked[item.id]);
  }, [checklist, checked]);

  const handleCheck = (id: string, isChecked: boolean) => {
    setChecked((prev) => ({ ...prev, [id]: isChecked }));
  };

  const handleSubmit = () => {
    onComplete(checked);
  };

  return (
    <Card className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/10">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-orange-600" />
          Emergency Safety Checklist
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Please confirm these safety items before proceeding without photos. This helps us ensure
          your safety and prepare our providers.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {checklist.map((item) => (
          <div
            key={item.id}
            className={`flex items-start space-x-3 p-3 rounded-lg ${
              item.critical
                ? "bg-red-100/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                : "bg-white dark:bg-gray-950/50"
            }`}
          >
            <Checkbox
              id={item.id}
              checked={checked[item.id] || false}
              onCheckedChange={(isChecked) => handleCheck(item.id, isChecked === true)}
            />
            <div className="grid gap-1">
              <Label
                htmlFor={item.id}
                className={`cursor-pointer ${item.critical ? "font-medium" : ""}`}
              >
                {item.question}
                {item.critical && (
                  <span className="ml-2 text-red-600 text-xs font-semibold">REQUIRED</span>
                )}
              </Label>
            </div>
          </div>
        ))}
      </CardContent>
      <CardFooter className="flex-col gap-3">
        {!allCriticalChecked && (
          <p className="text-sm text-red-600 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Please confirm all required items before continuing
          </p>
        )}
        <Button
          onClick={handleSubmit}
          disabled={!allCriticalChecked}
          className="w-full"
        >
          {allChecked ? (
            <>
              <ShieldCheck className="h-4 w-4 mr-2" />
              All Confirmed - Continue
            </>
          ) : allCriticalChecked ? (
            <>
              <ArrowRight className="h-4 w-4 mr-2" />
              Continue with Request
            </>
          ) : (
            "Complete Required Items to Continue"
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
