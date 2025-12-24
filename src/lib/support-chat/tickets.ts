/**
 * Support Ticket Management
 *
 * Handles ticket creation, updates, and escalation
 */

import { createClient } from "@/lib/supabase/server";
import type { SupportTicket, TicketPriority, TicketCategory, ChatMessage } from "@/types/database";
import { determinePriority, determineCategory, generateTicketSummary, formatMessagesForTicket, redactSensitiveData } from "./utils";
import { ESCALATION_TOPICS } from "./constants";

export interface TicketCreateInput {
  conversationId: string;
  userId?: string;
  guestEmail?: string;
  guestName?: string;
  summary?: string;
  priority?: TicketPriority;
  category?: TicketCategory;
  messages: Array<{ sender: string; content: string; created_at: string }>;
  metadata?: Record<string, unknown>;
}

export interface TicketCreateResult {
  success: boolean;
  ticketId?: string;
  ticketNumber?: string;
  error?: string;
}

/**
 * Create a support ticket from conversation
 */
export async function createTicket(input: TicketCreateInput): Promise<TicketCreateResult> {
  const supabase = await createClient();

  // Generate summary if not provided
  const summary = input.summary || generateTicketSummary(input.messages);

  // Determine priority and category from messages if not provided
  const allContent = input.messages.map((m) => m.content).join(" ");
  const priority = input.priority || determinePriority(allContent);
  const category = input.category || determineCategory(allContent);

  // Format messages for ticket details
  const formattedMessages = formatMessagesForTicket(input.messages);

  // Generate ticket number: TKT-YYYYMMDD-XXXX
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  const ticketNumber = `TKT-${dateStr}-${randomSuffix}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("support_tickets")
    .insert({
      conversation_id: input.conversationId,
      user_id: input.userId || null,
      guest_email: input.guestEmail || null,
      guest_name: input.guestName || null,
      summary,
      priority,
      category,
      status: "open",
      details: {
        transcript: formattedMessages,
        message_count: input.messages.length,
        ...input.metadata,
      },
    })
    .select("id")
    .single();

  if (error) {
    console.error("[Tickets] Create failed:", error);
    return { success: false, error: error.message };
  }

  // Update conversation with ticket reference
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("conversations")
    .update({
      ticket_id: data.id,
      status: "escalated",
    })
    .eq("id", input.conversationId);

  return {
    success: true,
    ticketId: data.id,
    ticketNumber,
  };
}

/**
 * Check if message content should trigger escalation
 */
export function shouldEscalate(message: string): boolean {
  const lower = message.toLowerCase();
  return ESCALATION_TOPICS.some((topic) => lower.includes(topic));
}

/**
 * Get ticket by ID
 */
export async function getTicket(ticketId: string): Promise<SupportTicket | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("support_tickets")
    .select("*")
    .eq("id", ticketId)
    .single();

  if (error || !data) {
    return null;
  }

  return data as SupportTicket;
}

/**
 * Get tickets for admin inbox
 */
export async function getOpenTickets(options: {
  status?: string[];
  priority?: TicketPriority[];
  category?: TicketCategory[];
  assignedTo?: string;
  limit?: number;
  offset?: number;
}): Promise<{ tickets: SupportTicket[]; total: number }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("support_tickets")
    .select("*, profiles:user_id(full_name, email)", { count: "exact" });

  // Apply filters
  if (options.status && options.status.length > 0) {
    query = query.in("status", options.status);
  } else {
    // Default to open tickets
    query = query.in("status", ["open", "in_progress"]);
  }

  if (options.priority && options.priority.length > 0) {
    query = query.in("priority", options.priority);
  }

  if (options.category && options.category.length > 0) {
    query = query.in("category", options.category);
  }

  if (options.assignedTo) {
    query = query.eq("assigned_to", options.assignedTo);
  }

  // Order by priority (urgent first) then by created date
  query = query
    .order("priority", { ascending: false })
    .order("created_at", { ascending: true });

  // Pagination
  if (options.limit) {
    query = query.limit(options.limit);
  }
  if (options.offset) {
    query = query.range(options.offset, options.offset + (options.limit || 20) - 1);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error("[Tickets] Fetch failed:", error);
    return { tickets: [], total: 0 };
  }

  return {
    tickets: (data || []) as SupportTicket[],
    total: count || 0,
  };
}

/**
 * Update ticket status
 */
export async function updateTicketStatus(
  ticketId: string,
  status: "open" | "in_progress" | "waiting" | "resolved" | "closed",
  adminId: string,
  resolution?: string
): Promise<boolean> {
  const supabase = await createClient();

  const updates: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "in_progress" || status === "waiting") {
    updates.assigned_to = adminId;
  }

  if (status === "resolved" || status === "closed") {
    updates.resolved_at = new Date().toISOString();
    if (resolution) {
      updates.resolution = resolution;
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("support_tickets")
    .update(updates)
    .eq("id", ticketId);

  if (error) {
    console.error("[Tickets] Update failed:", error);
    return false;
  }

  // Log the action
  await logTicketAction(ticketId, adminId, "status_change", { new_status: status, resolution });

  return true;
}

/**
 * Assign ticket to admin
 */
export async function assignTicket(
  ticketId: string,
  assigneeId: string,
  assignerId: string
): Promise<boolean> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("support_tickets")
    .update({
      assigned_to: assigneeId,
      status: "in_progress",
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    console.error("[Tickets] Assign failed:", error);
    return false;
  }

  await logTicketAction(ticketId, assignerId, "assigned", { assigned_to: assigneeId });

  return true;
}

/**
 * Add internal note to ticket
 */
export async function addTicketNote(
  ticketId: string,
  adminId: string,
  note: string
): Promise<boolean> {
  const supabase = await createClient();

  // Get current notes
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: ticket } = await (supabase as any)
    .from("support_tickets")
    .select("details")
    .eq("id", ticketId)
    .single();

  const currentDetails = (ticket?.details || {}) as Record<string, unknown>;
  const notes = (currentDetails.notes || []) as Array<{ admin_id: string; note: string; created_at: string }>;

  notes.push({
    admin_id: adminId,
    note: redactSensitiveData(note),
    created_at: new Date().toISOString(),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("support_tickets")
    .update({
      details: { ...currentDetails, notes },
      updated_at: new Date().toISOString(),
    })
    .eq("id", ticketId);

  if (error) {
    console.error("[Tickets] Add note failed:", error);
    return false;
  }

  await logTicketAction(ticketId, adminId, "note_added", {});

  return true;
}

/**
 * Log ticket action for audit trail
 */
async function logTicketAction(
  ticketId: string,
  userId: string,
  action: string,
  metadata: Record<string, unknown>
): Promise<void> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("audit_log").insert({
    user_id: userId,
    action: `ticket.${action}`,
    resource_type: "support_ticket",
    resource_id: ticketId,
    metadata,
  });
}

/**
 * Get conversation messages for a ticket
 */
export async function getTicketConversation(
  conversationId: string
): Promise<ChatMessage[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("support_messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("[Tickets] Get conversation failed:", error);
    return [];
  }

  return (data || []) as ChatMessage[];
}

/**
 * Add agent message to escalated conversation
 */
export async function addAgentMessage(
  conversationId: string,
  adminId: string,
  content: string
): Promise<ChatMessage | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("support_messages")
    .insert({
      conversation_id: conversationId,
      sender: "agent",
      content,
      metadata: { agent_id: adminId },
    })
    .select()
    .single();

  if (error) {
    console.error("[Tickets] Add agent message failed:", error);
    return null;
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

  return data as ChatMessage;
}

/**
 * Get ticket statistics for dashboard
 */
export async function getTicketStats(): Promise<{
  open: number;
  inProgress: number;
  resolved: number;
  avgResolutionTime: number;
}> {
  const supabase = await createClient();

  // Get counts by status
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: statusCounts } = await (supabase as any)
    .from("support_tickets")
    .select("status")
    .in("status", ["open", "in_progress", "resolved"]);

  const counts = {
    open: 0,
    inProgress: 0,
    resolved: 0,
  };

  if (statusCounts) {
    for (const row of statusCounts as { status: string }[]) {
      if (row.status === "open") counts.open++;
      else if (row.status === "in_progress") counts.inProgress++;
      else if (row.status === "resolved") counts.resolved++;
    }
  }

  // Calculate average resolution time (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: resolvedTickets } = await (supabase as any)
    .from("support_tickets")
    .select("created_at, resolved_at")
    .eq("status", "resolved")
    .not("resolved_at", "is", null)
    .gte("resolved_at", thirtyDaysAgo.toISOString());

  let avgResolutionTime = 0;
  if (resolvedTickets && resolvedTickets.length > 0) {
    const tickets = resolvedTickets as { created_at: string; resolved_at: string }[];
    const totalMs = tickets.reduce((sum, t) => {
      const created = new Date(t.created_at).getTime();
      const resolved = new Date(t.resolved_at).getTime();
      return sum + (resolved - created);
    }, 0);
    avgResolutionTime = totalMs / tickets.length / (1000 * 60 * 60); // hours
  }

  return { ...counts, avgResolutionTime };
}

/**
 * Generate escalation message for user
 */
export function getEscalationMessage(ticketNumber?: string): string {
  if (ticketNumber) {
    return `I've created a support ticket for you (**${ticketNumber}**). Our team will review your request and get back to you shortly. You'll receive updates via email.`;
  }
  return "I've escalated this to our support team. Someone will follow up with you shortly.";
}
