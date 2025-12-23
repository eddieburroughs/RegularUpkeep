/**
 * AI Media Analysis API
 *
 * Analyzes uploaded images for service requests using AI
 * to generate descriptions and suggestions.
 *
 * Uses OpenAI GPT-4o Vision when configured, falls back to
 * category-specific static responses otherwise.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { analyzeServiceRequestImages } from "@/lib/ai";

// Rate limiting: simple in-memory store (use Redis in production for multi-instance)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userLimit = rateLimitMap.get(userId);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(userId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (userLimit.count >= RATE_LIMIT) {
    return false;
  }

  userLimit.count++;
  return true;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limiting
  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { imageUrls, category, additionalContext } = body;

    // Validate imageUrls
    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      return NextResponse.json(
        { error: "At least one image URL is required" },
        { status: 400 }
      );
    }

    // Validate category
    if (!category || typeof category !== "string") {
      return NextResponse.json(
        { error: "Category is required" },
        { status: 400 }
      );
    }

    // Validate URLs are from our storage (security check)
    const validUrls = imageUrls.filter(
      (url: string) =>
        typeof url === "string" &&
        (url.includes("supabase") || url.includes("api.regularupkeep.com"))
    );

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: "No valid image URLs provided" },
        { status: 400 }
      );
    }

    // Limit number of images to prevent abuse
    const limitedUrls = validUrls.slice(0, 5);

    // Analyze the images using AI (with automatic fallback)
    const analysis = await analyzeServiceRequestImages({
      imageUrls: limitedUrls,
      category,
      additionalContext,
    });

    return NextResponse.json({
      summary: analysis.summary,
      suggestions: analysis.suggestions,
    });
  } catch (error) {
    console.error("AI analysis error:", error);

    // Return a user-friendly error
    return NextResponse.json(
      {
        error: "Failed to analyze images. Please try again or describe the issue manually.",
      },
      { status: 500 }
    );
  }
}
