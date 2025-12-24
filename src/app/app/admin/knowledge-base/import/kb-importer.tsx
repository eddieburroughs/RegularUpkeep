"use client";

/**
 * KB Importer Component
 *
 * UI for importing KB articles from JSON.
 */

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Upload, FileJson, ArrowLeft, Check, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";

type ImportResult = {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
};

export function KBImporter() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [jsonInput, setJsonInput] = useState("");

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      setJsonInput(text);
    } catch (error) {
      console.error("Failed to read file:", error);
      alert("Failed to read file");
    }
  };

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      alert("Please provide JSON data to import");
      return;
    }

    setImporting(true);
    setProgress(0);
    setResult(null);

    try {
      // Parse JSON
      let data;
      try {
        data = JSON.parse(jsonInput);
      } catch {
        throw new Error("Invalid JSON format");
      }

      // Normalize to array
      const articles = Array.isArray(data) ? data : data.articles || data.chunks || [data];

      if (articles.length === 0) {
        throw new Error("No articles found in JSON");
      }

      // Import via API
      const response = await fetch("/api/admin/kb/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ articles }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Import failed");
      }

      const importResult = await response.json();
      setResult(importResult);
      setProgress(100);
    } catch (error) {
      console.error("Import failed:", error);
      setResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: [(error as Error).message],
      });
    } finally {
      setImporting(false);
    }
  };

  const sampleFormat = JSON.stringify(
    [
      {
        title: "How to reset your password",
        slug: "reset-password",
        content: "Step 1: Go to login page...",
        visibility: "all",
        tags: ["login", "password"],
      },
    ],
    null,
    2
  );

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Link href="/app/admin/knowledge-base">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Knowledge Base
        </Button>
      </Link>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <Card>
          <CardHeader>
            <CardTitle>Import Data</CardTitle>
            <CardDescription>
              Paste JSON or upload a file containing KB articles
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Upload */}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload JSON File
              </Button>
            </div>

            {/* JSON Input */}
            <Textarea
              value={jsonInput}
              onChange={(e) => setJsonInput(e.target.value)}
              placeholder="Paste JSON here..."
              className="min-h-[300px] font-mono text-sm"
              disabled={importing}
            />

            {/* Import Button */}
            <Button
              onClick={handleImport}
              disabled={importing || !jsonInput.trim()}
              className="w-full"
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <FileJson className="h-4 w-4 mr-2" />
                  Import Articles
                </>
              )}
            </Button>

            {/* Progress */}
            {importing && <Progress value={progress} className="h-2" />}
          </CardContent>
        </Card>

        {/* Format Guide & Results */}
        <div className="space-y-4">
          {/* Result */}
          {result && (
            <Card className={result.success ? "border-green-500" : "border-red-500"}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {result.success ? (
                    <>
                      <Check className="h-5 w-5 text-green-600" />
                      Import Complete
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      Import Failed
                    </>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex gap-4">
                  <Badge variant="default">{result.imported} imported</Badge>
                  {result.skipped > 0 && (
                    <Badge variant="secondary">{result.skipped} skipped</Badge>
                  )}
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-red-600 mb-2">Errors:</p>
                    <ul className="text-sm text-red-600 list-disc pl-4">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {result.success && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => router.push("/app/admin/knowledge-base")}
                  >
                    View Articles
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Format Guide */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Expected Format</CardTitle>
              <CardDescription>
                JSON array of articles with the following structure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-auto text-xs">
                {sampleFormat}
              </pre>

              <div className="mt-4 space-y-2 text-sm">
                <p className="font-medium">Required fields:</p>
                <ul className="list-disc pl-4 text-muted-foreground">
                  <li>
                    <code>title</code> - Article title
                  </li>
                  <li>
                    <code>content</code> - Article content (markdown supported)
                  </li>
                </ul>

                <p className="font-medium mt-4">Optional fields:</p>
                <ul className="list-disc pl-4 text-muted-foreground">
                  <li>
                    <code>slug</code> - URL-friendly identifier (auto-generated if missing)
                  </li>
                  <li>
                    <code>visibility</code> - all, homeowner, provider, handyman, admin
                  </li>
                  <li>
                    <code>tags</code> - Array of topic tags
                  </li>
                  <li>
                    <code>status</code> - draft, published (default: published)
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Handbook Import Note */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Import from Handbooks</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              <p>
                The handbook files in <code>docs/</code> contain KB chunks in JSON format.
                Look for the "Chatbot KB Add-On" sections with JSON exports.
              </p>
              <p className="mt-2">
                For bulk import, use the CLI script:{" "}
                <code className="bg-muted px-1">npm run kb:import</code>
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
