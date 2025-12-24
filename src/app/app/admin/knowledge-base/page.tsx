/**
 * Admin Knowledge Base Management
 *
 * Create, edit, and manage KB articles for the support chatbot.
 */

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  Book,
  Plus,
  Search,
  FileText,
  Clock,
  Eye,
  Pencil,
  Trash2,
  Upload,
  RefreshCw,
} from "lucide-react";
import { KBArticleList } from "./kb-article-list";
import { KBStats } from "./kb-stats";

export const dynamic = "force-dynamic";

export default async function KnowledgeBasePage() {
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

  // Fetch KB stats
  const [articlesResult, chunksResult, searchesResult] = await Promise.all([
    supabase.from("kb_articles").select("id, status, visibility, updated_at"),
    supabase.from("kb_article_chunks").select("id", { count: "exact", head: true }),
    // Could add search analytics here
    Promise.resolve({ count: 0 }),
  ]);

  const articles = (articlesResult.data || []) as Array<{
    id: string;
    status: string;
    visibility: string;
    updated_at: string;
  }>;
  const totalArticles = articles.length;
  const publishedArticles = articles.filter((a) => a.status === "published").length;
  const draftArticles = articles.filter((a) => a.status === "draft").length;
  const totalChunks = chunksResult.count || 0;

  // Find most recently updated
  const sortedArticles = [...articles].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  );
  const lastUpdated = sortedArticles[0]?.updated_at;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <p className="text-muted-foreground">
            Manage articles and content for the support chatbot
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/app/admin/knowledge-base/import">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Import
            </Button>
          </Link>
          <Link href="/app/admin/knowledge-base/new">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Article
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Book className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Articles</p>
                <p className="text-2xl font-bold">{totalArticles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Eye className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Published</p>
                <p className="text-2xl font-bold">{publishedArticles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Drafts</p>
                <p className="text-2xl font-bold">{draftArticles}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Search className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Chunks</p>
                <p className="text-2xl font-bold">{totalChunks}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Last Updated Info */}
      {lastUpdated && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Last updated: {new Date(lastUpdated).toLocaleString()}</span>
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue="articles" className="space-y-4">
        <TabsList>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="articles" className="space-y-4">
          <KBArticleList />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <KBStats />
        </TabsContent>
      </Tabs>
    </div>
  );
}
