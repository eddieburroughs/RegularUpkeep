#!/usr/bin/env npx ts-node

/**
 * KB Import Script
 *
 * Imports knowledge base articles from JSON files into Supabase.
 *
 * Usage:
 *   npm run kb:import                    # Import from docs/kb-export.json
 *   npm run kb:import -- path/to/file.json
 *   npm run kb:import -- --from-handbooks
 */

import * as fs from "fs";
import * as path from "path";
import { createClient } from "@supabase/supabase-js";

// Load env
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY for embeddings");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const RAG_CONFIG = {
  CHUNK_SIZE_TOKENS: 500,
  EMBEDDING_MODEL: "text-embedding-3-small",
  EMBEDDING_DIMENSIONS: 1536,
};

type ArticleInput = {
  title: string;
  slug?: string;
  content: string;
  visibility?: string;
  tags?: string[];
  status?: "draft" | "published";
};

async function main() {
  const args = process.argv.slice(2);

  let articles: ArticleInput[] = [];

  if (args.includes("--from-handbooks")) {
    // Extract KB content from handbook files
    articles = await extractFromHandbooks();
  } else {
    // Load from JSON file
    const filePath = args[0] || "docs/kb-export.json";
    const fullPath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);

    if (!fs.existsSync(fullPath)) {
      console.error(`File not found: ${fullPath}`);
      process.exit(1);
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    const data = JSON.parse(content);
    articles = Array.isArray(data) ? data : data.articles || data.chunks || [data];
  }

  console.log(`Found ${articles.length} articles to import\n`);

  let imported = 0;
  let skipped = 0;
  let errors: string[] = [];

  for (const article of articles) {
    try {
      if (!article.title || !article.content) {
        console.log(`⏭️  Skipped: Missing title or content`);
        skipped++;
        continue;
      }

      const slug =
        article.slug ||
        article.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "");

      // Check if exists
      const { data: existing } = await supabase
        .from("kb_articles")
        .select("id")
        .eq("source_path", slug)
        .single();

      let articleId: string;

      if (existing) {
        // Update
        const { error } = await supabase
          .from("kb_articles")
          .update({
            title: article.title,
            body: article.content,
            role_visibility: article.visibility || "all",
            tags: article.tags || [],
            status: article.status || "published",
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);

        if (error) throw error;
        articleId = existing.id;
        console.log(`📝 Updated: ${article.title}`);
      } else {
        // Create
        const { data: newArticle, error } = await supabase
          .from("kb_articles")
          .insert({
            title: article.title,
            source_path: slug,
            body: article.content,
            role_visibility: article.visibility || "all",
            tags: article.tags || [],
            status: article.status || "published",
          })
          .select()
          .single();

        if (error) throw error;
        articleId = newArticle.id;
        console.log(`✅ Created: ${article.title}`);
      }

      // Index article
      await indexArticle(articleId, article.content);
      imported++;
    } catch (error) {
      console.log(`❌ Error: ${article.title} - ${(error as Error).message}`);
      errors.push(`${article.title}: ${(error as Error).message}`);
    }
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`Import complete!`);
  console.log(`  ✅ Imported: ${imported}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  ❌ Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log(`\nErrors:`);
    for (const err of errors) {
      console.log(`  - ${err}`);
    }
  }
}

async function extractFromHandbooks(): Promise<ArticleInput[]> {
  const articles: ArticleInput[] = [];
  const docsDir = path.join(process.cwd(), "docs");

  if (!fs.existsSync(docsDir)) {
    console.error("docs/ directory not found");
    return articles;
  }

  const handbooks = [
    "homeowner-handbook.md",
    "multi-property-handbook.md",
    "provider-handbook.md",
    "handyman-handbook.md",
    "admin-handbook.md",
    "sop-pack.md",
    "policies-pack.md",
  ];

  for (const filename of handbooks) {
    const filePath = path.join(docsDir, filename);
    if (!fs.existsSync(filePath)) continue;

    const content = fs.readFileSync(filePath, "utf-8");

    // Look for KB JSON blocks
    const jsonBlocks = content.match(/```json\n([\s\S]*?)\n```/g);
    if (!jsonBlocks) continue;

    for (const block of jsonBlocks) {
      try {
        const jsonContent = block.replace(/```json\n/, "").replace(/\n```$/, "");
        const parsed = JSON.parse(jsonContent);

        // Check if it looks like KB content
        if (Array.isArray(parsed)) {
          for (const item of parsed) {
            if (item.title && item.content) {
              articles.push({
                title: item.title,
                content: item.content,
                visibility: item.visibility || "all",
                tags: item.tags || [],
              });
            }
          }
        } else if (parsed.title && parsed.content) {
          articles.push({
            title: parsed.title,
            content: parsed.content,
            visibility: parsed.visibility || "all",
            tags: parsed.tags || [],
          });
        }
      } catch {
        // Not valid JSON or not KB content, skip
      }
    }
  }

  return articles;
}

async function indexArticle(articleId: string, content: string): Promise<void> {
  // Delete existing chunks
  await supabase.from("kb_article_chunks").delete().eq("article_id", articleId);

  // Chunk content
  const chunks = chunkContent(content, RAG_CONFIG.CHUNK_SIZE_TOKENS);

  // Generate embeddings and insert
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const embedding = await generateEmbedding(chunk.text);

    if (embedding.length > 0) {
      await supabase.from("kb_article_chunks").insert({
        article_id: articleId,
        chunk_index: i,
        content: chunk.text,
        token_count: chunk.tokenCount,
        embedding: JSON.stringify(embedding),
      });
    }
  }
}

function chunkContent(
  content: string,
  maxTokens: number
): Array<{ text: string; tokenCount: number }> {
  const chunks: Array<{ text: string; tokenCount: number }> = [];
  const paragraphs = content.split(/\n\n+/);

  let currentChunk = "";
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paragraphTokens = Math.ceil(paragraph.length / 4);

    if (paragraphTokens > maxTokens) {
      if (currentChunk) {
        chunks.push({ text: currentChunk.trim(), tokenCount: currentTokens });
        currentChunk = "";
        currentTokens = 0;
      }

      const sentences = paragraph.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        const sentenceTokens = Math.ceil(sentence.length / 4);

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

async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: RAG_CONFIG.EMBEDDING_MODEL,
        input: text.slice(0, 8000),
        dimensions: RAG_CONFIG.EMBEDDING_DIMENSIONS,
      }),
    });

    if (!response.ok) {
      console.error("Embedding API error:", await response.text());
      return [];
    }

    const data = await response.json();
    return data.data[0]?.embedding || [];
  } catch (error) {
    console.error("Embedding failed:", error);
    return [];
  }
}

main().catch(console.error);
