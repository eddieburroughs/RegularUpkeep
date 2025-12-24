/**
 * KB Import API
 *
 * Bulk import KB articles from JSON.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RAG_CONFIG } from "@/lib/support-chat/constants";

type ArticleInput = {
  title: string;
  slug?: string;
  content?: string;
  body?: string;
  visibility?: string;
  role_visibility?: string;
  tags?: string[];
  status?: "draft" | "published";
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const { data: profile } = (await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single()) as { data: { role: string } | null };

  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { articles } = body;

  if (!articles || !Array.isArray(articles)) {
    return NextResponse.json(
      { error: "articles array required" },
      { status: 400 }
    );
  }

  const result = {
    success: true,
    imported: 0,
    skipped: 0,
    errors: [] as string[],
  };

  for (const article of articles as ArticleInput[]) {
    try {
      // Get body content (accept both 'body' and 'content' for compatibility)
      const bodyContent = article.body || article.content;
      const roleVisibility = article.role_visibility || article.visibility || "all";

      // Validate required fields
      if (!article.title || !bodyContent) {
        result.skipped++;
        result.errors.push(`Skipped: Missing title or body`);
        continue;
      }

      // Generate slug if missing
      const slug =
        article.slug ||
        article.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

      // Check if article with source_path (slug) exists
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: existing } = await (supabase as any)
        .from("kb_articles")
        .select("id")
        .eq("source_path", slug)
        .single();

      if (existing) {
        // Update existing
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any)
          .from("kb_articles")
          .update({
            title: article.title,
            body: bodyContent,
            role_visibility: roleVisibility,
            tags: article.tags || [],
            status: article.status || "published",
          })
          .eq("id", existing.id);

        // Re-index
        await indexArticle(supabase, existing.id, bodyContent);
        result.imported++;
      } else {
        // Create new
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newArticle, error } = await (supabase as any)
          .from("kb_articles")
          .insert({
            title: article.title,
            source_path: slug,
            body: bodyContent,
            role_visibility: roleVisibility,
            tags: article.tags || [],
            status: article.status || "published",
          })
          .select()
          .single();

        if (error) throw error;

        // Index
        await indexArticle(supabase, newArticle.id, bodyContent);
        result.imported++;
      }
    } catch (error) {
      result.errors.push(`Error importing "${article.title}": ${(error as Error).message}`);
    }
  }

  result.success = result.errors.length === 0 || result.imported > 0;

  return NextResponse.json(result);
}

/**
 * Index an article by chunking and embedding
 */
async function indexArticle(
  supabase: Awaited<ReturnType<typeof createClient>>,
  articleId: string,
  content: string
): Promise<void> {
  // Delete existing chunks
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from("kb_article_chunks").delete().eq("article_id", articleId);

  // Chunk the content
  const chunks = chunkContent(content, RAG_CONFIG.CHUNK_SIZE_TOKENS);

  // Generate embeddings and insert chunks
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await generateEmbedding(chunk.text);

    if (embedding.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase as any).from("kb_article_chunks").insert({
        article_id: articleId,
        chunk_index: i,
        content: chunk.text,
        token_count: chunk.tokenCount,
        embedding: JSON.stringify(embedding),
      });
    }
  }
}

/**
 * Chunk content into smaller pieces
 */
function chunkContent(
  content: string,
  maxTokens: number
): Array<{ text: string; tokenCount: number }> {
  const chunks: Array<{ text: string; tokenCount: number }> = [];
  const paragraphs = content.split(/\n\n+/);

  let currentChunk = "";
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    if (paragraphTokens > maxTokens) {
      if (currentChunk) {
        chunks.push({ text: currentChunk.trim(), tokenCount: currentTokens });
        currentChunk = "";
        currentTokens = 0;
      }

      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        const sentenceTokens = estimateTokens(sentence);

        if (currentTokens + sentenceTokens > maxTokens && currentChunk) {
          chunks.push({ text: currentChunk.trim(), tokenCount: currentTokens });
          currentChunk = "";
          currentTokens = 0;
        }

        currentChunk += (currentChunk ? " " : "") + sentence;
        currentTokens += sentenceTokens;
      }
    } else if (currentTokens + paragraphTokens > maxTokens) {
      if (currentChunk) {
        chunks.push({ text: currentChunk.trim(), tokenCount: currentTokens });
      }
      currentChunk = paragraph;
      currentTokens = paragraphTokens;
    } else {
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      currentTokens += paragraphTokens;
    }
  }

  if (currentChunk) {
    chunks.push({ text: currentChunk.trim(), tokenCount: currentTokens });
  }

  return chunks;
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

async function generateEmbedding(text: string): Promise<number[]> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error("[KB Import] Missing OPENAI_API_KEY");
    return [];
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: RAG_CONFIG.EMBEDDING_MODEL,
        input: text.slice(0, 8000),
        dimensions: RAG_CONFIG.EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[KB Import] Embedding error:", error);
      return [];
    }

    const data = await response.json();
    return data.data[0]?.embedding || [];
  } catch (error) {
    console.error("[KB Import] Embedding failed:", error);
    return [];
  }
}
