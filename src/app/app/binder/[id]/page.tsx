import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  ArrowLeft,
  Download,
  Trash2,
  Pin,
  Calendar,
  DollarSign,
  Home,
  FileText,
  Receipt,
  Shield,
  BookOpen,
  ClipboardCheck,
  FileCheck,
  FileSpreadsheet,
  Camera,
  ExternalLink,
  Clock,
} from "lucide-react";
import type { DocumentCategory, Document } from "@/types/database";

type DocumentWithProperty = Document & {
  properties: { nickname: string | null; address_line1: string } | null;
};

const categoryIcons: Record<DocumentCategory, React.ComponentType<{ className?: string }>> = {
  receipt: Receipt,
  warranty: Shield,
  manual: BookOpen,
  inspection: ClipboardCheck,
  permit: FileCheck,
  insurance: Shield,
  contract: FileSpreadsheet,
  photo: Camera,
  other: FileText,
};

const categoryLabels: Record<DocumentCategory, string> = {
  receipt: "Receipt",
  warranty: "Warranty",
  manual: "Manual",
  inspection: "Inspection",
  permit: "Permit",
  insurance: "Insurance",
  contract: "Contract",
  photo: "Photo",
  other: "Other",
};

function formatFileSize(bytes: number | null): string {
  if (!bytes) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: document, error } = await supabase
    .from("documents")
    .select("*, properties(nickname, address_line1)")
    .eq("id", id)
    .single() as { data: DocumentWithProperty | null; error: unknown };

  if (error || !document) {
    notFound();
  }

  const CategoryIcon = categoryIcons[document.category] || FileText;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/app/binder">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <CategoryIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{document.title}</h1>
                {document.is_pinned && (
                  <Pin className="h-4 w-4 text-amber-500" />
                )}
              </div>
              <p className="text-muted-foreground">
                {categoryLabels[document.category]}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <a href={document.file_url} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              View
            </a>
          </Button>
          <Button asChild>
            <a href={document.file_url} download={document.file_name}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </a>
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Document Preview or Info */}
          <Card>
            <CardHeader>
              <CardTitle>Document Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {document.description && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Description</p>
                  <p>{document.description}</p>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">File Name</p>
                    <p className="font-medium truncate">{document.file_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">File Size</p>
                    <p className="font-medium">{formatFileSize(document.file_size)}</p>
                  </div>
                </div>

                {document.document_date && (
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Document Date</p>
                      <p className="font-medium">
                        {new Date(document.document_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {document.expiry_date && (
                  <div className="flex items-center gap-3">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Expiry Date</p>
                      <p className="font-medium">
                        {new Date(document.expiry_date).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                )}

                {document.amount_cents && (
                  <div className="flex items-center gap-3">
                    <DollarSign className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Amount</p>
                      <p className="font-medium">
                        ${(document.amount_cents / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                )}

                {document.properties && (
                  <div className="flex items-center gap-3">
                    <Home className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm text-muted-foreground">Property</p>
                      <p className="font-medium">
                        {document.properties.nickname || document.properties.address_line1}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {document.tags && document.tags.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Tags</p>
                  <div className="flex flex-wrap gap-2">
                    {document.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Preview for images */}
          {document.file_type?.startsWith("image/") && (
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={document.file_url}
                  alt={document.title}
                  className="w-full rounded-lg"
                />
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full" asChild>
                <a href={document.file_url} download={document.file_name}>
                  <Download className="mr-2 h-4 w-4" />
                  Download File
                </a>
              </Button>
              <Button variant="outline" className="w-full text-destructive hover:text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Document
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Uploaded</span>
                <span>{new Date(document.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last updated</span>
                <span>{new Date(document.updated_at).toLocaleDateString()}</span>
              </div>
              {document.file_type && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type</span>
                  <span>{document.file_type}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
