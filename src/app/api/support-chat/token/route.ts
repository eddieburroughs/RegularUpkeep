/**
 * Support Chat Token API
 *
 * Generate and validate public conversation tokens.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePublicToken, hashToken } from "@/lib/support-chat/utils";
import { TOKEN_EXPIRY_HOURS } from "@/lib/support-chat/constants";

/**
 * POST /api/support-chat/token
 *
 * Generate a new public conversation token
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Rate limiting by IP
  const clientIP = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const rateLimited = await checkRateLimit(supabase, clientIP);

  if (rateLimited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    // Generate token
    const token = generatePublicToken();
    const tokenHash = hashToken(token);

    // Calculate expiry
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + TOKEN_EXPIRY_HOURS);

    // Create conversation with token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: conversation, error } = await (supabase as any)
      .from("conversations")
      .insert({
        public_token_hash: tokenHash,
        channel: "website",
        status: "active",
        token_expires_at: expiresAt.toISOString(),
        metadata: {
          created_from_ip: clientIP,
        },
      })
      .select("id")
      .single();

    if (error) {
      console.error("[Token] Failed to create conversation:", error);
      return NextResponse.json(
        { error: "Failed to generate token" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      token,
      conversationId: conversation.id,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (error) {
    console.error("[Token] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate token" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/support-chat/token
 *
 * Validate an existing token
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ valid: false, error: "Token required" });
  }

  const tokenHash = hashToken(token);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: conversation, error } = await (supabase as any)
    .from("conversations")
    .select("id, status, token_expires_at")
    .eq("public_token_hash", tokenHash)
    .single();

  if (error || !conversation) {
    return NextResponse.json({ valid: false, error: "Token not found" });
  }

  // Check expiry
  if (conversation.token_expires_at) {
    const expiresAt = new Date(conversation.token_expires_at);
    if (expiresAt < new Date()) {
      return NextResponse.json({ valid: false, error: "Token expired" });
    }
  }

  // Check status
  if (conversation.status === "closed") {
    return NextResponse.json({ valid: false, error: "Conversation closed" });
  }

  return NextResponse.json({
    valid: true,
    conversationId: conversation.id,
  });
}

/**
 * Check rate limit for token generation
 */
async function checkRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  identifier: string
): Promise<boolean> {
  const key = `token:${identifier}`;
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - 60000);
  const hourAgo = new Date(now.getTime() - 3600000);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentRequests } = await (supabase as any)
    .from("chat_rate_limits")
    .select("created_at")
    .eq("identifier", key)
    .gte("created_at", hourAgo.toISOString());

  if (!recentRequests) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("chat_rate_limits").insert({
      identifier: key,
      identifier_type: "ip",
      created_at: now.toISOString(),
    });
    return false;
  }

  const lastMinute = recentRequests.filter(
    (r: { created_at: string }) => new Date(r.created_at) > minuteAgo
  ).length;
  const lastHour = recentRequests.length;

  // Stricter limits for token generation (prevent abuse)
  if (lastMinute >= 5 || lastHour >= 20) {
    return true;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("chat_rate_limits").insert({
    identifier: key,
    identifier_type: "ip",
    created_at: now.toISOString(),
  });

  return false;
}
