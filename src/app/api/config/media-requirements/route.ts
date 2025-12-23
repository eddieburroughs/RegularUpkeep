/**
 * Media Requirements Config API
 *
 * Returns media requirements for a given category.
 * Accessible to authenticated users.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getMediaRequirements } from "@/lib/config/admin-config";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const category = searchParams.get("category");

  if (!category) {
    return NextResponse.json(
      { error: "Category is required" },
      { status: 400 }
    );
  }

  const requirements = await getMediaRequirements(category);

  return NextResponse.json(requirements);
}
