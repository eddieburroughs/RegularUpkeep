/**
 * Support Chat API
 *
 * Main endpoint for the support chatbot with conversation state machine.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  SYSTEM_PROMPT,
  INTENTS,
  INTENT_TO_CATEGORY,
  RAG_CONFIG,
} from "@/lib/support-chat/constants";
import {
  createIdentityContext,
  processIdentityStep,
  needsIdentityVerification,
  type IdentityContext,
} from "@/lib/support-chat/identity";
import {
  searchKnowledgeBase,
  buildRAGContextString,
  hasRelevantContext,
  formatCitationsForMetadata,
} from "@/lib/support-chat/rag";
import {
  createTicket,
  shouldEscalate,
  getEscalationMessage,
} from "@/lib/support-chat/tickets";
import {
  hashToken,
  validateSupportCode,
  detectSensitiveData,
  redactSensitiveData,
  determineCategory,
  determinePriority,
  isHumanRequest,
  truncate,
  roleToKBVisibility,
} from "@/lib/support-chat/utils";
import type { UserRole, ConversationChannel } from "@/types/database";

// Local types for API - more flexible than the strict DB types
type ChatRequest = {
  message: string;
  conversation_id?: string;
  public_token?: string;
  channel?: ConversationChannel;
};

type ChatResponse = {
  conversationId: string;
  message: {
    content: string;
    citations: Array<{ article_id: string; title: string }>;
  };
  metadata?: Record<string, unknown>;
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const authClient = await createClient(); // For auth checks
  const supabase = createServiceClient(); // For DB operations (bypasses RLS)

  try {
    const body: ChatRequest = await request.json();
    const message = body.message;
    const conversationId = body.conversation_id;
    const publicToken = body.public_token;
    const channel = body.channel || "web";

    if (!message?.trim()) {
      return NextResponse.json({ error: "Message required" }, { status: 400 });
    }

    // Check for sensitive data in message
    const sensitiveData = detectSensitiveData(message);
    if (sensitiveData.length > 0) {
      return NextResponse.json({
        conversationId: conversationId || null,
        message: {
          content: `⚠️ Please don't share sensitive information like ${sensitiveData.join(", ")}. I'll never ask for passwords, full credit card numbers, or SSNs.`,
          citations: [],
        },
        metadata: { warning: "sensitive_data_detected" },
      });
    }

    // Get user context (use auth client for user info)
    const { userId, userRole } = await getUserContext(authClient, supabase, publicToken);

    // Get or create conversation
    const { conversation, isNew } = await getOrCreateConversation(
      supabase,
      conversationId,
      userId,
      publicToken,
      channel
    );

    // Store user message
    await storeMessage(supabase, conversation.id, "user", message);

    // Get conversation state
    const state = (conversation.metadata || {}) as ConversationState;

    // Process identity verification if needed
    const identityResult = await handleIdentity(
      state,
      message,
      userId
    );

    if (identityResult.response) {
      // Identity flow has a response, store and return it
      await storeMessage(supabase, conversation.id, "bot", identityResult.response);
      await updateConversationState(supabase, conversation.id, identityResult.newState);

      return NextResponse.json({
        conversationId: conversation.id,
        message: {
          content: identityResult.response,
          citations: [],
        },
        metadata: { step: "identity" },
      });
    }

    // Check for escalation triggers
    if (shouldEscalate(message) || isHumanRequest(message)) {
      const ticketResult = await createTicket({
        conversationId: conversation.id,
        userId: identityResult.newState.identity?.userId,
        summary: truncate(message, 100),
        category: determineCategory(message),
        priority: determinePriority(message),
        messages: await getConversationMessages(supabase, conversation.id),
      });

      const escalationMsg = getEscalationMessage(ticketResult.ticketNumber);
      await storeMessage(supabase, conversation.id, "bot", escalationMsg);

      return NextResponse.json({
        conversationId: conversation.id,
        message: {
          content: escalationMsg,
          citations: [],
        },
        metadata: { escalated: true, ticketId: ticketResult.ticketId },
      });
    }

    // Search knowledge base
    const ragContext = await searchKnowledgeBase(message, {
      userRole,
      topK: RAG_CONFIG.TOP_K_RESULTS,
      threshold: RAG_CONFIG.SIMILARITY_THRESHOLD,
    });

    // Generate response using AI
    const aiResponse = await generateAIResponse(
      message,
      ragContext,
      state,
      userRole,
      await getRecentMessages(supabase, conversation.id)
    );

    // Store bot response
    const citations = formatCitationsForMetadata(ragContext);
    await storeMessage(supabase, conversation.id, "bot", aiResponse, { citations });

    // Update conversation
    await updateConversationState(supabase, conversation.id, {
      ...identityResult.newState,
      lastInteraction: new Date().toISOString(),
    });

    const response: ChatResponse = {
      conversationId: conversation.id,
      message: {
        content: aiResponse,
        citations,
      },
      metadata: {
        latencyMs: Date.now() - startTime,
        hasContext: hasRelevantContext(ragContext),
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[Support Chat] Error:", error);
    return NextResponse.json(
      { error: "An error occurred processing your message" },
      { status: 500 }
    );
  }
}

// Types for conversation state
type ConversationState = {
  identity?: IdentityContext;
  intent?: string;
  lastInteraction?: string;
};

// Helper functions

async function getUserContext(
  authClient: Awaited<ReturnType<typeof createClient>>,
  serviceClient: ReturnType<typeof createServiceClient>,
  publicToken?: string
): Promise<{ userId?: string; userRole?: UserRole }> {
  const {
    data: { user },
  } = await authClient.auth.getUser();

  if (user) {
    const { data: profile } = (await serviceClient
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()) as { data: { role: string } | null };

    return {
      userId: user.id,
      userRole: profile?.role as UserRole,
    };
  }

  return {};
}

async function getOrCreateConversation(
  supabase: ReturnType<typeof createServiceClient>,
  conversationId: string | undefined,
  userId: string | undefined,
  publicToken: string | undefined,
  channel: ConversationChannel
): Promise<{ conversation: { id: string; metadata: unknown }; isNew: boolean }> {
  if (conversationId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existing } = await (supabase as any)
      .from("conversations")
      .select("id, metadata")
      .eq("id", conversationId)
      .single();

    if (existing) {
      return { conversation: existing, isNew: false };
    }
  }

  // Create new conversation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: created, error } = await (supabase as any)
    .from("conversations")
    .insert({
      user_id: userId || null,
      public_token_hash: publicToken ? hashToken(publicToken) : null,
      channel,
      status: "active",
      metadata: {},
    })
    .select("id, metadata")
    .single();

  if (error) {
    throw new Error("Failed to create conversation");
  }

  return { conversation: created, isNew: true };
}

async function storeMessage(
  supabase: ReturnType<typeof createServiceClient>,
  conversationId: string,
  sender: "user" | "bot" | "agent",
  content: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any).from("support_messages").insert({
    conversation_id: conversationId,
    sender,
    content,
    metadata: metadata || {},
  });

  if (error) {
    console.error("[Support Chat] Failed to store message:", error);
  }
}

async function getConversationMessages(
  supabase: ReturnType<typeof createServiceClient>,
  conversationId: string
): Promise<Array<{ sender: string; content: string; created_at: string }>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("support_messages")
    .select("sender, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return data || [];
}

async function getRecentMessages(
  supabase: ReturnType<typeof createServiceClient>,
  conversationId: string,
  limit = 10
): Promise<Array<{ role: string; content: string }>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .from("support_messages")
    .select("sender, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data || [])
    .reverse()
    .map((m: { sender: string; content: string }) => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.content,
    }));
}

async function handleIdentity(
  state: ConversationState,
  message: string,
  userId?: string
): Promise<{ response?: string; newState: ConversationState }> {
  // If already authenticated, skip identity
  if (userId) {
    return {
      newState: {
        ...state,
        identity: createIdentityContext(userId),
      },
    };
  }

  // Get or create identity context
  const identity = state.identity || createIdentityContext();

  // Skip identity for simple questions
  if (identity.state === "none" && !needsIdentityVerification(detectIntent(message))) {
    return { newState: { ...state, identity } };
  }

  // Process identity step
  const result = await processIdentityStep(identity, message);

  return {
    response: result.response,
    newState: {
      ...state,
      identity: result.context,
    },
  };
}

function detectIntent(message: string): string {
  const lower = message.toLowerCase();

  // Emergency situations - always answer directly (treat as HOW_TO)
  if (/smell gas|gas leak|leaking gas|carbon monoxide|co detector|burst pipe|pipe burst|flooding|flooded|water everywhere|electrical fire|smoke alarm|fire alarm|sparks|shocking me|electrocuted/.test(lower)) {
    return INTENTS.HOW_TO;
  }

  if (/price|pricing|cost|how much|plan|subscription/.test(lower)) {
    return INTENTS.SALES;
  }
  if (/billing|payment|charge|invoice|refund/.test(lower)) {
    return INTENTS.BILLING;
  }
  if (/bug|error|broken|crash|not working/.test(lower)) {
    return INTENTS.BUG;
  }
  if (/feature|request|suggestion|would be nice/.test(lower)) {
    return INTENTS.FEATURE;
  }
  // General questions - broad pattern to catch most informational queries
  if (/^what |^how |^where |^when |^why |^which |^can i|^do i|help me|explain|tell me|required|requirements|need to know|works\?|work\?/.test(lower)) {
    return INTENTS.HOW_TO;
  }
  if (/hello|hi|hey|good morning|good afternoon/.test(lower)) {
    return INTENTS.GREETING;
  }
  if (/provider|join|become|sign up as/.test(lower)) {
    return INTENTS.PROVIDER_ONBOARDING;
  }

  return INTENTS.SUPPORT;
}

async function updateConversationState(
  supabase: ReturnType<typeof createServiceClient>,
  conversationId: string,
  state: ConversationState
): Promise<void> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("conversations")
    .update({
      metadata: state,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);
}

async function generateAIResponse(
  userMessage: string,
  ragContext: Awaited<ReturnType<typeof searchKnowledgeBase>>,
  state: ConversationState,
  userRole?: UserRole,
  recentMessages?: Array<{ role: string; content: string }>
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;

  if (!openaiKey) {
    console.error("[Support Chat] Missing OPENAI_API_KEY");
    return "I apologize, but I'm having trouble connecting right now. Please try again in a moment.";
  }

  // Build context
  const ragContextStr = buildRAGContextString(ragContext);
  const roleContext = userRole ? `User role: ${userRole}` : "User: Not authenticated";

  const systemMessage = `${SYSTEM_PROMPT}

${roleContext}

${ragContextStr}`;

  // Build messages
  const messages = [
    { role: "system" as const, content: systemMessage },
    ...(recentMessages || []).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user" as const, content: userMessage },
  ];

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        max_tokens: 1024,
        messages,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[Support Chat] AI error:", error);
      return "I apologize, but I couldn't process your request. Would you like me to create a support ticket for you?";
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      return "I'm not sure how to help with that. Would you like me to create a support ticket for you?";
    }

    return content;
  } catch (error) {
    console.error("[Support Chat] AI request failed:", error);
    return "I apologize, but I'm having technical difficulties. Please try again or request to speak with a human.";
  }
}
