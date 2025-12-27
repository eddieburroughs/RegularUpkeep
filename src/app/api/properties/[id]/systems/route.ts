/**
 * Property Systems API
 *
 * CRUD operations for property systems (HVAC, water heater, appliances, etc.)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SystemType, SystemCondition } from "@/types/database";

interface SystemInput {
  system_type: SystemType;
  name: string;
  location?: string | null;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  filter_size?: string | null;
  filter_type?: string | null;
  refrigerant_type?: string | null;
  tonnage?: number | null;
  btu_rating?: number | null;
  tank_size_gallons?: number | null;
  fuel_type?: string | null;
  install_date?: string | null;
  manufacture_date?: string | null;
  warranty_expiry?: string | null;
  last_service_date?: string | null;
  next_service_date?: string | null;
  condition?: SystemCondition;
  is_active?: boolean;
  notes?: string | null;
  photo_url?: string | null;
  manual_url?: string | null;
  warranty_doc_url?: string | null;
}

// GET - List all systems for a property
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user has access to this property
  const { data: membership } = await supabase
    .from("property_members")
    .select("id")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .single();

  if (!membership) {
    return NextResponse.json(
      { error: "Not authorized to view this property" },
      { status: 403 }
    );
  }

  // Fetch systems
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: systems, error } = await (supabase.from("property_systems") as any)
    .select("*")
    .eq("property_id", propertyId)
    .eq("is_active", true)
    .order("system_type", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching systems:", error);
    return NextResponse.json(
      { error: "Failed to fetch systems" },
      { status: 500 }
    );
  }

  return NextResponse.json({ systems: systems || [] });
}

// POST - Add a new system to a property
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: propertyId } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify user has owner/manager access to this property
  const { data: membership } = await supabase
    .from("property_members")
    .select("role")
    .eq("property_id", propertyId)
    .eq("user_id", user.id)
    .single() as { data: { role: string } | null; error: unknown };

  if (!membership || !["owner", "manager"].includes(membership.role)) {
    return NextResponse.json(
      { error: "Not authorized to modify this property" },
      { status: 403 }
    );
  }

  // Parse request body
  const body = (await request.json()) as SystemInput;

  // Validate required fields
  if (!body.system_type || !body.name) {
    return NextResponse.json(
      { error: "system_type and name are required" },
      { status: 400 }
    );
  }

  // Insert system
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: system, error } = await (supabase.from("property_systems") as any)
    .insert({
      property_id: propertyId,
      system_type: body.system_type,
      name: body.name,
      location: body.location || null,
      brand: body.brand || null,
      model: body.model || null,
      serial_number: body.serial_number || null,
      filter_size: body.filter_size || null,
      filter_type: body.filter_type || null,
      refrigerant_type: body.refrigerant_type || null,
      tonnage: body.tonnage || null,
      btu_rating: body.btu_rating || null,
      tank_size_gallons: body.tank_size_gallons || null,
      fuel_type: body.fuel_type || null,
      install_date: body.install_date || null,
      manufacture_date: body.manufacture_date || null,
      warranty_expiry: body.warranty_expiry || null,
      last_service_date: body.last_service_date || null,
      next_service_date: body.next_service_date || null,
      condition: body.condition || "unknown",
      is_active: body.is_active ?? true,
      notes: body.notes || null,
      photo_url: body.photo_url || null,
      manual_url: body.manual_url || null,
      warranty_doc_url: body.warranty_doc_url || null,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating system:", error);
    return NextResponse.json(
      { error: "Failed to create system" },
      { status: 500 }
    );
  }

  return NextResponse.json({ system }, { status: 201 });
}
