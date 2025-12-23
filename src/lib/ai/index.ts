/**
 * AI Module
 *
 * Central export for all AI functionality.
 * Provides abstraction layer for AI providers.
 */

export * from "./types";
export * from "./openai";
export * from "./prompts/intake";

import { isFeatureEnabled } from "@/lib/config/admin-config";
import { isOpenAIAvailable, analyzeIntakeImages } from "./openai";
import { AIAnalysisResult, AIImageAnalysisRequest, MaintenanceCategory } from "./types";

// Fallback responses when AI is not available
const fallbackResponses: Record<MaintenanceCategory | "default", AIAnalysisResult> = {
  hvac: {
    summary:
      "Thank you for uploading photos of your HVAC system. A technician will review these to provide an accurate assessment.",
    suggestions: [
      "Note the model number if visible on the unit",
      "Describe any unusual sounds or smells",
      "Mention when you first noticed the issue",
      "Check if the thermostat is responding",
    ],
  },
  plumbing: {
    summary:
      "We've received your plumbing photos. A qualified plumber will assess the situation.",
    suggestions: [
      "Describe the water flow or leak severity",
      "Note if the water is discolored",
      "Mention any unusual smells",
      "Indicate where the issue is located",
    ],
  },
  electrical: {
    summary:
      "Your electrical concern photos have been received. Safety first - avoid touching exposed wires until inspected.",
    suggestions: [
      "Note which circuits or outlets are affected",
      "Describe any burning smells",
      "Mention if breakers are tripping",
      "Indicate when the issue started",
    ],
  },
  appliances: {
    summary:
      "We can see your appliance. We'll match you with a technician familiar with this type.",
    suggestions: [
      "Include the model number if possible",
      "Describe the symptoms clearly",
      "Note any error codes displayed",
      "Mention the approximate age of the appliance",
    ],
  },
  exterior: {
    summary:
      "Your exterior photos show the area of concern. Weather and age can affect these materials.",
    suggestions: [
      "Note any recent storm damage",
      "Describe any water intrusion",
      "Mention the material type if known",
      "Indicate the approximate size of the affected area",
    ],
  },
  interior: {
    summary:
      "The interior photos show the repair needed. Our team will assess the scope of work.",
    suggestions: [
      "Describe the extent of the damage",
      "Note if it appears structural",
      "Mention any water damage involvement",
      "Indicate when you first noticed it",
    ],
  },
  landscaping: {
    summary:
      "We can see your landscaping area. Our providers can help with maintenance or new work.",
    suggestions: [
      "Describe your desired outcome",
      "Note the approximate area size",
      "Mention any irrigation needs",
      "Indicate any access restrictions",
    ],
  },
  pest_control: {
    summary:
      "We'll connect you with pest control experts to address this safely and effectively.",
    suggestions: [
      "Describe where pests are being seen",
      "Note the pest type if known",
      "Mention any structural damage noticed",
      "Indicate how long this has been occurring",
    ],
  },
  safety: {
    summary:
      "Your safety concern has been received. We prioritize these requests for quick response.",
    suggestions: [
      "Describe the safety issue in detail",
      "Note any immediate hazards",
      "Mention who may be at risk",
      "Indicate if temporary measures are in place",
    ],
  },
  other: {
    summary:
      "Thank you for uploading images. Our team will review and match you with the right provider.",
    suggestions: [
      "Describe the issue in detail",
      "Note when it started",
      "Mention any temporary fixes attempted",
      "Indicate your urgency level",
    ],
  },
  default: {
    summary:
      "We've received your photos. Please provide additional details to help us assist you better.",
    suggestions: [
      "Describe what you're experiencing",
      "Note when the issue began",
      "Mention any relevant history",
      "Indicate how urgent this is",
    ],
  },
};

/**
 * Analyze images for service request intake
 *
 * Uses AI when available and enabled, falls back to static responses otherwise.
 */
export async function analyzeServiceRequestImages(
  request: AIImageAnalysisRequest
): Promise<AIAnalysisResult> {
  // Check if AI intake is enabled
  const aiEnabled = await isFeatureEnabled("ai_intake_enabled");

  if (!aiEnabled) {
    const category = request.category as MaintenanceCategory;
    return fallbackResponses[category] || fallbackResponses.default;
  }

  // Check if OpenAI is configured
  if (!isOpenAIAvailable()) {
    console.warn("AI intake enabled but OPENAI_API_KEY not configured");
    const category = request.category as MaintenanceCategory;
    return fallbackResponses[category] || fallbackResponses.default;
  }

  try {
    // Call the AI service
    const result = await analyzeIntakeImages(request);
    return result;
  } catch (error) {
    console.error("AI analysis failed:", error);
    // Fall back to static responses on error
    const category = request.category as MaintenanceCategory;
    return fallbackResponses[category] || fallbackResponses.default;
  }
}

/**
 * Get fallback response for a category (useful for testing)
 */
export function getFallbackResponse(category: string): AIAnalysisResult {
  return (
    fallbackResponses[category as MaintenanceCategory] || fallbackResponses.default
  );
}
