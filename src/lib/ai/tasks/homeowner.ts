/**
 * Homeowner Tasks
 *
 * Tasks for homeowner assistance and maintenance planning.
 */

import type {
  TaskDefinition,
  MaintenancePlanInput,
  MaintenancePlanOutput,
} from "../types";

// ============================================================================
// MAINTENANCE_PLAN_SUGGEST
// ============================================================================

export const maintenancePlanTask: TaskDefinition<MaintenancePlanInput, MaintenancePlanOutput> = {
  taskType: "MAINTENANCE_PLAN_SUGGEST",
  description: "Generate personalized maintenance recommendations",
  preferredModel: "gpt-4o",
  fallbackModel: "gpt-4o-mini",
  maxTokens: 1500,
  temperature: 0.4,
  requiresVision: false,
  allowedActors: ["customer", "system"],

  buildPrompt(input: MaintenancePlanInput) {
    const system = `You are a home maintenance planning expert for RegularUpkeep.

Create personalized maintenance recommendations based on:
- Property type and age
- Installed systems and their ages
- Climate and regional factors
- Industry best practices

GUIDELINES:
- Prioritize safety-critical items
- Consider seasonal timing
- Be specific about frequencies
- Focus on preventive maintenance
- Never suggest DIY for electrical, gas, or structural work

Respond with JSON only.`;

    const user = `Create a maintenance plan for this property:

Property Type: ${input.propertyType}
Property Age: ${input.propertyAge} years
Location: ${input.location.region} (${input.location.climate} climate)

Systems:
${input.systems
  .map(
    (s) =>
      `- ${s.type}${s.age ? ` (${s.age} years old)` : ""}${s.lastService ? ` - Last serviced: ${s.lastService}` : ""}`
  )
  .join("\n")}

Respond in this JSON format:
{
  "recommendations": [
    {
      "system": "System name",
      "task": "Specific maintenance task",
      "frequency": "How often (e.g., 'Annually', 'Every 6 months')",
      "priority": "high|medium|low",
      "reasoning": "Why this is important",
      "seasonalTiming": "Best season/month if applicable"
    }
  ],
  "annualPlanSummary": "Overview of the annual maintenance approach"
}`;

    return { system, user };
  },

  parseOutput(raw: string): MaintenancePlanOutput {
    try {
      const data = JSON.parse(raw);
      return {
        recommendations: Array.isArray(data.recommendations)
          ? data.recommendations.map((r: Record<string, unknown>) => ({
              system: String(r.system || ""),
              task: String(r.task || ""),
              frequency: String(r.frequency || ""),
              priority: ["high", "medium", "low"].includes(r.priority as string)
                ? (r.priority as "high" | "medium" | "low")
                : "medium",
              reasoning: String(r.reasoning || ""),
              seasonalTiming: r.seasonalTiming ? String(r.seasonalTiming) : undefined,
            }))
          : [],
        annualPlanSummary: String(data.annualPlanSummary || ""),
      };
    } catch {
      throw new Error("Failed to parse maintenance plan output");
    }
  },

  getFallback(input: MaintenancePlanInput): MaintenancePlanOutput {
    const standardRecommendations = [
      {
        system: "HVAC",
        task: "Replace air filters",
        frequency: "Every 1-3 months",
        priority: "high" as const,
        reasoning: "Maintains air quality and system efficiency",
        seasonalTiming: "Year-round",
      },
      {
        system: "HVAC",
        task: "Professional maintenance service",
        frequency: "Twice yearly",
        priority: "high" as const,
        reasoning: "Prevents breakdowns and extends system life",
        seasonalTiming: "Spring and Fall",
      },
      {
        system: "Plumbing",
        task: "Check for leaks and drips",
        frequency: "Monthly",
        priority: "medium" as const,
        reasoning: "Prevents water damage and waste",
      },
      {
        system: "Exterior",
        task: "Clean gutters",
        frequency: "Twice yearly",
        priority: "medium" as const,
        reasoning: "Prevents water damage and foundation issues",
        seasonalTiming: "Spring and Fall",
      },
      {
        system: "Safety",
        task: "Test smoke and CO detectors",
        frequency: "Monthly",
        priority: "high" as const,
        reasoning: "Critical for safety",
      },
    ];

    // Add system-specific recommendations based on input
    const systemRecommendations = input.systems.map((system) => ({
      system: system.type,
      task: `Schedule professional inspection for ${system.type.toLowerCase()}`,
      frequency: "Annually",
      priority: "medium" as const,
      reasoning: system.age && system.age > 10
        ? `System is ${system.age} years old and may need more attention`
        : "Regular professional inspection recommended",
      seasonalTiming: undefined,
    }));

    return {
      recommendations: [...standardRecommendations, ...systemRecommendations],
      annualPlanSummary: `Based on your ${input.propertyType} (${input.propertyAge} years old) in ${input.location.region}, we recommend focusing on regular HVAC maintenance, seasonal gutter cleaning, and monthly safety checks. Professional inspections for your specific systems should be scheduled annually.`,
    };
  },

  validateOutput(output: MaintenancePlanOutput): boolean {
    return (
      Array.isArray(output.recommendations) &&
      output.recommendations.length > 0 &&
      output.recommendations.every(
        (r) =>
          typeof r.system === "string" &&
          typeof r.task === "string" &&
          typeof r.frequency === "string" &&
          ["high", "medium", "low"].includes(r.priority)
      ) &&
      typeof output.annualPlanSummary === "string"
    );
  },
};
