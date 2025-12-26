/**
 * Google Geocoding API Integration
 *
 * Server-side only integration for converting addresses to coordinates.
 *
 * @see https://developers.google.com/maps/documentation/geocoding
 */

import { createServiceClient } from "@/lib/supabase/server";

export interface GeocodeResult {
  lat: number;
  lng: number;
  formatted_address: string;
  place_id: string;
  address_components: AddressComponent[];
}

interface AddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

// Get API key from environment
function getApiKey(): string {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_MAPS_API_KEY environment variable is not set");
  }
  return apiKey;
}

/**
 * Geocode an address string to lat/lng coordinates
 */
export async function geocodeAddress(
  address: string
): Promise<GeocodeResult | null> {
  const apiKey = getApiKey();

  const geocodeUrl = new URL(
    "https://maps.googleapis.com/maps/api/geocode/json"
  );
  geocodeUrl.searchParams.set("address", address);
  geocodeUrl.searchParams.set("key", apiKey);

  try {
    const response = await fetch(geocodeUrl.toString());
    const data = await response.json();

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        address_components: result.address_components,
      };
    }

    if (data.status === "ZERO_RESULTS") {
      console.warn(`No geocode results for address: ${address}`);
      return null;
    }

    console.error(`Geocoding error: ${data.status}`, data.error_message);
    return null;
  } catch (error) {
    console.error(`Error geocoding address: ${address}`, error);
    return null;
  }
}

/**
 * Reverse geocode lat/lng to an address
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<GeocodeResult | null> {
  const apiKey = getApiKey();

  const geocodeUrl = new URL(
    "https://maps.googleapis.com/maps/api/geocode/json"
  );
  geocodeUrl.searchParams.set("latlng", `${lat},${lng}`);
  geocodeUrl.searchParams.set("key", apiKey);

  try {
    const response = await fetch(geocodeUrl.toString());
    const data = await response.json();

    if (data.status === "OK" && data.results && data.results.length > 0) {
      const result = data.results[0];
      return {
        lat,
        lng,
        formatted_address: result.formatted_address,
        place_id: result.place_id,
        address_components: result.address_components,
      };
    }

    return null;
  } catch (error) {
    console.error(`Error reverse geocoding ${lat},${lng}:`, error);
    return null;
  }
}

/**
 * Geocode a property and update its lat/lng in the database
 */
// Property with geocoding fields
interface PropertyWithGeo {
  id: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  lat: number | null;
  lng: number | null;
  geocoded_at: string | null;
}

export async function geocodeProperty(propertyId: string): Promise<boolean> {
  const supabase = createServiceClient();

  // Fetch property
  const { data: property, error: fetchError } = (await supabase
    .from("properties")
    .select("id, address, city, state, zip, lat, lng, geocoded_at")
    .eq("id", propertyId)
    .single()) as { data: PropertyWithGeo | null; error: unknown };

  if (fetchError || !property) {
    console.error(`Property not found: ${propertyId}`);
    return false;
  }

  // Skip if already geocoded within the last 30 days
  if (property.geocoded_at) {
    const geocodedAt = new Date(property.geocoded_at);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    if (geocodedAt > thirtyDaysAgo && property.lat && property.lng) {
      return true;
    }
  }

  // Build full address string
  const addressParts = [
    property.address,
    property.city,
    property.state,
    property.zip,
  ].filter(Boolean);

  if (addressParts.length === 0) {
    console.warn(`Property ${propertyId} has no address information`);
    return false;
  }

  const fullAddress = addressParts.join(", ");

  // Geocode the address
  const result = await geocodeAddress(fullAddress);

  if (!result) {
    console.warn(`Could not geocode property ${propertyId}: ${fullAddress}`);
    return false;
  }

  // Update property with lat/lng
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase.from("properties") as any)
    .update({
      lat: result.lat,
      lng: result.lng,
      geocoded_at: new Date().toISOString(),
    })
    .eq("id", propertyId);

  if (updateError) {
    console.error(`Error updating property ${propertyId}:`, updateError);
    return false;
  }

  return true;
}

/**
 * Geocode all properties that don't have lat/lng
 * Returns the number of properties geocoded
 */
export async function geocodeAllProperties(): Promise<number> {
  const supabase = createServiceClient();

  // Fetch properties without lat/lng
  const { data: properties, error } = (await supabase
    .from("properties")
    .select("id")
    .or("lat.is.null,lng.is.null")
    .limit(100)) as { data: { id: string }[] | null; error: unknown }; // Process in batches

  if (error || !properties) {
    console.error("Error fetching properties to geocode:", error);
    return 0;
  }

  let geocodedCount = 0;

  for (const property of properties) {
    // Add small delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 200));

    const success = await geocodeProperty(property.id);
    if (success) {
      geocodedCount++;
    }
  }

  return geocodedCount;
}

/**
 * Get property location (geocode if needed)
 */
export async function getPropertyLocation(
  propertyId: string
): Promise<{ lat: number; lng: number } | null> {
  const supabase = createServiceClient();

  // Fetch property
  const { data: property, error } = (await supabase
    .from("properties")
    .select("lat, lng, address, city, state, zip")
    .eq("id", propertyId)
    .single()) as { data: PropertyWithGeo | null; error: unknown };

  if (error || !property) {
    return null;
  }

  // Return cached location if available
  if (property.lat && property.lng) {
    return { lat: property.lat, lng: property.lng };
  }

  // Try to geocode
  const success = await geocodeProperty(propertyId);
  if (!success) {
    return null;
  }

  // Fetch updated property
  const { data: updatedProperty } = (await supabase
    .from("properties")
    .select("lat, lng")
    .eq("id", propertyId)
    .single()) as { data: { lat: number | null; lng: number | null } | null; error: unknown };

  if (updatedProperty?.lat && updatedProperty?.lng) {
    return { lat: updatedProperty.lat, lng: updatedProperty.lng };
  }

  return null;
}
