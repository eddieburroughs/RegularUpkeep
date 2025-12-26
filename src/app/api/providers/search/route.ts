/**
 * Provider Search API
 *
 * Search for providers using Google Places API with caching.
 * Returns providers within specified radius of a property.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  searchNearbyProviders,
  getPropertyLocation,
  type ProviderSearchParams,
} from "@/lib/google";
import { isFeatureEnabled } from "@/lib/config/admin-config";

// Service types supported
const VALID_SERVICE_TYPES = [
  "hvac",
  "plumbing",
  "electrical",
  "handyman",
  "roofing",
  "landscaping",
  "pest_control",
  "appliances",
] as const;

type ServiceType = (typeof VALID_SERVICE_TYPES)[number];

interface SearchRequestBody {
  propertyId: string;
  serviceType?: ServiceType;
  radiusMiles?: number;
  minRating?: number;
  minReviews?: number;
  maxResults?: number;
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if Google discovery is enabled
    const discoveryEnabled = await isFeatureEnabled(
      "google_provider_discovery"
    );

    if (!discoveryEnabled) {
      return NextResponse.json(
        {
          error: "Provider discovery is not enabled",
          featureDisabled: true,
        },
        { status: 403 }
      );
    }

    // Parse request body
    const body = (await request.json()) as SearchRequestBody;
    const { propertyId, serviceType, radiusMiles, minRating, minReviews, maxResults } =
      body;

    if (!propertyId) {
      return NextResponse.json(
        { error: "propertyId is required" },
        { status: 400 }
      );
    }

    // Validate service type if provided
    if (
      serviceType &&
      !VALID_SERVICE_TYPES.includes(serviceType as ServiceType)
    ) {
      return NextResponse.json(
        {
          error: `Invalid serviceType. Must be one of: ${VALID_SERVICE_TYPES.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Verify user has access to this property
    const { data: propertyMember } = await supabase
      .from("property_members")
      .select("id")
      .eq("property_id", propertyId)
      .eq("user_id", user.id)
      .single();

    if (!propertyMember) {
      return NextResponse.json(
        { error: "You don't have access to this property" },
        { status: 403 }
      );
    }

    // Get property location (geocode if needed)
    const location = await getPropertyLocation(propertyId);

    if (!location) {
      return NextResponse.json(
        {
          error:
            "Could not determine property location. Please ensure the address is complete.",
        },
        { status: 400 }
      );
    }

    // Default discovery settings
    const config = {
      search_radius_miles: 30,
      min_rating: 4.0,
      min_reviews: 5,
      max_results_per_search: 20,
    };

    // Build search params
    const searchParams: ProviderSearchParams = {
      lat: location.lat,
      lng: location.lng,
      radiusMiles: radiusMiles || config.search_radius_miles,
      serviceType: serviceType,
      minRating: minRating ?? config.min_rating,
      minReviews: minReviews ?? config.min_reviews,
      maxResults: maxResults || config.max_results_per_search,
    };

    // Search for providers
    const providers = await searchNearbyProviders(searchParams);

    return NextResponse.json({
      providers,
      count: providers.length,
      searchParams: {
        lat: location.lat,
        lng: location.lng,
        radiusMiles: searchParams.radiusMiles,
        serviceType: searchParams.serviceType,
        minRating: searchParams.minRating,
        minReviews: searchParams.minReviews,
      },
    });
  } catch (error) {
    console.error("Provider search error:", error);
    return NextResponse.json(
      { error: "Failed to search for providers" },
      { status: 500 }
    );
  }
}
