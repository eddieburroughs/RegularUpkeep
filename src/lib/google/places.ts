/**
 * Google Places API Integration
 *
 * Server-side only integration for searching nearby service providers.
 * Uses Google Places API (Nearby Search + Place Details).
 *
 * @see https://developers.google.com/maps/documentation/places/web-service
 */

import { createServiceClient } from "@/lib/supabase/server";

// Service type to Google Places type mapping
const SERVICE_TYPE_KEYWORDS: Record<string, string[]> = {
  hvac: ["hvac", "air conditioning", "heating", "cooling", "furnace"],
  plumbing: ["plumber", "plumbing", "drain cleaning", "water heater"],
  electrical: ["electrician", "electrical contractor", "electric"],
  handyman: ["handyman", "home repair", "general contractor"],
  roofing: ["roofing", "roofer", "roof repair"],
  landscaping: ["landscaping", "lawn care", "yard maintenance"],
  pest_control: ["pest control", "exterminator", "termite"],
  appliances: ["appliance repair", "appliance service"],
};

export interface GooglePlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  formatted_phone_number?: string;
  website?: string;
  types?: string[];
  opening_hours?: {
    open_now?: boolean;
    weekday_text?: string[];
  };
  photos?: Array<{
    photo_reference: string;
    height: number;
    width: number;
  }>;
}

export interface ProviderSearchParams {
  lat: number;
  lng: number;
  radiusMiles?: number;
  serviceType?: string;
  minRating?: number;
  minReviews?: number;
  maxResults?: number;
}

export interface ProviderSearchResult {
  id: string;
  place_id: string;
  name: string;
  primary_service: string;
  service_tags: string[];
  rating: number | null;
  user_ratings_total: number | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  lat: number;
  lng: number;
  distance_miles: number;
  source: "google" | "manual" | "referral";
  last_fetched_at: string;
}

// Get API key from environment
function getApiKey(): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY environment variable is not set");
  }
  return apiKey;
}

// Convert miles to meters (Google uses meters)
function milesToMeters(miles: number): number {
  return miles * 1609.34;
}

// Calculate Haversine distance in miles
function haversineDistanceMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 3959; // Earth radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.asin(Math.sqrt(a));
  return R * c;
}

/**
 * Search for nearby providers using Google Places API
 * Results are cached in provider_leads table for 7 days
 */
export async function searchNearbyProviders(
  params: ProviderSearchParams
): Promise<ProviderSearchResult[]> {
  const {
    lat,
    lng,
    radiusMiles = 30,
    serviceType,
    minRating = 4.0,
    minReviews = 5,
    maxResults = 20,
  } = params;

  const supabase = createServiceClient();

  // First, check cache for recent results
  const cacheHours = 168; // 7 days
  const cacheThreshold = new Date(
    Date.now() - cacheHours * 60 * 60 * 1000
  ).toISOString();

  // Query cached providers within radius using the database function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: cachedProviders, error: cacheError } = (await (supabase as any).rpc(
    "find_providers_within_radius",
    {
      center_lat: lat,
      center_lng: lng,
      radius_miles: radiusMiles,
      service_filter: serviceType || null,
      min_rating: minRating,
    }
  )) as { data: ProviderSearchResult[] | null; error: unknown };

  // Check if we have enough fresh cache results
  if (!cacheError && cachedProviders && cachedProviders.length >= maxResults) {
    // Filter by min reviews and limit
    return cachedProviders
      .filter(
        (p: ProviderSearchResult) =>
          !p.user_ratings_total || p.user_ratings_total >= minReviews
      )
      .slice(0, maxResults)
      .map((p: ProviderSearchResult) => ({
        ...p,
        source: "google" as const,
        last_fetched_at: new Date().toISOString(),
      }));
  }

  // Need to fetch from Google
  const googleResults = await fetchFromGooglePlaces(
    lat,
    lng,
    radiusMiles,
    serviceType
  );

  // Cache the results
  if (googleResults.length > 0) {
    await cacheProviderLeads(googleResults, serviceType);
  }

  // Combine with any existing cache results and filter
  const allProviders = [...(cachedProviders || [])];

  // Add new Google results that aren't already in cache
  for (const result of googleResults) {
    const distance = haversineDistanceMiles(
      lat,
      lng,
      result.geometry.location.lat,
      result.geometry.location.lng
    );

    if (distance <= radiusMiles) {
      const existing = allProviders.find(
        (p) => p.place_id === result.place_id
      );
      if (!existing) {
        allProviders.push({
          id: "", // Will be set when cached
          place_id: result.place_id,
          name: result.name,
          primary_service: serviceType || "general",
          service_tags: [],
          rating: result.rating || null,
          user_ratings_total: result.user_ratings_total || null,
          phone: result.formatted_phone_number || null,
          website: result.website || null,
          address: result.formatted_address || null,
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          distance_miles: distance,
          source: "google",
          last_fetched_at: new Date().toISOString(),
        });
      }
    }
  }

  // Filter and sort
  return allProviders
    .filter((p) => {
      if (minRating && p.rating && p.rating < minRating) return false;
      if (minReviews && p.user_ratings_total && p.user_ratings_total < minReviews)
        return false;
      return true;
    })
    .sort((a, b) => {
      // Sort by distance first, then rating
      if (a.distance_miles !== b.distance_miles) {
        return a.distance_miles - b.distance_miles;
      }
      return (b.rating || 0) - (a.rating || 0);
    })
    .slice(0, maxResults);
}

/**
 * Fetch providers from Google Places API
 */
async function fetchFromGooglePlaces(
  lat: number,
  lng: number,
  radiusMiles: number,
  serviceType?: string
): Promise<GooglePlaceResult[]> {
  const apiKey = getApiKey();
  const radiusMeters = Math.min(milesToMeters(radiusMiles), 50000); // Max 50km

  // Build search keywords
  const keywords = serviceType
    ? SERVICE_TYPE_KEYWORDS[serviceType] || [serviceType]
    : ["home services", "contractor"];

  const results: GooglePlaceResult[] = [];

  // Search for each keyword
  for (const keyword of keywords.slice(0, 3)) {
    // Limit to 3 searches to save API quota
    const searchUrl = new URL(
      "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    );
    searchUrl.searchParams.set("location", `${lat},${lng}`);
    searchUrl.searchParams.set("radius", radiusMeters.toString());
    searchUrl.searchParams.set("keyword", keyword);
    searchUrl.searchParams.set("type", "general_contractor");
    searchUrl.searchParams.set("key", apiKey);

    try {
      const response = await fetch(searchUrl.toString());
      const data = await response.json();

      if (data.status === "OK" && data.results) {
        // Fetch details for each place to get phone and website
        for (const place of data.results.slice(0, 10)) {
          const details = await fetchPlaceDetails(place.place_id);
          if (details) {
            results.push(details);
          }
        }
      }
    } catch (error) {
      console.error(`Error searching Google Places for ${keyword}:`, error);
    }
  }

  // Dedupe by place_id
  const uniqueResults = Array.from(
    new Map(results.map((r) => [r.place_id, r])).values()
  );

  return uniqueResults;
}

/**
 * Fetch detailed information about a specific place
 */
export async function fetchPlaceDetails(
  placeId: string
): Promise<GooglePlaceResult | null> {
  const apiKey = getApiKey();

  const detailsUrl = new URL(
    "https://maps.googleapis.com/maps/api/place/details/json"
  );
  detailsUrl.searchParams.set("place_id", placeId);
  detailsUrl.searchParams.set(
    "fields",
    "place_id,name,formatted_address,geometry,rating,user_ratings_total,formatted_phone_number,website,types,opening_hours,photos"
  );
  detailsUrl.searchParams.set("key", apiKey);

  try {
    const response = await fetch(detailsUrl.toString());
    const data = await response.json();

    if (data.status === "OK" && data.result) {
      return data.result as GooglePlaceResult;
    }
  } catch (error) {
    console.error(`Error fetching place details for ${placeId}:`, error);
  }

  return null;
}

/**
 * Cache provider leads in the database
 */
async function cacheProviderLeads(
  places: GooglePlaceResult[],
  serviceType?: string
): Promise<void> {
  const supabase = createServiceClient();

  for (const place of places) {
    const leadData = {
      source: "google" as const,
      place_id: place.place_id,
      name: place.name,
      primary_service: serviceType || "general",
      service_tags: place.types || [],
      rating: place.rating || null,
      user_ratings_total: place.user_ratings_total || null,
      phone: place.formatted_phone_number || null,
      website: place.website || null,
      address: place.formatted_address || null,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      last_fetched_at: new Date().toISOString(),
      raw_json: place,
    };

    // Upsert to update if exists
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("provider_leads") as any).upsert(leadData, {
      onConflict: "place_id",
    });

    if (error) {
      console.error(`Error caching provider lead ${place.place_id}:`, error);
    }
  }
}

/**
 * Get a cached provider lead by ID
 */
export async function getProviderLeadById(
  id: string
): Promise<ProviderSearchResult | null> {
  const supabase = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await (supabase.from("provider_leads") as any)
    .select("*")
    .eq("id", id)
    .single()) as { data: ProviderSearchResult | null; error: unknown };

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    place_id: data.place_id,
    name: data.name,
    primary_service: data.primary_service,
    service_tags: data.service_tags || [],
    rating: data.rating,
    user_ratings_total: data.user_ratings_total,
    phone: data.phone,
    website: data.website,
    address: data.address,
    lat: data.lat,
    lng: data.lng,
    distance_miles: 0, // Will be calculated when needed
    source: data.source,
    last_fetched_at: data.last_fetched_at,
  };
}

/**
 * Get a cached provider lead by Google Place ID
 */
export async function getProviderLeadByPlaceId(
  placeId: string
): Promise<ProviderSearchResult | null> {
  const supabase = createServiceClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = (await (supabase.from("provider_leads") as any)
    .select("*")
    .eq("place_id", placeId)
    .single()) as { data: ProviderSearchResult | null; error: unknown };

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    place_id: data.place_id,
    name: data.name,
    primary_service: data.primary_service,
    service_tags: data.service_tags || [],
    rating: data.rating,
    user_ratings_total: data.user_ratings_total,
    phone: data.phone,
    website: data.website,
    address: data.address,
    lat: data.lat,
    lng: data.lng,
    distance_miles: 0,
    source: data.source,
    last_fetched_at: data.last_fetched_at,
  };
}
