"use client";

/**
 * AI Ops Panel
 *
 * Admin dashboard widget showing AI usage metrics, costs, and operational status.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Bot,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Clock,
  RefreshCw,
  Trash2,
  Users,
  Activity,
} from "lucide-react";

interface AIOpsSummary {
  today: {
    date: string;
    totalCostCents: number;
    totalCalls: number;
    avgCostCents: number;
    topTaskTypes: Array<{ taskType: string; count: number; costCents: number }>;
    errorCount: number;
    errorRate: number;
    uniqueUsers: number;
    rateLimitHits: number;
  };
  budget: {
    withinBudget: boolean;
    currentSpendCents: number;
    budgetCents: number;
    alertThresholdReached: boolean;
  };
  costTrend: Array<{
    date: string;
    totalCostCents: number;
    totalCalls: number;
  }>;
  retention: {
    aiJobsRetentionDays: number;
    aiOutputsRetentionDays: number;
    keepAggregateMetrics: boolean;
    mediaRetentionDays: number;
  };
}

export function AIOpsPanelServer() {
  return <AIOpsPanel />;
}

export function AIOpsPanel() {
  const [data, setData] = useState<AIOpsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [cleanupLoading, setCleanupLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ai-ops");
      if (!res.ok) throw new Error("Failed to fetch AI ops data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const runCleanup = async () => {
    setCleanupLoading(true);
    try {
      const res = await fetch("/api/cron/ai-cleanup", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        alert(`Cleanup complete: ${json.jobsDeleted} jobs, ${json.outputsDeleted} outputs deleted`);
        fetchData();
      } else {
        alert(`Cleanup failed: ${json.error}`);
      }
    } catch (err) {
      alert("Failed to run cleanup");
    } finally {
      setCleanupLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <RefreshCw className="h-5 w-5 animate-spin mr-2" />
          Loading AI ops data...
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            {error || "No data available"}
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} className="mt-2">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const budgetPercent = Math.min(
    100,
    Math.round((data.budget.currentSpendCents / data.budget.budgetCents) * 100)
  );

  return (
    <div className="space-y-4">
      {/* Budget Alert */}
      {data.budget.alertThresholdReached && (
        <Card className="border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <div>
              <p className="font-medium text-amber-800 dark:text-amber-200">
                Budget Alert
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-300">
                Daily AI spend has reached the alert threshold (75% of budget)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Top Level Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Today&apos;s AI Spend</p>
                <p className="text-2xl font-bold">
                  ${(data.today.totalCostCents / 100).toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground">
                  of ${(data.budget.budgetCents / 100).toFixed(0)} budget
                </p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">AI Calls Today</p>
                <p className="text-2xl font-bold">{data.today.totalCalls}</p>
                <p className="text-xs text-muted-foreground">
                  avg ${(data.today.avgCostCents / 100).toFixed(3)}/call
                </p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <Bot className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-2xl font-bold">{data.today.uniqueUsers}</p>
                <p className="text-xs text-muted-foreground">using AI today</p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <Users className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Error Rate</p>
                <p className="text-2xl font-bold">{data.today.errorRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">
                  {data.today.errorCount} failed calls
                </p>
              </div>
              <div className="p-2 bg-muted rounded-lg">
                <Activity className="h-5 w-5" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Daily Budget Usage</CardTitle>
        </CardHeader>
        <CardContent>
          <Progress
            value={budgetPercent}
            className={`h-3 ${
              data.budget.alertThresholdReached
                ? "[&>div]:bg-amber-500"
                : !data.budget.withinBudget
                ? "[&>div]:bg-destructive"
                : ""
            }`}
          />
          <div className="flex justify-between mt-2 text-sm text-muted-foreground">
            <span>
              ${(data.budget.currentSpendCents / 100).toFixed(2)} spent
            </span>
            <span>{budgetPercent}% of daily budget</span>
          </div>
        </CardContent>
      </Card>

      {/* Two Column Layout */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Top Task Types */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top AI Tasks Today</CardTitle>
          </CardHeader>
          <CardContent>
            {data.today.topTaskTypes.length === 0 ? (
              <p className="text-sm text-muted-foreground">No AI calls today</p>
            ) : (
              <div className="space-y-3">
                {data.today.topTaskTypes.map((task) => (
                  <div
                    key={task.taskType}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <span className="font-medium">{formatTaskType(task.taskType)}</span>
                      <span className="text-muted-foreground ml-2">
                        {task.count} calls
                      </span>
                    </div>
                    <Badge variant="outline">
                      ${(task.costCents / 100).toFixed(2)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 7-Day Trend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">7-Day Cost Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.costTrend.map((day) => {
                const maxCost = Math.max(
                  ...data.costTrend.map((d) => d.totalCostCents),
                  1
                );
                const percent = Math.round((day.totalCostCents / maxCost) * 100);
                return (
                  <div key={day.date} className="flex items-center gap-2 text-sm">
                    <span className="w-16 text-muted-foreground">
                      {formatShortDate(day.date)}
                    </span>
                    <div className="flex-1 h-4 bg-muted rounded overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="w-16 text-right">
                      ${(day.totalCostCents / 100).toFixed(2)}
                    </span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retention & Cleanup */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Data Retention</CardTitle>
              <CardDescription>Automated cleanup settings</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={runCleanup}
              disabled={cleanupLoading}
            >
              {cleanupLoading ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Run Cleanup Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">AI Jobs</p>
                <p className="text-xs text-muted-foreground">
                  {data.retention.aiJobsRetentionDays} days
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">AI Outputs</p>
                <p className="text-xs text-muted-foreground">
                  {data.retention.aiOutputsRetentionDays} days
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <Clock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Media References</p>
                <p className="text-xs text-muted-foreground">
                  {data.retention.mediaRetentionDays} days
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-muted rounded-lg">
                <TrendingUp className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Aggregate Metrics</p>
                <p className="text-xs text-muted-foreground">
                  {data.retention.keepAggregateMetrics ? "Preserved" : "Deleted"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatTaskType(taskType: string): string {
  return taskType
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
