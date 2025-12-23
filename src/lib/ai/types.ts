/**
 * AI Gateway Types
 *
 * Core type definitions for the centralized AI system.
 */

// ============================================================================
// Task Types
// ============================================================================

export type AITaskType =
  // Intake Tasks
  | "INTAKE_CLASSIFY_AND_SUMMARIZE"
  | "INTAKE_FOLLOWUP_QUESTIONS"
  | "PROVIDER_BRIEF_GENERATE"
  | "MEDIA_QUALITY_CHECK"
  // Provider Tasks
  | "PROVIDER_ESTIMATE_DRAFT"
  | "PROVIDER_MESSAGE_DRAFT"
  | "INVOICE_NARRATIVE_DRAFT"
  // Admin Tasks
  | "DISPUTE_TIMELINE_SUMMARY"
  | "FRAUD_SIGNAL_REFERRALS"
  // CRM Tasks
  | "CRM_NEXT_BEST_ACTION"
  // Homeowner Tasks
  | "MAINTENANCE_PLAN_SUGGEST"
  // Sponsor Tasks
  | "SPONSOR_TILE_COPY";

export type AIProvider = "openai" | "anthropic" | "none";

export type AIModel =
  // OpenAI Models
  | "gpt-4o"
  | "gpt-4o-mini"
  | "gpt-4-turbo"
  // Anthropic Models
  | "claude-3-5-sonnet-20241022"
  | "claude-3-haiku-20240307"
  // Mock
  | "mock";

// ============================================================================
// Entity Types (for correlation)
// ============================================================================

export type AIEntityType =
  | "service_request"
  | "booking"
  | "estimate"
  | "invoice"
  | "dispute"
  | "message_thread"
  | "property"
  | "provider"
  | "customer"
  | "sponsor"
  | "none";

// ============================================================================
// Policy Events (safety signals)
// ============================================================================

export type AIPolicyEventType =
  // Safety Flags
  | "SAFETY_FLAG_ELECTRICAL"
  | "SAFETY_FLAG_GAS"
  | "SAFETY_FLAG_STRUCTURAL"
  | "SAFETY_FLAG_HAZMAT"
  | "SAFETY_FLAG_EMERGENCY"
  // Content Flags
  | "PII_DETECTED"
  | "PROFANITY_DETECTED"
  | "PRICING_MENTIONED"
  | "LEGAL_CLAIM_DETECTED"
  // Fraud Signals
  | "FRAUD_SIGNAL_VELOCITY"
  | "FRAUD_SIGNAL_DUPLICATE"
  | "FRAUD_SIGNAL_SUSPICIOUS_PATTERN"
  // Quality Flags
  | "LOW_CONFIDENCE"
  | "JSON_REPAIR_NEEDED"
  | "FALLBACK_USED";

export interface AIPolicyEvent {
  type: AIPolicyEventType;
  severity: "info" | "warning" | "critical";
  message: string;
  metadata?: Record<string, unknown>;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface AITaskRequest<TInput = Record<string, unknown>> {
  /** The type of task to execute */
  taskType: AITaskType;
  /** The user ID initiating the request (for audit) */
  actorUserId: string;
  /** The entity type for correlation */
  entityType: AIEntityType;
  /** The entity ID for correlation */
  entityId: string;
  /** Task-specific inputs */
  inputs: TInput;
  /** Optional flags to modify behavior */
  flags?: AITaskFlags;
}

export interface AITaskFlags {
  /** Force use of a specific provider */
  forceProvider?: AIProvider;
  /** Force use of a specific model */
  forceModel?: AIModel;
  /** Skip safety checks (admin only) */
  skipSafetyChecks?: boolean;
  /** Correlation ID for tracing */
  correlationId?: string;
  /** Custom timeout in ms */
  timeoutMs?: number;
  /** Enable debug mode */
  debug?: boolean;
}

export interface AITaskResponse<TOutput = Record<string, unknown>> {
  /** Whether the task succeeded */
  success: boolean;
  /** The parsed output JSON */
  outputJson: TOutput;
  /** The model used */
  model: AIModel;
  /** Estimated cost in USD */
  cost: number;
  /** Latency in milliseconds */
  latencyMs: number;
  /** Policy events generated */
  policyEvents: AIPolicyEvent[];
  /** Whether fallback was used */
  usedFallback: boolean;
  /** Error message if failed */
  error?: string;
  /** Raw response for debugging */
  rawResponse?: string;
  /** Correlation ID */
  correlationId: string;
}

// ============================================================================
// Safety Flags (for high-risk situations)
// ============================================================================

export type SafetyFlagType =
  | "gas_smell"
  | "electrical_sparking"
  | "active_flooding"
  | "structural_damage"
  | "fire_hazard"
  | "carbon_monoxide"
  | "mold_visible"
  | "asbestos_suspected"
  | "water_near_electrical"
  | "exposed_wiring";

export interface SafetyFlag {
  type: SafetyFlagType;
  severity: "warning" | "critical";
  description: string;
  guidance: string;
  recommendEmergencyServices: boolean;
}

// ============================================================================
// Task-Specific Input/Output Types
// ============================================================================

// --- INTAKE_CLASSIFY_AND_SUMMARIZE ---
export interface IntakeClassifyInput {
  imageUrls: string[];
  category: string;
  userDescription?: string;
}

export interface IntakeClassifyOutput {
  summary: string;
  suggestedCategory: string;
  confidence: "high" | "medium" | "low";
  keyObservations: string[];
  urgencyLevel: "emergency" | "urgent" | "standard" | "flexible";
  /** Bullet-point summary for quick display */
  summaryBullets?: string[];
  /** Safety flags detected in the request */
  safetyFlags?: SafetyFlag[];
}

// --- INTAKE_FOLLOWUP_QUESTIONS ---
export interface IntakeFollowupInput {
  category: string;
  summary: string;
  existingAnswers?: Record<string, string>;
}

export interface IntakeFollowupOutput {
  questions: Array<{
    id: string;
    question: string;
    type: "text" | "select" | "boolean";
    options?: string[];
    required: boolean;
  }>;
}

// --- PROVIDER_BRIEF_GENERATE ---
export interface ProviderBriefInput {
  category: string;
  summary: string;
  userDescription: string;
  imageUrls: string[];
  propertyDetails?: {
    type: string;
    age?: number;
    sqft?: number;
  };
}

export interface ProviderBriefOutput {
  /** Problem summary (1-2 sentences) */
  briefSummary: string;
  /** Observed symptoms from photos/description */
  keyObservations: string[];
  /** Likely causes / hypotheses */
  potentialCauses: string[];
  /** Questions provider should ask customer */
  recommendedQuestions: string[];
  /** Urgency assessment */
  urgencyAssessment: "low" | "medium" | "high" | "emergency";
  /** Estimated job complexity */
  estimatedComplexity: "simple" | "moderate" | "complex";
  /** Safety-related notes and warnings */
  safetyNotes: string[];
  /** Suggested tools or parts to bring */
  suggestedToolsOrParts?: string[];
  /** Whether a remote estimate might be possible */
  remoteEstimatePossible?: boolean;
  /** Whether an on-site visit is recommended */
  siteVisitRecommended?: boolean;
}

// --- MEDIA_QUALITY_CHECK ---
export interface MediaQualityInput {
  imageUrl: string;
  expectedSubject: string;
}

export interface MediaQualityOutput {
  isAcceptable: boolean;
  qualityScore: number; // 0-100
  issues: Array<{
    type: "blur" | "dark" | "irrelevant" | "partial" | "duplicate";
    description: string;
  }>;
  suggestions: string[];
}

// --- PROVIDER_ESTIMATE_DRAFT ---
export interface ProviderEstimateInput {
  category: string;
  providerBrief: string;
  providerNotes?: string;
  similarJobsContext?: string;
}

export interface ProviderEstimateOutput {
  scopeOfWork: string;
  lineItemSuggestions: Array<{
    description: string;
    type: "labor" | "material";
    note?: string;
  }>;
  clarifyingQuestions: string[];
  estimatedDurationRange: string;
  warrantyConsiderations: string[];
  /** What is explicitly NOT included in the estimate */
  exclusions?: string[];
  /** Assumptions made in the estimate */
  assumptions?: string[];
  /** Whether a remote estimate might be sufficient */
  remoteEstimateOk?: boolean;
  /** Whether an on-site visit is required */
  requiresSiteVisit?: boolean;
  /** Missing info that would improve the estimate */
  missingInfoRequests?: string[];
}

// --- PROVIDER_MESSAGE_DRAFT ---
export interface ProviderMessageInput {
  context: "introduction" | "update" | "scheduling" | "completion" | "followup";
  customerName: string;
  serviceCategory: string;
  keyPoints: string[];
}

export interface ProviderMessageOutput {
  message: string;
  tone: "professional" | "friendly" | "urgent";
  suggestedAlternatives?: string[];
}

// --- INVOICE_NARRATIVE_DRAFT ---
export interface InvoiceNarrativeInput {
  category: string;
  scopeOfWork: string;
  completedWork: string[];
  materialsUsed?: string[];
  technician?: string;
}

export interface InvoiceNarrativeOutput {
  narrative: string;
  highlights: string[];
  disclaimer: string;
}

// --- DISPUTE_TIMELINE_SUMMARY ---
export interface DisputeTimelineInput {
  disputeReason: string;
  events: Array<{
    timestamp: string;
    type: string;
    description: string;
    actor: string;
  }>;
  invoiceAmount: number;
  disputedAmount: number;
}

export interface DisputeTimelineOutput {
  summary: string;
  timeline: Array<{
    date: string;
    event: string;
    relevance: "key" | "supporting" | "context";
  }>;
  keyIssues: string[];
  recommendedActions: string[];
}

// --- FRAUD_SIGNAL_REFERRALS ---
export interface FraudSignalInput {
  referralCode: string;
  referrerHistory: {
    totalReferrals: number;
    conversionRate: number;
    avgDaysToConvert: number;
  };
  referreeData: {
    signupDate: string;
    ipAddress?: string;
    deviceFingerprint?: string;
    email: string;
  };
}

export interface FraudSignalOutput {
  riskScore: number; // 0-100
  signals: Array<{
    type: string;
    severity: "low" | "medium" | "high";
    description: string;
  }>;
  recommendation: "approve" | "review" | "reject";
  reviewNotes: string;
}

// --- CRM_NEXT_BEST_ACTION ---
export interface CrmNextActionInput {
  customerId: string;
  customerHistory: {
    totalJobs: number;
    totalSpend: number;
    lastJobDate: string;
    avgRating: number;
  };
  recentInteractions: string[];
}

export interface CrmNextActionOutput {
  suggestedAction: string;
  priority: "high" | "medium" | "low";
  reasoning: string;
  messageTemplate?: string;
  timing: string;
}

// --- MAINTENANCE_PLAN_SUGGEST ---
export interface MaintenancePlanInput {
  propertyType: string;
  propertyAge: number;
  systems: Array<{
    type: string;
    age?: number;
    lastService?: string;
  }>;
  location: {
    climate: string;
    region: string;
  };
}

export interface MaintenancePlanOutput {
  recommendations: Array<{
    system: string;
    task: string;
    frequency: string;
    priority: "high" | "medium" | "low";
    reasoning: string;
    seasonalTiming?: string;
  }>;
  annualPlanSummary: string;
}

// --- SPONSOR_TILE_COPY ---
export interface SponsorTileCopyInput {
  productName: string;
  productCategory: string;
  targetAudience: string;
  keyFeatures: string[];
  tone: "professional" | "friendly" | "urgent";
}

export interface SponsorTileCopyOutput {
  headline: string;
  subheadline: string;
  bodyText: string;
  callToAction: string;
  alternatives: Array<{
    headline: string;
    subheadline: string;
  }>;
}

// ============================================================================
// Provider Interface
// ============================================================================

export interface AIProviderAdapter {
  name: AIProvider;
  isAvailable(): boolean;
  generateCompletion(request: ProviderCompletionRequest): Promise<ProviderCompletionResponse>;
  supportsVision(): boolean;
  estimateCost(model: AIModel, inputTokens: number, outputTokens: number): number;
}

export interface ProviderCompletionRequest {
  model: AIModel;
  systemPrompt: string;
  userPrompt: string;
  imageUrls?: string[];
  maxTokens: number;
  temperature: number;
  jsonMode: boolean;
}

export interface ProviderCompletionResponse {
  content: string;
  model: AIModel;
  inputTokens: number;
  outputTokens: number;
  finishReason: "stop" | "length" | "error";
}

// ============================================================================
// Task Registry Types
// ============================================================================

export interface TaskDefinition<TInput = unknown, TOutput = unknown> {
  taskType: AITaskType;
  description: string;
  preferredModel: AIModel;
  fallbackModel: AIModel;
  maxTokens: number;
  temperature: number;
  requiresVision: boolean;
  allowedActors: ("customer" | "provider" | "admin" | "system")[];
  buildPrompt: (input: TInput) => { system: string; user: string };
  parseOutput: (raw: string) => TOutput;
  getFallback: (input: TInput) => TOutput;
  validateOutput: (output: TOutput) => boolean;
}

// ============================================================================
// Observability Types
// ============================================================================

export interface AILogEntry {
  timestamp: string;
  correlationId: string;
  taskType: AITaskType;
  actorUserId: string;
  entityType: AIEntityType;
  entityId: string;
  provider: AIProvider;
  model: AIModel;
  latencyMs: number;
  success: boolean;
  usedFallback: boolean;
  estimatedCost: number;
  inputTokens?: number;
  outputTokens?: number;
  policyEvents: AIPolicyEventType[];
  error?: string;
}

// ============================================================================
// Legacy Types (Backward Compatibility)
// ============================================================================

/**
 * @deprecated Use IntakeClassifyOutput instead
 */
export interface AIAnalysisResult {
  summary: string;
  suggestions: string[];
  rawResponse?: string;
}

/**
 * @deprecated Use IntakeClassifyInput instead
 */
export interface AIImageAnalysisRequest {
  imageUrls: string[];
  category: string;
  userDescription?: string;
  additionalContext?: string;
}

/**
 * @deprecated Use AITaskType with task-specific inputs
 */
export interface AIProviderBrief {
  briefSummary: string;
  keyObservations: string[];
  potentialCauses: string[];
  recommendedQuestions: string[];
  urgencyAssessment: "low" | "medium" | "high" | "emergency";
  estimatedComplexity: "simple" | "moderate" | "complex";
  safetyNotes?: string[];
}

/**
 * Maintenance category for legacy code
 */
export type MaintenanceCategory =
  | "hvac"
  | "plumbing"
  | "electrical"
  | "appliances"
  | "exterior"
  | "interior"
  | "landscaping"
  | "pest_control"
  | "safety"
  | "other";
