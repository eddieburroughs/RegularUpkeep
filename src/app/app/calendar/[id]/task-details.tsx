"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Calendar,
  Clock,
  Home,
  AlertTriangle,
  SkipForward,
  Trash2,
  Wrench,
  Droplets,
  Zap,
  Thermometer,
  Leaf,
  Bug,
  Shield,
} from "lucide-react";
import Link from "next/link";
import type { MaintenanceTask, Property, MaintenanceCategory, MaintenanceStatus } from "@/types/database";

const categoryIcons: Record<MaintenanceCategory, React.ComponentType<{ className?: string }>> = {
  hvac: Thermometer,
  plumbing: Droplets,
  electrical: Zap,
  appliances: Home,
  exterior: Home,
  interior: Home,
  landscaping: Leaf,
  pest_control: Bug,
  safety: Shield,
  other: Wrench,
};

const categoryLabels: Record<MaintenanceCategory, string> = {
  hvac: "HVAC",
  plumbing: "Plumbing",
  electrical: "Electrical",
  appliances: "Appliances",
  exterior: "Exterior",
  interior: "Interior",
  landscaping: "Landscaping",
  pest_control: "Pest Control",
  safety: "Safety",
  other: "Other",
};

const statusColors: Record<MaintenanceStatus, "default" | "secondary" | "destructive" | "outline"> = {
  scheduled: "outline",
  upcoming: "secondary",
  due: "default",
  overdue: "destructive",
  in_progress: "secondary",
  completed: "outline",
  skipped: "outline",
  cancelled: "outline",
};

const priorityLabels = {
  urgent: "Urgent",
  high: "High",
  normal: "Normal",
  low: "Low",
};

interface TaskDetailsProps {
  task: MaintenanceTask & { properties: Property | null };
  properties: Property[];
}

export function TaskDetails({ task }: Omit<TaskDetailsProps, 'properties'>) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completionNotes, setCompletionNotes] = useState("");
  const [skipReason, setSkipReason] = useState("");
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [skipDialogOpen, setSkipDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const CategoryIcon = categoryIcons[task.category] || Wrench;

  const handleComplete = async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("maintenance_tasks")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        completion_notes: completionNotes || null,
      })
      .eq("id", task.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setCompleteDialogOpen(false);
    router.refresh();
  };

  const handleSkip = async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: updateError } = await (supabase as any)
      .from("maintenance_tasks")
      .update({
        status: "skipped",
        skipped_reason: skipReason || null,
      })
      .eq("id", task.id);

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    setSkipDialogOpen(false);
    router.refresh();
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: deleteError } = await (supabase as any)
      .from("maintenance_tasks")
      .delete()
      .eq("id", task.id);

    if (deleteError) {
      setError(deleteError.message);
      setLoading(false);
      return;
    }

    router.push("/app/calendar");
  };

  const isCompleted = task.status === "completed";
  const isSkipped = task.status === "skipped";
  const isCancelled = task.status === "cancelled";
  const canMarkComplete = !isCompleted && !isSkipped && !isCancelled;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app/calendar">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <CategoryIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{task.name}</h1>
              <p className="text-muted-foreground">
                {categoryLabels[task.category]}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={statusColors[task.status]}>
            {task.status.replace("_", " ")}
          </Badge>
          {task.priority === "urgent" && (
            <Badge variant="destructive">
              <AlertTriangle className="h-3 w-3 mr-1" />
              Urgent
            </Badge>
          )}
        </div>
      </div>

      {error && (
        <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Task Details */}
          <Card>
            <CardHeader>
              <CardTitle>Task Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {task.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p>{task.description}</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Due Date</p>
                    <p className="font-medium">
                      {new Date(task.due_date).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {task.due_time && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Due Time</p>
                      <p className="font-medium">{task.due_time}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <Home className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Property</p>
                    <p className="font-medium">
                      {task.properties?.nickname || task.properties?.address_line1}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-muted-foreground">Priority</p>
                  <p className="font-medium">{priorityLabels[task.priority]}</p>
                </div>
              </div>

              {task.instructions && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Instructions</p>
                  <p className="whitespace-pre-wrap">{task.instructions}</p>
                </div>
              )}

              {task.estimated_cost_cents && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Estimated Cost</p>
                  <p className="font-medium">${(task.estimated_cost_cents / 100).toFixed(2)}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completion Info (if completed) */}
          {isCompleted && (
            <Card className="border-green-200 bg-green-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-800">
                  <CheckCircle2 className="h-5 w-5" />
                  Completed
                </CardTitle>
                <CardDescription className="text-green-700">
                  {task.completed_at && new Date(task.completed_at).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </CardDescription>
              </CardHeader>
              {(task.completion_notes || task.actual_cost_cents) && (
                <CardContent className="space-y-3">
                  {task.completion_notes && (
                    <div>
                      <p className="text-sm text-green-700 mb-1">Notes</p>
                      <p className="text-green-800">{task.completion_notes}</p>
                    </div>
                  )}
                  {task.actual_cost_cents && (
                    <div>
                      <p className="text-sm text-green-700 mb-1">Actual Cost</p>
                      <p className="font-medium text-green-800">
                        ${(task.actual_cost_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          )}

          {/* Skipped Info */}
          {isSkipped && task.skipped_reason && (
            <Card className="border-amber-200 bg-amber-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <SkipForward className="h-5 w-5" />
                  Skipped
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-amber-800">{task.skipped_reason}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Actions Sidebar */}
        <div className="space-y-4">
          {canMarkComplete && (
            <>
              <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="w-full" size="lg">
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Mark Complete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Complete Task</DialogTitle>
                    <DialogDescription>
                      Mark &quot;{task.name}&quot; as completed
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="notes">Completion Notes (optional)</Label>
                      <Textarea
                        id="notes"
                        placeholder="Any notes about the completed work..."
                        value={completionNotes}
                        onChange={(e) => setCompletionNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleComplete} disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Complete Task
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={skipDialogOpen} onOpenChange={setSkipDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <SkipForward className="mr-2 h-4 w-4" />
                    Skip Task
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Skip Task</DialogTitle>
                    <DialogDescription>
                      Skip &quot;{task.name}&quot; for now
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="skipReason">Reason for skipping (optional)</Label>
                      <Textarea
                        id="skipReason"
                        placeholder="Why are you skipping this task..."
                        value={skipReason}
                        onChange={(e) => setSkipReason(e.target.value)}
                        rows={3}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setSkipDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button variant="secondary" onClick={handleSkip} disabled={loading}>
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Skip Task
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}

          <Button variant="outline" className="w-full" asChild>
            <Link href="/app/requests/new">
              <Wrench className="mr-2 h-4 w-4" />
              Request Service
            </Link>
          </Button>

          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Task
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete Task</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete this task? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={handleDelete} disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Delete Task
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}
