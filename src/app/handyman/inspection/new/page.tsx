"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FileUpload } from "@/components/ui/file-upload";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  Loader2,
  Home,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  MinusCircle,
  Camera,
  ClipboardCheck,
  Shield,
  Droplets,
  Thermometer,
  Zap,
  Sofa,
} from "lucide-react";
import Link from "next/link";
import {
  type InspectionType,
  type FindingStatus,
  type InspectionFinding,
  type InspectionMeta,
  INSPECTION_SECTIONS,
  INSPECTION_TYPE_LABELS,
} from "@/types/inspection";

type Property = {
  id: string;
  nickname: string | null;
  address_line1: string;
  city: string;
  state: string;
};

type BookingWithProperty = {
  id: string;
  property_id: string | null;
  properties: Property | null;
};

const statusConfig: Record<FindingStatus, { label: string; icon: typeof CheckCircle2; color: string; bg: string }> = {
  pass: { label: "Pass", icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
  attention: { label: "Needs Attention", icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
  urgent: { label: "Urgent", icon: AlertCircle, color: "text-red-600", bg: "bg-red-100" },
  na: { label: "N/A", icon: MinusCircle, color: "text-gray-500", bg: "bg-gray-100" },
};

const sectionIcons: Record<string, typeof Shield> = {
  Shield,
  Droplets,
  Thermometer,
  Zap,
  Home,
  Sofa,
  Refrigerator: Home,
};

export default function HandymanNewInspectionPage() {
  const supabase = createClient();

  const [step, setStep] = useState<"setup" | "walkthrough" | "review" | "success">("setup");
  const [loading, setLoading] = useState(false);
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("");
  const [inspectionType, setInspectionType] = useState<InspectionType>("seasonal");
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [findings, setFindings] = useState<Record<string, Record<string, InspectionFinding>>>({});
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [createdDocId, setCreatedDocId] = useState<string | null>(null);

  const [saveReport, setSaveReport] = useState(true);
  const [createTasks, setCreateTasks] = useState(true);
  const [createRequests, setCreateRequests] = useState(true);

  // Load properties from handyman's assigned bookings
  const loadProperties = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Get properties from bookings where user is the assigned handyman
    const { data: bookings } = await supabase
      .from("bookings")
      .select("id, property_id, properties(id, nickname, address_line1, city, state)")
      .eq("handyman_id", user.id)
      .not("property_id", "is", null) as { data: BookingWithProperty[] | null };

    if (bookings) {
      // Deduplicate properties
      const propMap = new Map<string, Property>();
      bookings.forEach(b => {
        if (b.properties && b.properties.id) {
          propMap.set(b.properties.id, b.properties);
        }
      });
      const props = Array.from(propMap.values());
      setProperties(props);
      if (props.length === 1) {
        setSelectedPropertyId(props[0].id);
      }
    }
  }, [supabase]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const sections = INSPECTION_SECTIONS[inspectionType];
  const currentSection = sections[currentSectionIndex];
  const currentItem = currentSection?.items[currentItemIndex];
  const totalItems = sections.reduce((sum, s) => sum + s.items.length, 0);
  const completedItems = Object.values(findings).reduce(
    (sum, section) => sum + Object.keys(section).length,
    0
  );

  const getCurrentFinding = (): InspectionFinding => {
    if (!currentSection || !currentItem) {
      return { status: "pass", notes: "", photos: [], createTask: false, createRequest: false };
    }
    return findings[currentSection.key]?.[currentItem.key] || {
      status: "pass",
      notes: "",
      photos: [],
      createTask: false,
      createRequest: false,
    };
  };

  const updateFinding = (updates: Partial<InspectionFinding>) => {
    if (!currentSection || !currentItem) return;

    setFindings(prev => ({
      ...prev,
      [currentSection.key]: {
        ...prev[currentSection.key],
        [currentItem.key]: {
          ...getCurrentFinding(),
          ...updates,
        },
      },
    }));
  };

  const handleStatusChange = (status: FindingStatus) => {
    updateFinding({
      status,
      createTask: status === "attention",
      createRequest: status === "urgent",
    });
  };

  const goToNext = async () => {
    if (photoFiles.length > 0 && currentSection && currentItem) {
      const currentPhotos = getCurrentFinding().photos;
      updateFinding({ photos: [...currentPhotos, ...photoFiles.map(f => `pending:${f.name}`)] });
    }
    setPhotoFiles([]);

    if (currentItemIndex < currentSection.items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else if (currentSectionIndex < sections.length - 1) {
      setCurrentSectionIndex(currentSectionIndex + 1);
      setCurrentItemIndex(0);
    } else {
      setStep("review");
    }
  };

  const goToPrev = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    } else if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
      setCurrentItemIndex(sections[currentSectionIndex - 1].items.length - 1);
    }
  };

  const calculateSummary = () => {
    const summary = { pass: 0, attention: 0, urgent: 0, na: 0, total: 0 };
    Object.values(findings).forEach(section => {
      Object.values(section).forEach(finding => {
        summary[finding.status]++;
        summary.total++;
      });
    });
    return summary;
  };

  const handleSave = async () => {
    if (!selectedPropertyId) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const property = properties.find(p => p.id === selectedPropertyId);
      const propertyName = property?.nickname || property?.address_line1 || "Home";
      const today = new Date().toISOString().split("T")[0];
      const summary = calculateSummary();

      const meta: InspectionMeta = {
        type: inspectionType,
        sections: findings,
        summary,
        completedAt: new Date().toISOString(),
        generated: {
          tasks: false,
          requests: false,
        },
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: doc, error: docError } = await (supabase.from("documents") as any)
        .insert({
          property_id: selectedPropertyId,
          category: "inspection",
          title: `Handyman Inspection – ${propertyName} – ${today}`,
          description: `${INSPECTION_TYPE_LABELS[inspectionType].label} with ${summary.total} items checked`,
          file_url: "",
          file_name: `inspection-${today}.json`,
          uploaded_by: user.id,
          document_date: today,
          meta,
        })
        .select("id")
        .single();

      if (docError) throw docError;

      const docId = doc.id;
      setCreatedDocId(docId);

      // Create tasks if requested
      if (createTasks) {
        const taskIds: string[] = [];
        for (const [sectionKey, sectionFindings] of Object.entries(findings)) {
          for (const [itemKey, finding] of Object.entries(sectionFindings)) {
            if (finding.createTask && finding.status === "attention") {
              const section = sections.find(s => s.key === sectionKey);
              const item = section?.items.find(i => i.key === itemKey);

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: task } = await (supabase.from("maintenance_tasks") as any)
                .insert({
                  property_id: selectedPropertyId,
                  name: `${item?.label || itemKey} - Needs Attention`,
                  description: finding.notes || `From handyman inspection on ${today}`,
                  category: sectionKey === "plumbing" ? "plumbing"
                    : sectionKey === "hvac" ? "hvac"
                    : sectionKey === "electrical" ? "electrical"
                    : sectionKey === "exterior" ? "exterior"
                    : sectionKey === "interior" ? "interior"
                    : "other",
                  priority: "normal",
                  status: "scheduled",
                  due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
                  created_by: user.id,
                })
                .select("id")
                .single();

              if (task) taskIds.push(task.id);
            }
          }
        }
        meta.generated!.tasks = true;
        meta.generated!.taskIds = taskIds;
      }

      // Create requests if requested
      if (createRequests) {
        const requestIds: string[] = [];
        for (const [sectionKey, sectionFindings] of Object.entries(findings)) {
          for (const [itemKey, finding] of Object.entries(sectionFindings)) {
            if (finding.createRequest && finding.status === "urgent") {
              const section = sections.find(s => s.key === sectionKey);
              const item = section?.items.find(i => i.key === itemKey);

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: task } = await (supabase.from("maintenance_tasks") as any)
                .insert({
                  property_id: selectedPropertyId,
                  name: `URGENT: ${item?.label || itemKey}`,
                  description: finding.notes || `Urgent issue found during handyman inspection on ${today}`,
                  category: sectionKey === "plumbing" ? "plumbing"
                    : sectionKey === "hvac" ? "hvac"
                    : sectionKey === "electrical" ? "electrical"
                    : sectionKey === "exterior" ? "exterior"
                    : sectionKey === "interior" ? "interior"
                    : "other",
                  priority: "urgent",
                  status: "due",
                  due_date: new Date().toISOString().split("T")[0],
                  created_by: user.id,
                })
                .select("id")
                .single();

              if (task) requestIds.push(task.id);
            }
          }
        }
        meta.generated!.requests = true;
        meta.generated!.requestIds = requestIds;
      }

      // Update document with generated info
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from("documents") as any)
        .update({ meta })
        .eq("id", docId);

      setStep("success");
    } catch (error) {
      console.error("Error saving inspection:", error);
    } finally {
      setLoading(false);
    }
  };

  const summary = calculateSummary();
  const SectionIcon = currentSection ? (sectionIcons[currentSection.icon] || Home) : Home;

  // Setup Step
  if (step === "setup") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/handyman/jobs">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">New Inspection</h1>
            <p className="text-muted-foreground">Conduct a property inspection</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Select Property</CardTitle>
            <CardDescription>Choose which property to inspect</CardDescription>
          </CardHeader>
          <CardContent>
            {properties.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No properties found. Properties appear here from your assigned jobs.
              </p>
            ) : (
              <Select value={selectedPropertyId} onValueChange={setSelectedPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map(property => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.nickname || property.address_line1}, {property.city}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Inspection Type</CardTitle>
            <CardDescription>Choose the depth of inspection</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.keys(INSPECTION_TYPE_LABELS) as InspectionType[]).map(type => {
              const config = INSPECTION_TYPE_LABELS[type];
              const isSelected = inspectionType === type;
              return (
                <div
                  key={type}
                  onClick={() => setInspectionType(type)}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                    isSelected ? "border-primary bg-primary/5" : "border-muted hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{config.label}</p>
                      <p className="text-sm text-muted-foreground">{config.description}</p>
                    </div>
                    <Badge variant="outline">{config.duration}</Badge>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Button
          onClick={() => setStep("walkthrough")}
          disabled={!selectedPropertyId}
          className="w-full"
          size="lg"
        >
          Start Inspection
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Walkthrough Step
  if (step === "walkthrough" && currentSection && currentItem) {
    const finding = getCurrentFinding();

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => currentSectionIndex === 0 && currentItemIndex === 0 ? setStep("setup") : goToPrev()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-medium">{currentSection.label}</p>
            <p className="text-xs text-muted-foreground">
              {completedItems + 1} of {totalItems} items
            </p>
          </div>
          <div className="w-10" />
        </div>

        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all"
            style={{ width: `${((completedItems + 1) / totalItems) * 100}%` }}
          />
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                <SectionIcon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{currentItem.label}</CardTitle>
                {currentItem.description && (
                  <CardDescription>{currentItem.description}</CardDescription>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-2 gap-3">
              {(Object.keys(statusConfig) as FindingStatus[]).map(status => {
                const config = statusConfig[status];
                const Icon = config.icon;
                const isSelected = finding.status === status;
                return (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`flex items-center gap-2 p-3 rounded-lg border-2 transition-colors ${
                      isSelected ? `border-current ${config.bg} ${config.color}` : "border-muted hover:border-primary/50"
                    }`}
                  >
                    <Icon className={`h-5 w-5 ${isSelected ? config.color : "text-muted-foreground"}`} />
                    <span className={`font-medium ${isSelected ? config.color : ""}`}>{config.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Textarea
                placeholder="Add any observations..."
                value={finding.notes}
                onChange={e => updateFinding({ notes: e.target.value })}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Photos (optional)
              </Label>
              <FileUpload
                value={photoFiles}
                onChange={setPhotoFiles}
                accept="image/*"
                multiple
                maxFiles={4}
                label="Add photos"
                description="Document any issues"
              />
            </div>

            {(finding.status === "attention" || finding.status === "urgent") && (
              <div className="space-y-3 pt-4 border-t">
                <p className="text-sm font-medium">Follow-up actions</p>
                <div className="flex items-center gap-3">
                  <Checkbox
                    id="createTask"
                    checked={finding.createTask}
                    onCheckedChange={checked => updateFinding({ createTask: !!checked })}
                  />
                  <label htmlFor="createTask" className="text-sm">
                    Create a maintenance task
                  </label>
                </div>
                {finding.status === "urgent" && (
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="createRequest"
                      checked={finding.createRequest}
                      onCheckedChange={checked => updateFinding({ createRequest: !!checked })}
                    />
                    <label htmlFor="createRequest" className="text-sm">
                      Flag for professional service
                    </label>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button variant="outline" onClick={goToPrev} disabled={currentSectionIndex === 0 && currentItemIndex === 0}>
            Previous
          </Button>
          <Button onClick={goToNext} className="flex-1">
            {currentSectionIndex === sections.length - 1 && currentItemIndex === currentSection.items.length - 1
              ? "Review Results"
              : "Next Item"}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Review Step
  if (step === "review") {
    const attentionItems = Object.entries(findings).flatMap(([sectionKey, items]) =>
      Object.entries(items)
        .filter(([, f]) => f.status === "attention")
        .map(([itemKey, f]) => ({ sectionKey, itemKey, ...f }))
    );
    const urgentItems = Object.entries(findings).flatMap(([sectionKey, items]) =>
      Object.entries(items)
        .filter(([, f]) => f.status === "urgent")
        .map(([itemKey, f]) => ({ sectionKey, itemKey, ...f }))
    );

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => setStep("walkthrough")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Review Inspection</h1>
            <p className="text-muted-foreground">Summary and next steps</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Inspection Summary</CardTitle>
            <CardDescription>
              {INSPECTION_TYPE_LABELS[inspectionType].label} - {summary.total} items checked
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center p-3 rounded-lg bg-green-50">
                <p className="text-2xl font-bold text-green-600">{summary.pass}</p>
                <p className="text-xs text-green-700">Pass</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-amber-50">
                <p className="text-2xl font-bold text-amber-600">{summary.attention}</p>
                <p className="text-xs text-amber-700">Attention</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-red-50">
                <p className="text-2xl font-bold text-red-600">{summary.urgent}</p>
                <p className="text-xs text-red-700">Urgent</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-gray-50">
                <p className="text-2xl font-bold text-gray-600">{summary.na}</p>
                <p className="text-xs text-gray-700">N/A</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {urgentItems.length > 0 && (
          <Card className="border-red-200 bg-red-50">
            <CardHeader>
              <CardTitle className="text-red-800 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Urgent Issues ({urgentItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {urgentItems.map((item, i) => {
                const section = sections.find(s => s.key === item.sectionKey);
                const itemDef = section?.items.find(it => it.key === item.itemKey);
                return (
                  <div key={i} className="p-3 rounded bg-white/50">
                    <p className="font-medium text-red-900">{itemDef?.label}</p>
                    {item.notes && <p className="text-sm text-red-700">{item.notes}</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {attentionItems.length > 0 && (
          <Card className="border-amber-200 bg-amber-50">
            <CardHeader>
              <CardTitle className="text-amber-800 flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Needs Attention ({attentionItems.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {attentionItems.map((item, i) => {
                const section = sections.find(s => s.key === item.sectionKey);
                const itemDef = section?.items.find(it => it.key === item.itemKey);
                return (
                  <div key={i} className="p-3 rounded bg-white/50">
                    <p className="font-medium text-amber-900">{itemDef?.label}</p>
                    {item.notes && <p className="text-sm text-amber-700">{item.notes}</p>}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Save Options</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Checkbox id="saveReport" checked={saveReport} onCheckedChange={c => setSaveReport(!!c)} />
              <label htmlFor="saveReport">Save inspection report</label>
            </div>
            {attentionItems.length > 0 && (
              <div className="flex items-center gap-3">
                <Checkbox id="createTasks" checked={createTasks} onCheckedChange={c => setCreateTasks(!!c)} />
                <label htmlFor="createTasks">Create tasks for &quot;Needs Attention&quot; items ({attentionItems.filter(i => i.createTask).length})</label>
              </div>
            )}
            {urgentItems.length > 0 && (
              <div className="flex items-center gap-3">
                <Checkbox id="createRequests" checked={createRequests} onCheckedChange={c => setCreateRequests(!!c)} />
                <label htmlFor="createRequests">Flag urgent items ({urgentItems.filter(i => i.createRequest).length})</label>
              </div>
            )}
          </CardContent>
        </Card>

        <Button onClick={handleSave} disabled={loading || !saveReport} className="w-full" size="lg">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              Complete Inspection
            </>
          )}
        </Button>
      </div>
    );
  }

  // Success Step
  if (step === "success") {
    return (
      <div className="space-y-6">
        <div className="text-center space-y-4 py-8">
          <div className="flex justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
          <h1 className="text-2xl font-bold">Inspection Complete!</h1>
          <p className="text-muted-foreground">
            Your inspection report has been saved.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-2xl font-bold text-green-600">{summary.pass}</p>
                <p className="text-xs text-muted-foreground">Pass</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-600">{summary.attention}</p>
                <p className="text-xs text-muted-foreground">Attention</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{summary.urgent}</p>
                <p className="text-xs text-muted-foreground">Urgent</p>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-600">{summary.na}</p>
                <p className="text-xs text-muted-foreground">N/A</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {createdDocId && (
            <Button asChild className="w-full" size="lg">
              <Link href={`/handyman/inspection/${createdDocId}`}>
                View Report
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild className="w-full">
            <Link href="/handyman/jobs">Back to Jobs</Link>
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
