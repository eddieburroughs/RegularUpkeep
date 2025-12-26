/**
 * Identity Verification State Machine
 *
 * Flow:
 * 1. NONE → Ask for support code
 * 2. CODE_PENDING → Validate code, show masked email for confirmation
 * 3. CODE_CONFIRMED / FALLBACK_PENDING → Ask for name + email/phone
 * 4. VERIFIED → Identity confirmed
 */

import { createClient } from "@/lib/supabase/server";
import type { LookupResult, UserRole } from "@/types/database";
import { validateSupportCode, normalizeSupportCode, maskEmail, maskPhone, hashForLog, extractSupportCode, extractEmail, extractPhone, extractName, isSkipMessage, isAffirmative, isNegative } from "./utils";

// Local type for identity verification state machine
export type IdentityStateValue = "none" | "code_pending" | "code_confirmed" | "fallback_pending" | "verified" | "skipped" | "failed";

export interface IdentityContext {
  state: IdentityStateValue;
  userId?: string;
  supportCode?: string;
  maskedEmail?: string | null;
  maskedPhone?: string | null;
  fullName?: string;
  attemptCount: number;
  skipReason?: string;
}

export interface IdentityTransitionResult {
  context: IdentityContext;
  response?: string;
  shouldContinue: boolean;
  lookupResult?: LookupResult;
}

const MAX_ATTEMPTS = 3;

/**
 * Initialize identity context
 */
export function createIdentityContext(existingUserId?: string): IdentityContext {
  if (existingUserId) {
    return {
      state: "verified",
      userId: existingUserId,
      attemptCount: 0,
    };
  }

  return {
    state: "none",
    attemptCount: 0,
  };
}

/**
 * Process identity verification based on current state and user message
 */
export async function processIdentityStep(
  context: IdentityContext,
  userMessage: string
): Promise<IdentityTransitionResult> {
  const { state, attemptCount } = context;

  // Already verified, no action needed
  if (state === "verified") {
    return { context, shouldContinue: true };
  }

  // Max attempts reached
  if (attemptCount >= MAX_ATTEMPTS) {
    return {
      context: { ...context, state: "failed" },
      response: "I wasn't able to verify your identity after several attempts. I'll create a support ticket so our team can help you directly.",
      shouldContinue: false,
    };
  }

  switch (state) {
    case "none":
      return handleNoneState(context, userMessage);

    case "code_pending":
      return handleCodePendingState(context, userMessage);

    case "code_confirmed":
      return handleCodeConfirmedState(context, userMessage);

    case "fallback_pending":
      return handleFallbackPendingState(context, userMessage);

    default:
      return { context, shouldContinue: true };
  }
}

/**
 * Handle NONE state - prompt for support code
 */
async function handleNoneState(
  context: IdentityContext,
  userMessage: string
): Promise<IdentityTransitionResult> {
  // Check if message already contains a support code
  const extractedCode = extractSupportCode(userMessage);
  if (extractedCode) {
    return validateAndLookupCode({ ...context, state: "code_pending" }, extractedCode);
  }

  // User wants to skip
  if (isSkipMessage(userMessage)) {
    return {
      context: {
        ...context,
        state: "fallback_pending",
        skipReason: "user_skipped",
      },
      response: "No problem! Please provide your **full name** and the **email address** or **phone number** associated with your account.",
      shouldContinue: false,
    };
  }

  // Prompt for support code
  return {
    context: { ...context, state: "code_pending" },
    response: 'To pull up your account quickly, please enter your **Customer Support Code** (find it on your **Profile** page near the bottom). It looks like `RU-XXXXXX-XXXX`.\n\nIf you don\'t have it, just type "skip".',
    shouldContinue: false,
  };
}

/**
 * Handle CODE_PENDING state - validate the provided code
 */
async function handleCodePendingState(
  context: IdentityContext,
  userMessage: string
): Promise<IdentityTransitionResult> {
  // User wants to skip
  if (isSkipMessage(userMessage)) {
    return {
      context: {
        ...context,
        state: "fallback_pending",
        skipReason: "user_skipped",
      },
      response: "No problem! Please provide your **full name** and the **email address** or **phone number** associated with your account.",
      shouldContinue: false,
    };
  }

  // Extract and validate code
  const extractedCode = extractSupportCode(userMessage);
  if (!extractedCode) {
    // Check if it looks like they tried to enter a code
    if (userMessage.toUpperCase().includes("RU-") || /[A-Z0-9]{6,}/.test(userMessage.toUpperCase())) {
      return {
        context: { ...context, attemptCount: context.attemptCount + 1 },
        response: "That doesn't look like a valid support code. The format is `RU-XXXXXX-XXXX` (e.g., RU-ABC123-XY89). Please try again or type \"skip\" to verify with your email instead.",
        shouldContinue: false,
      };
    }

    // They entered something else entirely - might be answering a different question
    return {
      context,
      shouldContinue: true,
    };
  }

  return validateAndLookupCode(context, extractedCode);
}

/**
 * Validate code format and lookup in database
 */
async function validateAndLookupCode(
  context: IdentityContext,
  code: string
): Promise<IdentityTransitionResult> {
  const normalizedCode = normalizeSupportCode(code);

  if (!validateSupportCode(normalizedCode)) {
    return {
      context: { ...context, attemptCount: context.attemptCount + 1 },
      response: "That support code doesn't look right. Please double-check and try again, or type \"skip\" to verify with your email instead.",
      shouldContinue: false,
    };
  }

  // Lookup in database
  const lookupResult = await lookupByCode(normalizedCode);

  if (!lookupResult) {
    return {
      context: { ...context, attemptCount: context.attemptCount + 1 },
      response: "I couldn't find an account with that support code. Please double-check it, or type \"skip\" to verify with your email or phone instead.",
      shouldContinue: false,
    };
  }

  // Found - ask for confirmation
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = lookupResult as any;
  const maskedEmail = result.masked_email || maskEmail(result.email);
  const maskedPhone = result.masked_phone || maskPhone(result.phone);

  let confirmMsg = `I found an account for **${maskedEmail || "no email on file"}**`;
  if (maskedPhone) {
    confirmMsg += ` (phone: ${maskedPhone})`;
  }
  confirmMsg += ". Is that you?";

  return {
    context: {
      ...context,
      state: "code_confirmed",
      supportCode: normalizedCode,
      userId: result.user_id,
      maskedEmail,
      maskedPhone,
      fullName: result.full_name || undefined,
    },
    response: confirmMsg,
    shouldContinue: false,
    lookupResult,
  };
}

/**
 * Handle CODE_CONFIRMED state - user confirms or denies
 */
async function handleCodeConfirmedState(
  context: IdentityContext,
  userMessage: string
): Promise<IdentityTransitionResult> {
  if (isAffirmative(userMessage)) {
    return {
      context: { ...context, state: "verified" },
      response: `Great! I've verified your account${context.fullName ? `, ${context.fullName}` : ""}. How can I help you today?`,
      shouldContinue: true,
    };
  }

  if (isNegative(userMessage)) {
    return {
      context: {
        ...context,
        state: "fallback_pending",
        userId: undefined,
        supportCode: undefined,
        skipReason: "wrong_account",
      },
      response: "Sorry about that! Let's try another way. Please provide your **full name** and the **email address** or **phone number** associated with your account.",
      shouldContinue: false,
    };
  }

  // Unclear response
  return {
    context,
    response: "Please confirm - is this your account? Just say \"yes\" or \"no\".",
    shouldContinue: false,
  };
}

/**
 * Handle FALLBACK_PENDING state - collect name + email/phone
 */
async function handleFallbackPendingState(
  context: IdentityContext,
  userMessage: string
): Promise<IdentityTransitionResult> {
  const email = extractEmail(userMessage);
  const phone = extractPhone(userMessage);
  const name = extractName(userMessage);

  // Need at least email or phone
  if (!email && !phone) {
    return {
      context: { ...context, attemptCount: context.attemptCount + 1 },
      response: "I need your **email address** or **phone number** to look up your account. Please include it in your message along with your name.",
      shouldContinue: false,
    };
  }

  // Lookup by contact info
  const lookupResult = await lookupByContact(email, phone, name);

  if (!lookupResult) {
    // Couldn't find account - continue anyway as guest
    return {
      context: {
        ...context,
        state: "failed",
        fullName: name || undefined,
        skipReason: "not_found",
      },
      response: "I couldn't find an account with that information, but I can still help you! If you need account-specific assistance, I'll create a support ticket for our team to follow up.",
      shouldContinue: true,
    };
  }

  // Found - verify
  const maskedEmail = maskEmail(lookupResult.email);
  const maskedPhone = maskPhone(lookupResult.phone);

  // Transform to LookupResult format
  const typedLookupResult: LookupResult = {
    user_id: lookupResult.user_id,
    masked_email: maskedEmail,
    masked_phone: maskedPhone,
    role: lookupResult.role as UserRole,
  };

  return {
    context: {
      ...context,
      state: "verified",
      userId: lookupResult.user_id,
      maskedEmail,
      maskedPhone,
      fullName: lookupResult.full_name || name || undefined,
    },
    response: `I found your account (${maskedEmail || maskedPhone}). How can I help you today?`,
    shouldContinue: true,
    lookupResult: typedLookupResult,
  };
}

/**
 * Lookup user by support code
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function lookupByCode(code: string): Promise<any> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("profiles")
    .select("id, email, phone, full_name, support_code, role")
    .eq("support_code", code)
    .single();

  if (error || !data) {
    console.log(`[Identity] Support code lookup failed: ${hashForLog(code)}`);
    return null;
  }

  return {
    user_id: data.id,
    email: data.email,
    phone: data.phone,
    full_name: data.full_name,
    support_code: data.support_code,
    role: data.role,
  };
}

/**
 * Lookup user by email or phone
 */
async function lookupByContact(
  email: string | null,
  phone: string | null,
  name: string | null
): Promise<{
  user_id: string;
  email: string | null;
  phone: string | null;
  full_name: string | null;
  support_code: string | null;
  role: string | null;
} | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from("profiles")
    .select("id, email, phone, full_name, support_code, role");

  if (email) {
    query = query.ilike("email", email);
  } else if (phone) {
    // Normalize phone for comparison
    query = query.or(`phone.ilike.%${phone}%`);
  }

  const { data, error } = await query.limit(1).single();

  if (error || !data) {
    console.log(`[Identity] Contact lookup failed: ${email ? hashForLog(email) : "phone"}`);
    return null;
  }

  return {
    user_id: data.id,
    email: data.email,
    phone: data.phone,
    full_name: data.full_name,
    support_code: data.support_code,
    role: data.role,
  };
}

/**
 * Get initial identity prompt based on context
 */
export function getIdentityPrompt(isAuthenticated: boolean): string | null {
  if (isAuthenticated) {
    return null; // Already know who they are
  }

  return 'To help you better, could you share your **Customer Support Code**? You can find it on your Profile page. It looks like `RU-XXXXXX-XXXX`.\n\nIf you don\'t have it, just type "skip".';
}

/**
 * Check if identity verification is needed for a given topic
 */
export function needsIdentityVerification(intent: string): boolean {
  const identityRequiredIntents = [
    "support",
    "billing",
    "booking",
    "bug",
    "account",
    "inspection",
  ];

  return identityRequiredIntents.includes(intent);
}
