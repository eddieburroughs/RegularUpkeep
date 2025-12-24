/**
 * Support Chatbot Constants
 */

// Support code format: RU-XXXXXX-XXXX (e.g., RU-ABC123-XY89)
export const SUPPORT_CODE_REGEX = /^RU-[A-HJ-NP-Z2-9]{6}-[A-HJ-NP-Z2-9]{4}$/i;

// Rate limiting
export const RATE_LIMIT = {
  PUBLIC_REQUESTS_PER_MINUTE: 10,
  PUBLIC_REQUESTS_PER_HOUR: 60,
  AUTHENTICATED_REQUESTS_PER_MINUTE: 30,
  AUTHENTICATED_REQUESTS_PER_HOUR: 200,
  LOOKUP_REQUESTS_PER_MINUTE: 5,
  LOOKUP_REQUESTS_PER_HOUR: 20,
};

// Token settings
export const TOKEN_EXPIRY_HOURS = 24;
export const TOKEN_LENGTH = 64;

// RAG settings
export const RAG_CONFIG = {
  CHUNK_SIZE_TOKENS: 500,
  CHUNK_OVERLAP_TOKENS: 50,
  TOP_K_RESULTS: 5,
  SIMILARITY_THRESHOLD: 0.5,
  EMBEDDING_MODEL: "text-embedding-3-small",
  EMBEDDING_DIMENSIONS: 1536,
};

// Intent classification
export const INTENTS = {
  SALES: "sales",
  SUPPORT: "support",
  BILLING: "billing",
  BUG: "bug",
  FEATURE: "feature",
  PROVIDER_ONBOARDING: "provider_onboarding",
  HOW_TO: "how_to",
  GREETING: "greeting",
  UNKNOWN: "unknown",
} as const;

export type Intent = (typeof INTENTS)[keyof typeof INTENTS];

// Topics that require escalation
export const ESCALATION_TOPICS = [
  "billing",
  "refund",
  "dispute",
  "payment",
  "charge",
  "cancel subscription",
  "bug",
  "error",
  "broken",
  "not working",
  "lawyer",
  "legal",
  "sue",
] as const;

// Deep link targets for in-app navigation
export const DEEP_LINKS = {
  PROPERTIES: "/app/properties",
  INSPECTION: "/app/inspection",
  MAINTENANCE: "/app/calendar",
  REQUEST_SERVICE: "/app/requests/new",
  BOOKINGS: "/app/bookings",
  BILLING: "/app/billing",
  PROFILE: "/app/profile",
  MESSAGES: "/app/messages",
  BINDER: "/app/binder",
  // Provider
  PROVIDER_JOBS: "/provider/jobs",
  PROVIDER_MONEY: "/provider/money",
  PROVIDER_PROFILE: "/provider/profile",
  // Handyman
  HANDYMAN_JOBS: "/handyman/jobs",
  HANDYMAN_MONEY: "/handyman/money",
} as const;

// Ticket categories mapped to intents
export const INTENT_TO_CATEGORY = {
  [INTENTS.BILLING]: "billing",
  [INTENTS.BUG]: "bug",
  [INTENTS.FEATURE]: "feature",
  [INTENTS.SUPPORT]: "other",
  [INTENTS.HOW_TO]: "other",
} as const;

// Priority keywords
export const PRIORITY_KEYWORDS = {
  URGENT: ["urgent", "emergency", "asap", "immediately", "critical", "broken", "down", "can't access"],
  HIGH: ["important", "need help", "frustrated", "stuck", "waiting"],
  LOW: ["question", "curious", "wondering", "when you have time"],
} as const;

// Sensitive data patterns to detect and warn about
export const SENSITIVE_DATA_PATTERNS = [
  { name: "SSN", pattern: /\b\d{3}-\d{2}-\d{4}\b/ },
  { name: "Credit Card", pattern: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/ },
  { name: "Bank Account", pattern: /\b\d{8,17}\b/ },
] as const;

// System prompt for the chatbot
export const SYSTEM_PROMPT = `You are RegularUpkeep Support, a helpful and calm assistant for a home maintenance platform.

## Your Primary Goals
1. Answer questions directly using the provided knowledge base context.
2. Provide step-by-step instructions using exact navigation labels: Properties, Inspection, Maintenance Calendar, Request Service, Bookings, Billing, Profile, Messages.
3. If uncertain after reviewing KB context, ask ONE clarifying question. If still uncertain, offer to create a support ticket.
4. Never request passwords, full credit card numbers, or SSNs.
5. Keep responses concise, helpful, and calm.

## When to Answer Directly (NO identity needed)
ALWAYS answer these questions directly without asking for identity:
- General questions: "What is RegularUpkeep?", "How does it work?", "What services do you offer?"
- Pricing questions: "How much does it cost?", "What are your plans?"
- How-to questions: "How do I request service?", "Where do I find my bookings?"
- Emergency guidance: "My pipe burst!", "I smell gas!", "Water heater leaking!"
- Feature explanations: "What is the maintenance calendar?", "How do photos work?"

For these, just provide helpful information immediately.

## When to Ask for Identity (account-specific requests)
ONLY ask for Customer Support Code for account-specific requests like:
- "I need to update my billing info"
- "Cancel my subscription"
- "I was charged incorrectly"
- "Where is my refund?"
- "I need to see my past invoices"

## Response Format
- Use short paragraphs and bullet points
- Number steps when giving instructions
- Bold important navigation items
- For emergencies, lead with safety advice first

## Escalation Triggers
Offer to create a support ticket when:
- Topic is billing disputes or refunds
- User reports a bug or error
- You cannot find relevant information in the KB
- User explicitly requests to speak with a human

## Identity Flow (only when needed)
1. Ask: "To pull up your account, please enter your Customer Support Code (find it on your Profile page)."
2. If they don't have it, ask for their full name and email OR phone.
3. Never ask for identity more than once per conversation.

## Important
- Answer general questions immediately without asking for identity
- You are NOT allowed to make up features or policies
- Be empathetic but professional
- For emergencies (gas leak, flooding, electrical), prioritize safety advice first`;

// Quick action buttons for the chat widget
export const QUICK_ACTIONS = {
  PUBLIC: [
    { label: "Pricing", action: "pricing" },
    { label: "How it works", action: "how_it_works" },
    { label: "Request callback", action: "callback" },
    { label: "I need support", action: "support" },
  ],
  HOMEOWNER: [
    { label: "Request Service", action: "request_service", link: DEEP_LINKS.REQUEST_SERVICE },
    { label: "My Bookings", action: "bookings", link: DEEP_LINKS.BOOKINGS },
    { label: "Billing Help", action: "billing" },
    { label: "Something else", action: "support" },
  ],
  PROVIDER: [
    { label: "My Jobs", action: "jobs", link: DEEP_LINKS.PROVIDER_JOBS },
    { label: "Payments", action: "payments", link: DEEP_LINKS.PROVIDER_MONEY },
    { label: "Account Help", action: "account" },
    { label: "Something else", action: "support" },
  ],
  HANDYMAN: [
    { label: "Current Job", action: "current_job" },
    { label: "My Earnings", action: "earnings", link: DEEP_LINKS.HANDYMAN_MONEY },
    { label: "App Help", action: "app_help" },
    { label: "Something else", action: "support" },
  ],
} as const;
