/**
 * Support Chatbot Utility Functions
 */

import { createHash, randomBytes } from "crypto";
import { SUPPORT_CODE_REGEX, SENSITIVE_DATA_PATTERNS, PRIORITY_KEYWORDS } from "./constants";
import type { TicketPriority, TicketCategory, UserRole } from "@/types/database";

/**
 * Validate support code format: RU-XXXXXX-XXXX
 */
export function validateSupportCode(code: string): boolean {
  return SUPPORT_CODE_REGEX.test(code.toUpperCase().trim());
}

/**
 * Normalize support code to uppercase
 */
export function normalizeSupportCode(code: string): string {
  return code.toUpperCase().trim();
}

/**
 * Mask email for display: john.doe@example.com → j***@e***.com
 */
export function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@");
  if (!local || !domain) return null;

  const maskedLocal = local.length > 1 ? local[0] + "***" : local;
  const domainParts = domain.split(".");
  const maskedDomain = domainParts[0]?.length > 1
    ? domainParts[0][0] + "***"
    : domainParts[0];

  return `${maskedLocal}@${maskedDomain}.${domainParts.slice(1).join(".")}`;
}

/**
 * Mask phone for display: 555-123-4567 → ***-***-4567
 */
export function maskPhone(phone: string | null): string | null {
  if (!phone) return null;
  // Remove non-digits
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return null;

  // Show last 4 digits
  const last4 = digits.slice(-4);
  return `***-***-${last4}`;
}

/**
 * Generate a secure public conversation token
 */
export function generatePublicToken(): string {
  return randomBytes(32).toString("hex");
}

/**
 * Hash a token for storage (never store raw tokens)
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Hash support code for logging (never log raw support codes)
 */
export function hashForLog(value: string): string {
  const hash = createHash("sha256").update(value).digest("hex");
  return hash.slice(0, 8) + "...";
}

/**
 * Detect sensitive data in user message
 */
export function detectSensitiveData(message: string): string[] {
  const detected: string[] = [];

  for (const { name, pattern } of SENSITIVE_DATA_PATTERNS) {
    if (pattern.test(message)) {
      detected.push(name);
    }
  }

  return detected;
}

/**
 * Redact sensitive data from message for logging
 */
export function redactSensitiveData(message: string): string {
  let redacted = message;

  for (const { name, pattern } of SENSITIVE_DATA_PATTERNS) {
    redacted = redacted.replace(pattern, `[REDACTED ${name}]`);
  }

  // Also redact email patterns
  redacted = redacted.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[REDACTED EMAIL]"
  );

  // Redact phone patterns
  redacted = redacted.replace(
    /(\+1)?[\s.-]?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g,
    "[REDACTED PHONE]"
  );

  return redacted;
}

/**
 * Determine ticket priority from message content
 */
export function determinePriority(message: string): TicketPriority {
  const lower = message.toLowerCase();

  if (PRIORITY_KEYWORDS.URGENT.some((kw) => lower.includes(kw))) {
    return "urgent";
  }
  if (PRIORITY_KEYWORDS.HIGH.some((kw) => lower.includes(kw))) {
    return "high";
  }
  if (PRIORITY_KEYWORDS.LOW.some((kw) => lower.includes(kw))) {
    return "low";
  }

  return "normal";
}

/**
 * Determine ticket category from message content
 */
export function determineCategory(message: string): TicketCategory {
  const lower = message.toLowerCase();

  if (/billing|payment|charge|invoice|refund|subscription/.test(lower)) {
    return "billing";
  }
  if (/login|password|sign in|access|locked out|can't log/.test(lower)) {
    return "login";
  }
  if (/booking|appointment|schedule|reschedule|cancel/.test(lower)) {
    return "booking";
  }
  if (/inspection|inspect|report/.test(lower)) {
    return "inspection";
  }
  if (/provider|contractor|handyman|service pro/.test(lower)) {
    return "provider";
  }
  if (/bug|error|broken|crash|glitch|not working/.test(lower)) {
    return "bug";
  }
  if (/feature|request|suggestion|would be nice|wish/.test(lower)) {
    return "feature";
  }

  return "other";
}

/**
 * Extract potential support code from message
 */
export function extractSupportCode(message: string): string | null {
  const match = message.toUpperCase().match(/RU-[A-HJ-NP-Z2-9]{6}-[A-HJ-NP-Z2-9]{4}/);
  return match ? match[0] : null;
}

/**
 * Check if message indicates user wants to skip identity verification
 */
export function isSkipMessage(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return ["skip", "i don't have it", "don't have it", "no code", "i don't know"].includes(lower);
}

/**
 * Check if message is affirmative (yes/confirm)
 */
export function isAffirmative(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return ["yes", "yeah", "yep", "yup", "correct", "that's me", "thats me", "right", "confirm", "y"].includes(lower);
}

/**
 * Check if message is negative (no/deny)
 */
export function isNegative(message: string): boolean {
  const lower = message.toLowerCase().trim();
  return ["no", "nope", "not me", "wrong", "incorrect", "different account", "n"].includes(lower);
}

/**
 * Extract email from message
 */
export function extractEmail(message: string): string | null {
  const match = message.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0].toLowerCase() : null;
}

/**
 * Extract phone from message
 */
export function extractPhone(message: string): string | null {
  // Remove common formatting
  const cleaned = message.replace(/[^\d+]/g, "");
  // Match US phone numbers (with or without country code)
  const match = cleaned.match(/^\+?1?(\d{10})$/);
  return match ? match[1] : null;
}

/**
 * Extract name from message (basic heuristic)
 */
export function extractName(message: string): string | null {
  // Remove common prefixes
  const cleaned = message
    .replace(/^(my name is|i'm|i am|name:|name is)\s*/i, "")
    .trim();

  // Basic validation: 2-50 chars, starts with letter
  if (cleaned.length >= 2 && cleaned.length <= 50 && /^[a-zA-Z]/.test(cleaned)) {
    return cleaned;
  }

  return null;
}

/**
 * Map user role to KB role visibility
 */
export function roleToKBVisibility(role: UserRole | undefined): string {
  if (!role) return "all";

  switch (role) {
    case "customer":
      return "homeowner";
    case "provider":
      return "provider";
    case "handyman":
      return "handyman";
    case "admin":
    case "territory_manager":
    case "franchisee":
      return "admin";
    default:
      return "all";
  }
}

/**
 * Generate a summary from conversation messages
 */
export function generateTicketSummary(messages: Array<{ sender: string; content: string }>): string {
  // Get the first user message as the base
  const firstUserMessage = messages.find((m) => m.sender === "user");
  if (!firstUserMessage) return "Support request";

  // Truncate to reasonable length
  const content = firstUserMessage.content;
  if (content.length <= 100) return content;

  return content.slice(0, 97) + "...";
}

/**
 * Format messages for ticket details
 */
export function formatMessagesForTicket(
  messages: Array<{ sender: string; content: string; created_at: string }>
): string {
  return messages
    .map((m) => {
      const time = new Date(m.created_at).toLocaleString();
      const sender = m.sender === "user" ? "Customer" : m.sender === "bot" ? "Bot" : "Agent";
      return `[${time}] ${sender}:\n${m.content}`;
    })
    .join("\n\n---\n\n");
}

/**
 * Parse device info from user agent
 */
export function parseUserAgent(userAgent: string | null): {
  type: string;
  os: string;
  browser: string;
} {
  if (!userAgent) {
    return { type: "unknown", os: "unknown", browser: "unknown" };
  }

  const ua = userAgent.toLowerCase();

  // Detect device type
  let type = "desktop";
  if (/mobile|android|iphone|ipad|ipod/.test(ua)) {
    type = /ipad|tablet/.test(ua) ? "tablet" : "mobile";
  }

  // Detect OS
  let os = "unknown";
  if (/windows/.test(ua)) os = "Windows";
  else if (/mac os|macos/.test(ua)) os = "macOS";
  else if (/linux/.test(ua)) os = "Linux";
  else if (/android/.test(ua)) os = "Android";
  else if (/iphone|ipad|ipod/.test(ua)) os = "iOS";

  // Detect browser
  let browser = "unknown";
  if (/chrome/.test(ua) && !/edge|edg/.test(ua)) browser = "Chrome";
  else if (/safari/.test(ua) && !/chrome/.test(ua)) browser = "Safari";
  else if (/firefox/.test(ua)) browser = "Firefox";
  else if (/edge|edg/.test(ua)) browser = "Edge";

  return { type, os, browser };
}

/**
 * Rate limit key generator
 */
export function getRateLimitKey(
  identifier: string,
  identifierType: "ip" | "user_id" | "public_token",
  action: string
): string {
  return `ratelimit:${action}:${identifierType}:${identifier}`;
}

/**
 * Check if message is requesting human support
 */
export function isHumanRequest(message: string): boolean {
  const lower = message.toLowerCase();
  const patterns = [
    "speak to a human",
    "talk to a human",
    "real person",
    "human please",
    "agent please",
    "speak to someone",
    "talk to someone",
    "representative",
    "customer service",
    "support agent",
    "live chat",
    "live support",
  ];
  return patterns.some((p) => lower.includes(p));
}

/**
 * Truncate text to max length with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 3) + "...";
}
