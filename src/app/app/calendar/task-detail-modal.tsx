"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CheckCircle2,
  Clock,
  Calendar,
  User,
  DollarSign,
  FileText,
  AlertTriangle,
  Lightbulb,
  Loader2,
  Send,
  Wrench,
  Droplets,
  Zap,
  Thermometer,
  Home,
  Leaf,
  Bug,
  Shield,
  History,
} from "lucide-react";
import type {
  PropertyMaintenanceTaskWithProperty,
  MaintenanceTaskCompletionWithUser,
} from "@/types/database";
import { formatDueDate, getFrequencyLabel, SKILL_LEVELS } from "@/lib/maintenance";

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
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

const skillBadgeColors: Record<string, string> = {
  diy: "bg-green-100 text-green-800",
  pro_recommended: "bg-amber-100 text-amber-800",
  pro_required: "bg-red-100 text-red-800",
};

export function TaskDetailModal({
  task,
  onClose,
  onComplete,
}: {
  task: PropertyMaintenanceTaskWithProperty;
  onClose: () => void;
  onComplete: () => void;
}) {
  const [activeTab, setActiveTab] = useState("details");
  const [completions, setCompletions] = useState<MaintenanceTaskCompletionWithUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);

  // Completion form state
  const [notes, setNotes] = useState("");
  const [cost, setCost] = useState("");

  const CategoryIcon = categoryIcons[task.category] || Wrench;
  const skillLevel = SKILL_LEVELS.find((s) => s.value === task.skill_level);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab, task.id]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/maintenance/tasks/${task.id}`);
      if (res.ok) {
        const data = await res.json();
        setCompletions(data.completions || []);
      }
    } catch (error) {
      console.error("Failed to fetch history:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    setCompleting(true);
    try {
      const res = await fetch(`/api/maintenance/tasks/${task.id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: notes || undefined,
          cost_cents: cost ? Math.round(parseFloat(cost) * 100) : undefined,
        }),
      });

      if (res.ok) {
        onComplete();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to complete task");
      }
    } catch (error) {
      console.error("Failed to complete task:", error);
      alert("Failed to complete task");
    } finally {
      setCompleting(false);
    }
  };

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-muted shrink-0">
              <CategoryIcon className="h-6 w-6 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl">{task.title}</DialogTitle>
              <DialogDescription className="mt-1">
                {task.property?.nickname || task.property?.address_line1}
                {task.property?.city && `, ${task.property.city}`}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center gap-2 flex-wrap mt-2">
          <Badge className={`${skillBadgeColors[task.skill_level]} border-0`}>
            {skillLevel?.label || task.skill_level}
          </Badge>
          <Badge variant="outline">
            {task.category.replace("_", " ")}
          </Badge>
          <Badge variant="outline">
            {getFrequencyLabel(task.frequency_type, task.frequency_interval)}
          </Badge>
          {task.estimated_minutes && (
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {task.estimated_minutes} min
            </Badge>
          )}
          {task.priority === "urgent" && (
            <Badge variant="destructive">Urgent</Badge>
          )}
          {task.priority === "high" && (
            <Badge variant="secondary" className="bg-orange-100 text-orange-800">
              High Priority
            </Badge>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="complete">Mark Complete</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 mt-4">
            {/* Due Date */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">{formatDueDate(task.next_due_date)}</p>
              </div>
            </div>

            {/* Last Completed */}
            {task.last_completed_at && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-muted-foreground">Last Completed</p>
                  <p className="font-medium">
                    {new Date(task.last_completed_at).toLocaleDateString()}
                    {task.last_completed_by_profile?.full_name && (
                      <span className="text-muted-foreground ml-1">
                        by {task.last_completed_by_profile.full_name}
                      </span>
                    )}
                  </p>
                </div>
              </div>
            )}

            {/* Description */}
            {task.description && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Description
                </h4>
                <p className="text-muted-foreground">{task.description}</p>
              </div>
            )}

            {/* Instructions */}
            {task.instructions && (
              <div className="space-y-2">
                <h4 className="font-medium flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Instructions
                </h4>
                <div className="text-muted-foreground whitespace-pre-wrap text-sm">
                  {task.instructions}
                </div>
              </div>
            )}

            {/* Pro Tips */}
            {task.pro_tips && (
              <div className="space-y-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
                <h4 className="font-medium flex items-center gap-2 text-blue-800">
                  <Lightbulb className="h-4 w-4" />
                  Pro Tips
                </h4>
                <p className="text-blue-700 text-sm">{task.pro_tips}</p>
              </div>
            )}

            {/* Warning Notes */}
            {task.warning_notes && (
              <div className="space-y-2 p-3 rounded-lg bg-amber-50 border border-amber-100">
                <h4 className="font-medium flex items-center gap-2 text-amber-800">
                  <AlertTriangle className="h-4 w-4" />
                  Safety Note
                </h4>
                <p className="text-amber-700 text-sm">{task.warning_notes}</p>
              </div>
            )}

            {/* Custom Notes */}
            {task.custom_notes && (
              <div className="space-y-2">
                <h4 className="font-medium">Your Notes</h4>
                <p className="text-muted-foreground">{task.custom_notes}</p>
              </div>
            )}

            {/* Tags */}
            {task.tags && task.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}

            {/* Request Provider Button */}
            {task.skill_level !== "diy" && (
              <Button className="w-full" variant="outline">
                <Send className="h-4 w-4 mr-2" />
                Request Provider for This Task
              </Button>
            )}
          </TabsContent>

          <TabsContent value="complete" className="space-y-4 mt-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="notes">Notes (optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any notes about what you did, observations, etc."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cost">Cost (optional)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={cost}
                    onChange={(e) => setCost(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Track how much you spent on parts, supplies, or services
                </p>
              </div>

              <Button
                className="w-full"
                onClick={handleComplete}
                disabled={completing}
              >
                {completing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                )}
                Mark as Completed
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                This will record today's date and schedule the next due date automatically
              </p>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            {loading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-muted-foreground" />
                <p className="text-muted-foreground">Loading history...</p>
              </div>
            ) : completions.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No completion history yet</p>
              </div>
            ) : (
              <div className="space-y-4">
                {completions.map((completion) => (
                  <div
                    key={completion.id}
                    className="p-4 rounded-lg border bg-muted/30"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">
                          {completion.completed_by_profile?.full_name || "Unknown"}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {completion.completion_source === "provider_job"
                            ? "Provider"
                            : "Self"}
                        </Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {new Date(completion.completed_at).toLocaleDateString()}
                      </span>
                    </div>

                    {completion.notes && (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {completion.notes}
                      </p>
                    )}

                    {completion.cost_cents && completion.cost_cents > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-sm">
                        <DollarSign className="h-3 w-3" />
                        <span>{(completion.cost_cents / 100).toFixed(2)}</span>
                      </div>
                    )}

                    {completion.related_request && (
                      <div className="mt-2 text-sm">
                        <span className="text-muted-foreground">Service Request: </span>
                        <span className="font-medium">
                          #{completion.related_request.request_number}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
