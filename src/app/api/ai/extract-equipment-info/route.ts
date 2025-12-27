/**
 * AI Equipment Label Extraction API
 *
 * Uses OpenAI's vision model to extract equipment details from photos of labels.
 * Returns structured data: brand, model, serial_number, filter_size, tonnage, etc.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import OpenAI from "openai";

interface ExtractedEquipmentInfo {
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  manufacture_date: string | null;
  filter_size: string | null;
  filter_type: string | null;
  refrigerant_type: string | null;
  tonnage: number | null;
  btu_rating: number | null;
  tank_size_gallons: number | null;
  fuel_type: string | null;
  voltage: string | null;
  suggested_system_type: string | null;
  confidence: "high" | "medium" | "low";
  raw_text: string | null;
}

const EXTRACTION_PROMPT = `You are an expert at reading equipment labels and extracting information from HVAC units, water heaters, appliances, and other home systems.

Analyze this image of an equipment label and extract all available information. Return a JSON object with these fields (use null for any field you cannot determine):

{
  "brand": "Manufacturer name (e.g., Carrier, Rheem, LG, Trane)",
  "model": "Model number exactly as shown",
  "serial_number": "Serial number exactly as shown",
  "manufacture_date": "Manufacturing date in YYYY-MM-DD format if visible (often encoded in serial number)",
  "filter_size": "Filter dimensions if shown (e.g., '20x25x1', '16x20x4')",
  "filter_type": "Filter type if specified (e.g., 'MERV 13', 'HEPA')",
  "refrigerant_type": "Refrigerant type for AC/heat pump (e.g., 'R-410A', 'R-22', 'R-32')",
  "tonnage": "AC tonnage as a number (e.g., 2.5, 3.0) - can calculate from BTU/12000",
  "btu_rating": "BTU rating as a number (e.g., 36000, 60000)",
  "tank_size_gallons": "Water heater tank capacity in gallons as a number",
  "fuel_type": "Fuel/power source (e.g., 'Gas', 'Electric', 'Propane', 'Heat Pump')",
  "voltage": "Electrical specs if shown (e.g., '240V', '120V')",
  "suggested_system_type": "One of: hvac, heating, cooling, water_heater, electrical, plumbing, appliance, pool_spa, security, garage, irrigation, solar, other",
  "confidence": "Your confidence level: 'high' if text is clear, 'medium' if partially visible, 'low' if guessing",
  "raw_text": "All readable text from the label for reference"
}

Tips for identification:
- Serial numbers often contain manufacture date codes (e.g., first 4 digits = year+week)
- Model numbers often encode capacity (e.g., "036" = 36,000 BTU = 3 ton)
- Look for data plates, rating plates, or stickers with specs
- Common brands: Carrier, Trane, Lennox, Rheem, AO Smith, Bradford White, GE, LG, Samsung

Return ONLY valid JSON, no other text.`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { image_url, image_base64 } = body as {
      image_url?: string;
      image_base64?: string;
    };

    if (!image_url && !image_base64) {
      return NextResponse.json(
        { error: "Either image_url or image_base64 is required" },
        { status: 400 }
      );
    }

    // Initialize OpenAI client
    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // Prepare the image content
    const imageContent = image_url
      ? { type: "image_url" as const, image_url: { url: image_url } }
      : {
          type: "image_url" as const,
          image_url: { url: `data:image/jpeg;base64,${image_base64}` },
        };

    // Call OpenAI Vision API
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: EXTRACTION_PROMPT },
            imageContent,
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1, // Low temperature for more consistent extraction
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        { error: "No response from AI" },
        { status: 500 }
      );
    }

    // Parse the JSON response
    let extracted: ExtractedEquipmentInfo;
    try {
      // Clean up the response - remove markdown code blocks if present
      let jsonStr = content.trim();
      if (jsonStr.startsWith("```json")) {
        jsonStr = jsonStr.slice(7);
      } else if (jsonStr.startsWith("```")) {
        jsonStr = jsonStr.slice(3);
      }
      if (jsonStr.endsWith("```")) {
        jsonStr = jsonStr.slice(0, -3);
      }
      jsonStr = jsonStr.trim();

      extracted = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content);
      return NextResponse.json(
        {
          error: "Failed to parse equipment information",
          raw_response: content,
        },
        { status: 500 }
      );
    }

    // Validate and clean the extracted data
    const cleanedData: ExtractedEquipmentInfo = {
      brand: extracted.brand?.trim() || null,
      model: extracted.model?.trim() || null,
      serial_number: extracted.serial_number?.trim() || null,
      manufacture_date: extracted.manufacture_date || null,
      filter_size: extracted.filter_size?.trim() || null,
      filter_type: extracted.filter_type?.trim() || null,
      refrigerant_type: extracted.refrigerant_type?.trim() || null,
      tonnage: typeof extracted.tonnage === "number" ? extracted.tonnage : null,
      btu_rating:
        typeof extracted.btu_rating === "number" ? extracted.btu_rating : null,
      tank_size_gallons:
        typeof extracted.tank_size_gallons === "number"
          ? extracted.tank_size_gallons
          : null,
      fuel_type: extracted.fuel_type?.trim() || null,
      voltage: extracted.voltage?.trim() || null,
      suggested_system_type: extracted.suggested_system_type || null,
      confidence: extracted.confidence || "medium",
      raw_text: extracted.raw_text || null,
    };

    // Log AI usage for tracking
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("ai_jobs") as any).insert({
      user_id: user.id,
      task_type: "EQUIPMENT_LABEL_EXTRACTION",
      status: "completed",
      input_tokens: response.usage?.prompt_tokens || 0,
      output_tokens: response.usage?.completion_tokens || 0,
      model: "gpt-4o",
      completed_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      extracted: cleanedData,
      usage: {
        prompt_tokens: response.usage?.prompt_tokens,
        completion_tokens: response.usage?.completion_tokens,
      },
    });
  } catch (error) {
    console.error("Equipment extraction error:", error);
    return NextResponse.json(
      { error: "Failed to extract equipment information" },
      { status: 500 }
    );
  }
}
