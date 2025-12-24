/**
 * RAG (Retrieval-Augmented Generation) Module
 *
 * Handles knowledge base search using pgvector embeddings
 */

import { createClient } from "@/lib/supabase/server";
import type { KBArticleChunk, UserRole } from "@/types/database";
import { RAG_CONFIG } from "./constants";
import { roleToKBVisibility } from "./utils";

export interface RAGContext {
  chunks: KBArticleChunk[];
  citations: Array<{
    article_id: string;
    article_title: string;
    chunk_id: string;
    similarity: number;
  }>;
}

export interface SearchOptions {
  userRole?: UserRole;
  topK?: number;
  threshold?: number;
  articleIds?: string[];
}

/**
 * Generate embedding for a query using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    console.error("[RAG] Missing OPENAI_API_KEY");
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
        input: text.slice(0, 8000), // Truncate to avoid token limits
        dimensions: RAG_CONFIG.EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error("[RAG] Embedding API error:", error);
      return [];
    }

    const data = await response.json();
    return data.data[0]?.embedding || [];
  } catch (error) {
    console.error("[RAG] Embedding generation failed:", error);
    return [];
  }
}

/**
 * Search knowledge base for relevant chunks
 */
export async function searchKnowledgeBase(
  query: string,
  options: SearchOptions = {}
): Promise<RAGContext> {
  const {
    userRole,
    topK = RAG_CONFIG.TOP_K_RESULTS,
    threshold = RAG_CONFIG.SIMILARITY_THRESHOLD,
    articleIds,
  } = options;

  // Generate embedding for query
  const embedding = await generateEmbedding(query);
  if (embedding.length === 0) {
    console.warn("[RAG] Empty embedding, returning no results");
    return { chunks: [], citations: [] };
  }

  const supabase = await createClient();
  const roleVisibility = roleToKBVisibility(userRole);

  // Use the vector similarity search function
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any).rpc("search_kb_chunks", {
    query_embedding: embedding,
    match_count: topK,
    match_threshold: threshold,
    user_role: roleVisibility,
  });

  if (error) {
    console.error("[RAG] Search failed:", error);
    return { chunks: [], citations: [] };
  }

  if (!data || data.length === 0) {
    return { chunks: [], citations: [] };
  }

  // Filter by specific article IDs if provided
  let results = data;
  if (articleIds && articleIds.length > 0) {
    results = results.filter((r: { article_id: string }) => articleIds.includes(r.article_id));
  }

  // Format results
  const chunks: KBArticleChunk[] = results.map((r: {
    chunk_id: string;
    article_id: string;
    chunk_index: number;
    content: string;
    token_count: number;
    similarity: number;
  }) => ({
    id: r.chunk_id,
    article_id: r.article_id,
    chunk_index: r.chunk_index,
    content: r.content,
    token_count: r.token_count,
    embedding: null, // Don't return embeddings to client
    created_at: new Date().toISOString(),
  }));

  const citations = results.map((r: {
    article_id: string;
    article_title: string;
    chunk_id: string;
    similarity: number;
  }) => ({
    article_id: r.article_id,
    article_title: r.article_title,
    chunk_id: r.chunk_id,
    similarity: r.similarity,
  }));

  return { chunks, citations };
}

/**
 * Build context string from RAG results for LLM prompt
 */
export function buildRAGContextString(ragContext: RAGContext): string {
  if (ragContext.chunks.length === 0) {
    return "";
  }

  const contextParts = ragContext.chunks.map((chunk, idx) => {
    const citation = ragContext.citations[idx];
    return `[Source: ${citation?.article_title || "KB Article"}]\n${chunk.content}`;
  });

  return `## Relevant Knowledge Base Information\n\n${contextParts.join("\n\n---\n\n")}`;
}

/**
 * Get articles by intent/category
 */
export async function getArticlesByIntent(intent: string): Promise<string[]> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("kb_articles")
    .select("id")
    .eq("status", "published")
    .contains("tags", [intent]);

  if (error || !data) {
    return [];
  }

  return (data as { id: string }[]).map((a) => a.id);
}

/**
 * Get a specific article by slug
 */
export async function getArticleBySlug(slug: string): Promise<{ title: string; content: string } | null> {
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("kb_articles")
    .select("title, content")
    .eq("slug", slug)
    .eq("status", "published")
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * Log RAG search for analytics
 */
export async function logRAGSearch(
  conversationId: string | null,
  query: string,
  results: RAGContext,
  latencyMs: number
): Promise<void> {
  // This could be extended to log to a separate analytics table
  // For now, we'll just log to console in development
  if (process.env.NODE_ENV === "development") {
    console.log("[RAG Search]", {
      conversationId,
      queryLength: query.length,
      resultsCount: results.chunks.length,
      topSimilarity: results.citations[0]?.similarity || 0,
      latencyMs,
    });
  }
}

/**
 * Re-rank results using cross-encoder (optional enhancement)
 * For now, we just return sorted by similarity
 */
export function rerankResults(
  ragContext: RAGContext,
  _query: string
): RAGContext {
  // Sort by similarity score descending
  const indices = ragContext.citations
    .map((c, i) => ({ similarity: c.similarity, index: i }))
    .sort((a, b) => b.similarity - a.similarity)
    .map((item) => item.index);

  return {
    chunks: indices.map((i) => ragContext.chunks[i]),
    citations: indices.map((i) => ragContext.citations[i]),
  };
}

/**
 * Deduplicate chunks from same article
 */
export function deduplicateChunks(ragContext: RAGContext): RAGContext {
  const seenArticles = new Set<string>();
  const deduped: { chunks: KBArticleChunk[]; citations: typeof ragContext.citations } = {
    chunks: [],
    citations: [],
  };

  for (let i = 0; i < ragContext.chunks.length; i++) {
    const chunk = ragContext.chunks[i];
    const citation = ragContext.citations[i];

    if (!seenArticles.has(chunk.article_id)) {
      seenArticles.add(chunk.article_id);
      deduped.chunks.push(chunk);
      deduped.citations.push(citation);
    }
  }

  return deduped;
}

/**
 * Check if RAG context is sufficient for answering
 */
export function hasRelevantContext(ragContext: RAGContext, minSimilarity = 0.75): boolean {
  if (ragContext.chunks.length === 0) return false;

  // Check if at least one result meets the threshold
  return ragContext.citations.some((c) => c.similarity >= minSimilarity);
}

/**
 * Format citations for message metadata
 */
export function formatCitationsForMetadata(
  ragContext: RAGContext
): Array<{ article_id: string; title: string }> {
  const seen = new Set<string>();
  const formatted: Array<{ article_id: string; title: string }> = [];

  for (const citation of ragContext.citations) {
    if (!seen.has(citation.article_id)) {
      seen.add(citation.article_id);
      formatted.push({
        article_id: citation.article_id,
        title: citation.article_title,
      });
    }
  }

  return formatted;
}
