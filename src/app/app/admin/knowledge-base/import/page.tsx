/**
 * KB Import Page
 *
 * Import knowledge base articles from JSON files.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { KBImporter } from "./kb-importer";

export const dynamic = "force-dynamic";

export default async function KBImportPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/app/admin/knowledge-base/import");
  }

  // Verify admin
  const { data: profile } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: { role: string } | null };

  if (profile?.role !== "admin") {
    redirect("/app");
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Import Knowledge Base</h1>
        <p className="text-muted-foreground">
          Import articles from JSON files or the handbook KB exports
        </p>
      </div>

      <KBImporter />
    </div>
  );
}
