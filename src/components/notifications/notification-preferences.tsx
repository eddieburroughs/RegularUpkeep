"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Loader2, Bell, Mail, Smartphone, Calendar } from "lucide-react";

interface NotificationPreferences {
  maintenance_reminders: boolean;
  maintenance_frequency: "daily" | "weekly" | "never";
  overdue_alerts: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    maintenance_reminders: true,
    maintenance_frequency: "daily",
    overdue_alerts: true,
    email_enabled: true,
    push_enabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    async function fetchPreferences() {
      try {
        const res = await fetch("/api/user/notification-preferences");
        if (res.ok) {
          const data = await res.json();
          setPreferences(data.preferences);
        }
      } catch (error) {
        console.error("Failed to fetch preferences:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchPreferences();
  }, []);

  const updatePreference = async <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    setSaved(false);

    // Auto-save
    setSaving(true);
    try {
      const res = await fetch("/api/user/notification-preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferences: newPrefs }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notification Preferences
        </CardTitle>
        <CardDescription>
          Choose how and when you want to receive notifications
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Channels */}
        <div className="space-y-4">
          <h4 className="text-sm font-medium">Notification Channels</h4>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="email_enabled">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
            </div>
            <Switch
              id="email_enabled"
              checked={preferences.email_enabled}
              onCheckedChange={(checked) => updatePreference("email_enabled", checked)}
            />
          </div>

          <div className="flex items-center justify-between opacity-50">
            <div className="flex items-center gap-3">
              <Smartphone className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="push_enabled">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Browser push notifications (coming soon)
                </p>
              </div>
            </div>
            <Switch
              id="push_enabled"
              checked={preferences.push_enabled}
              disabled
            />
          </div>
        </div>

        <div className="border-t pt-6 space-y-4">
          <h4 className="text-sm font-medium">Maintenance Reminders</h4>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <div>
                <Label htmlFor="maintenance_reminders">Task Reminders</Label>
                <p className="text-sm text-muted-foreground">
                  Get reminded about upcoming maintenance tasks
                </p>
              </div>
            </div>
            <Switch
              id="maintenance_reminders"
              checked={preferences.maintenance_reminders}
              onCheckedChange={(checked) => updatePreference("maintenance_reminders", checked)}
            />
          </div>

          {preferences.maintenance_reminders && (
            <div className="ml-7 space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="maintenance_frequency">Reminder Frequency</Label>
                <Select
                  value={preferences.maintenance_frequency}
                  onValueChange={(value) =>
                    updatePreference("maintenance_frequency", value as "daily" | "weekly" | "never")
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="overdue_alerts">Overdue Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Get urgent alerts for overdue tasks
                  </p>
                </div>
                <Switch
                  id="overdue_alerts"
                  checked={preferences.overdue_alerts}
                  onCheckedChange={(checked) => updatePreference("overdue_alerts", checked)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Save indicator */}
        <div className="flex items-center justify-end gap-2 text-sm text-muted-foreground">
          {saving && (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Saving...
            </>
          )}
          {saved && !saving && (
            <span className="text-green-600">Saved</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
