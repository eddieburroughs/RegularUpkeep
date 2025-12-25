"use client";

/**
 * Push Notification Settings Component
 *
 * Allows users to enable/disable push notifications for their account.
 */

import { useState } from "react";
import { Bell, BellOff, Loader2, Smartphone, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export function PushNotificationSettings() {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    sendTestNotification,
  } = usePushNotifications();

  const [testSent, setTestSent] = useState(false);

  const handleToggle = async (enabled: boolean) => {
    if (enabled) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  const handleTestNotification = async () => {
    const success = await sendTestNotification();
    if (success) {
      setTestSent(true);
      setTimeout(() => setTestSent(false), 3000);
    }
  };

  // Not supported
  if (!isSupported) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Push notifications are not supported in this browser.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertDescription>
              To receive push notifications, please use a modern browser like Chrome, Firefox, or Edge on desktop, or Safari on iOS 16.4+.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // Permission denied
  if (permission === "denied") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Notification permission has been blocked.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertDescription>
              You have blocked notifications for this site. To enable push notifications, please update your browser settings to allow notifications from RegularUpkeep.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Push Notifications
        </CardTitle>
        <CardDescription>
          Get instant alerts on your device for important updates.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="push-toggle" className="text-base">
              Enable Push Notifications
            </Label>
            <p className="text-sm text-muted-foreground">
              Receive notifications for maintenance reminders, messages, and booking updates.
            </p>
          </div>
          <Switch
            id="push-toggle"
            checked={isSubscribed}
            onCheckedChange={handleToggle}
            disabled={isLoading}
          />
        </div>

        {/* Error Message */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Test Notification */}
        {isSubscribed && (
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label className="text-base flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Test Notification
              </Label>
              <p className="text-sm text-muted-foreground">
                Send a test notification to verify it&apos;s working.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestNotification}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : testSent ? (
                "Sent!"
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Test
                </>
              )}
            </Button>
          </div>
        )}

        {/* Info */}
        <div className="pt-4 border-t">
          <p className="text-xs text-muted-foreground">
            Push notifications will be sent to this device. You can enable them on multiple devices.
            {isSubscribed && " You can disable notifications at any time."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
