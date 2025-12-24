/**
 * Support Chatbot Module
 *
 * Main entry point for the support chat system
 */

// Constants
export {
  SUPPORT_CODE_REGEX,
  RATE_LIMIT,
  TOKEN_EXPIRY_HOURS,
  RAG_CONFIG,
  INTENTS,
  ESCALATION_TOPICS,
  DEEP_LINKS,
  INTENT_TO_CATEGORY,
  PRIORITY_KEYWORDS,
  SENSITIVE_DATA_PATTERNS,
  SYSTEM_PROMPT,
  QUICK_ACTIONS,
} from "./constants";

export type { Intent } from "./constants";

// Utilities
export {
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
  formatMessagesForTicket,
  parseUserAgent,
  getRateLimitKey,
  isHumanRequest,
  truncate,
} from "./utils";

// Identity verification
export {
  createIdentityContext,
  processIdentityStep,
  getIdentityPrompt,
  needsIdentityVerification,
} from "./identity";

export type { IdentityContext, IdentityTransitionResult } from "./identity";

// RAG retrieval
export {
  searchKnowledgeBase,
  buildRAGContextString,
  getArticlesByIntent,
  getArticleBySlug,
  logRAGSearch,
  rerankResults,
  deduplicateChunks,
  hasRelevantContext,
  formatCitationsForMetadata,
} from "./rag";

export type { RAGContext, SearchOptions } from "./rag";

// Ticket management
export {
  createTicket,
  shouldEscalate,
  getTicket,
  getOpenTickets,
  updateTicketStatus,
  assignTicket,
  addTicketNote,
  getTicketConversation,
  addAgentMessage,
  getTicketStats,
  getEscalationMessage,
} from "./tickets";

export type { TicketCreateInput, TicketCreateResult } from "./tickets";

// Analytics
export {
  logEvent,
  logError,
  trackRAGSearch,
  trackEscalation,
  getChatAnalytics,
  getDailyVolume,
  createLatencyTracker,
} from "./analytics";

export type { AnalyticsEvent, AnalyticsData } from "./analytics";
