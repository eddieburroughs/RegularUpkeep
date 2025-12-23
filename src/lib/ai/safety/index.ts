/**
 * AI Safety Module
 *
 * Provides guardrails, content filtering, and policy event generation.
 */

import type { AIPolicyEvent, AIPolicyEventType } from "../types";

// ============================================================================
// Safety Patterns
// ============================================================================

const DANGEROUS_DIY_PATTERNS = [
  // Electrical
  /\b(rewire|wire yourself|diy electrical|bypass breaker|splice wire|replace panel|modify circuit)/i,
  /\b(without an electrician|skip the electrician|save money.*electrical)/i,
  // Gas
  /\b(gas line|gas leak|pilot light|gas valve|propane|natural gas).*\b(diy|yourself|fix it|repair it)/i,
  /\b(without a plumber|skip the plumber).*gas/i,
  // Structural
  /\b(remove.*load.?bearing|knock out.*wall|diy.*foundation|structural.*yourself)/i,
  // Hazmat
  /\b(asbestos|lead paint|mold removal).*\b(diy|yourself|remove it yourself)/i,
];

const EXACT_PRICE_PATTERNS = [
  /\$\d{1,3}(?:,\d{3})*(?:\.\d{2})?\b(?!\s*(?:range|to|-))/i, // $X.XX not followed by range indicators
  /(?:cost|price|charge|fee|quote).*(?:is|will be|would be)\s*\$\d+/i,
  /\bexactly\s*\$\d+/i,
  /\bguaranteed\s*(?:price|cost|rate)/i,
];

const PII_PATTERNS = [
  /\b\d{3}[-.\s]?\d{2}[-.\s]?\d{4}\b/, // SSN
  /\b\d{16}\b/, // Credit card
  /\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/, // Phone (basic)
];

const LEGAL_CLAIM_PATTERNS = [
  /\bguarantee(?:d|s)?\b.*\b(?:fix|solve|repair)/i,
  /\bwarranty\b.*\b(?:void|invalid)/i,
  /\bliable|liability|lawsuit|sue\b/i,
  /\byou (?:must|have to|need to)\b.*\b(?:pay|compensate)/i,
];

const PROFANITY_PATTERNS = [
  // Basic list - expand as needed
  /\b(damn|hell|crap)\b/i, // Mild
  // More severe patterns omitted for code cleanliness
];

// ============================================================================
// Safety Check Functions
// ============================================================================

/**
 * Check input for safety concerns before sending to AI
 */
export function checkInputSafety(input: string): AIPolicyEvent[] {
  const events: AIPolicyEvent[] = [];

  // Check for PII in input
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(input)) {
      events.push({
        type: "PII_DETECTED",
        severity: "warning",
        message: "Potential PII detected in input",
        metadata: { pattern: pattern.source },
      });
      break; // One PII event is enough
    }
  }

  return events;
}

/**
 * Check AI output for safety concerns
 */
export function checkOutputSafety(output: string): AIPolicyEvent[] {
  const events: AIPolicyEvent[] = [];

  // Check for dangerous DIY instructions
  for (const pattern of DANGEROUS_DIY_PATTERNS) {
    if (pattern.test(output)) {
      events.push({
        type: "SAFETY_FLAG_ELECTRICAL",
        severity: "critical",
        message: "Output contains potentially dangerous DIY instructions",
        metadata: { pattern: pattern.source },
      });
      break;
    }
  }

  // Check for exact pricing
  for (const pattern of EXACT_PRICE_PATTERNS) {
    if (pattern.test(output)) {
      events.push({
        type: "PRICING_MENTIONED",
        severity: "warning",
        message: "Output contains specific pricing (should use ranges)",
        metadata: { pattern: pattern.source },
      });
      break;
    }
  }

  // Check for PII in output
  for (const pattern of PII_PATTERNS) {
    if (pattern.test(output)) {
      events.push({
        type: "PII_DETECTED",
        severity: "critical",
        message: "PII detected in AI output",
        metadata: { pattern: pattern.source },
      });
      break;
    }
  }

  // Check for legal claims
  for (const pattern of LEGAL_CLAIM_PATTERNS) {
    if (pattern.test(output)) {
      events.push({
        type: "LEGAL_CLAIM_DETECTED",
        severity: "warning",
        message: "Output contains potential legal claims",
        metadata: { pattern: pattern.source },
      });
      break;
    }
  }

  // Check for profanity
  for (const pattern of PROFANITY_PATTERNS) {
    if (pattern.test(output)) {
      events.push({
        type: "PROFANITY_DETECTED",
        severity: "info",
        message: "Profanity detected in output",
      });
      break;
    }
  }

  return events;
}

/**
 * Sanitize output by removing or replacing dangerous content
 */
export function sanitizeOutput(output: string): string {
  let sanitized = output;

  // Remove dangerous DIY instructions
  for (const pattern of DANGEROUS_DIY_PATTERNS) {
    sanitized = sanitized.replace(
      pattern,
      "[Content removed for safety - please consult a licensed professional]"
    );
  }

  // Redact PII
  for (const pattern of PII_PATTERNS) {
    sanitized = sanitized.replace(pattern, "[REDACTED]");
  }

  return sanitized;
}

/**
 * Add uncertainty language to definitive statements
 */
export function addUncertaintyLanguage(text: string): string {
  // Replace definitive statements with uncertain ones
  const replacements: [RegExp, string][] = [
    [/\bwill definitely\b/gi, "may"],
    [/\bis definitely\b/gi, "may be"],
    [/\bwill certainly\b/gi, "may"],
    [/\bis certainly\b/gi, "appears to be"],
    [/\byou must\b/gi, "you may want to"],
    [/\byou need to\b/gi, "you may need to"],
    [/\bthis is\b/gi, "this appears to be"],
    [/\bthe problem is\b/gi, "the issue may be"],
  ];

  let result = text;
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }

  return result;
}

/**
 * Generate category-specific safety notes
 */
export function generateSafetyNotes(category: string): string[] {
  const safetyNotes: Record<string, string[]> = {
    electrical: [
      "Always turn off power at the breaker before any inspection",
      "Do not touch exposed wires or components",
      "If you smell burning or see sparks, evacuate and call 911",
      "Electrical work should only be done by licensed electricians",
    ],
    plumbing: [
      "Know the location of your main water shutoff valve",
      "If you smell gas, evacuate immediately and call your gas company",
      "Do not use chemical drain cleaners excessively",
      "Standing water can be a slip hazard",
    ],
    hvac: [
      "Turn off the system before any inspection",
      "Do not block vents or returns",
      "Change filters regularly for safety and efficiency",
      "Carbon monoxide detectors should be tested monthly",
    ],
    gas: [
      "If you smell gas, do not use any electrical switches",
      "Evacuate the area immediately if you suspect a gas leak",
      "Only licensed professionals should work on gas lines",
      "Never attempt DIY repairs on gas appliances",
    ],
  };

  return safetyNotes[category.toLowerCase()] || [
    "Always prioritize safety over convenience",
    "When in doubt, consult a licensed professional",
    "Keep children and pets away from work areas",
  ];
}

/**
 * Determine if content requires emergency flagging
 */
export function checkForEmergency(text: string): boolean {
  const emergencyPatterns = [
    /\bgas leak\b/i,
    /\bsmoke\b.*\bfire\b/i,
    /\bfire\b.*\bsmoke\b/i,
    /\belectrical fire\b/i,
    /\bflooding\b/i,
    /\bwater.*everywhere\b/i,
    /\bno heat\b.*\b(winter|cold|freezing)\b/i,
    /\bcarbon monoxide\b/i,
    /\bco detector\b.*\balarm\b/i,
    /\bsparking\b.*\boutlet\b/i,
    /\bexposed wire\b/i,
    /\bsewage\b.*\bbackup\b/i,
  ];

  return emergencyPatterns.some((pattern) => pattern.test(text));
}

/**
 * Get safety policy events for a specific category
 */
export function getCategorySafetyFlags(category: string): AIPolicyEventType[] {
  const categoryFlags: Record<string, AIPolicyEventType[]> = {
    electrical: ["SAFETY_FLAG_ELECTRICAL"],
    plumbing: ["SAFETY_FLAG_GAS"], // Plumbing can involve gas lines
    hvac: ["SAFETY_FLAG_GAS", "SAFETY_FLAG_ELECTRICAL"],
    exterior: ["SAFETY_FLAG_STRUCTURAL"],
    safety: ["SAFETY_FLAG_EMERGENCY"],
  };

  return categoryFlags[category.toLowerCase()] || [];
}
