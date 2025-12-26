/**
 * Support Chat Utility Tests
 */

import { describe, it, expect } from "vitest";
import {
  validateSupportCode,
  normalizeSupportCode,
  maskEmail,
  maskPhone,
  generatePublicToken,
  hashToken,
  hashForLog,
  detectSensitiveData,
  redactSensitiveData,
  determinePriority,
  determineCategory,
  extractSupportCode,
  isSkipMessage,
  isAffirmative,
  isNegative,
  extractEmail,
  extractPhone,
  extractName,
  roleToKBVisibility,
  generateTicketSummary,
  isHumanRequest,
  truncate,
} from "../utils";

describe("validateSupportCode", () => {
  it("validates correct support codes", () => {
    // Crockford base32: A-HJ-NP-Z (no I,L,O) and 2-9 (no 0,1)
    expect(validateSupportCode("RU-ABC234-XY89")).toBe(true);
    expect(validateSupportCode("RU-DEFGH2-WZ45")).toBe(true);
    expect(validateSupportCode("ru-abc234-xy89")).toBe(true); // case insensitive
  });

  it("rejects invalid support codes", () => {
    // Note: All-digit codes are valid in Crockford base32 (2-9 allowed)
    expect(validateSupportCode("XX-ABC234-XY89")).toBe(false); // wrong prefix
    expect(validateSupportCode("RU-ABC-XY89")).toBe(false); // too short
    expect(validateSupportCode("RUABC234XY89")).toBe(false); // no dashes
    expect(validateSupportCode("")).toBe(false);
    expect(validateSupportCode("RU-ABCDEFGHIJ-WXYZ")).toBe(false); // too long
  });

  it("rejects codes with ambiguous characters (0, 1, I, L, O)", () => {
    expect(validateSupportCode("RU-ABCIO1-XY89")).toBe(false); // I, O, 1 not allowed
    expect(validateSupportCode("RU-ABC123-XY89")).toBe(false); // 1 not allowed
  });
});

describe("normalizeSupportCode", () => {
  it("normalizes to uppercase", () => {
    expect(normalizeSupportCode("ru-abc234-xy89")).toBe("RU-ABC234-XY89");
  });

  it("trims whitespace", () => {
    expect(normalizeSupportCode("  RU-ABC234-XY89  ")).toBe("RU-ABC234-XY89");
  });
});

describe("maskEmail", () => {
  it("masks email addresses", () => {
    expect(maskEmail("john.doe@example.com")).toBe("j***@e***.com");
    expect(maskEmail("test@domain.org")).toBe("t***@d***.org");
  });

  it("preserves single-char parts (nothing to hide)", () => {
    // Single char local/domain parts aren't masked further
    expect(maskEmail("a@b.co")).toBe("a@b.co");
  });

  it("handles null input", () => {
    expect(maskEmail(null)).toBe(null);
  });

  it("handles invalid emails", () => {
    expect(maskEmail("notanemail")).toBe(null);
  });
});

describe("maskPhone", () => {
  it("masks phone numbers", () => {
    expect(maskPhone("555-123-4567")).toBe("***-***-4567");
    expect(maskPhone("(555) 123-4567")).toBe("***-***-4567");
    expect(maskPhone("+1 555 123 4567")).toBe("***-***-4567");
  });

  it("handles null input", () => {
    expect(maskPhone(null)).toBe(null);
  });

  it("handles short numbers", () => {
    expect(maskPhone("123")).toBe(null);
  });
});

describe("generatePublicToken", () => {
  it("generates a 64-character hex string", () => {
    const token = generatePublicToken();
    expect(token).toHaveLength(64);
    expect(/^[a-f0-9]+$/.test(token)).toBe(true);
  });

  it("generates unique tokens", () => {
    const token1 = generatePublicToken();
    const token2 = generatePublicToken();
    expect(token1).not.toBe(token2);
  });
});

describe("hashToken", () => {
  it("hashes tokens consistently", () => {
    const token = "test-token";
    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
  });

  it("produces 64-character hashes", () => {
    const hash = hashToken("test");
    expect(hash).toHaveLength(64);
  });
});

describe("hashForLog", () => {
  it("returns truncated hash with ellipsis", () => {
    const result = hashForLog("test-value");
    expect(result).toMatch(/^[a-f0-9]{8}\.\.\.$/);
  });
});

describe("detectSensitiveData", () => {
  it("detects SSN", () => {
    const result = detectSensitiveData("My SSN is 123-45-6789");
    expect(result).toContain("SSN");
  });

  it("detects credit card numbers", () => {
    const result = detectSensitiveData("Card: 4111-1111-1111-1111");
    expect(result).toContain("Credit Card");
  });

  it("returns empty array for clean messages", () => {
    const result = detectSensitiveData("Hello, I need help");
    expect(result).toHaveLength(0);
  });
});

describe("redactSensitiveData", () => {
  it("redacts SSN", () => {
    const result = redactSensitiveData("My SSN is 123-45-6789");
    expect(result).not.toContain("123-45-6789");
    expect(result).toContain("[REDACTED");
  });

  it("redacts email", () => {
    const result = redactSensitiveData("Email me at test@example.com");
    expect(result).not.toContain("test@example.com");
    expect(result).toContain("[REDACTED EMAIL]");
  });

  it("redacts phone", () => {
    const result = redactSensitiveData("Call me at 555-123-4567");
    expect(result).not.toContain("555-123-4567");
    expect(result).toContain("[REDACTED PHONE]");
  });
});

describe("determinePriority", () => {
  it("detects urgent priority", () => {
    expect(determinePriority("This is URGENT!")).toBe("urgent");
    expect(determinePriority("I need help ASAP")).toBe("urgent");
    expect(determinePriority("Site is down, critical issue")).toBe("urgent");
  });

  it("detects high priority", () => {
    expect(determinePriority("This is important")).toBe("high");
    expect(determinePriority("I'm stuck and frustrated")).toBe("high");
  });

  it("detects low priority", () => {
    expect(determinePriority("Just a question")).toBe("low");
    expect(determinePriority("When you have time")).toBe("low");
  });

  it("defaults to normal", () => {
    expect(determinePriority("I need some help")).toBe("normal");
  });
});

describe("determineCategory", () => {
  it("detects billing category", () => {
    expect(determineCategory("I have a billing question")).toBe("billing");
    expect(determineCategory("Need a refund")).toBe("billing");
  });

  it("detects login category", () => {
    expect(determineCategory("I can't log in")).toBe("login");
    expect(determineCategory("Forgot my password")).toBe("login");
  });

  it("detects booking category", () => {
    expect(determineCategory("Need to reschedule my appointment")).toBe("booking");
  });

  it("detects bug category", () => {
    expect(determineCategory("Found a bug")).toBe("bug");
    expect(determineCategory("App is not working")).toBe("bug");
  });

  it("defaults to other", () => {
    expect(determineCategory("Hello there")).toBe("other");
  });
});

describe("extractSupportCode", () => {
  it("extracts valid support codes", () => {
    // Uses Crockford base32 chars: A-HJ-NP-Z (no I,L,O) and 2-9 (no 0,1)
    expect(extractSupportCode("My code is RU-ABC234-XY89")).toBe("RU-ABC234-XY89");
    expect(extractSupportCode("ru-abc234-xy89 is my code")).toBe("RU-ABC234-XY89");
  });

  it("returns null for no match", () => {
    expect(extractSupportCode("No code here")).toBe(null);
  });

  it("returns null for codes with invalid characters (0, 1, I, L, O)", () => {
    // These contain 1 which is not in the valid charset
    expect(extractSupportCode("RU-ABC123-XY89")).toBe(null);
  });
});

describe("isSkipMessage", () => {
  it("detects skip messages", () => {
    expect(isSkipMessage("skip")).toBe(true);
    expect(isSkipMessage("I don't have it")).toBe(true);
    expect(isSkipMessage("no code")).toBe(true);
  });

  it("rejects non-skip messages", () => {
    expect(isSkipMessage("RU-ABC123-XY89")).toBe(false);
    expect(isSkipMessage("hello")).toBe(false);
  });
});

describe("isAffirmative", () => {
  it("detects affirmative responses", () => {
    expect(isAffirmative("yes")).toBe(true);
    expect(isAffirmative("Yeah")).toBe(true);
    expect(isAffirmative("that's me")).toBe(true);
    expect(isAffirmative("y")).toBe(true);
  });

  it("rejects non-affirmative responses", () => {
    expect(isAffirmative("no")).toBe(false);
    expect(isAffirmative("maybe")).toBe(false);
  });
});

describe("isNegative", () => {
  it("detects negative responses", () => {
    expect(isNegative("no")).toBe(true);
    expect(isNegative("nope")).toBe(true);
    expect(isNegative("not me")).toBe(true);
    expect(isNegative("n")).toBe(true);
  });

  it("rejects non-negative responses", () => {
    expect(isNegative("yes")).toBe(false);
    expect(isNegative("maybe")).toBe(false);
  });
});

describe("extractEmail", () => {
  it("extracts email addresses", () => {
    expect(extractEmail("Contact me at test@example.com")).toBe("test@example.com");
    expect(extractEmail("My email: John.Doe@company.co.uk")).toBe("john.doe@company.co.uk");
  });

  it("returns null for no match", () => {
    expect(extractEmail("No email here")).toBe(null);
  });
});

describe("extractPhone", () => {
  it("extracts phone numbers", () => {
    expect(extractPhone("Call 5551234567")).toBe("5551234567");
    expect(extractPhone("+1 555 123 4567")).toBe("5551234567");
  });

  it("returns null for invalid numbers", () => {
    expect(extractPhone("123")).toBe(null);
    expect(extractPhone("No phone here")).toBe(null);
  });
});

describe("extractName", () => {
  it("extracts names", () => {
    expect(extractName("My name is John Doe")).toBe("John Doe");
    expect(extractName("I'm Jane Smith")).toBe("Jane Smith");
  });

  it("validates name length", () => {
    expect(extractName("A")).toBe(null); // too short
    expect(extractName("John")).toBe("John");
  });
});

describe("roleToKBVisibility", () => {
  it("maps roles to visibility", () => {
    expect(roleToKBVisibility("customer")).toBe("homeowner");
    expect(roleToKBVisibility("provider")).toBe("provider");
    expect(roleToKBVisibility("handyman")).toBe("handyman");
    expect(roleToKBVisibility("admin")).toBe("admin");
    expect(roleToKBVisibility(undefined)).toBe("all");
  });
});

describe("generateTicketSummary", () => {
  it("generates summary from first user message", () => {
    const messages = [
      { sender: "bot", content: "Hello!" },
      { sender: "user", content: "I need help with billing" },
    ];
    expect(generateTicketSummary(messages)).toBe("I need help with billing");
  });

  it("truncates long messages", () => {
    const longMessage = "A".repeat(150);
    const messages = [{ sender: "user", content: longMessage }];
    const result = generateTicketSummary(messages);
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result.endsWith("...")).toBe(true);
  });

  it("returns default for no user messages", () => {
    const messages = [{ sender: "bot", content: "Hello!" }];
    expect(generateTicketSummary(messages)).toBe("Support request");
  });
});

describe("isHumanRequest", () => {
  it("detects human request phrases", () => {
    expect(isHumanRequest("I want to speak to a human")).toBe(true);
    expect(isHumanRequest("Let me talk to a real person")).toBe(true);
    expect(isHumanRequest("Customer service please")).toBe(true);
    expect(isHumanRequest("Live support")).toBe(true);
  });

  it("rejects non-human requests", () => {
    expect(isHumanRequest("What are your hours?")).toBe(false);
    expect(isHumanRequest("Help me book")).toBe(false);
  });
});

describe("truncate", () => {
  it("truncates long strings", () => {
    expect(truncate("Hello World", 8)).toBe("Hello...");
  });

  it("leaves short strings unchanged", () => {
    expect(truncate("Hello", 10)).toBe("Hello");
  });
});
