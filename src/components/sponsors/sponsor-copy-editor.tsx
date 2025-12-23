"use client";

/**
 * Sponsor Copy Editor
 *
 * AI-powered marketing copy generation for sponsor campaigns.
 * Generates multiple variants with compliance checking.
 */

import { useState, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Wand2,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Info,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { AIFeedback } from "@/components/ai/ai-feedback";
import type { SponsorTileCopyOutput } from "@/lib/ai/types";

interface SponsorCopyEditorProps {
  campaignId: string;
  campaignName?: string;
  /** Called when user selects a copy variant to use */
  onSelectCopy?: (copy: { headline: string; description: string; cta: string }) => void;
}

export function SponsorCopyEditor({
  campaignId,
  campaignName,
  onSelectCopy,
}: SponsorCopyEditorProps) {
  const [copy, setCopy] = useState<SponsorTileCopyOutput | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Selected indices for each field
  const [selectedHeadline, setSelectedHeadline] = useState(0);
  const [selectedDescription, setSelectedDescription] = useState(0);
  const [selectedCta, setSelectedCta] = useState(0);

  const fetchCopy = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sponsor/campaigns/${campaignId}/copy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to generate copy");
      }

      const data = await response.json();
      setCopy(data.copy);
      setJobId(data.jobId || null);

      // Reset selections
      setSelectedHeadline(0);
      setSelectedDescription(0);
      setSelectedCta(0);
    } catch (err) {
      setError("Unable to generate copy. Please try again.");
      console.error("Sponsor copy error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [campaignId]);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleUseSelected = () => {
    if (!copy) return;

    const selected = {
      headline: copy.headlines[selectedHeadline]?.text || "",
      description: copy.shortDescriptions[selectedDescription]?.text || "",
      cta: copy.ctas[selectedCta]?.text || "",
    };

    onSelectCopy?.(selected);
  };

  const getComplianceIcon = (type: "warning" | "suggestion" | "approved") => {
    switch (type) {
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case "suggestion":
        return <Info className="h-4 w-4 text-yellow-500" />;
      case "approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getComplianceBg = (type: "warning" | "suggestion" | "approved") => {
    switch (type) {
      case "warning":
        return "bg-red-50 border-red-200";
      case "suggestion":
        return "bg-yellow-50 border-yellow-200";
      case "approved":
        return "bg-green-50 border-green-200";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-purple-500" />
            <CardTitle className="text-lg">AI Copy Generator</CardTitle>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchCopy}
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : copy ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-1" />
                Generate
              </>
            )}
          </Button>
        </div>
        <CardDescription>
          Generate marketing copy variants for {campaignName || "your campaign"}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {!copy && !isLoading && !error && (
          <div className="text-center py-8">
            <Wand2 className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              Click &quot;Generate&quot; to create AI-powered copy variants for your sponsor tile.
              Multiple options will be generated for each field.
            </p>
          </div>
        )}

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Generating copy variants...</p>
          </div>
        )}

        {copy && !isLoading && (
          <>
            {/* Headlines */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Headlines</h4>
                <span className="text-xs text-muted-foreground">
                  Select one
                </span>
              </div>
              <RadioGroup
                value={String(selectedHeadline)}
                onValueChange={(v) => setSelectedHeadline(Number(v))}
              >
                {copy.headlines.map((headline, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-3 border rounded-lg ${
                      selectedHeadline === index ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <RadioGroupItem value={String(index)} id={`headline-${index}`} />
                    <Label
                      htmlFor={`headline-${index}`}
                      className="flex-1 cursor-pointer"
                    >
                      <span className="font-medium">{headline.text}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({headline.charCount} chars)
                      </span>
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(headline.text, `headline-${index}`)}
                    >
                      {copiedField === `headline-${index}` ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* Descriptions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Descriptions</h4>
                <span className="text-xs text-muted-foreground">
                  Select one
                </span>
              </div>
              <RadioGroup
                value={String(selectedDescription)}
                onValueChange={(v) => setSelectedDescription(Number(v))}
              >
                {copy.shortDescriptions.map((desc, index) => (
                  <div
                    key={index}
                    className={`flex items-start space-x-3 p-3 border rounded-lg ${
                      selectedDescription === index ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <RadioGroupItem
                      value={String(index)}
                      id={`desc-${index}`}
                      className="mt-1"
                    />
                    <Label
                      htmlFor={`desc-${index}`}
                      className="flex-1 cursor-pointer"
                    >
                      <span>{desc.text}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({desc.charCount} chars)
                      </span>
                    </Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCopy(desc.text, `desc-${index}`)}
                    >
                      {copiedField === `desc-${index}` ? (
                        <Check className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                ))}
              </RadioGroup>
            </div>

            <Separator />

            {/* CTAs */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Call-to-Action</h4>
                <span className="text-xs text-muted-foreground">
                  Select one
                </span>
              </div>
              <RadioGroup
                value={String(selectedCta)}
                onValueChange={(v) => setSelectedCta(Number(v))}
                className="flex flex-wrap gap-2"
              >
                {copy.ctas.map((cta, index) => (
                  <div
                    key={index}
                    className={`flex items-center space-x-2 px-3 py-2 border rounded-lg ${
                      selectedCta === index ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <RadioGroupItem value={String(index)} id={`cta-${index}`} />
                    <Label htmlFor={`cta-${index}`} className="cursor-pointer">
                      {cta.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Compliance Notes */}
            {copy.complianceNotes.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Compliance Notes</h4>
                  {copy.complianceNotes.map((note, index) => (
                    <div
                      key={index}
                      className={`flex items-start gap-2 p-2 rounded-lg border ${getComplianceBg(note.type)}`}
                    >
                      {getComplianceIcon(note.type)}
                      <span className="text-sm">{note.message}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Preview */}
            <Separator />
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Preview</h4>
              <div className="p-4 border rounded-lg bg-muted/50">
                <h3 className="font-bold text-lg">
                  {copy.headlines[selectedHeadline]?.text}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {copy.shortDescriptions[selectedDescription]?.text}
                </p>
                <Button size="sm" className="mt-3">
                  {copy.ctas[selectedCta]?.text}
                </Button>
              </div>
            </div>

            {/* Use Selected Button */}
            {onSelectCopy && (
              <Button className="w-full" onClick={handleUseSelected}>
                <CheckCircle className="h-4 w-4 mr-2" />
                Use Selected Copy
              </Button>
            )}

            {/* Recommended Combo */}
            {copy.recommended && (
              <>
                <Separator />
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-yellow-500" />
                    <h4 className="text-sm font-medium">AI Recommended Combination</h4>
                  </div>
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg text-sm">
                    <p><strong>Headline:</strong> {copy.recommended.headline}</p>
                    <p><strong>Description:</strong> {copy.recommended.description}</p>
                    <p><strong>CTA:</strong> {copy.recommended.cta}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => {
                        // Find and select the recommended options
                        const hIdx = copy.headlines.findIndex(h => h.text === copy.recommended.headline);
                        const dIdx = copy.shortDescriptions.findIndex(d => d.text === copy.recommended.description);
                        const cIdx = copy.ctas.findIndex(c => c.text === copy.recommended.cta);

                        if (hIdx >= 0) setSelectedHeadline(hIdx);
                        if (dIdx >= 0) setSelectedDescription(dIdx);
                        if (cIdx >= 0) setSelectedCta(cIdx);
                      }}
                    >
                      Apply Recommendation
                    </Button>
                  </div>
                </div>
              </>
            )}

            {/* Feedback */}
            {jobId && (
              <>
                <Separator />
                <AIFeedback
                  jobId={jobId}
                  endpoint={`/api/sponsor/campaigns/${campaignId}/copy`}
                />
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
