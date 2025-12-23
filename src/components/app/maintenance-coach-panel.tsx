"use client";

/**
 * Maintenance Coach Panel
 *
 * AI-powered maintenance recommendations for homeowners.
 * Premium subscribers get additional details and printable summary.
 */

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Wrench,
  Loader2,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Download,
  RefreshCw,
  Info,
  Crown,
} from "lucide-react";
import { AIFeedback } from "@/components/ai/ai-feedback";
import type { MaintenancePlanOutput } from "@/lib/ai/types";

interface MaintenanceCoachPanelProps {
  propertyId: string;
  propertyName?: string;
  /** Called when user wants to schedule a service */
  onScheduleService?: (service: MaintenancePlanOutput["recommendedServices"][0]) => void;
}

export function MaintenanceCoachPanel({
  propertyId,
  propertyName,
  onScheduleService,
}: MaintenanceCoachPanelProps) {
  const [plan, setPlan] = useState<MaintenancePlanOutput | null>(null);
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  const fetchPlan = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/properties/${propertyId}/maintenance-plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to get maintenance plan");
      }

      const data = await response.json();
      setPlan(data.plan);
      setIsPremium(data.isPremium || false);
      setJobId(data.jobId || null);
    } catch (err) {
      setError("Unable to load maintenance plan. Please try again.");
      console.error("Maintenance plan error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [propertyId]);

  const handleExportPDF = () => {
    // TODO: Implement PDF export using the printableSummary
    alert("PDF export coming soon!");
  };

  const getUrgencyBadge = (urgency: "now" | "this_month" | "this_season") => {
    switch (urgency) {
      case "now":
        return <Badge className="bg-red-100 text-red-700">Now</Badge>;
      case "this_month":
        return <Badge className="bg-yellow-100 text-yellow-700">This Month</Badge>;
      case "this_season":
        return <Badge className="bg-blue-100 text-blue-700">This Season</Badge>;
    }
  };

  const getSeverityBadge = (severity: "critical" | "important" | "minor") => {
    switch (severity) {
      case "critical":
        return <Badge className="bg-red-100 text-red-700">Critical</Badge>;
      case "important":
        return <Badge className="bg-yellow-100 text-yellow-700">Important</Badge>;
      case "minor":
        return <Badge className="bg-gray-100 text-gray-700">Minor</Badge>;
    }
  };

  const getPriorityBadge = (priority: "high" | "medium" | "low") => {
    switch (priority) {
      case "high":
        return <Badge className="bg-red-100 text-red-700">High Priority</Badge>;
      case "medium":
        return <Badge className="bg-yellow-100 text-yellow-700">Medium</Badge>;
      case "low":
        return <Badge className="bg-green-100 text-green-700">Low</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Maintenance Coach</CardTitle>
            {isPremium && (
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-300">
                <Crown className="h-3 w-3 mr-1" />
                Premium
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {isPremium && plan?.printableSummary && (
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="h-4 w-4 mr-1" />
                Export PDF
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPlan}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : plan ? (
                <RefreshCw className="h-4 w-4" />
              ) : (
                "Get Plan"
              )}
            </Button>
          </div>
        </div>
        <CardDescription>
          AI-powered maintenance recommendations for {propertyName || "your property"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!plan && !isLoading && !error && (
          <div className="text-center py-8">
            <Wrench className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Click &quot;Get Plan&quot; to receive personalized maintenance recommendations
              based on your property, systems, and current season.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Analyzing your property...</p>
          </div>
        )}

        {plan && !isLoading && (
          <Tabs defaultValue="seasonal" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="seasonal">Seasonal</TabsTrigger>
              <TabsTrigger value="repairs">Repairs</TabsTrigger>
              <TabsTrigger value="services">Services</TabsTrigger>
            </TabsList>

            {/* Seasonal Tasks */}
            <TabsContent value="seasonal" className="space-y-3">
              {plan.seasonalTasks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No seasonal tasks recommended at this time.
                </p>
              ) : (
                plan.seasonalTasks.map((task, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{task.task}</span>
                          {getUrgencyBadge(task.urgency)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {task.system}
                        </p>
                      </div>
                      {task.diyPossible && (
                        <Badge variant="outline" className="bg-green-50 text-green-700">
                          DIY OK
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm">{task.reasoning}</p>
                    {task.estimatedCost && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        Estimated: {task.estimatedCost}
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            {/* Priority Repairs */}
            <TabsContent value="repairs" className="space-y-3">
              {plan.priorityRepairs.length === 0 ? (
                <div className="text-center py-4">
                  <CheckCircle className="h-8 w-8 mx-auto text-green-500 mb-2" />
                  <p className="text-sm text-muted-foreground">
                    No priority repairs needed!
                  </p>
                </div>
              ) : (
                plan.priorityRepairs.map((repair, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{repair.system}</span>
                          {getSeverityBadge(repair.severity)}
                        </div>
                        <p className="text-sm text-red-600 mt-1">{repair.issue}</p>
                      </div>
                    </div>
                    <p className="text-sm">{repair.recommendation}</p>
                    {repair.estimatedCost && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <DollarSign className="h-3 w-3" />
                        Estimated: {repair.estimatedCost}
                      </div>
                    )}
                  </div>
                ))
              )}
            </TabsContent>

            {/* Recommended Services */}
            <TabsContent value="services" className="space-y-3">
              {plan.recommendedServices.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No additional services recommended.
                </p>
              ) : (
                plan.recommendedServices.map((service, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg space-y-2"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{service.service}</span>
                          {getPriorityBadge(service.priority)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {service.category} &bull; {service.frequency}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {service.nextDue}
                      </div>
                    </div>
                    <p className="text-sm">{service.reasoning}</p>
                    {onScheduleService && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => onScheduleService(service)}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Schedule Service
                      </Button>
                    )}
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Notes */}
        {plan && plan.notes.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Info className="h-4 w-4" />
                Tips & Notes
              </h4>
              <ul className="space-y-1">
                {plan.notes.map((note, index) => (
                  <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                    <span className="text-blue-500 mt-1">•</span>
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Annual Summary */}
        {plan && plan.annualPlanSummary && (
          <>
            <Separator />
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-1">Annual Overview</h4>
              <p className="text-sm text-blue-800">{plan.annualPlanSummary}</p>
            </div>
          </>
        )}

        {/* Premium Printable Summary */}
        {isPremium && plan?.printableSummary && (
          <>
            <Separator />
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="h-4 w-4 text-yellow-600" />
                <h4 className="text-sm font-medium text-yellow-900">
                  Premium: Quarterly Checklist
                </h4>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {plan.printableSummary.quarterlyChecklist.map((q, index) => (
                  <div key={index} className="text-xs">
                    <span className="font-medium">{q.quarter}:</span>
                    <span className="text-muted-foreground ml-1">
                      {q.tasks.length} tasks
                    </span>
                  </div>
                ))}
              </div>
              {plan.printableSummary.estimatedAnnualCost && (
                <p className="text-sm mt-2 text-yellow-800">
                  Est. Annual Cost: {plan.printableSummary.estimatedAnnualCost}
                </p>
              )}
            </div>
          </>
        )}

        {/* Upgrade prompt for non-premium */}
        {!isPremium && plan && (
          <>
            <Separator />
            <div className="p-3 bg-muted rounded-lg text-center">
              <Crown className="h-5 w-5 mx-auto text-yellow-500 mb-2" />
              <p className="text-sm font-medium">Upgrade to Premium</p>
              <p className="text-xs text-muted-foreground">
                Get detailed quarterly checklists and exportable maintenance plans.
              </p>
            </div>
          </>
        )}

        {/* Feedback */}
        {jobId && (
          <>
            <Separator />
            <AIFeedback
              jobId={jobId}
              endpoint={`/api/properties/${propertyId}/maintenance-plan`}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
