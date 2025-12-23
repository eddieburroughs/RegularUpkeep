/**
 * OpenAI Provider Implementation
 *
 * Handles all OpenAI API interactions for the platform
 */

import OpenAI from "openai";
import {
  AIAnalysisResult,
  AIImageAnalysisRequest,
  AIProviderBrief,
  MaintenanceCategory,
} from "./types";
import {
  INTAKE_SYSTEM_PROMPT,
  getIntakePrompt,
  getProviderBriefPrompt,
} from "./prompts/intake";

// Lazy initialization to avoid errors when API key is not set
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY environment variable is not set");
    }
    openaiClient = new OpenAI({ apiKey });
  }
  return openaiClient;
}

/**
 * Check if OpenAI is configured and available
 */
export function isOpenAIAvailable(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/**
 * Analyze images for a service request intake
 */
export async function analyzeIntakeImages(
  request: AIImageAnalysisRequest
): Promise<AIAnalysisResult> {
  const openai = getOpenAIClient();
  const category = request.category as MaintenanceCategory;

  const userPrompt = getIntakePrompt(category, request.imageUrls.length);

  // Build the message content with images
  const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [
    { type: "text", text: userPrompt },
    ...request.imageUrls.map((url) => ({
      type: "image_url" as const,
      image_url: {
        url,
        detail: "high" as const,
      },
    })),
  ];

  // Add additional context if provided
  if (request.additionalContext) {
    content.push({
      type: "text",
      text: `\n\nAdditional context from homeowner: ${request.additionalContext}`,
    });
  }

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content: INTAKE_SYSTEM_PROMPT,
      },
      {
        role: "user",
        content,
      },
    ],
    max_tokens: 1000,
    temperature: 0.3, // Lower temperature for more consistent analysis
    response_format: { type: "json_object" },
  });

  const rawResponse = response.choices[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(rawResponse);
    return {
      summary: parsed.summary || "Unable to analyze the images.",
      suggestions: [
        ...(parsed.suggestions || []),
        ...(parsed.urgencyIndicators || []),
        ...(parsed.safetyNotes || []),
      ].slice(0, 6), // Limit to 6 suggestions
      rawResponse,
    };
  } catch {
    // If JSON parsing fails, try to extract useful info
    return {
      summary: rawResponse.slice(0, 200),
      suggestions: [
        "Please describe the issue in more detail",
        "Note when the problem started",
        "Mention any recent changes",
      ],
      rawResponse,
    };
  }
}

/**
 * Generate a provider brief from intake data
 */
export async function generateProviderBrief(
  aiSummary: string,
  category: MaintenanceCategory,
  userDescription: string
): Promise<AIProviderBrief> {
  const openai = getOpenAIClient();

  const prompt = getProviderBriefPrompt(aiSummary, category, userDescription);

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      {
        role: "system",
        content:
          "You are a professional service coordinator creating briefs for maintenance providers. Be concise and actionable.",
      },
      {
        role: "user",
        content: prompt,
      },
    ],
    max_tokens: 800,
    temperature: 0.3,
    response_format: { type: "json_object" },
  });

  const rawResponse = response.choices[0]?.message?.content || "";

  try {
    const parsed = JSON.parse(rawResponse);
    return {
      briefSummary: parsed.briefSummary || "Service request requires assessment.",
      keyObservations: parsed.keyObservations || [],
      potentialCauses: parsed.potentialCauses || [],
      recommendedQuestions: parsed.recommendedQuestions || [],
      urgencyAssessment: parsed.urgencyAssessment || "medium",
      estimatedComplexity: parsed.estimatedComplexity || "moderate",
    };
  } catch {
    return {
      briefSummary: "Service request requires on-site assessment.",
      keyObservations: ["Review submitted photos", "Speak with homeowner"],
      potentialCauses: ["To be determined on-site"],
      recommendedQuestions: ["When did you first notice this issue?"],
      urgencyAssessment: "medium",
      estimatedComplexity: "moderate",
    };
  }
}

/**
 * Simple text generation (for future use)
 */
export async function generateText(
  prompt: string,
  systemPrompt?: string
): Promise<string> {
  const openai = getOpenAIClient();

  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini", // Use mini for simple text generation
    messages: [
      ...(systemPrompt
        ? [{ role: "system" as const, content: systemPrompt }]
        : []),
      { role: "user" as const, content: prompt },
    ],
    max_tokens: 500,
    temperature: 0.7,
  });

  return response.choices[0]?.message?.content || "";
}
