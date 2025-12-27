#!/usr/bin/env npx ts-node
/**
 * Geocode Properties Script
 *
 * Geocodes all properties that don't have lat/lng coordinates.
 * Run with: npx ts-node scripts/geocode-properties.ts
 * Or: npm run geocode
 */

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

if (!GOOGLE_MAPS_API_KEY) {
  console.error("Missing GOOGLE_MAPS_API_KEY environment variable");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface Property {
  id: string;
  address_line1: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  lat: number | null;
  lng: number | null;
}

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", address);
  url.searchParams.set("key", GOOGLE_MAPS_API_KEY);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status === "OK" && data.results?.[0]) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }

    console.warn(`  Geocoding failed for "${address}": ${data.status}`);
    return null;
  } catch (error) {
    console.error(`  Error geocoding "${address}":`, error);
    return null;
  }
}

async function main() {
  console.log("🌍 Geocoding Properties\n");

  // Fetch properties without lat/lng
  const { data: properties, error } = await supabase
    .from("properties")
    .select("id, address_line1, city, state, postal_code, lat, lng")
    .or("lat.is.null,lng.is.null");

  if (error) {
    console.error("Error fetching properties:", error);
    process.exit(1);
  }

  if (!properties || properties.length === 0) {
    console.log("✅ All properties are already geocoded!");
    return;
  }

  console.log(`Found ${properties.length} properties needing geocoding\n`);

  let successCount = 0;
  let failCount = 0;

  for (const property of properties as Property[]) {
    const addressParts = [
      property.address_line1,
      property.city,
      property.state,
      property.postal_code,
    ].filter(Boolean);

    if (addressParts.length === 0) {
      console.log(`⚠️  Skipping property ${property.id}: no address`);
      failCount++;
      continue;
    }

    const fullAddress = addressParts.join(", ");
    console.log(`📍 Geocoding: ${fullAddress}`);

    const result = await geocodeAddress(fullAddress);

    if (result) {
      const { error: updateError } = await supabase
        .from("properties")
        .update({
          lat: result.lat,
          lng: result.lng,
          geocoded_at: new Date().toISOString(),
        })
        .eq("id", property.id);

      if (updateError) {
        console.log(`  ❌ Failed to update: ${updateError.message}`);
        failCount++;
      } else {
        console.log(`  ✅ Success: ${result.lat}, ${result.lng}`);
        successCount++;
      }
    } else {
      failCount++;
    }

    // Rate limiting - 200ms delay between requests
    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  console.log(`\n📊 Results:`);
  console.log(`   ✅ Geocoded: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
}

main().catch(console.error);
