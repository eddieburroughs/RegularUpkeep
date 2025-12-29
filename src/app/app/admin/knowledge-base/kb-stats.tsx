"use client";

/**
 * KB Statistics Component
 *
 * Displays analytics about knowledge base usage.
 */

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

type VisibilityStats = {
  visibility: string;
  count: number;
};

type TagStats = {
  tag: string;
  count: number;
};

export function KBStats() {
  const [loading, setLoading] = useState(true);
  const [visibilityStats, setVisibilityStats] = useState<VisibilityStats[]>([]);
  const [tagStats, setTagStats] = useState<TagStats[]>([]);
  const [avgChunksPerArticle, setAvgChunksPerArticle] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);

  useEffect(() => {
    const supabase = createClient();
    const fetchStats = async () => {
      setLoading(true);

      // Fetch articles with visibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: articles } = await (supabase as any)
        .from("kb_articles")
        .select("visibility, tags")
        .eq("status", "published");

      if (articles) {
        // Calculate visibility stats
        const visMap = new Map<string, number>();
        const tagMap = new Map<string, number>();

        for (const article of articles as { visibility: string; tags: string[] }[]) {
          visMap.set(article.visibility, (visMap.get(article.visibility) || 0) + 1);

          for (const tag of article.tags || []) {
            tagMap.set(tag, (tagMap.get(tag) || 0) + 1);
          }
        }

        setVisibilityStats(
          Array.from(visMap.entries())
            .map(([visibility, count]) => ({ visibility, count }))
            .sort((a, b) => b.count - a.count)
        );

        setTagStats(
          Array.from(tagMap.entries())
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 10)
        );
      }

      // Fetch chunk stats
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: chunks } = await (supabase as any)
        .from("kb_article_chunks")
        .select("article_id, token_count");

      if (chunks) {
        const typedChunks = chunks as { article_id: string; token_count: number }[];
        const articleCount = new Set(typedChunks.map((c) => c.article_id)).size;
        setAvgChunksPerArticle(articleCount > 0 ? typedChunks.length / articleCount : 0);
        setTotalTokens(typedChunks.reduce((sum: number, c) => sum + (c.token_count || 0), 0));
      }

      setLoading(false);
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8 text-muted-foreground">
        Loading statistics...
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {/* Chunk Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Indexing Stats</CardTitle>
          <CardDescription>Chunk and token information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Avg Chunks per Article</span>
            <span className="font-medium">{avgChunksPerArticle.toFixed(1)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Tokens</span>
            <span className="font-medium">{totalTokens.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Est. Embedding Cost</span>
            <span className="font-medium">
              ${((totalTokens / 1000) * 0.00002).toFixed(4)}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Visibility Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Visibility Distribution</CardTitle>
          <CardDescription>Articles by target audience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {visibilityStats.map((stat) => (
              <div key={stat.visibility} className="flex items-center justify-between">
                <Badge variant="outline">{stat.visibility}</Badge>
                <span className="font-medium">{stat.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Tags */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Top Tags</CardTitle>
          <CardDescription>Most used article tags</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {tagStats.map((stat) => (
              <Badge key={stat.tag} variant="secondary">
                {stat.tag} ({stat.count})
              </Badge>
            ))}
            {tagStats.length === 0 && (
              <p className="text-sm text-muted-foreground">No tags found</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
