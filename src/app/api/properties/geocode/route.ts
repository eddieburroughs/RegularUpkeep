/**
 * Geocode Properties API
 *
 * Triggers geocoding for properties that don't have lat/lng.
 * Can geocode a specific property or all un-geocoded properties.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geocodeProperty, geocodeAllProperties } from "@/lib/google/geocoding";

// POST - Geocode specific property or all properties
export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if admin or property owner
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single() as { data: { role: string } | null; error: unknown };

  const body = await request.json().catch(() => ({}));
  const { propertyId } = body as { propertyId?: string };

  if (propertyId) {
    // Geocode specific property
    // Verify user has access to this property (owner or admin)
    if (profile?.role !== "admin") {
      const { data: membership } = await supabase
        .from("property_members")
        .select("id")
        .eq("property_id", propertyId)
        .eq("user_id", user.id)
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: "Not authorized to geocode this property" },
          { status: 403 }
        );
      }
    }

    const success = await geocodeProperty(propertyId);

    if (success) {
      // Fetch updated property
      const { data: property } = await supabase
        .from("properties")
        .select("lat, lng, geocoded_at")
        .eq("id", propertyId)
        .single() as { data: { lat: number | null; lng: number | null; geocoded_at: string | null } | null; error: unknown };

      return NextResponse.json({
        success: true,
        property: {
          id: propertyId,
          lat: property?.lat,
          lng: property?.lng,
          geocoded_at: property?.geocoded_at,
        },
      });
    } else {
      return NextResponse.json(
        { error: "Failed to geocode property" },
        { status: 500 }
      );
    }
  } else {
    // Geocode all properties (admin only)
    if (profile?.role !== "admin") {
      return NextResponse.json(
        { error: "Admin access required to geocode all properties" },
        { status: 403 }
      );
    }

    const count = await geocodeAllProperties();

    return NextResponse.json({
      success: true,
      geocoded: count,
      message: `Geocoded ${count} properties`,
    });
  }
}

// GET - Check geocoding status for user's properties
export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  interface PropertyGeoStatus {
    id: string;
    address_line1: string | null;
    city: string | null;
    state: string | null;
    lat: number | null;
    lng: number | null;
    geocoded_at: string | null;
  }

  // Get user's properties and their geocoding status
  const { data: properties } = await supabase
    .from("property_members")
    .select(`
      property:properties (
        id,
        address_line1,
        city,
        state,
        lat,
        lng,
        geocoded_at
      )
    `)
    .eq("user_id", user.id) as { data: { property: PropertyGeoStatus }[] | null; error: unknown };

  const propertyList = (properties || [])
    .map((p) => p.property)
    .filter(Boolean);

  const needsGeocoding = propertyList.filter(
    (p) => !p.lat || !p.lng
  );

  return NextResponse.json({
    total: propertyList.length,
    geocoded: propertyList.length - needsGeocoding.length,
    needsGeocoding: needsGeocoding.length,
    properties: propertyList,
  });
}
