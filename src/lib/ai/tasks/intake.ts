/**
 * Intake Tasks
 *
 * Tasks related to service request intake and classification.
 */

import type {
  TaskDefinition,
  IntakeClassifyInput,
  IntakeClassifyOutput,
  IntakeFollowupInput,
  IntakeFollowupOutput,
  ProviderBriefInput,
  ProviderBriefOutput,
  MediaQualityInput,
  MediaQualityOutput,
  SafetyFlag,
  SafetyFlagType,
} from "../types";

// ============================================================================
// INTAKE_CLASSIFY_AND_SUMMARIZE
// ============================================================================

export const intakeClassifyTask: TaskDefinition<IntakeClassifyInput, IntakeClassifyOutput> = {
  taskType: "INTAKE_CLASSIFY_AND_SUMMARIZE",
  description: "Analyze service request images and description to classify and summarize the issue",
  preferredModel: "gpt-4o-mini", // Fast vision model; fallback to gpt-4o
  fallbackModel: "gpt-4o",
  maxTokens: 1000,
  temperature: 0.3,
  requiresVision: true,
  allowedActors: ["customer", "system"],

  buildPrompt(input: IntakeClassifyInput) {
    const system = `You are an expert home maintenance analyst for RegularUpkeep, a professional home maintenance service platform.

Your role is to analyze images and descriptions of home issues to:
1. Summarize the visible problem concisely
2. Suggest the most appropriate service category
3. Assess urgency level
4. Identify key observations
5. Detect any safety hazards that require warnings

IMPORTANT GUIDELINES:
- Be professional and factual
- Never provide DIY repair instructions
- Never quote specific prices
- Flag any safety concerns (electrical, gas, structural)
- Use uncertainty language when appropriate ("appears to be", "may indicate")

CATEGORIES: hvac, plumbing, electrical, exterior, interior, appliances, landscaping, pest_control, safety, general

URGENCY LEVELS:
- emergency: Immediate safety risk or active damage (gas leak, flooding, sparking)
- urgent: Should be addressed within 24-48 hours (water leak, no heat in winter)
- standard: Normal scheduling, within a week
- flexible: Can be scheduled at convenience

SAFETY FLAGS - Include if you detect any of these hazards:
- gas_smell: Potential gas leak
- electrical_sparking: Visible sparks, arcing, or burn marks
- active_flooding: Water actively leaking/flooding
- structural_damage: Visible cracks, sagging, or instability
- fire_hazard: Smoke, burn marks, or fire risk
- carbon_monoxide: CO risk from faulty appliances/venting
- mold_visible: Visible mold growth
- asbestos_suspected: Materials that may contain asbestos (old insulation, tiles)
- water_near_electrical: Water in proximity to electrical components
- exposed_wiring: Bare/damaged wires visible

Respond with JSON only.`;

    const user = `Analyze this home maintenance issue.

User's selected category: ${input.category}
${input.userDescription ? `User's description: ${input.userDescription}` : "No description provided."}

Please analyze the attached image(s) and provide your assessment in the following JSON format:
{
  "summary": "Brief 1-2 sentence summary of the issue",
  "summaryBullets": ["Key point 1", "Key point 2", "Key point 3"],
  "suggestedCategory": "category from the list",
  "confidence": "high|medium|low",
  "keyObservations": ["observation 1", "observation 2"],
  "urgencyLevel": "emergency|urgent|standard|flexible",
  "safetyFlags": [
    {
      "type": "one of the safety flag types above",
      "severity": "warning|critical",
      "description": "What was observed",
      "guidance": "What the homeowner should do",
      "recommendEmergencyServices": true|false
    }
  ]
}

Only include safetyFlags array if safety hazards are detected. Leave it empty or omit if none found.`;

    return { system, user };
  },

  parseOutput(raw: string): IntakeClassifyOutput {
    try {
      const data = JSON.parse(raw);

      // Parse safety flags if present
      const validSafetyTypes: SafetyFlagType[] = [
        "gas_smell", "electrical_sparking", "active_flooding", "structural_damage",
        "fire_hazard", "carbon_monoxide", "mold_visible", "asbestos_suspected",
        "water_near_electrical", "exposed_wiring"
      ];

      const safetyFlags: SafetyFlag[] = Array.isArray(data.safetyFlags)
        ? data.safetyFlags
            .filter((f: Record<string, unknown>) => validSafetyTypes.includes(f.type as SafetyFlagType))
            .map((f: Record<string, unknown>) => ({
              type: f.type as SafetyFlagType,
              severity: f.severity === "critical" ? "critical" : "warning",
              description: String(f.description || ""),
              guidance: String(f.guidance || "Please wait for a professional to assess."),
              recommendEmergencyServices: Boolean(f.recommendEmergencyServices),
            }))
        : [];

      return {
        summary: String(data.summary || "Unable to analyze the image"),
        summaryBullets: Array.isArray(data.summaryBullets) ? data.summaryBullets.map(String) : undefined,
        suggestedCategory: String(data.suggestedCategory || "general"),
        confidence: ["high", "medium", "low"].includes(data.confidence) ? data.confidence : "low",
        keyObservations: Array.isArray(data.keyObservations) ? data.keyObservations.map(String) : [],
        urgencyLevel: ["emergency", "urgent", "standard", "flexible"].includes(data.urgencyLevel)
          ? data.urgencyLevel
          : "standard",
        safetyFlags: safetyFlags.length > 0 ? safetyFlags : undefined,
      };
    } catch {
      throw new Error("Failed to parse intake classification output");
    }
  },

  getFallback(input: IntakeClassifyInput): IntakeClassifyOutput {
    return {
      summary: "We received your service request and will have a specialist review it shortly.",
      suggestedCategory: input.category || "general",
      confidence: "low",
      keyObservations: ["Manual review needed"],
      urgencyLevel: "standard",
    };
  },

  validateOutput(output: IntakeClassifyOutput): boolean {
    return (
      typeof output.summary === "string" &&
      output.summary.length > 0 &&
      typeof output.suggestedCategory === "string" &&
      ["high", "medium", "low"].includes(output.confidence) &&
      Array.isArray(output.keyObservations) &&
      ["emergency", "urgent", "standard", "flexible"].includes(output.urgencyLevel)
    );
  },
};

// ============================================================================
// INTAKE_FOLLOWUP_QUESTIONS
// ============================================================================

export const intakeFollowupTask: TaskDefinition<IntakeFollowupInput, IntakeFollowupOutput> = {
  taskType: "INTAKE_FOLLOWUP_QUESTIONS",
  description: "Generate relevant follow-up questions based on the issue category",
  preferredModel: "gpt-4o-mini", // Fast structured output
  fallbackModel: "gpt-4o",
  maxTokens: 800,
  temperature: 0.4,
  requiresVision: false,
  allowedActors: ["customer", "system"],

  buildPrompt(input: IntakeFollowupInput) {
    const system = `You are a home maintenance intake specialist for RegularUpkeep.

Your role is to generate relevant follow-up questions to gather more information about a service request.

GUIDELINES:
- Ask 3-5 relevant questions
- Questions should help the service provider understand the issue
- Mix of question types (text, select, boolean)
- Keep questions concise and clear
- Focus on practical details (when, how long, what already tried)

Respond with JSON only.`;

    const user = `Category: ${input.category}
Summary: ${input.summary}
${input.existingAnswers ? `Already answered: ${JSON.stringify(input.existingAnswers)}` : ""}

Generate follow-up questions in this JSON format:
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "type": "text|select|boolean",
      "options": ["option1", "option2"] (only for select type),
      "required": true|false
    }
  ]
}`;

    return { system, user };
  },

  parseOutput(raw: string): IntakeFollowupOutput {
    try {
      const data = JSON.parse(raw);
      return {
        questions: Array.isArray(data.questions)
          ? data.questions.map((q: Record<string, unknown>, i: number) => ({
              id: String(q.id || `q${i + 1}`),
              question: String(q.question || ""),
              type: ["text", "select", "boolean"].includes(q.type as string)
                ? (q.type as "text" | "select" | "boolean")
                : "text",
              options: q.type === "select" && Array.isArray(q.options) ? q.options.map(String) : undefined,
              required: Boolean(q.required),
            }))
          : [],
      };
    } catch {
      throw new Error("Failed to parse follow-up questions output");
    }
  },

  getFallback(input: IntakeFollowupInput): IntakeFollowupOutput {
    const categoryQuestions: Record<string, IntakeFollowupOutput> = {
      plumbing: {
        questions: [
          { id: "q1", question: "When did you first notice this issue?", type: "select", options: ["Today", "This week", "Longer than a week"], required: true },
          { id: "q2", question: "Is there visible water damage?", type: "boolean", required: true },
          { id: "q3", question: "Have you tried any fixes?", type: "text", required: false },
        ],
      },
      electrical: {
        questions: [
          { id: "q1", question: "Is this affecting multiple outlets/rooms?", type: "boolean", required: true },
          { id: "q2", question: "When did this start?", type: "select", options: ["Today", "This week", "Longer"], required: true },
          { id: "q3", question: "Have you checked the breaker?", type: "boolean", required: false },
        ],
      },
      hvac: {
        questions: [
          { id: "q1", question: "Is it heating, cooling, or both?", type: "select", options: ["Heating", "Cooling", "Both"], required: true },
          { id: "q2", question: "When was the filter last changed?", type: "text", required: false },
          { id: "q3", question: "Do you hear unusual noises?", type: "boolean", required: false },
        ],
      },
    };

    return (
      categoryQuestions[input.category.toLowerCase()] || {
        questions: [
          { id: "q1", question: "When did you first notice this issue?", type: "text", required: true },
          { id: "q2", question: "Is this urgent?", type: "boolean", required: true },
          { id: "q3", question: "Any additional details?", type: "text", required: false },
        ],
      }
    );
  },

  validateOutput(output: IntakeFollowupOutput): boolean {
    return (
      Array.isArray(output.questions) &&
      output.questions.length > 0 &&
      output.questions.every(
        (q) =>
          typeof q.id === "string" &&
          typeof q.question === "string" &&
          ["text", "select", "boolean"].includes(q.type)
      )
    );
  },
};

// ============================================================================
// PROVIDER_BRIEF_GENERATE
// ============================================================================

export const providerBriefTask: TaskDefinition<ProviderBriefInput, ProviderBriefOutput> = {
  taskType: "PROVIDER_BRIEF_GENERATE",
  description: "Generate a comprehensive brief for service providers",
  preferredModel: "gpt-4o",
  fallbackModel: "gpt-4o-mini",
  maxTokens: 1500,
  temperature: 0.3,
  requiresVision: true,
  allowedActors: ["system", "admin"],

  buildPrompt(input: ProviderBriefInput) {
    const system = `You are an expert home maintenance analyst creating provider briefs for RegularUpkeep.

Your role is to analyze service requests and create comprehensive briefs for service providers.

GUIDELINES:
- Be thorough but concise
- Focus on actionable information
- Include safety considerations where relevant
- Never include pricing estimates
- Use professional technical language
- Prioritize observations that help diagnose and prepare
- Suggest tools/parts the technician may need
- Assess whether this could be quoted remotely or requires a site visit

Respond with JSON only.`;

    const user = `Create a provider brief for this service request:

Category: ${input.category}
Summary: ${input.summary}
Customer Description: ${input.userDescription}
${input.propertyDetails ? `Property: ${input.propertyDetails.type}, ${input.propertyDetails.age || "unknown"} years old, ${input.propertyDetails.sqft || "unknown"} sqft` : ""}
Images attached: ${input.imageUrls.length}

Provide a brief in this JSON format:
{
  "briefSummary": "2-3 sentence professional summary",
  "keyObservations": ["observation from images"],
  "potentialCauses": ["possible cause 1", "possible cause 2"],
  "recommendedQuestions": ["questions for the technician to ask"],
  "urgencyAssessment": "low|medium|high|emergency",
  "estimatedComplexity": "simple|moderate|complex",
  "safetyNotes": ["any safety considerations"],
  "suggestedToolsOrParts": ["tool or part to bring", "another tool"],
  "remoteEstimatePossible": true|false,
  "siteVisitRecommended": true|false
}

Notes:
- suggestedToolsOrParts: Common tools/parts based on the likely issue
- remoteEstimatePossible: Can a quote be provided from photos/description alone?
- siteVisitRecommended: Does the technician need to visit to properly assess?`;

    return { system, user };
  },

  parseOutput(raw: string): ProviderBriefOutput {
    try {
      const data = JSON.parse(raw);
      return {
        briefSummary: String(data.briefSummary || ""),
        keyObservations: Array.isArray(data.keyObservations) ? data.keyObservations.map(String) : [],
        potentialCauses: Array.isArray(data.potentialCauses) ? data.potentialCauses.map(String) : [],
        recommendedQuestions: Array.isArray(data.recommendedQuestions) ? data.recommendedQuestions.map(String) : [],
        urgencyAssessment: ["low", "medium", "high", "emergency"].includes(data.urgencyAssessment)
          ? data.urgencyAssessment
          : "medium",
        estimatedComplexity: ["simple", "moderate", "complex"].includes(data.estimatedComplexity)
          ? data.estimatedComplexity
          : "moderate",
        safetyNotes: Array.isArray(data.safetyNotes) ? data.safetyNotes.map(String) : [],
        suggestedToolsOrParts: Array.isArray(data.suggestedToolsOrParts) ? data.suggestedToolsOrParts.map(String) : undefined,
        remoteEstimatePossible: typeof data.remoteEstimatePossible === "boolean" ? data.remoteEstimatePossible : undefined,
        siteVisitRecommended: typeof data.siteVisitRecommended === "boolean" ? data.siteVisitRecommended : undefined,
      };
    } catch {
      throw new Error("Failed to parse provider brief output");
    }
  },

  getFallback(input: ProviderBriefInput): ProviderBriefOutput {
    return {
      briefSummary: `Service request for ${input.category}. Customer description: ${input.userDescription || "Not provided"}. Please review attached images.`,
      keyObservations: ["Images require manual review"],
      potentialCauses: ["To be determined by technician on-site"],
      recommendedQuestions: ["Ask customer about timeline", "Verify access to the affected area"],
      urgencyAssessment: "medium",
      estimatedComplexity: "moderate",
      safetyNotes: ["Standard safety precautions apply"],
      suggestedToolsOrParts: ["Standard toolkit for category"],
      remoteEstimatePossible: false,
      siteVisitRecommended: true,
    };
  },

  validateOutput(output: ProviderBriefOutput): boolean {
    return (
      typeof output.briefSummary === "string" &&
      output.briefSummary.length > 0 &&
      Array.isArray(output.keyObservations) &&
      Array.isArray(output.potentialCauses) &&
      ["low", "medium", "high", "emergency"].includes(output.urgencyAssessment) &&
      ["simple", "moderate", "complex"].includes(output.estimatedComplexity)
    );
  },
};

// ============================================================================
// MEDIA_QUALITY_CHECK
// ============================================================================

export const mediaQualityTask: TaskDefinition<MediaQualityInput, MediaQualityOutput> = {
  taskType: "MEDIA_QUALITY_CHECK",
  description: "Check the quality and relevance of uploaded images",
  preferredModel: "gpt-4o-mini", // Fast vision check
  fallbackModel: "gpt-4o",
  maxTokens: 500,
  temperature: 0.2,
  requiresVision: true,
  allowedActors: ["customer", "system"],

  buildPrompt(input: MediaQualityInput) {
    const system = `You are an image quality analyst for a home maintenance platform.

Evaluate images for:
1. Technical quality (blur, lighting, focus)
2. Relevance to the stated subject
3. Usefulness for a service provider

Score from 0-100 where:
- 80-100: Excellent, clear and useful
- 60-79: Acceptable with minor issues
- 40-59: Marginal, may need additional images
- 0-39: Poor, should request retake

Respond with JSON only.`;

    const user = `Evaluate this image.

Expected subject: ${input.expectedSubject}

Respond in this JSON format:
{
  "isAcceptable": true|false,
  "qualityScore": 0-100,
  "issues": [
    { "type": "blur|dark|irrelevant|partial|duplicate", "description": "description" }
  ],
  "suggestions": ["suggestion if issues found"]
}`;

    return { system, user };
  },

  parseOutput(raw: string): MediaQualityOutput {
    try {
      const data = JSON.parse(raw);
      return {
        isAcceptable: Boolean(data.isAcceptable),
        qualityScore: Math.min(100, Math.max(0, Number(data.qualityScore) || 0)),
        issues: Array.isArray(data.issues)
          ? data.issues.map((i: Record<string, unknown>) => ({
              type: ["blur", "dark", "irrelevant", "partial", "duplicate"].includes(i.type as string)
                ? (i.type as "blur" | "dark" | "irrelevant" | "partial" | "duplicate")
                : "partial",
              description: String(i.description || ""),
            }))
          : [],
        suggestions: Array.isArray(data.suggestions) ? data.suggestions.map(String) : [],
      };
    } catch {
      throw new Error("Failed to parse media quality output");
    }
  },

  getFallback(): MediaQualityOutput {
    return {
      isAcceptable: true,
      qualityScore: 70,
      issues: [],
      suggestions: [],
    };
  },

  validateOutput(output: MediaQualityOutput): boolean {
    return (
      typeof output.isAcceptable === "boolean" &&
      typeof output.qualityScore === "number" &&
      output.qualityScore >= 0 &&
      output.qualityScore <= 100 &&
      Array.isArray(output.issues)
    );
  },
};
