/**
 * Support Chat Analytics
 *
 * Track usage, performance, and errors for the support chatbot.
 */

import { createClient } from "@/lib/supabase/server";

// Event types
export type AnalyticsEvent =
  | "chat_started"
  | "chat_message_sent"
  | "chat_message_received"
  | "chat_escalated"
  | "chat_resolved"
  | "kb_search"
  | "identity_verified"
  | "identity_failed"
  | "ticket_created"
  | "ticket_resolved"
  | "error";

export type AnalyticsData = {
  event: AnalyticsEvent;
  conversationId?: string;
  userId?: string;
  channel?: string;
  metadata?: Record<string, unknown>;
  latencyMs?: number;
  error?: string;
};

/**
 * Log an analytics event
 */
export async function logEvent(data: AnalyticsData): Promise<void> {
  try {
    const supabase = await createClient();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("audit_log").insert({
      action: `support_chat.${data.event}`,
      user_id: data.userId || null,
      resource_type: "conversation",
      resource_id: data.conversationId || null,
      metadata: {
        channel: data.channel,
        latencyMs: data.latencyMs,
        error: data.error,
        ...data.metadata,
      },
    });
  } catch (error) {
    // Don't let analytics errors affect the main flow
    console.error("[Analytics] Failed to log event:", error);
  }
}

/**
 * Log an error with context
 */
export async function logError(
  error: Error | string,
  context: {
    conversationId?: string;
    userId?: string;
    action?: string;
    metadata?: Record<string, unknown>;
  }
): Promise<void> {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;

  console.error(`[Support Chat Error] ${context.action || "unknown"}:`, errorMessage);

  await logEvent({
    event: "error",
    conversationId: context.conversationId,
    userId: context.userId,
    error: errorMessage,
    metadata: {
      action: context.action,
      stack: errorStack,
      ...context.metadata,
    },
  });
}

/**
 * Track RAG search performance
 */
export async function trackRAGSearch(
  conversationId: string,
  query: string,
  resultsCount: number,
  topSimilarity: number,
  latencyMs: number
): Promise<void> {
  await logEvent({
    event: "kb_search",
    conversationId,
    latencyMs,
    metadata: {
      queryLength: query.length,
      resultsCount,
      topSimilarity,
      hasResults: resultsCount > 0,
    },
  });
}

/**
 * Track escalation events
 */
export async function trackEscalation(
  conversationId: string,
  userId: string | undefined,
  reason: string,
  ticketId?: string
): Promise<void> {
  await logEvent({
    event: "chat_escalated",
    conversationId,
    userId,
    metadata: {
      reason,
      ticketId,
    },
  });
}

/**
 * Get chat analytics summary
 */
export async function getChatAnalytics(
  startDate: Date,
  endDate: Date
): Promise<{
  totalConversations: number;
  totalMessages: number;
  escalationRate: number;
  avgMessagesPerConversation: number;
  topCategories: Array<{ category: string; count: number }>;
}> {
  const supabase = await createClient();

  // Get conversation counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: totalConversations } = await (supabase as any)
    .from("conversations")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  // Get message counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: totalMessages } = await (supabase as any)
    .from("support_messages")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  // Get escalation counts
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { count: escalatedCount } = await (supabase as any)
    .from("support_tickets")
    .select("id", { count: "exact", head: true })
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  // Get category breakdown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: categoryData } = await (supabase as any)
    .from("support_tickets")
    .select("category")
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString());

  const categoryCounts = new Map<string, number>();
  for (const ticket of (categoryData || []) as { category: string }[]) {
    categoryCounts.set(ticket.category, (categoryCounts.get(ticket.category) || 0) + 1);
  }

  const topCategories = Array.from(categoryCounts.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    totalConversations: totalConversations || 0,
    totalMessages: totalMessages || 0,
    escalationRate:
      totalConversations && totalConversations > 0
        ? ((escalatedCount || 0) / totalConversations) * 100
        : 0,
    avgMessagesPerConversation:
      totalConversations && totalConversations > 0
        ? (totalMessages || 0) / totalConversations
        : 0,
    topCategories,
  };
}

/**
 * Get daily chat volume
 */
export async function getDailyVolume(
  days: number = 7
): Promise<Array<{ date: string; conversations: number; messages: number }>> {
  const supabase = await createClient();
  const result: Array<{ date: string; conversations: number; messages: number }> = [];

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split("T")[0];

    const startOfDay = `${dateStr}T00:00:00.000Z`;
    const endOfDay = `${dateStr}T23:59:59.999Z`;

    const [convResult, msgResult] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from("support_messages")
        .select("id", { count: "exact", head: true })
        .gte("created_at", startOfDay)
        .lte("created_at", endOfDay),
    ]);

    result.push({
      date: dateStr,
      conversations: convResult.count || 0,
      messages: msgResult.count || 0,
    });
  }

  return result.reverse();
}

/**
 * Track response time
 */
export function createLatencyTracker(): {
  start: () => void;
  end: () => number;
} {
  let startTime = 0;

  return {
    start: () => {
      startTime = Date.now();
    },
    end: () => {
      return Date.now() - startTime;
    },
  };
}
