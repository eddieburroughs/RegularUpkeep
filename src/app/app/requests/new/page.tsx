"use client";

/**
 * New Service Request Page
 *
 * Uses AI-assisted intake with mandatory media requirements by category.
 * Integrates AI classification, follow-up questions, and provider brief generation.
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MediaUpload } from "@/components/service-request/media-upload";
import { AIAssistedDescription } from "@/components/service-request/ai-assisted-description";
import { AIIntakeFlow, type AIIntakeResult } from "@/components/service-request/ai-intake-flow";
import { VoiceNoteRecorder } from "@/components/service-request/voice-note-recorder";
import { EmergencyChecklist } from "@/components/service-request/emergency-checklist";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Clock,
  Home,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Mic,
  ClipboardList,
} from "lucide-react";
import Link from "next/link";
import type { Property } from "@/types/database";
import type { IntakeClassifyOutput, ProviderBriefOutput } from "@/lib/ai/types";

interface MediaRequirement {
  min_photos: number;
  video_required: boolean;
  emergency_exception: boolean;
  video_min_duration?: number;
  video_max_duration?: number;
}

interface UploadedMedia {
  id: string;
  url: string;
  type: "photo" | "video";
  filename: string;
  duration?: number;
}

// Emergency alternative type
type EmergencyAlternative = "none" | "voice_note" | "checklist";

const serviceCategories = [
  { value: "hvac", label: "HVAC / Heating & Cooling" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "appliances", label: "Appliance Repair" },
  { value: "exterior", label: "Exterior / Roofing" },
  { value: "interior", label: "Interior Repairs" },
  { value: "landscaping", label: "Landscaping" },
  { value: "pest_control", label: "Pest Control" },
  { value: "safety", label: "Safety & Security" },
  { value: "other", label: "Other" },
];

export default function NewRequestPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertiesLoading, setPropertiesLoading] = useState(true);

  // Form state
  const [propertyId, setPropertyId] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isEmergency, setIsEmergency] = useState(false);
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [mediaRequirements, setMediaRequirements] = useState<MediaRequirement>({
    min_photos: 1,
    video_required: false,
    emergency_exception: true,
  });

  // AI intake state
  const [aiIntakeComplete, setAiIntakeComplete] = useState(false);
  const [aiIntakeResult, setAiIntakeResult] = useState<AIIntakeResult | null>(null);
  const [aiFallbackUsed, setAiFallbackUsed] = useState(false);
  const [showAiIntake, setShowAiIntake] = useState(false);

  // Emergency alternative state (for when media requirements can't be met)
  const [emergencyAlternative, setEmergencyAlternative] = useState<EmergencyAlternative>("none");
  const [voiceNoteUrl, setVoiceNoteUrl] = useState<string | null>(null);
  const [voiceNoteDuration, setVoiceNoteDuration] = useState<number>(0);
  const [emergencyChecklistAnswers, setEmergencyChecklistAnswers] = useState<Record<string, boolean>>({});

  // Get tomorrow's date for initial value
  const defaultScheduledDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }, []);

  const [scheduledDate, setScheduledDate] = useState(defaultScheduledDate);
  const [scheduledTime, setScheduledTime] = useState("09:00");
  const [priority, setPriority] = useState("normal");

  // Request ID for media uploads (generate once)
  const [requestId] = useState(() => crypto.randomUUID());

  // Fetch properties on mount
  useEffect(() => {
    async function loadProperties() {
      const supabase = createClient();

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: propertiesData } = await (supabase as any)
        .from("properties")
        .select("*")
        .order("nickname", { ascending: true });

      setProperties(propertiesData || []);
      if (propertiesData?.length === 1) {
        setPropertyId(propertiesData[0].id);
      }
      setPropertiesLoading(false);
    }
    loadProperties();
  }, []);

  // Fetch media requirements when category changes
  useEffect(() => {
    async function loadMediaRequirements() {
      if (!category) return;

      try {
        const response = await fetch(
          `/api/config/media-requirements?category=${category}`
        );
        if (response.ok) {
          const data = await response.json();
          setMediaRequirements(data);
        }
      } catch {
        // Use defaults on error
      }
    }
    loadMediaRequirements();
  }, [category]);

  // Check if media requirements are met
  const meetsMediaRequirements = useMemo(() => {
    if (!category) return true;

    const photoCount = media.filter((m) => m.type === "photo").length;
    const hasVideo = media.some((m) => m.type === "video");
    const minPhotosRequired =
      isEmergency && mediaRequirements.emergency_exception
        ? 0
        : mediaRequirements.min_photos;
    const videoRequired =
      isEmergency && mediaRequirements.emergency_exception
        ? false
        : mediaRequirements.video_required;

    return photoCount >= minPhotosRequired && (!videoRequired || hasVideo);
  }, [media, category, isEmergency, mediaRequirements]);

  // Check if emergency alternative is complete
  const hasEmergencyAlternative = useMemo(() => {
    if (!isEmergency) return false;
    if (emergencyAlternative === "voice_note" && voiceNoteUrl) return true;
    if (emergencyAlternative === "checklist" && Object.keys(emergencyChecklistAnswers).length > 0) return true;
    return false;
  }, [isEmergency, emergencyAlternative, voiceNoteUrl, emergencyChecklistAnswers]);

  // Should show AI intake flow
  const shouldShowAiIntake = useMemo(() => {
    return meetsMediaRequirements && media.length > 0 && !aiIntakeComplete && !aiFallbackUsed;
  }, [meetsMediaRequirements, media.length, aiIntakeComplete, aiFallbackUsed]);

  // Trigger AI intake when media is ready
  useEffect(() => {
    if (shouldShowAiIntake && !showAiIntake) {
      setShowAiIntake(true);
    }
  }, [shouldShowAiIntake, showAiIntake]);

  // Handle AI intake completion
  const handleAiIntakeComplete = useCallback((result: AIIntakeResult) => {
    setAiIntakeResult(result);
    setAiIntakeComplete(true);
    // Update description with AI summary if empty
    if (!description && result.classification.summary) {
      setDescription(result.classification.summary);
    }
  }, [description]);

  // Handle AI fallback
  const handleAiFallback = useCallback(() => {
    setAiFallbackUsed(true);
    setShowAiIntake(false);
  }, []);

  // Handle voice note upload
  const handleVoiceNoteComplete = useCallback((url: string, duration: number) => {
    setVoiceNoteUrl(url);
    setVoiceNoteDuration(duration);
  }, []);

  // Handle emergency checklist complete
  const handleEmergencyChecklistComplete = useCallback((answers: Record<string, boolean>) => {
    setEmergencyChecklistAnswers(answers);
  }, []);

  // Check overall form validity
  const isFormValid = useMemo(() => {
    const hasRequiredFields = propertyId && category && description.trim().length > 10 && scheduledDate && scheduledTime;

    // If emergency with alternative, allow without full media
    if (isEmergency && hasEmergencyAlternative) {
      return hasRequiredFields;
    }

    // Otherwise, need media requirements met
    // AI intake is optional (form can submit without it, but AI data will be included if available)
    return hasRequiredFields && meetsMediaRequirements;
  }, [
    propertyId,
    category,
    description,
    meetsMediaRequirements,
    scheduledDate,
    scheduledTime,
    isEmergency,
    hasEmergencyAlternative,
  ]);

  const handleMediaChange = useCallback((newMedia: UploadedMedia[]) => {
    setMedia(newMedia);
  }, []);

  const handleDescriptionChange = useCallback((newDescription: string) => {
    setDescription(newDescription);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setError("You must be logged in to submit a request");
      setLoading(false);
      return;
    }

    try {
      // Get or create customer record
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let { data: customer } = await (supabase as any)
        .from("customers")
        .select("id")
        .eq("profile_id", user.id)
        .single();

      if (!customer) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: newCustomer, error: customerError } = await (supabase as any)
          .from("customers")
          .insert({ profile_id: user.id })
          .select()
          .single();

        if (customerError) {
          throw new Error("Failed to create customer profile");
        }
        customer = newCustomer;
      }

      const selectedProperty = properties.find((p) => p.id === propertyId);
      if (!selectedProperty) {
        throw new Error("Selected property not found");
      }

      // Create service request with AI data if available
      // Map urgency: emergency toggle → 'emergency', otherwise use priority mapping
      const urgencyValue = isEmergency
        ? "emergency"
        : priority === "high"
        ? "urgent"
        : priority === "low"
        ? "flexible"
        : "standard";

      const serviceRequestData = {
        id: requestId,
        customer_id: customer.id,
        property_id: propertyId,
        category: aiIntakeResult?.classification?.suggestedCategory || category,
        title: `${serviceCategories.find(c => c.value === category)?.label || category} - ${description.slice(0, 50)}`,
        description,
        urgency: urgencyValue,
        status: "submitted",
        photos: media.filter((m) => m.type === "photo").map((m) => m.url),
        videos: media.filter((m) => m.type === "video").map((m) => m.url),
        media_requirements_met: meetsMediaRequirements,
        emergency_media_exception: isEmergency && hasEmergencyAlternative,
        preferred_date: scheduledDate,
        preferred_time_start: scheduledTime,
        flexible_scheduling: priority === "low",
        submitted_at: new Date().toISOString(),
        // AI-generated data
        ai_summary: aiIntakeResult?.classification?.summary || null,
        ai_processing_status: aiIntakeResult ? "complete" : (aiFallbackUsed ? "fallback" : null),
        ai_follow_up_answers: aiIntakeResult?.answers || null,
        ai_provider_brief: aiIntakeResult?.providerBrief || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: createError } = await (supabase as any)
        .from("service_requests")
        .insert(serviceRequestData);

      if (createError) {
        throw createError;
      }

      router.push(`/app/requests/${requestId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit request");
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/requests">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">New Service Request</h1>
          <p className="text-muted-foreground">
            Tell us what you need help with
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Property Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Home className="h-5 w-5" />
              Property
            </CardTitle>
            <CardDescription>
              Which property needs service?
            </CardDescription>
          </CardHeader>
          <CardContent>
            {propertiesLoading ? (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading properties...
              </div>
            ) : properties.length > 0 ? (
              <Select value={propertyId} onValueChange={setPropertyId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.nickname || property.address_line1}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="text-sm text-muted-foreground">
                No properties found.{" "}
                <Link
                  href="/app/properties/new"
                  className="text-primary hover:underline"
                >
                  Add a property first
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Category & Emergency */}
        <Card>
          <CardHeader>
            <CardTitle>Service Category</CardTitle>
            <CardDescription>
              What type of service do you need?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {serviceCategories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-0.5">
                <Label htmlFor="emergency" className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  Emergency Service
                </Label>
                <p className="text-sm text-muted-foreground">
                  Is this an urgent issue that needs immediate attention?
                </p>
              </div>
              <Switch
                id="emergency"
                checked={isEmergency}
                onCheckedChange={setIsEmergency}
              />
            </div>

            {isEmergency && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Emergency requests will be prioritized and sent to available
                  providers immediately. Media requirements may be relaxed for
                  true emergencies.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Media Upload - only show after category selected */}
        {category && (
          <MediaUpload
            category={category}
            requirements={mediaRequirements}
            isEmergency={isEmergency}
            serviceRequestId={requestId}
            onMediaChange={handleMediaChange}
            initialMedia={media}
          />
        )}

        {/* Emergency Alternative - when emergency and media requirements not met */}
        {category && isEmergency && !meetsMediaRequirements && media.length === 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Emergency Without Photos
              </CardTitle>
              <CardDescription>
                Since you can&apos;t provide photos right now, please provide one of these alternatives:
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-3">
                <Button
                  type="button"
                  variant={emergencyAlternative === "voice_note" ? "default" : "outline"}
                  onClick={() => setEmergencyAlternative("voice_note")}
                  className="flex-1"
                >
                  <Mic className="mr-2 h-4 w-4" />
                  Record Voice Note
                </Button>
                <Button
                  type="button"
                  variant={emergencyAlternative === "checklist" ? "default" : "outline"}
                  onClick={() => setEmergencyAlternative("checklist")}
                  className="flex-1"
                >
                  <ClipboardList className="mr-2 h-4 w-4" />
                  Safety Checklist
                </Button>
              </div>

              {emergencyAlternative === "voice_note" && (
                <VoiceNoteRecorder
                  onRecordingComplete={(blob, duration) => {
                    // For now, just store the duration.
                    // In production, this would upload to Supabase storage
                    setVoiceNoteDuration(duration);
                  }}
                  onUploadComplete={handleVoiceNoteComplete}
                  uploadEndpoint={`/api/service-requests/${requestId}/voice-note`}
                />
              )}

              {emergencyAlternative === "checklist" && (
                <EmergencyChecklist
                  category={category}
                  onComplete={handleEmergencyChecklistComplete}
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Intake Flow - show after media is uploaded */}
        {category && showAiIntake && meetsMediaRequirements && media.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                AI Analysis
              </CardTitle>
              <CardDescription>
                Our AI is analyzing your photos to help providers understand the issue
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AIIntakeFlow
                serviceRequestId={requestId}
                category={category}
                media={media.map(m => ({ url: m.url, type: m.type === "photo" ? "image" : "video" as const }))}
                description={description}
                isEmergency={isEmergency}
                onComplete={handleAiIntakeComplete}
                onFallback={handleAiFallback}
              />
            </CardContent>
          </Card>
        )}

        {/* AI Fallback Notice */}
        {aiFallbackUsed && (
          <Alert>
            <Sparkles className="h-4 w-4" />
            <AlertDescription>
              AI analysis is temporarily unavailable. Your request will be processed normally
              and reviewed by our team.
            </AlertDescription>
          </Alert>
        )}

        {/* AI-Assisted Description - only show after category selected */}
        {category && (
          <AIAssistedDescription
            category={category}
            mediaUrls={media.map((m) => m.url)}
            initialDescription={description}
            onDescriptionChange={handleDescriptionChange}
          />
        )}

        {/* Scheduling */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Scheduling
            </CardTitle>
            <CardDescription>
              When would you like the service?
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="scheduled_date">Preferred Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="scheduled_date"
                    type="date"
                    className="pl-10"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduled_time">Preferred Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="scheduled_time"
                    type="time"
                    className="pl-10"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            {!isEmergency && (
              <div className="space-y-3">
                <Label>Priority</Label>
                <RadioGroup
                  value={priority}
                  onValueChange={setPriority}
                  className="flex flex-wrap gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="low" id="low" />
                    <Label htmlFor="low" className="cursor-pointer">
                      Low
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="normal" id="normal" />
                    <Label htmlFor="normal" className="cursor-pointer">
                      Normal
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="high" id="high" />
                    <Label htmlFor="high" className="cursor-pointer">
                      High
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submission Checklist */}
        <Card>
          <CardHeader>
            <CardTitle>Ready to Submit?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2">
              {propertyId ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2" />
              )}
              <span
                className={propertyId ? "" : "text-muted-foreground"}
              >
                Property selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {category ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2" />
              )}
              <span className={category ? "" : "text-muted-foreground"}>
                Category selected
              </span>
            </div>
            <div className="flex items-center gap-2">
              {meetsMediaRequirements || hasEmergencyAlternative ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2" />
              )}
              <span
                className={
                  meetsMediaRequirements || hasEmergencyAlternative ? "" : "text-muted-foreground"
                }
              >
                {hasEmergencyAlternative
                  ? "Emergency alternative provided"
                  : "Photos uploaded"}
                {!meetsMediaRequirements && !hasEmergencyAlternative && category && (
                  <span className="text-xs ml-1">
                    (min {mediaRequirements.min_photos} required)
                  </span>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {description.trim().length > 10 ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2" />
              )}
              <span
                className={
                  description.trim().length > 10 ? "" : "text-muted-foreground"
                }
              >
                Description provided
              </span>
            </div>
            {/* AI Analysis Status */}
            {media.length > 0 && (
              <div className="flex items-center gap-2">
                {aiIntakeComplete ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : aiFallbackUsed ? (
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                ) : showAiIntake ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                ) : (
                  <div className="h-4 w-4 rounded-full border-2" />
                )}
                <span
                  className={aiIntakeComplete ? "" : "text-muted-foreground"}
                >
                  {aiIntakeComplete
                    ? "AI analysis complete"
                    : aiFallbackUsed
                    ? "AI unavailable (optional)"
                    : showAiIntake
                    ? "AI analyzing..."
                    : "AI analysis pending"}
                </span>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={loading || !isFormValid}
                className="flex-1"
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Submit Request
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/app/requests">Cancel</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
