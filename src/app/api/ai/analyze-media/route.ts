/**
 * AI Media Analysis API
 *
 * Analyzes uploaded images for service requests using AI
 * to generate descriptions and suggestions.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Category-specific analysis prompts
const categoryPrompts: Record<string, string> = {
  hvac: "Analyze this HVAC-related issue. Look for signs of damage, wear, ice buildup, or malfunctioning components.",
  plumbing: "Analyze this plumbing issue. Look for leaks, corrosion, water damage, clogs, or damaged fixtures.",
  electrical: "Analyze this electrical issue. Look for damaged outlets, wiring issues, burn marks, or safety hazards.",
  appliances: "Analyze this appliance issue. Identify the appliance and any visible damage, wear, or malfunction indicators.",
  exterior: "Analyze this exterior/roofing issue. Look for damage, wear, rot, missing materials, or storm damage.",
  interior: "Analyze this interior repair issue. Look for damage to walls, floors, ceilings, doors, or trim.",
  landscaping: "Analyze this landscaping issue. Look for overgrowth, damage, drainage issues, or required maintenance.",
  pest_control: "Analyze this pest-related issue. Look for signs of infestation, damage, or entry points.",
  other: "Analyze this home maintenance issue and describe what you see.",
};

// Simulated AI analysis (replace with actual AI service)
async function analyzeImages(
  imageUrls: string[],
  category: string
): Promise<{ summary: string; suggestions: string[] }> {
  // In production, this would call an AI service like:
  // - OpenAI Vision API
  // - Google Cloud Vision
  // - AWS Rekognition
  // - Anthropic Claude Vision

  const prompt = categoryPrompts[category] || categoryPrompts.other;

  // For now, return category-specific placeholder responses
  // This demonstrates the expected response format
  const responses: Record<string, { summary: string; suggestions: string[] }> = {
    hvac: {
      summary: "Based on the uploaded images, we can see your HVAC system. Our technicians will review the details to provide an accurate assessment.",
      suggestions: [
        "Note the model number if visible",
        "Describe any unusual sounds",
        "Mention when the issue started",
        "Check if thermostat is responding",
      ],
    },
    plumbing: {
      summary: "The images show a plumbing concern. We'll connect you with a qualified plumber to assess the situation.",
      suggestions: [
        "Describe the water flow",
        "Note if water is discolored",
        "Mention if there's a smell",
        "Indicate where the leak is coming from",
      ],
    },
    electrical: {
      summary: "Your images show an electrical concern. Safety first - avoid touching exposed wires until inspected.",
      suggestions: [
        "Note which circuits are affected",
        "Describe any burning smell",
        "Mention if breakers are tripping",
        "Indicate when the issue started",
      ],
    },
    appliances: {
      summary: "We can see the appliance in question. We'll match you with a technician familiar with this brand.",
      suggestions: [
        "Include the model number",
        "Describe the symptoms",
        "Note any error codes",
        "Mention the appliance age",
      ],
    },
    exterior: {
      summary: "The exterior images show the area of concern. Weather and age can affect these materials.",
      suggestions: [
        "Note recent storm damage",
        "Describe any water intrusion",
        "Mention the material type",
        "Indicate the affected area size",
      ],
    },
    interior: {
      summary: "The interior images show the repair needed. Our team will assess the scope of work required.",
      suggestions: [
        "Describe the damage extent",
        "Note if it's structural",
        "Mention any water damage",
        "Indicate when it was noticed",
      ],
    },
    landscaping: {
      summary: "We can see the landscaping area. Our providers can help with maintenance or new installations.",
      suggestions: [
        "Describe the desired outcome",
        "Note the approximate area size",
        "Mention any irrigation needs",
        "Indicate access restrictions",
      ],
    },
    pest_control: {
      summary: "We'll connect you with pest control experts to address this concern safely and effectively.",
      suggestions: [
        "Describe where pests are seen",
        "Note the pest type if known",
        "Mention any structural damage",
        "Indicate duration of issue",
      ],
    },
    other: {
      summary: "Thank you for uploading images. Our team will review and match you with the right provider.",
      suggestions: [
        "Describe the issue in detail",
        "Note when it started",
        "Mention any temporary fixes tried",
        "Indicate urgency level",
      ],
    },
  };

  // TODO: Replace with actual AI vision API call
  // Example with OpenAI:
  // const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  // const response = await openai.chat.completions.create({
  //   model: "gpt-4-vision-preview",
  //   messages: [
  //     {
  //       role: "user",
  //       content: [
  //         { type: "text", text: prompt },
  //         ...imageUrls.map(url => ({
  //           type: "image_url" as const,
  //           image_url: { url }
  //         }))
  //       ]
  //     }
  //   ]
  // });
  // return parseAIResponse(response.choices[0].message.content);

  return responses[category] || responses.other;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { imageUrls, category } = await request.json();

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one image URL is required" },
        { status: 400 }
      );
    }

    if (!category) {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    // Validate URLs are from our storage
    const validUrls = imageUrls.filter((url: string) =>
      url.includes("supabase") || url.includes("api.regularupkeep.com")
    );

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: "No valid image URLs provided" },
        { status: 400 }
      );
    }

    // Analyze the images
    const analysis = await analyzeImages(validUrls, category);

    return NextResponse.json({
      summary: analysis.summary,
      suggestions: analysis.suggestions,
    });
  } catch (error) {
    console.error("AI analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze images" },
      { status: 500 }
    );
  }
}
