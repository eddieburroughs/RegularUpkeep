"use client";

/**
 * Ticket Actions Component
 *
 * Status changes, priority updates, and assignment actions.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { CheckCircle, Clock, XCircle, UserPlus, Loader2 } from "lucide-react";

type TicketActionsProps = {
  ticketId: string;
  currentStatus: string;
  currentPriority: string;
  assignedTo: string | null;
  adminId: string;
};

export function TicketActions({
  ticketId,
  currentStatus,
  currentPriority,
  assignedTo,
  adminId,
}: TicketActionsProps) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [priority, setPriority] = useState(currentPriority);

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);

    const updates: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
    };

    if (newStatus === "in_progress" && !assignedTo) {
      updates.assigned_to = adminId;
    }

    if (newStatus === "resolved" || newStatus === "closed") {
      updates.resolved_at = new Date().toISOString();
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("support_tickets")
      .update(updates)
      .eq("id", ticketId);

    if (error) {
      console.error("Failed to update status:", error);
    } else {
      router.refresh();
    }

    setLoading(false);
  };

  const handlePriorityChange = async (newPriority: string) => {
    setPriority(newPriority);
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("support_tickets")
      .update({
        priority: newPriority,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) {
      console.error("Failed to update priority:", error);
      setPriority(currentPriority);
    } else {
      router.refresh();
    }

    setLoading(false);
  };

  const handleAssignToMe = async () => {
    setLoading(true);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase as any)
      .from("support_tickets")
      .update({
        assigned_to: adminId,
        status: currentStatus === "open" ? "in_progress" : currentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq("id", ticketId);

    if (error) {
      console.error("Failed to assign:", error);
    } else {
      router.refresh();
    }

    setLoading(false);
  };

  return (
    <div className="space-y-4">
      {/* Priority */}
      <div className="space-y-2">
        <Label>Priority</Label>
        <Select value={priority} onValueChange={handlePriorityChange} disabled={loading}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="normal">Normal</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Status Actions */}
      <div className="space-y-2">
        <Label>Status</Label>
        <div className="grid grid-cols-2 gap-2">
          {currentStatus === "open" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("in_progress")}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4 mr-1" />
                )}
                In Progress
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("resolved")}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Resolve
              </Button>
            </>
          )}

          {currentStatus === "in_progress" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("waiting")}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4 mr-1" />
                )}
                Waiting
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("resolved")}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Resolve
              </Button>
            </>
          )}

          {currentStatus === "waiting" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("in_progress")}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Clock className="h-4 w-4 mr-1" />
                )}
                Resume
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("resolved")}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Resolve
              </Button>
            </>
          )}

          {currentStatus === "resolved" && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("open")}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <XCircle className="h-4 w-4 mr-1" />
                )}
                Reopen
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange("closed")}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4 mr-1" />
                )}
                Close
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Assignment */}
      {!assignedTo && (
        <Button
          variant="default"
          className="w-full"
          onClick={handleAssignToMe}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4 mr-2" />
          )}
          Assign to Me
        </Button>
      )}

      {assignedTo === adminId && (
        <p className="text-sm text-center text-muted-foreground">
          Assigned to you
        </p>
      )}
    </div>
  );
}
