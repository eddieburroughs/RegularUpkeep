import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import {
  FileText,
  Plus,
  Receipt,
  FileCheck,
  BookOpen,
  ClipboardCheck,
  Shield,
  FileSpreadsheet,
  Camera,
  Folder,
  Pin,
  Calendar,
  DollarSign,
  Download,
  Home,
} from "lucide-react";
import type { DocumentCategory } from "@/types/database";

type DocumentWithProperty = {
  id: string;
  title: string;
  description: string | null;
  category: DocumentCategory;
  file_url: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  document_date: string | null;
  expiry_date: string | null;
  amount_cents: number | null;
  is_pinned: boolean;
  created_at: string;
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
  receipt: "Receipts",
  warranty: "Warranties",
  manual: "Manuals",
  inspection: "Inspections",
  permit: "Permits",
  insurance: "Insurance",
  contract: "Contracts",
  photo: "Photos",
  other: "Other",
};

const categoryColors: Record<DocumentCategory, string> = {
  receipt: "bg-green-100 text-green-700",
  warranty: "bg-blue-100 text-blue-700",
  manual: "bg-purple-100 text-purple-700",
  inspection: "bg-amber-100 text-amber-700",
  permit: "bg-orange-100 text-orange-700",
  insurance: "bg-cyan-100 text-cyan-700",
  contract: "bg-pink-100 text-pink-700",
  photo: "bg-indigo-100 text-indigo-700",
  other: "bg-gray-100 text-gray-700",
};

export default async function BinderPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const params = await searchParams;
  const selectedCategory = params.category as DocumentCategory | undefined;
  const supabase = await createClient();

  // Get documents
  let query = supabase
    .from("documents")
    .select("id, title, description, category, file_url, file_name, file_type, file_size, document_date, expiry_date, amount_cents, is_pinned, created_at, properties(nickname, address_line1)")
    .eq("is_archived", false)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false });

  if (selectedCategory) {
    query = query.eq("category", selectedCategory);
  }

  const { data: documents } = await query.limit(100) as { data: DocumentWithProperty[] | null };

  // Group documents by category for counts
  const categoryCounts: Record<string, number> = {};
  documents?.forEach((doc) => {
    categoryCounts[doc.category] = (categoryCounts[doc.category] || 0) + 1;
  });

  const pinnedDocs = documents?.filter((d) => d.is_pinned) || [];
  const totalDocs = documents?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Home Binder</h1>
          <p className="text-muted-foreground">
            Store and organize important documents for your properties
          </p>
        </div>
        <Button asChild>
          <Link href="/app/binder/upload">
            <Plus className="mr-2 h-4 w-4" />
            Upload Document
          </Link>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Folder className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{totalDocs}</p>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <Pin className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pinnedDocs.length}</p>
              <p className="text-sm text-muted-foreground">Pinned</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Receipt className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{categoryCounts.receipt || 0}</p>
              <p className="text-sm text-muted-foreground">Receipts</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 py-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Shield className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{categoryCounts.warranty || 0}</p>
              <p className="text-sm text-muted-foreground">Warranties</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant={!selectedCategory ? "default" : "outline"}
          size="sm"
          asChild
        >
          <Link href="/app/binder">All</Link>
        </Button>
        {Object.entries(categoryLabels).map(([value, label]) => {
          const Icon = categoryIcons[value as DocumentCategory];
          const count = categoryCounts[value] || 0;
          return (
            <Button
              key={value}
              variant={selectedCategory === value ? "default" : "outline"}
              size="sm"
              asChild
            >
              <Link href={`/app/binder?category=${value}`}>
                <Icon className="mr-1 h-3 w-3" />
                {label}
                {count > 0 && <Badge variant="secondary" className="ml-1">{count}</Badge>}
              </Link>
            </Button>
          );
        })}
      </div>

      {/* Documents Grid */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedCategory ? categoryLabels[selectedCategory] : "All Documents"}
          </CardTitle>
          <CardDescription>
            {selectedCategory
              ? `Showing ${categoryLabels[selectedCategory].toLowerCase()}`
              : "All your property documents"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {documents && documents.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc) => {
                const CategoryIcon = categoryIcons[doc.category] || FileText;
                return (
                  <Link
                    key={doc.id}
                    href={`/app/binder/${doc.id}`}
                    className="group relative flex flex-col p-4 rounded-lg border bg-card hover:shadow-md transition-shadow"
                  >
                    {doc.is_pinned && (
                      <Pin className="absolute top-2 right-2 h-4 w-4 text-amber-500" />
                    )}
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${categoryColors[doc.category]}`}>
                        <CategoryIcon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {categoryLabels[doc.category]}
                        </p>
                      </div>
                    </div>

                    {doc.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {doc.description}
                      </p>
                    )}

                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        {doc.document_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(doc.document_date).toLocaleDateString()}
                          </span>
                        )}
                        {doc.amount_cents && (
                          <span className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3" />
                            {(doc.amount_cents / 100).toFixed(2)}
                          </span>
                        )}
                      </div>
                      {doc.properties && (
                        <span className="flex items-center gap-1 truncate">
                          <Home className="h-3 w-3" />
                          {doc.properties.nickname || doc.properties.address_line1}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Folder className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-1">No documents yet</p>
              <p className="text-sm mb-4">
                Upload receipts, warranties, manuals, and more
              </p>
              <Button asChild>
                <Link href="/app/binder/upload">
                  <Plus className="mr-2 h-4 w-4" />
                  Upload Your First Document
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
