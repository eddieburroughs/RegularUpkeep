"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Calendar,
  CheckCircle2,
  Thermometer,
  Droplets,
  Home,
  Shield,
  Leaf,
  AlertTriangle,
} from "lucide-react";
import type { MaintenanceCategory, MaintenancePriority } from "@/types/database";

// Starter tasks based on common home maintenance needs
const starterTasks = [
  {
    name: "Replace HVAC filters",
    description: "Replace air filters to maintain air quality and system efficiency",
    category: "hvac" as MaintenanceCategory,
    priority: "normal" as MaintenancePriority,
    dueInDays: 7,
    icon: Thermometer,
    recurring: true,
  },
  {
    name: "Test smoke & CO detectors",
    description: "Test all smoke and carbon monoxide detectors",
    category: "safety" as MaintenanceCategory,
    priority: "high" as MaintenancePriority,
    dueInDays: 14,
    icon: Shield,
    recurring: true,
  },
  {
    name: "Check water heater",
    description: "Inspect water heater for leaks and check temperature settings",
    category: "plumbing" as MaintenanceCategory,
    priority: "normal" as MaintenancePriority,
    dueInDays: 30,
    icon: Droplets,
    recurring: true,
  },
  {
    name: "Inspect exterior drainage",
    description: "Check gutters and downspouts for debris and proper drainage",
    category: "exterior" as MaintenanceCategory,
    priority: "normal" as MaintenancePriority,
    dueInDays: 45,
    icon: Home,
    recurring: true,
  },
  {
    name: "Seasonal lawn care check",
    description: "Review lawn and landscaping needs for the season",
    category: "landscaping" as MaintenanceCategory,
    priority: "low" as MaintenancePriority,
    dueInDays: 21,
    icon: Leaf,
    recurring: true,
  },
  {
    name: "Check for water leaks",
    description: "Inspect under sinks, around toilets, and visible pipes for leaks",
    category: "plumbing" as MaintenanceCategory,
    priority: "normal" as MaintenancePriority,
    dueInDays: 60,
    icon: AlertTriangle,
    recurring: true,
  },
];

export default function PlanPreviewPage() {
  const router = useRouter();
  const [creating, setCreating] = useState(false);
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [propertyAddress, setPropertyAddress] = useState<string>("");

  useEffect(() => {
    const loadProperty = async () => {
      const storedId = sessionStorage.getItem("onboarding_property_id");
      if (!storedId) {
        router.push("/onboarding/home-details");
        return;
      }
      setPropertyId(storedId);

      const supabase = createClient();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data } = await (supabase as any)
        .from("properties")
        .select("address_line1, city, state")
        .eq("id", storedId)
        .single();

      if (data) {
        setPropertyAddress(`${data.address_line1}, ${data.city}, ${data.state}`);
      }
    };

    loadProperty();
  }, [router]);

  const handleCreatePlan = async () => {
    if (!propertyId) return;

    setCreating(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      router.push("/auth/login");
      return;
    }

    // Create starter tasks
    const today = new Date();
    const tasksToCreate = starterTasks.map((task) => {
      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + task.dueInDays);

      return {
        property_id: propertyId,
        name: task.name,
        description: task.description,
        category: task.category,
        priority: task.priority,
        status: "scheduled",
        due_date: dueDate.toISOString().split("T")[0],
        is_recurring: task.recurring,
        created_by: user.id,
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("maintenance_tasks").insert(tasksToCreate);

    // Clear onboarding session data
    sessionStorage.removeItem("onboarding_property_id");

    // Redirect to app
    router.push("/app");
  };

  const getDueDateText = (daysFromNow: number) => {
    if (daysFromNow <= 7) return "This week";
    if (daysFromNow <= 14) return "Next week";
    if (daysFromNow <= 30) return "This month";
    return "Coming up";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/onboarding/systems">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <span className="text-sm text-muted-foreground">Step 3 of 3</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Calendar className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Your Maintenance Plan</h1>
            <p className="text-muted-foreground">
              Here&apos;s what we recommend for your home
            </p>
          </div>
        </div>
      </div>

      {/* Property Info */}
      {propertyAddress && (
        <Card className="bg-muted/50">
          <CardContent className="flex items-center gap-3 py-4">
            <Home className="h-5 w-5 text-muted-foreground" />
            <span className="font-medium">{propertyAddress}</span>
          </CardContent>
        </Card>
      )}

      {/* Task Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Recommended Tasks
          </CardTitle>
          <CardDescription>
            We&apos;ll create these {starterTasks.length} starter tasks for your home
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {starterTasks.map((task, index) => (
            <div
              key={index}
              className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background">
                <task.icon className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">{task.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {task.description}
                </p>
              </div>
              <Badge variant="outline" className="shrink-0">
                {getDueDateText(task.dueInDays)}
              </Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="py-4">
          <div className="flex gap-3">
            <Calendar className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Your plan is personalized</p>
              <p className="text-muted-foreground">
                You can always add, edit, or remove tasks from your dashboard.
                We&apos;ll send you reminders when tasks are due.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleCreatePlan}
          className="flex-1"
          size="lg"
          disabled={creating || !propertyId}
        >
          {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create My Plan
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Progress indicator */}
      <div className="flex justify-center gap-2">
        <div className="h-2 w-8 rounded-full bg-muted" />
        <div className="h-2 w-8 rounded-full bg-muted" />
        <div className="h-2 w-8 rounded-full bg-muted" />
        <div className="h-2 w-8 rounded-full bg-primary" />
      </div>
    </div>
  );
}
