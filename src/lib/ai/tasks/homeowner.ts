/**
 * Homeowner Tasks
 *
 * Tasks for homeowner assistance and maintenance planning.
 * Behind ai_maintenance_coach_enabled feature flag.
 */

import type {
  TaskDefinition,
  MaintenancePlanInput,
  MaintenancePlanOutput,
} from "../types";

// Helper to get current season from timezone
function getSeasonFromTimezone(timezone: string): "spring" | "summer" | "fall" | "winter" {
  try {
    const now = new Date();
    const month = now.getMonth(); // 0-11

    // Determine if northern or southern hemisphere based on timezone
    const isSouthern = timezone.includes("Australia") ||
                       timezone.includes("Auckland") ||
                       timezone.includes("Buenos_Aires") ||
                       timezone.includes("Johannesburg") ||
                       timezone.includes("Santiago");

    // Northern hemisphere seasons
    if (!isSouthern) {
      if (month >= 2 && month <= 4) return "spring";
      if (month >= 5 && month <= 7) return "summer";
      if (month >= 8 && month <= 10) return "fall";
      return "winter";
    }

    // Southern hemisphere (inverted)
    if (month >= 2 && month <= 4) return "fall";
    if (month >= 5 && month <= 7) return "winter";
    if (month >= 8 && month <= 10) return "spring";
    return "summer";
  } catch {
    // Default to current month-based season
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return "spring";
    if (month >= 5 && month <= 7) return "summer";
    if (month >= 8 && month <= 10) return "fall";
    return "winter";
  }
}

function getCurrentQuarter(): "Q1" | "Q2" | "Q3" | "Q4" {
  const month = new Date().getMonth();
  if (month <= 2) return "Q1";
  if (month <= 5) return "Q2";
  if (month <= 8) return "Q3";
  return "Q4";
}

// ============================================================================
// MAINTENANCE_PLAN_SUGGEST
// ============================================================================

export const maintenancePlanTask: TaskDefinition<MaintenancePlanInput, MaintenancePlanOutput> = {
  taskType: "MAINTENANCE_PLAN_SUGGEST",
  description: "Generate personalized maintenance coach recommendations based on property and season",
  preferredModel: "gpt-4o",
  fallbackModel: "gpt-4o-mini",
  maxTokens: 2000,
  temperature: 0.4,
  requiresVision: false,
  allowedActors: ["customer", "admin", "system"],

  buildPrompt(input: MaintenancePlanInput) {
    const season = getSeasonFromTimezone(input.location.timezone);
    const climate = input.location.climate || "temperate";
    const isPremium = input.subscriptionTier === "premium" || input.subscriptionTier === "standard";

    const system = `You are a home maintenance coach for RegularUpkeep.

Create personalized, actionable maintenance recommendations based on:
- Current season: ${season}
- Property characteristics and age
- Installed systems and their condition
- Regional climate considerations
- Industry best practices

GUIDELINES:
- Prioritize safety-critical items (carbon monoxide, smoke detectors, gas/electrical)
- Consider seasonal timing - what needs to be done NOW vs. this season
- Be specific about task descriptions
- Provide realistic cost estimates where appropriate
- Mark DIY-appropriate tasks clearly
- NEVER suggest DIY for electrical, gas, or structural work

${isPremium ? `PREMIUM FEATURES:
- Include detailed printable summary with quarterly checklist
- Provide estimated annual costs
- Give more detailed system-specific recommendations` : ""}

Respond with JSON only.`;

    const userPrompt = `Create a maintenance plan for this property:

Property ID: ${input.propertyId}
Property Type: ${input.propertyType}
${input.yearBuilt ? `Year Built: ${input.yearBuilt}` : ""}
${input.propertyAge ? `Property Age: ${input.propertyAge} years` : ""}
${input.squareFeet ? `Square Footage: ${input.squareFeet} sq ft` : ""}
Location: ${input.location.region} (${climate} climate)
Current Season: ${season}
Subscription Tier: ${input.subscriptionTier}

Systems:
${input.systems
  .map(
    (s) =>
      `- ${s.type}${s.brand ? ` (${s.brand}${s.model ? ` ${s.model}` : ""})` : ""}${s.age ? ` - ${s.age} years old` : ""}${s.lastService ? ` - Last serviced: ${s.lastService}` : ""}${s.condition ? ` - Condition: ${s.condition}` : ""}`
  )
  .join("\n")}
${input.recentIssues && input.recentIssues.length > 0 ? `\nRecent Issues:\n${input.recentIssues.map(i => `- ${i}`).join("\n")}` : ""}

Respond in this JSON format:
{
  "seasonalTasks": [
    {
      "task": "Specific task description",
      "system": "System name",
      "urgency": "now|this_month|this_season",
      "estimatedCost": "$X-$Y (optional)",
      "diyPossible": true|false,
      "reasoning": "Why this is important now"
    }
  ],
  "priorityRepairs": [
    {
      "system": "System name",
      "issue": "What needs attention",
      "severity": "critical|important|minor",
      "recommendation": "What to do",
      "estimatedCost": "$X-$Y (optional)"
    }
  ],
  "recommendedServices": [
    {
      "service": "Service name",
      "category": "hvac|plumbing|electrical|etc",
      "frequency": "Monthly|Quarterly|Annually|etc",
      "nextDue": "When to schedule",
      "reasoning": "Why this service is recommended",
      "priority": "high|medium|low"
    }
  ],
  "notes": ["General tip 1", "Seasonal reminder 2"],
  ${isPremium ? `"printableSummary": {
    "title": "Home Maintenance Plan for [Address]",
    "overview": "Executive summary of maintenance needs",
    "quarterlyChecklist": [
      { "quarter": "Q1|Q2|Q3|Q4", "tasks": ["Task 1", "Task 2"] }
    ],
    "annualPlan": "Summary of the annual maintenance approach",
    "estimatedAnnualCost": "$X,XXX-$X,XXX"
  },` : ""}
  "annualPlanSummary": "Brief overview for all subscription tiers"
}`;

    return { system, user: userPrompt };
  },

  parseOutput(raw: string): MaintenancePlanOutput {
    try {
      const data = JSON.parse(raw);

      return {
        seasonalTasks: Array.isArray(data.seasonalTasks)
          ? data.seasonalTasks.map((t: Record<string, unknown>) => ({
              task: String(t.task || ""),
              system: String(t.system || ""),
              urgency: ["now", "this_month", "this_season"].includes(t.urgency as string)
                ? (t.urgency as "now" | "this_month" | "this_season")
                : "this_season",
              estimatedCost: t.estimatedCost ? String(t.estimatedCost) : undefined,
              diyPossible: Boolean(t.diyPossible),
              reasoning: String(t.reasoning || ""),
            }))
          : [],
        priorityRepairs: Array.isArray(data.priorityRepairs)
          ? data.priorityRepairs.map((r: Record<string, unknown>) => ({
              system: String(r.system || ""),
              issue: String(r.issue || ""),
              severity: ["critical", "important", "minor"].includes(r.severity as string)
                ? (r.severity as "critical" | "important" | "minor")
                : "minor",
              recommendation: String(r.recommendation || ""),
              estimatedCost: r.estimatedCost ? String(r.estimatedCost) : undefined,
            }))
          : [],
        recommendedServices: Array.isArray(data.recommendedServices)
          ? data.recommendedServices.map((s: Record<string, unknown>) => ({
              service: String(s.service || ""),
              category: String(s.category || "other"),
              frequency: String(s.frequency || ""),
              nextDue: String(s.nextDue || ""),
              reasoning: String(s.reasoning || ""),
              priority: ["high", "medium", "low"].includes(s.priority as string)
                ? (s.priority as "high" | "medium" | "low")
                : "medium",
            }))
          : [],
        notes: Array.isArray(data.notes) ? data.notes.map(String) : [],
        printableSummary: data.printableSummary
          ? {
              title: String(data.printableSummary.title || ""),
              overview: String(data.printableSummary.overview || ""),
              quarterlyChecklist: Array.isArray(data.printableSummary.quarterlyChecklist)
                ? data.printableSummary.quarterlyChecklist.map((q: Record<string, unknown>) => ({
                    quarter: ["Q1", "Q2", "Q3", "Q4"].includes(q.quarter as string)
                      ? (q.quarter as "Q1" | "Q2" | "Q3" | "Q4")
                      : "Q1",
                    tasks: Array.isArray(q.tasks) ? q.tasks.map(String) : [],
                  }))
                : [],
              annualPlan: String(data.printableSummary.annualPlan || ""),
              estimatedAnnualCost: data.printableSummary.estimatedAnnualCost
                ? String(data.printableSummary.estimatedAnnualCost)
                : undefined,
            }
          : undefined,
        annualPlanSummary: String(data.annualPlanSummary || ""),
      };
    } catch {
      throw new Error("Failed to parse maintenance plan output");
    }
  },

  getFallback(input: MaintenancePlanInput): MaintenancePlanOutput {
    const season = getSeasonFromTimezone(input.location.timezone);
    const currentQuarter = getCurrentQuarter();
    const isPremium = input.subscriptionTier === "premium" || input.subscriptionTier === "standard";

    // Seasonal task suggestions
    const seasonalTasks: MaintenancePlanOutput["seasonalTasks"] = [];

    if (season === "spring") {
      seasonalTasks.push(
        { task: "Test and service air conditioning", system: "HVAC", urgency: "this_month", diyPossible: false, reasoning: "Prepare for summer cooling needs" },
        { task: "Clean gutters and downspouts", system: "Exterior", urgency: "now", diyPossible: true, reasoning: "Clear winter debris before spring rains" },
        { task: "Check exterior for winter damage", system: "Exterior", urgency: "this_month", diyPossible: true, reasoning: "Identify any repairs needed from winter weather" }
      );
    } else if (season === "summer") {
      seasonalTasks.push(
        { task: "Check and clean dryer vents", system: "Appliances", urgency: "this_month", diyPossible: true, reasoning: "Prevent fire hazards" },
        { task: "Inspect and touch up exterior paint", system: "Exterior", urgency: "this_season", diyPossible: true, reasoning: "Best weather for exterior work" }
      );
    } else if (season === "fall") {
      seasonalTasks.push(
        { task: "Schedule heating system service", system: "HVAC", urgency: "now", diyPossible: false, reasoning: "Prepare for winter heating season" },
        { task: "Clean gutters after leaves fall", system: "Exterior", urgency: "this_month", diyPossible: true, reasoning: "Prevent ice dams and water damage" },
        { task: "Seal gaps and cracks around windows and doors", system: "Exterior", urgency: "this_month", diyPossible: true, reasoning: "Improve energy efficiency before winter" }
      );
    } else {
      seasonalTasks.push(
        { task: "Replace HVAC filters", system: "HVAC", urgency: "now", estimatedCost: "$15-$30", diyPossible: true, reasoning: "Heavy heating use requires fresh filters" },
        { task: "Test smoke and CO detectors", system: "Safety", urgency: "now", diyPossible: true, reasoning: "Critical safety check during heating season" }
      );
    }

    // Check for system-specific recommendations
    const priorityRepairs: MaintenancePlanOutput["priorityRepairs"] = [];
    const recommendedServices: MaintenancePlanOutput["recommendedServices"] = [];

    for (const system of input.systems) {
      if (system.age && system.age > 15) {
        priorityRepairs.push({
          system: system.type,
          issue: `System is ${system.age} years old and may be nearing end of useful life`,
          severity: "important",
          recommendation: "Schedule professional inspection to assess condition and discuss replacement options",
        });
      }

      if (system.condition === "poor" || system.condition === "fair") {
        priorityRepairs.push({
          system: system.type,
          issue: `System condition is listed as ${system.condition}`,
          severity: system.condition === "poor" ? "critical" : "important",
          recommendation: "Schedule professional evaluation to determine repair or replacement needs",
        });
      }

      recommendedServices.push({
        service: `${system.type} maintenance`,
        category: system.type.toLowerCase().includes("hvac") ? "hvac"
          : system.type.toLowerCase().includes("plumb") ? "plumbing"
          : system.type.toLowerCase().includes("elec") ? "electrical"
          : "other",
        frequency: "Annually",
        nextDue: "Schedule within 30 days if not serviced this year",
        reasoning: "Regular professional maintenance extends equipment life and prevents costly breakdowns",
        priority: system.age && system.age > 10 ? "high" : "medium",
      });
    }

    const notes = [
      "Keep records of all maintenance and repairs for warranty claims and resale value",
      "Consider setting calendar reminders for recurring maintenance tasks",
      `Your property in ${input.location.region} may have specific requirements based on local climate`,
    ];

    const annualPlanSummary = `Based on your ${input.propertyType}${input.propertyAge ? ` (${input.propertyAge} years old)` : ""} in ${input.location.region}, we recommend focusing on ${season} preparation tasks, regular HVAC maintenance, and professional inspections for any systems showing signs of wear.`;

    // Only include printable summary for premium/standard
    const printableSummary = isPremium ? {
      title: `Home Maintenance Plan - ${input.propertyType}`,
      overview: `This maintenance plan covers your ${input.propertyType}${input.squareFeet ? ` (${input.squareFeet} sq ft)` : ""} with ${input.systems.length} tracked systems. Focus on seasonal preparation and regular professional maintenance to protect your investment.`,
      quarterlyChecklist: [
        { quarter: "Q1" as const, tasks: ["Test smoke/CO detectors", "Replace HVAC filters", "Check for ice dam damage", "Inspect plumbing for leaks"] },
        { quarter: "Q2" as const, tasks: ["Service air conditioning", "Clean gutters", "Inspect exterior", "Test irrigation system"] },
        { quarter: "Q3" as const, tasks: ["Service heating system", "Seal windows/doors", "Clean dryer vents", "Check roof condition"] },
        { quarter: "Q4" as const, tasks: ["Winterize outdoor faucets", "Replace HVAC filters", "Test emergency systems", "Schedule annual inspections"] },
      ],
      annualPlan: "Follow the quarterly checklist above, scheduling professional services as indicated. Keep all maintenance records organized for warranty claims and future reference.",
      estimatedAnnualCost: "$500-$1,500",
    } : undefined;

    return {
      seasonalTasks,
      priorityRepairs,
      recommendedServices,
      notes,
      printableSummary,
      annualPlanSummary,
    };
  },

  validateOutput(output: MaintenancePlanOutput): boolean {
    return (
      Array.isArray(output.seasonalTasks) &&
      Array.isArray(output.priorityRepairs) &&
      Array.isArray(output.recommendedServices) &&
      Array.isArray(output.notes) &&
      typeof output.annualPlanSummary === "string"
    );
  },
};
