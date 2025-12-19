import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  ArrowLeft,
  Printer,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MinusCircle,
  Calendar,
  Home,
  FileText,
} from "lucide-react";
import { INSPECTION_SECTIONS, INSPECTION_TYPE_LABELS, type InspectionMeta, type FindingStatus } from "@/types/inspection";
import { DownloadPdfButton } from "./download-pdf-button";

type InspectionDocument = {
  id: string;
  title: string;
  description: string | null;
  document_date: string | null;
  created_at: string;
  meta: InspectionMeta;
  properties: {
    id: string;
    nickname: string | null;
    address_line1: string;
    city: string;
    state: string;
  } | null;
};

export default async function InspectionReportPage({
  params,
}: {
  params: Promise<{ docId: string }>;
}) {
  const { docId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login?redirectTo=/app/inspection/" + docId);
  }

  // Fetch the inspection document
  const { data: doc, error } = await supabase
    .from("documents")
    .select("id, title, description, document_date, created_at, meta, properties(id, nickname, address_line1, city, state)")
    .eq("id", docId)
    .eq("category", "inspection")
    .single() as { data: InspectionDocument | null; error: unknown };

  if (error || !doc || !doc.meta) {
    notFound();
  }

  const meta = doc.meta as InspectionMeta;
  const sections = INSPECTION_SECTIONS[meta.type];
  const property = doc.properties;

  // Group findings by status
  const findingsByStatus: Record<FindingStatus, Array<{ section: string; item: string; notes: string }>> = {
    pass: [],
    attention: [],
    urgent: [],
    na: [],
  };

  Object.entries(meta.sections).forEach(([sectionKey, items]) => {
    const sectionDef = sections.find(s => s.key === sectionKey);
    Object.entries(items).forEach(([itemKey, finding]) => {
      const itemDef = sectionDef?.items.find(i => i.key === itemKey);
      findingsByStatus[finding.status].push({
        section: sectionDef?.label || sectionKey,
        item: itemDef?.label || itemKey,
        notes: finding.notes,
      });
    });
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/binder">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">{doc.title}</h1>
          <p className="text-sm text-muted-foreground">
            {INSPECTION_TYPE_LABELS[meta.type].label}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button variant="outline" asChild className="flex-1">
          <Link href={`/app/inspection/${docId}/print`} target="_blank">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Link>
        </Button>
        <DownloadPdfButton docId={docId} />
      </div>

      {/* Property & Date Info */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex items-center gap-3">
              <Home className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Property</p>
                <p className="font-medium">
                  {property?.nickname || property?.address_line1}
                </p>
                {property?.nickname && (
                  <p className="text-sm text-muted-foreground">
                    {property.address_line1}, {property.city}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Inspection Date</p>
                <p className="font-medium">
                  {new Date(meta.completedAt).toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Summary</CardTitle>
          <CardDescription>{meta.summary.total} items inspected</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-4">
            <div className="text-center p-4 rounded-lg bg-green-50">
              <CheckCircle2 className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-600">{meta.summary.pass}</p>
              <p className="text-xs text-green-700">Pass</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-amber-50">
              <AlertTriangle className="h-6 w-6 text-amber-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-amber-600">{meta.summary.attention}</p>
              <p className="text-xs text-amber-700">Attention</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-red-50">
              <AlertCircle className="h-6 w-6 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-600">{meta.summary.urgent}</p>
              <p className="text-xs text-red-700">Urgent</p>
            </div>
            <div className="text-center p-4 rounded-lg bg-gray-50">
              <MinusCircle className="h-6 w-6 text-gray-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-600">{meta.summary.na}</p>
              <p className="text-xs text-gray-600">N/A</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Urgent Issues */}
      {findingsByStatus.urgent.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="bg-red-50 rounded-t-lg">
            <CardTitle className="text-red-800 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Urgent Issues ({findingsByStatus.urgent.length})
            </CardTitle>
            <CardDescription className="text-red-700">
              These items require immediate professional attention
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {findingsByStatus.urgent.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-red-50/50">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{item.item}</p>
                  <p className="text-sm text-muted-foreground">{item.section}</p>
                  {item.notes && <p className="text-sm mt-1">{item.notes}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Needs Attention */}
      {findingsByStatus.attention.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="bg-amber-50 rounded-t-lg">
            <CardTitle className="text-amber-800 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Needs Attention ({findingsByStatus.attention.length})
            </CardTitle>
            <CardDescription className="text-amber-700">
              These items should be addressed soon
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 space-y-3">
            {findingsByStatus.attention.map((item, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-amber-50/50">
                <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">{item.item}</p>
                  <p className="text-sm text-muted-foreground">{item.section}</p>
                  {item.notes && <p className="text-sm mt-1">{item.notes}</p>}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Passed Items */}
      {findingsByStatus.pass.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-700 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Passed ({findingsByStatus.pass.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 sm:grid-cols-2">
              {findingsByStatus.pass.map((item, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded bg-green-50/50">
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                  <span className="text-sm">{item.item}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Generated Items */}
      {meta.generated && (meta.generated.taskIds?.length || meta.generated.requestIds?.length) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Created Items
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {meta.generated.taskIds && meta.generated.taskIds.length > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span>{meta.generated.taskIds.length} maintenance task(s) created</span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/calendar">View Tasks</Link>
                </Button>
              </div>
            )}
            {meta.generated.requestIds && meta.generated.requestIds.length > 0 && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span>{meta.generated.requestIds.length} service request(s) created</span>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/app/requests">View Requests</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
