/**
 * AI Intake Prompts
 *
 * Prompts for analyzing home maintenance service request images
 */

import { MaintenanceCategory } from "../types";

export const INTAKE_SYSTEM_PROMPT = `You are an expert home maintenance analyst for RegularUpkeep, a home maintenance platform. Your role is to analyze photos submitted by homeowners and provide helpful, accurate assessments.

Guidelines:
- Be concise but thorough
- Focus on visible issues and potential concerns
- Never diagnose definitively - suggest possibilities
- Prioritize safety concerns
- Be empathetic and professional
- Do not recommend DIY fixes for complex or dangerous issues
- Always recommend professional assessment for electrical, gas, or structural concerns

Response Format:
Provide your response as valid JSON with this exact structure:
{
  "summary": "A 1-2 sentence summary of what you observe in the images",
  "suggestions": ["Array of 4-6 specific things the homeowner should mention or check"],
  "urgencyIndicators": ["Any signs that suggest this needs immediate attention"],
  "safetyNotes": ["Any safety precautions the homeowner should take"]
}`;

export const categorySpecificPrompts: Record<MaintenanceCategory, string> = {
  hvac: `Analyze these HVAC system images. Look for:
- Visible damage, rust, or corrosion on units
- Ice buildup on coils or pipes
- Dirty filters or blocked vents
- Water pooling or leaks
- Age indicators on equipment
- Thermostat display issues
- Ductwork condition if visible

Consider common HVAC issues: refrigerant leaks, compressor problems, blower motor issues, clogged condensate lines, failed capacitors.`,

  plumbing: `Analyze these plumbing images. Look for:
- Active leaks, drips, or water damage
- Corrosion or mineral buildup on pipes/fixtures
- Water stains on walls, ceilings, or floors
- Mold or mildew presence
- Pipe material (copper, PVC, galvanized)
- Fixture condition and age
- Drain condition

Consider common issues: clogged drains, pipe corrosion, water heater problems, fixture failures, water pressure issues.`,

  electrical: `Analyze these electrical images. SAFETY FIRST.
Look for:
- Burn marks, discoloration, or melting
- Exposed or damaged wiring
- Overloaded outlets or power strips
- Outdated electrical panels
- Missing cover plates
- Signs of amateur repairs
- Water near electrical components

IMPORTANT: Note any immediate safety hazards. Electrical issues can be dangerous.`,

  appliances: `Analyze these appliance images. Look for:
- Model/brand information if visible
- Physical damage or wear
- Error codes on displays
- Rust, corrosion, or water damage
- Age indicators
- Cleanliness and maintenance state
- Connection points (water, gas, electrical)

Identify the appliance type and any visible issues that could indicate the problem.`,

  exterior: `Analyze these exterior/roofing images. Look for:
- Missing, damaged, or curling shingles
- Gutter condition and debris
- Siding damage, cracks, or rot
- Foundation cracks or settling
- Paint peeling or wood rot
- Drainage issues
- Storm damage indicators
- Flashing condition around penetrations

Consider weather exposure and age of materials.`,

  interior: `Analyze these interior repair images. Look for:
- Drywall damage (holes, cracks, water stains)
- Floor damage (scratches, warping, tile issues)
- Ceiling damage or stains
- Door/window alignment issues
- Trim or molding damage
- Signs of water intrusion
- Paint or finish condition

Assess scope: is this cosmetic or potentially structural?`,

  landscaping: `Analyze these landscaping images. Look for:
- Plant health and condition
- Overgrowth or maintenance needs
- Irrigation system visible issues
- Hardscape condition (patios, walkways)
- Drainage patterns or issues
- Tree health and proximity to structures
- Lawn condition

Consider seasonal factors and maintenance level.`,

  pest_control: `Analyze these pest-related images. Look for:
- Evidence of pest presence (droppings, damage, nests)
- Entry points or gaps
- Wood damage (termites, carpenter ants)
- Gnaw marks or trails
- Standing water (mosquito breeding)
- Food source attractions

Identify pest type if possible and extent of evidence.`,

  safety: `Analyze these safety-related images. PRIORITY: Safety issues.
Look for:
- Smoke/CO detector condition
- Handrail or stair safety
- Trip hazards
- Fire hazards
- Security concerns
- Child safety issues
- Structural safety concerns

Flag any immediate dangers that need urgent attention.`,

  other: `Analyze these home maintenance images. Look for:
- The primary issue or concern shown
- Related problems that may be visible
- Age and condition of affected areas
- Potential causes of the issue
- Scope of work that may be needed

Provide helpful observations to guide the service request.`,
};

export function getIntakePrompt(
  category: MaintenanceCategory,
  imageCount: number
): string {
  const categoryPrompt = categorySpecificPrompts[category] || categorySpecificPrompts.other;

  return `${categoryPrompt}

You are analyzing ${imageCount} image${imageCount > 1 ? "s" : ""} submitted for a ${category.replace("_", " ")} service request.

Remember to respond with valid JSON containing: summary, suggestions, urgencyIndicators, and safetyNotes.`;
}

export function getProviderBriefPrompt(
  summary: string,
  category: MaintenanceCategory,
  userDescription: string
): string {
  return `Based on the following service request, create a professional brief for the service provider.

Category: ${category.replace("_", " ")}
AI Image Analysis: ${summary}
Homeowner Description: ${userDescription}

Create a provider brief with:
1. Concise summary of the issue
2. Key observations from photos and description
3. Potential causes to investigate
4. Questions to ask the homeowner on arrival
5. Urgency assessment (low/medium/high/emergency)
6. Estimated complexity (simple/moderate/complex)

Respond with valid JSON:
{
  "briefSummary": "2-3 sentence summary for the provider",
  "keyObservations": ["list of observations"],
  "potentialCauses": ["possible causes to check"],
  "recommendedQuestions": ["questions for the homeowner"],
  "urgencyAssessment": "low|medium|high|emergency",
  "estimatedComplexity": "simple|moderate|complex"
}`;
}
