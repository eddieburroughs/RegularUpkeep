/**
 * KB Article Editor Page
 *
 * Create and edit knowledge base articles.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { KBArticleEditor } from "./kb-article-editor";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function KBArticleEditPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/app/admin/knowledge-base");
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

  // Fetch article if editing
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let article: any = null;
  if (id !== "new") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("kb_articles")
      .select("*")
      .eq("id", id)
      .single();

    if (error || !data) {
      notFound();
    }

    article = data;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">
          {article ? "Edit Article" : "New Article"}
        </h1>
        <p className="text-muted-foreground">
          {article ? `Editing: ${article.title}` : "Create a new knowledge base article"}
        </p>
      </div>

      <KBArticleEditor article={article} />
    </div>
  );
}
