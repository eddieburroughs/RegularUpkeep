/**
 * Sponsor Tiles Container
 *
 * Server component that fetches and displays sponsor tiles
 * based on the user's territory (zip code).
 */

import { createClient } from "@/lib/supabase/server";
import { SponsorTile } from "./sponsor-tile";
import { getConfig } from "@/lib/config/admin-config";

interface SponsorTilesContainerProps {
  zipCode: string;
  maxTiles?: number;
  excludeSponsorFree?: boolean;
}

type Sponsor = {
  id: string;
  business_name: string;
  tagline: string | null;
  logo_url: string | null;
  website_url: string | null;
  phone: string | null;
  email: string | null;
  sponsor_type: "realtor" | "insurance" | "handyman";
  city: string | null;
};

export async function SponsorTilesContainer({
  zipCode,
  maxTiles,
  excludeSponsorFree = false,
}: SponsorTilesContainerProps) {
  const supabase = await createClient();

  // Get sponsor config
  const sponsorConfig = await getConfig("sponsor_pricing");
  const tilesPerTerritory = maxTiles || sponsorConfig.tiles_per_territory;

  // Find territory for this zip code
  const { data: territory } = await supabase
    .from("territories")
    .select("id")
    .contains("zip_codes", [zipCode])
    .single() as { data: { id: string } | null };

  if (!territory) {
    return null;
  }

  // Get active sponsors for this territory
  const { data: sponsors } = await supabase
    .from("sponsors")
    .select(`
      id,
      business_name,
      tagline,
      logo_url,
      website_url,
      phone,
      email,
      sponsor_type,
      city
    `)
    .eq("territory_id", territory.id)
    .eq("status", "active")
    .limit(tilesPerTerritory) as { data: Sponsor[] | null };

  if (!sponsors || sponsors.length === 0) {
    return null;
  }

  // Track impressions
  const trackImpressions = async () => {
    "use server";
    try {
      const supabase = await createClient();
      const updates = sponsors!.map((sponsor) => ({
        sponsor_id: sponsor.id,
        impressions: 1,
        date: new Date().toISOString().split("T")[0],
      }));

      // Upsert daily stats
      for (const update of updates) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from("sponsor_daily_stats") as any)
          .upsert(update, { onConflict: "sponsor_id,date" })
          .select();
      }
    } catch {
      // Ignore tracking errors
    }
  };

  // Call track impressions
  await trackImpressions();

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wide">
        Local Partners
      </p>
      <div className="grid gap-3">
        {sponsors.map((sponsor) => (
          <SponsorTile
            key={sponsor.id}
            id={sponsor.id}
            businessName={sponsor.business_name}
            tagline={sponsor.tagline}
            logoUrl={sponsor.logo_url}
            websiteUrl={sponsor.website_url}
            phone={sponsor.phone}
            email={sponsor.email}
            sponsorType={sponsor.sponsor_type}
            city={sponsor.city}
          />
        ))}
      </div>
    </div>
  );
}
