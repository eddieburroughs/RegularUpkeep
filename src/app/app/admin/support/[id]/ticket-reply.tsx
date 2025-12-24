"use client";

/**
 * Ticket Reply Component
 *
 * Form for admin to send replies to tickets.
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from "lucide-react";

type TicketReplyProps = {
  ticketId: string;
  conversationId: string;
  adminId: string;
  status: string;
};

export function TicketReply({ ticketId, conversationId, adminId, status }: TicketReplyProps) {
  const router = useRouter();
  const supabase = createClient();

  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    setSending(true);

    try {
      // Add message to conversation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: msgError } = await (supabase as any).from("support_messages").insert({
        conversation_id: conversationId,
        sender: "agent",
        content: message.trim(),
        metadata: { agent_id: adminId },
      });

      if (msgError) throw msgError;

      // Update ticket status if needed
      if (status === "open") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("support_tickets")
          .update({
            status: "in_progress",
            assigned_to: adminId,
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticketId);
      } else if (status === "waiting") {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("support_tickets")
          .update({
            status: "in_progress",
            updated_at: new Date().toISOString(),
          })
          .eq("id", ticketId);
      }

      // Update conversation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any)
        .from("conversations")
        .update({
          status: "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId);

      setMessage("");
      router.refresh();
    } catch (error) {
      console.error("Failed to send reply:", error);
      alert("Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      handleSend();
    }
  };

  const isResolved = status === "resolved" || status === "closed";

  return (
    <div className="space-y-2">
      <Textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={
          isResolved
            ? "Ticket is resolved. Reopen to send a message."
            : "Type your reply... (Cmd+Enter to send)"
        }
        className="min-h-[100px]"
        disabled={sending || isResolved}
      />
      <div className="flex justify-between items-center">
        <p className="text-xs text-muted-foreground">
          {isResolved
            ? "Reopen the ticket to continue the conversation"
            : "Press Cmd+Enter or Ctrl+Enter to send"}
        </p>
        <Button onClick={handleSend} disabled={sending || !message.trim() || isResolved}>
          {sending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Reply
        </Button>
      </div>
    </div>
  );
}
