/**
 * KB Article Reindex API
 *
 * Chunks an article and generates embeddings for RAG search.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RAG_CONFIG } from "@/lib/support-chat/constants";

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
  const { articleId } = body;

  if (!articleId) {
    return NextResponse.json({ error: "articleId required" }, { status: 400 });
  }

  // Fetch article
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: article, error: articleError } = await (supabase as any)
    .from("kb_articles")
    .select("id, title, body, role_visibility, tags")
    .eq("id", articleId)
    .single();

  if (articleError || !article) {
    return NextResponse.json({ error: "Article not found" }, { status: 404 });
  }

  try {
    // Delete existing chunks
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("kb_article_chunks").delete().eq("article_id", articleId);

    // Chunk the content
    const chunks = chunkContent(article.body, RAG_CONFIG.CHUNK_SIZE_TOKENS);

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

    // Update article last indexed timestamp
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("kb_articles")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", articleId);

    return NextResponse.json({
      success: true,
      chunks: chunks.length,
    });
  } catch (error) {
    console.error("[KB Reindex] Error:", error);
    return NextResponse.json(
      { error: "Failed to reindex article" },
      { status: 500 }
    );
  }
}

/**
 * Chunk content into smaller pieces for embedding
 */
function chunkContent(
  content: string,
  maxTokens: number
): Array<{ text: string; tokenCount: number }> {
  const chunks: Array<{ text: string; tokenCount: number }> = [];

  // Split by paragraphs first
  const paragraphs = content.split(/\n\n+/);

  let currentChunk = "";
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = estimateTokens(paragraph);

    // If single paragraph exceeds max, split by sentences
    if (paragraphTokens > maxTokens) {
      // Flush current chunk first
      if (currentChunk) {
        chunks.push({ text: currentChunk.trim(), tokenCount: currentTokens });
        currentChunk = "";
        currentTokens = 0;
      }

      // Split paragraph by sentences
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
      // Flush and start new chunk
      if (currentChunk) {
        chunks.push({ text: currentChunk.trim(), tokenCount: currentTokens });
      }
      currentChunk = paragraph;
      currentTokens = paragraphTokens;
    } else {
      // Add to current chunk
      currentChunk += (currentChunk ? "\n\n" : "") + paragraph;
      currentTokens += paragraphTokens;
    }
  }

  // Flush remaining
  if (currentChunk) {
    chunks.push({ text: currentChunk.trim(), tokenCount: currentTokens });
  }

  return chunks;
}

/**
 * Estimate token count (rough approximation)
 */
function estimateTokens(text: string): number {
  // Rough estimate: ~4 chars per token for English
  return Math.ceil(text.length / 4);
}

/**
 * Generate embedding using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error("[KB Reindex] Missing OPENAI_API_KEY");
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
      console.error("[KB Reindex] Embedding error:", error);
      return [];
    }

    const data = await response.json();
    return data.data[0]?.embedding || [];
  } catch (error) {
    console.error("[KB Reindex] Embedding failed:", error);
    return [];
  }
}
