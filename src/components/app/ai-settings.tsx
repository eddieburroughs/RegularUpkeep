"use client";

/**
 * AI Settings Component
 *
 * Allows users to enable/disable AI features and view privacy information.
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Bot, Shield, Clock, Loader2 } from "lucide-react";

interface AISettingsProps {
  userId: string;
}

export function AISettings({ userId }: AISettingsProps) {
  const [aiEnabled, setAiEnabled] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch current setting
    fetch("/api/user/ai-preferences")
      .then((res) => res.json())
      .then((data) => {
        setAiEnabled(data.aiEnabled ?? true);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleToggle = async (enabled: boolean) => {
    setSaving(true);
    setAiEnabled(enabled);

    try {
      await fetch("/api/user/ai-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aiEnabled: enabled }),
      });
    } catch (error) {
      // Revert on error
      setAiEnabled(!enabled);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <CardTitle className="text-base">AI Assistant Settings</CardTitle>
        </div>
        <CardDescription>
          Control how AI features work in your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="ai-toggle" className="text-base font-medium">
              Enable AI Helper Features
            </Label>
            <p className="text-sm text-muted-foreground">
              Get smart suggestions for service requests, maintenance tips, and more
            </p>
          </div>
          {loading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Switch
              id="ai-toggle"
              checked={aiEnabled}
              onCheckedChange={handleToggle}
              disabled={saving}
            />
          )}
        </div>

        {/* Privacy Information */}
        <div className="rounded-lg border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-sm">Privacy & Data Handling</span>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            <p>When AI features are enabled:</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>Photos you upload may be analyzed to help describe issues</li>
              <li>Text descriptions are processed to provide smart suggestions</li>
              <li>Sensitive personal information is never stored in AI logs</li>
              <li>Your data is processed securely and not shared with third parties</li>
            </ul>
          </div>
        </div>

        {/* Data Retention */}
        <div className="flex items-start gap-3 text-sm">
          <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="font-medium">Data Retention</p>
            <p className="text-muted-foreground">
              AI-generated suggestions are retained for 6 months to improve service quality.
              Aggregate usage data may be kept longer for analytics.
            </p>
          </div>
        </div>

        {/* Current Status */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-sm text-muted-foreground">AI Features Status</span>
          <Badge variant={aiEnabled ? "default" : "secondary"}>
            {aiEnabled ? "Enabled" : "Disabled"}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
