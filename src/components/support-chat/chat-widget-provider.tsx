"use client";

/**
 * Chat Widget Provider
 *
 * Conditionally renders the chat widget based on the current route.
 */

import { usePathname } from "next/navigation";
import { ChatWidget } from "./chat-widget";

// Routes where the chat widget should NOT appear
const EXCLUDED_ROUTES = [
  "/app/admin",
  "/auth",
  "/onboarding",
];

// Routes that are part of the authenticated app
const APP_ROUTES = [
  "/app",
  "/provider",
  "/handyman",
];

export function ChatWidgetProvider() {
  const pathname = usePathname();

  // Don't show on excluded routes
  if (EXCLUDED_ROUTES.some((route) => pathname.startsWith(route))) {
    return null;
  }

  // Determine mode based on route
  let mode: "public" | "homeowner" | "provider" | "handyman" = "public";

  if (pathname.startsWith("/provider")) {
    mode = "provider";
  } else if (pathname.startsWith("/handyman")) {
    mode = "handyman";
  } else if (pathname.startsWith("/app")) {
    mode = "homeowner";
  }

  return <ChatWidget mode={mode} />;
}
