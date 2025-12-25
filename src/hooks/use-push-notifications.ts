"use client";

/**
 * Hook for managing push notification subscriptions
 */

import { useState, useEffect, useCallback } from "react";
import {
  isPushSupported,
  getPermissionStatus,
  requestPermission,
  subscribeToPush,
  unsubscribeFromPush,
  getCurrentSubscription,
  subscriptionToJSON,
} from "@/lib/push/client";

interface UsePushNotificationsReturn {
  // State
  isSupported: boolean;
  permission: NotificationPermission | "unsupported";
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  subscribe: () => Promise<boolean>;
  unsubscribe: () => Promise<boolean>;
  requestNotificationPermission: () => Promise<NotificationPermission | null>;
  sendTestNotification: () => Promise<boolean>;
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("unsupported");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check initial state
  useEffect(() => {
    const checkStatus = async () => {
      const supported = isPushSupported();
      setIsSupported(supported);

      if (supported) {
        setPermission(getPermissionStatus());

        const subscription = await getCurrentSubscription();
        setIsSubscribed(!!subscription);
      }

      setIsLoading(false);
    };

    checkStatus();
  }, []);

  // Request permission
  const requestNotificationPermission = useCallback(async () => {
    if (!isSupported) {
      setError("Push notifications not supported in this browser");
      return null;
    }

    try {
      setError(null);
      const result = await requestPermission();
      setPermission(result);
      return result;
    } catch (err) {
      setError("Failed to request permission");
      console.error("Permission request error:", err);
      return null;
    }
  }, [isSupported]);

  // Subscribe to push notifications
  const subscribe = useCallback(async () => {
    if (!isSupported) {
      setError("Push notifications not supported");
      return false;
    }

    if (permission !== "granted") {
      const newPermission = await requestNotificationPermission();
      if (newPermission !== "granted") {
        setError("Notification permission denied");
        return false;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      const subscription = await subscribeToPush();
      if (!subscription) {
        throw new Error("Failed to create subscription");
      }

      // Send subscription to server
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: subscriptionToJSON(subscription),
          deviceName: getDeviceName(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to save subscription");
      }

      setIsSubscribed(true);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to subscribe";
      setError(message);
      console.error("Subscribe error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, permission, requestNotificationPermission]);

  // Unsubscribe from push notifications
  const unsubscribe = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const subscription = await getCurrentSubscription();

      // Unsubscribe from browser
      const success = await unsubscribeFromPush();

      // Remove from server
      if (subscription) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            endpoint: subscription.endpoint,
          }),
        });
      }

      setIsSubscribed(false);
      return success;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to unsubscribe";
      setError(message);
      console.error("Unsubscribe error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Send test notification
  const sendTestNotification = useCallback(async () => {
    if (!isSubscribed) {
      setError("Not subscribed to push notifications");
      return false;
    }

    try {
      setError(null);

      const response = await fetch("/api/push/test", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to send test notification");
      }

      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to send test";
      setError(message);
      console.error("Test notification error:", err);
      return false;
    }
  }, [isSubscribed]);

  return {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    requestNotificationPermission,
    sendTestNotification,
  };
}

// Helper to get a friendly device name
function getDeviceName(): string {
  if (typeof navigator === "undefined") return "Unknown Device";

  const ua = navigator.userAgent;

  // Check for mobile devices
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) {
    if (/Mobile/.test(ua)) return "Android Phone";
    return "Android Tablet";
  }

  // Check for desktop browsers
  if (/Mac OS/.test(ua)) {
    if (/Chrome/.test(ua)) return "Mac Chrome";
    if (/Safari/.test(ua)) return "Mac Safari";
    if (/Firefox/.test(ua)) return "Mac Firefox";
    return "Mac";
  }
  if (/Windows/.test(ua)) {
    if (/Chrome/.test(ua)) return "Windows Chrome";
    if (/Edge/.test(ua)) return "Windows Edge";
    if (/Firefox/.test(ua)) return "Windows Firefox";
    return "Windows";
  }
  if (/Linux/.test(ua)) {
    if (/Chrome/.test(ua)) return "Linux Chrome";
    if (/Firefox/.test(ua)) return "Linux Firefox";
    return "Linux";
  }

  return "Web Browser";
}
