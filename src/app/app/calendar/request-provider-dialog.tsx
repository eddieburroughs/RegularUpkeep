"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Send,
  Loader2,
  Calendar,
  Clock,
  CheckCircle2,
  X,
  Wrench,
  Droplets,
  Zap,
  Thermometer,
  Home,
  Leaf,
  Bug,
  Shield,
} from "lucide-react";
import type { PropertyMaintenanceTaskWithProperty } from "@/types/database";
import { useRouter } from "next/navigation";

type Property = {
  id: string;
  nickname: string | null;
  address_line1: string;
  city: string;
  state: string;
};

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

export function RequestProviderDialog({
  tasks,
  properties,
  onClose,
  onSuccess,
}: {
  tasks: PropertyMaintenanceTaskWithProperty[];
  properties: Property[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"review" | "details" | "success">("review");

  // Form state
  const [title, setTitle] = useState(() => {
    if (tasks.length === 1) {
      return tasks[0].title;
    }
    return `Maintenance Request (${tasks.length} tasks)`;
  });
  const [description, setDescription] = useState(() => {
    return tasks
      .map((t) => `• ${t.title}${t.description ? `: ${t.description}` : ""}`)
      .join("\n");
  });
  const [urgency, setUrgency] = useState<"standard" | "urgent" | "flexible">("standard");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTimeStart, setPreferredTimeStart] = useState("");
  const [preferredTimeEnd, setPreferredTimeEnd] = useState("");

  // Result state
  const [requestNumber, setRequestNumber] = useState("");

  // Get the property ID from first task (all tasks should be same property)
  const propertyId = tasks[0]?.property_id;
  const property = properties.find((p) => p.id === propertyId);

  // Verify all tasks are from the same property
  const mixedProperties = tasks.some((t) => t.property_id !== propertyId);

  const handleSubmit = async () => {
    if (!propertyId || !title) return;

    setLoading(true);
    try {
      const res = await fetch("/api/maintenance/create-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          property_id: propertyId,
          task_ids: tasks.map((t) => t.id),
          title,
          description,
          urgency,
          preferred_date: preferredDate || undefined,
          preferred_time_start: preferredTimeStart || undefined,
          preferred_time_end: preferredTimeEnd || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setRequestNumber(data.request_number);
        setStep("success");
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create request");
      }
    } catch (error) {
      console.error("Failed to create request:", error);
      alert("Failed to create request");
    } finally {
      setLoading(false);
    }
  };

  if (mixedProperties) {
    return (
      <Dialog open onOpenChange={() => onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Create Request</DialogTitle>
            <DialogDescription>
              Selected tasks must be from the same property.
              Please select tasks from only one property.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        {step === "review" && (
          <>
            <DialogHeader>
              <DialogTitle>Request Provider</DialogTitle>
              <DialogDescription>
                Create a service request for the selected maintenance tasks
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              {/* Property */}
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">Property</p>
                <p className="font-medium">
                  {property?.nickname || property?.address_line1}
                </p>
                {property?.city && (
                  <p className="text-sm text-muted-foreground">
                    {property.city}, {property.state}
                  </p>
                )}
              </div>

              {/* Selected Tasks */}
              <div>
                <p className="text-sm font-medium mb-2">Selected Tasks ({tasks.length})</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {tasks.map((task) => {
                    const CategoryIcon = categoryIcons[task.category] || Wrench;
                    return (
                      <div
                        key={task.id}
                        className="flex items-center gap-3 p-2 rounded-lg bg-muted/30"
                      >
                        <CategoryIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="flex-1 text-sm">{task.title}</span>
                        <Badge variant="outline" className="text-xs">
                          {task.category}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => setStep("details")}>
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "details" && (
          <>
            <DialogHeader>
              <DialogTitle>Request Details</DialogTitle>
              <DialogDescription>
                Provide additional details for your service request
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 my-4">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title">Request Title</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Brief description of what you need"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what needs to be done"
                  rows={5}
                />
                <p className="text-xs text-muted-foreground">
                  Auto-filled from selected tasks. Add any additional details.
                </p>
              </div>

              {/* Urgency */}
              <div className="space-y-2">
                <Label>Urgency</Label>
                <Select value={urgency} onValueChange={(v) => setUrgency(v as typeof urgency)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="flexible">Flexible - Within 2 weeks</SelectItem>
                    <SelectItem value="standard">Standard - Within 1 week</SelectItem>
                    <SelectItem value="urgent">Urgent - Within 48 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Preferred Date */}
              <div className="space-y-2">
                <Label htmlFor="preferredDate">Preferred Date (optional)</Label>
                <Input
                  id="preferredDate"
                  type="date"
                  value={preferredDate}
                  onChange={(e) => setPreferredDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                />
              </div>

              {/* Preferred Time Window */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeStart">Preferred Time (from)</Label>
                  <Input
                    id="timeStart"
                    type="time"
                    value={preferredTimeStart}
                    onChange={(e) => setPreferredTimeStart(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timeEnd">Preferred Time (to)</Label>
                  <Input
                    id="timeEnd"
                    type="time"
                    value={preferredTimeEnd}
                    onChange={(e) => setPreferredTimeEnd(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("review")}>
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !title}>
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit Request
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "success" && (
          <>
            <DialogHeader>
              <div className="flex flex-col items-center text-center py-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-600" />
                </div>
                <DialogTitle className="text-xl">Request Created!</DialogTitle>
                <DialogDescription className="mt-2">
                  Your service request has been submitted successfully.
                </DialogDescription>
              </div>
            </DialogHeader>

            <div className="text-center py-4">
              <p className="text-muted-foreground">Request Number</p>
              <p className="text-2xl font-bold">{requestNumber}</p>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              We&apos;ll match you with a qualified provider and notify you when they respond.
            </p>

            <DialogFooter className="mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  onSuccess();
                  router.push("/app/requests");
                }}
              >
                View My Requests
              </Button>
              <Button onClick={onSuccess}>
                Done
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
