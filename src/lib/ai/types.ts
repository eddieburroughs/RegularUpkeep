/**
 * AI Types and Interfaces
 */

export interface AIAnalysisResult {
  summary: string;
  suggestions: string[];
  confidence?: number;
  rawResponse?: string;
}

export interface AIProviderBrief {
  briefSummary: string;
  keyObservations: string[];
  potentialCauses: string[];
  recommendedQuestions: string[];
  urgencyAssessment: "low" | "medium" | "high" | "emergency";
  estimatedComplexity: "simple" | "moderate" | "complex";
}

export interface AIImageAnalysisRequest {
  imageUrls: string[];
  category: string;
  additionalContext?: string;
}

export interface AITextGenerationRequest {
  prompt: string;
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
}

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
