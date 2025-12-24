/**
 * Support Chat Lookup API
 *
 * Endpoints for identity verification lookups.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  validateSupportCode,
  normalizeSupportCode,
  maskEmail,
  maskPhone,
  hashForLog,
} from "@/lib/support-chat/utils";
import { RATE_LIMIT } from "@/lib/support-chat/constants";
import type { LookupByCodeRequest, LookupByContactRequest, LookupResponse } from "@/types/database";

/**
 * POST /api/support-chat/lookup
 *
 * Lookup user by support code or contact info
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Rate limiting
  const clientIP = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  const rateLimited = await checkRateLimit(supabase, clientIP, "lookup");

  if (rateLimited) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();

    // Determine lookup type
    if (body.code || body.supportCode) {
      // Accept both 'code' and 'supportCode' for compatibility
      const codeBody: LookupByCodeRequest = {
        code: body.code || body.supportCode,
        public_token: body.public_token,
      };
      return handleCodeLookup(supabase, codeBody);
    } else if (body.email || body.phone) {
      return handleContactLookup(supabase, body as LookupByContactRequest);
    } else {
      return NextResponse.json(
        { error: "supportCode, email, or phone required" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("[Lookup] Error:", error);
    return NextResponse.json(
      { error: "Lookup failed" },
      { status: 500 }
    );
  }
}

/**
 * Lookup by support code
 */
async function handleCodeLookup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  body: LookupByCodeRequest
): Promise<NextResponse> {
  const code = normalizeSupportCode(body.code);

  if (!validateSupportCode(code)) {
    return NextResponse.json({
      success: false,
      error: "Invalid support code format",
    } as LookupResponse);
  }

  console.log(`[Lookup] Support code lookup: ${hashForLog(code)}`);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("id, email, phone, full_name, role")
    .eq("support_code", code)
    .single();

  if (error || !data) {
    return NextResponse.json({
      success: false,
      error: "No account found with that support code",
    } as LookupResponse);
  }

  return NextResponse.json({
    success: true,
    result: {
      user_id: data.id,
      email: data.email,
      phone: data.phone,
      full_name: data.full_name,
      role: data.role,
      masked_email: maskEmail(data.email),
      masked_phone: maskPhone(data.phone),
    },
  } as LookupResponse);
}

/**
 * Lookup by email or phone
 */
async function handleContactLookup(
  supabase: Awaited<ReturnType<typeof createClient>>,
  body: LookupByContactRequest
): Promise<NextResponse> {
  const { email, phone, name } = body;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("profiles")
    .select("id, email, phone, full_name, role, support_code");

  if (email) {
    query = query.ilike("email", email.toLowerCase());
    console.log(`[Lookup] Email lookup: ${hashForLog(email)}`);
  } else if (phone) {
    // Normalize phone - remove non-digits
    const digits = phone.replace(/\D/g, "");
    query = query.or(`phone.ilike.%${digits}%`);
    console.log(`[Lookup] Phone lookup`);
  }

  const { data, error } = await query.limit(1).single();

  if (error || !data) {
    return NextResponse.json({
      success: false,
      error: "No account found with that contact information",
    } as LookupResponse);
  }

  // Optionally verify name matches (loose match)
  if (name && data.full_name) {
    const nameLower = name.toLowerCase();
    const fullNameLower = data.full_name.toLowerCase();

    if (!fullNameLower.includes(nameLower) && !nameLower.includes(fullNameLower)) {
      // Name doesn't match - still return but flag it
      console.log(`[Lookup] Name mismatch: provided=${hashForLog(name)}`);
    }
  }

  return NextResponse.json({
    success: true,
    result: {
      user_id: data.id,
      email: data.email,
      phone: data.phone,
      full_name: data.full_name,
      role: data.role,
      support_code: data.support_code,
      masked_email: maskEmail(data.email),
      masked_phone: maskPhone(data.phone),
    },
  } as LookupResponse);
}

/**
 * Check and update rate limit
 */
async function checkRateLimit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  identifier: string,
  action: string
): Promise<boolean> {
  const key = `${action}:${identifier}`;
  const now = new Date();
  const minuteAgo = new Date(now.getTime() - 60000);
  const hourAgo = new Date(now.getTime() - 3600000);

  // Get recent requests
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: recentRequests } = await (supabase as any)
    .from("chat_rate_limits")
    .select("created_at")
    .eq("identifier", key)
    .gte("created_at", hourAgo.toISOString());

  if (!recentRequests) {
    // Record this request
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("chat_rate_limits").insert({
      identifier: key,
      identifier_type: "ip",
      created_at: now.toISOString(),
    });
    return false;
  }

  // Count requests in last minute and hour
  const lastMinute = recentRequests.filter(
    (r: { created_at: string }) => new Date(r.created_at) > minuteAgo
  ).length;
  const lastHour = recentRequests.length;

  // Check limits
  if (
    lastMinute >= RATE_LIMIT.LOOKUP_REQUESTS_PER_MINUTE ||
    lastHour >= RATE_LIMIT.LOOKUP_REQUESTS_PER_HOUR
  ) {
    return true;
  }

  // Record this request
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("chat_rate_limits").insert({
    identifier: key,
    identifier_type: "ip",
    created_at: now.toISOString(),
  });

  return false;
}
