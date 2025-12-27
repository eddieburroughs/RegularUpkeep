/**
 * Individual Property System API
 *
 * GET, PUT, DELETE operations for a specific system
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { SystemType, SystemCondition } from "@/types/database";

interface SystemUpdateInput {
  system_type?: SystemType;
  name?: string;
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

// GET - Get a specific system
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; systemId: string }> }
) {
  const { id: propertyId, systemId } = await params;
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

  // Fetch system
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: system, error } = await (supabase.from("property_systems") as any)
    .select("*")
    .eq("id", systemId)
    .eq("property_id", propertyId)
    .single();

  if (error || !system) {
    return NextResponse.json(
      { error: "System not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({ system });
}

// PUT - Update a system
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; systemId: string }> }
) {
  const { id: propertyId, systemId } = await params;
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

  // Verify system exists and belongs to this property
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existingSystem } = await (supabase.from("property_systems") as any)
    .select("id")
    .eq("id", systemId)
    .eq("property_id", propertyId)
    .single();

  if (!existingSystem) {
    return NextResponse.json(
      { error: "System not found" },
      { status: 404 }
    );
  }

  // Parse request body
  const body = (await request.json()) as SystemUpdateInput;

  // Build update object (only include provided fields)
  const updateData: Record<string, unknown> = {};
  const allowedFields = [
    "system_type", "name", "location", "brand", "model", "serial_number",
    "filter_size", "filter_type", "refrigerant_type", "tonnage", "btu_rating",
    "tank_size_gallons", "fuel_type", "install_date", "manufacture_date",
    "warranty_expiry", "last_service_date", "next_service_date", "condition",
    "is_active", "notes", "photo_url", "manual_url", "warranty_doc_url"
  ];

  for (const field of allowedFields) {
    if (field in body) {
      updateData[field] = body[field as keyof SystemUpdateInput];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: "No fields to update" },
      { status: 400 }
    );
  }

  // Update system
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: system, error } = await (supabase.from("property_systems") as any)
    .update(updateData)
    .eq("id", systemId)
    .eq("property_id", propertyId)
    .select()
    .single();

  if (error) {
    console.error("Error updating system:", error);
    return NextResponse.json(
      { error: "Failed to update system" },
      { status: 500 }
    );
  }

  return NextResponse.json({ system });
}

// DELETE - Delete a system (soft delete by setting is_active = false)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; systemId: string }> }
) {
  const { id: propertyId, systemId } = await params;
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

  // Soft delete by setting is_active = false
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("property_systems") as any)
    .update({ is_active: false })
    .eq("id", systemId)
    .eq("property_id", propertyId);

  if (error) {
    console.error("Error deleting system:", error);
    return NextResponse.json(
      { error: "Failed to delete system" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
