/**
 * Sponsor Tile Gating
 *
 * Enforces max tiles per metro/territory (ADDENDUM D).
 * Manages sponsor tile placement and limits.
 */

import { createClient } from "@/lib/supabase/server";
import { getConfig } from "@/lib/config/admin-config";

interface TileAvailability {
  territoryId: string;
  currentTiles: number;
  maxTiles: number;
  available: number;
  isFull: boolean;
}

interface SponsorTileInfo {
  sponsorId: string;
  sponsorType: string;
  tilesOwned: number;
  territories: string[];
  canPurchaseMore: boolean;
}

/**
 * Check tile availability in a territory/metro
 */
export async function getTileAvailability(
  territoryId: string
): Promise<TileAvailability> {
  const supabase = await createClient();
  const sponsorConfig = await getConfig("sponsor_pricing");

  // Count active tiles in this territory
  const { count } = await supabase
    .from("sponsor_tiles")
    .select("*", { count: "exact", head: true })
    .eq("territory_id", territoryId)
    .eq("status", "active");

  const currentTiles = count || 0;
  const maxTiles = sponsorConfig.max_total_tiles;

  return {
    territoryId,
    currentTiles,
    maxTiles,
    available: Math.max(0, maxTiles - currentTiles),
    isFull: currentTiles >= maxTiles,
  };
}

/**
 * Check if a sponsor can purchase a tile in a territory
 */
export async function canPurchaseTile(params: {
  sponsorId: string;
  territoryId: string;
}): Promise<{ allowed: boolean; reason?: string }> {
  const supabase = await createClient();
  const sponsorConfig = await getConfig("sponsor_pricing");

  // Check territory availability
  const availability = await getTileAvailability(params.territoryId);
  if (availability.isFull) {
    return {
      allowed: false,
      reason: `This metro area has reached its maximum of ${availability.maxTiles} sponsor tiles. ` +
        "Join the waitlist to be notified when a spot opens.",
    };
  }

  // Check if sponsor already has a tile in this territory
  const { data: existingTile } = await supabase
    .from("sponsor_tiles")
    .select("id")
    .eq("sponsor_id", params.sponsorId)
    .eq("territory_id", params.territoryId)
    .eq("status", "active")
    .single() as { data: { id: string } | null };

  if (existingTile) {
    return {
      allowed: false,
      reason: "You already have an active tile in this territory.",
    };
  }

  // Check sponsor's total tiles across all territories
  const { count: totalTiles } = await supabase
    .from("sponsor_tiles")
    .select("*", { count: "exact", head: true })
    .eq("sponsor_id", params.sponsorId)
    .eq("status", "active");

  const maxPerSponsor = sponsorConfig.tiles_per_territory; // Max tiles per sponsor
  if ((totalTiles || 0) >= maxPerSponsor) {
    return {
      allowed: false,
      reason: `You have reached your maximum of ${maxPerSponsor} sponsor tiles. ` +
        "Contact us to discuss enterprise options.",
    };
  }

  return { allowed: true };
}

/**
 * Get sponsor's tile information
 */
export async function getSponsorTileInfo(
  sponsorId: string
): Promise<SponsorTileInfo | null> {
  const supabase = await createClient();
  const sponsorConfig = await getConfig("sponsor_pricing");

  // Get sponsor
  const { data: sponsor } = await supabase
    .from("sponsors")
    .select("id, sponsor_type")
    .eq("id", sponsorId)
    .single() as { data: { id: string; sponsor_type: string } | null };

  if (!sponsor) {
    return null;
  }

  // Get tiles
  const { data: tiles } = await supabase
    .from("sponsor_tiles")
    .select("territory_id")
    .eq("sponsor_id", sponsorId)
    .eq("status", "active") as { data: Array<{ territory_id: string }> | null };

  const tilesOwned = tiles?.length || 0;
  const territories = tiles?.map((t) => t.territory_id) || [];

  return {
    sponsorId,
    sponsorType: sponsor.sponsor_type,
    tilesOwned,
    territories,
    canPurchaseMore: tilesOwned < sponsorConfig.tiles_per_territory,
  };
}

/**
 * Get all territories with availability
 */
export async function getAllTerritoryAvailability(): Promise<TileAvailability[]> {
  const supabase = await createClient();
  const sponsorConfig = await getConfig("sponsor_pricing");
  const maxTiles = sponsorConfig.max_total_tiles;

  // Get all territories
  const { data: territories } = await supabase
    .from("territories")
    .select("id")
    .eq("status", "active") as { data: Array<{ id: string }> | null };

  if (!territories) {
    return [];
  }

  const results: TileAvailability[] = [];

  for (const territory of territories) {
    // Count tiles in this territory
    const { count } = await supabase
      .from("sponsor_tiles")
      .select("*", { count: "exact", head: true })
      .eq("territory_id", territory.id)
      .eq("status", "active");

    const currentTiles = count || 0;

    results.push({
      territoryId: territory.id,
      currentTiles,
      maxTiles,
      available: Math.max(0, maxTiles - currentTiles),
      isFull: currentTiles >= maxTiles,
    });
  }

  return results;
}

/**
 * Reserve a tile slot (creates pending tile)
 */
export async function reserveTileSlot(params: {
  sponsorId: string;
  territoryId: string;
}): Promise<{ success: boolean; tileId?: string; error?: string }> {
  const supabase = await createClient();

  // Check if can purchase
  const check = await canPurchaseTile(params);
  if (!check.allowed) {
    return { success: false, error: check.reason };
  }

  // Create pending tile
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tile, error } = await (supabase.from("sponsor_tiles") as any)
    .insert({
      sponsor_id: params.sponsorId,
      territory_id: params.territoryId,
      status: "pending",
      created_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: (error as Error).message };
  }

  return { success: true, tileId: tile.id };
}

/**
 * Activate a reserved tile (after payment)
 */
export async function activateTile(
  tileId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("sponsor_tiles") as any)
    .update({
      status: "active",
      activated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", tileId)
    .eq("status", "pending");

  if (error) {
    return { success: false, error: (error as Error).message };
  }

  return { success: true };
}

/**
 * Join waitlist for a full territory
 */
export async function joinTileWaitlist(params: {
  sponsorId: string;
  territoryId: string;
  profileId: string;
}): Promise<{ success: boolean; position?: number; error?: string }> {
  const supabase = await createClient();

  // Check if already on waitlist
  const { data: existing } = await supabase
    .from("sponsor_tile_waitlist")
    .select("id, position")
    .eq("sponsor_id", params.sponsorId)
    .eq("territory_id", params.territoryId)
    .single() as { data: { id: string; position: number } | null };

  if (existing) {
    return { success: true, position: existing.position };
  }

  // Get current waitlist size
  const { count } = await supabase
    .from("sponsor_tile_waitlist")
    .select("*", { count: "exact", head: true })
    .eq("territory_id", params.territoryId);

  const position = (count || 0) + 1;

  // Add to waitlist
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase.from("sponsor_tile_waitlist") as any).insert({
    sponsor_id: params.sponsorId,
    territory_id: params.territoryId,
    profile_id: params.profileId,
    position,
    created_at: new Date().toISOString(),
  });

  if (error) {
    return { success: false, error: (error as Error).message };
  }

  return { success: true, position };
}
