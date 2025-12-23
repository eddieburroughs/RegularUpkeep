"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Briefcase,
  User,
  Bell,
  Power,
  BellOff,
  MessageSquare,
  Users,
  ClipboardCheck,
  LayoutDashboard,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Provider } from "@/types/database";

// Provider bottom nav items
const providerNavItems = [
  { name: "Jobs", href: "/provider/jobs", icon: Briefcase },
  { name: "CRM", href: "/provider/crm", icon: LayoutDashboard },
  { name: "Messages", href: "/provider/messages", icon: MessageSquare },
  { name: "Team", href: "/provider/team", icon: Users },
  { name: "Profile", href: "/provider/profile", icon: User },
];

interface ProviderShellProps {
  children: React.ReactNode;
  provider: Provider | null;
}

export function ProviderShell({ children, provider }: ProviderShellProps) {
  const pathname = usePathname();
  const [isOnline, setIsOnline] = useState(provider?.is_online ?? false);
  const [updating, setUpdating] = useState(false);

  const isOnboarding = pathname.startsWith("/provider/onboarding");

  const handleOnlineToggle = async (checked: boolean) => {
    if (!provider) return;
    setUpdating(true);

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("providers") as any)
      .update({ is_online: checked })
      .eq("id", provider.id);

    setIsOnline(checked);
    setUpdating(false);
  };

  const isActiveRoute = (href: string) => {
    if (href === "/provider/jobs") {
      return pathname === "/provider/jobs" || pathname.startsWith("/provider/jobs/");
    }
    if (href === "/provider/crm") {
      return pathname.startsWith("/provider/crm");
    }
    return pathname.startsWith(href);
  };

  // Onboarding layout (no nav)
  if (isOnboarding) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
        <header className="border-b bg-background/80 backdrop-blur-sm">
          <div className="container mx-auto px-4 h-16 flex items-center">
            <Link href="/" className="text-xl font-bold text-primary">
              RegularUpkeep
            </Link>
            <Badge variant="secondary" className="ml-2">
              Provider
            </Badge>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          {children}
        </main>
      </div>
    );
  }

  // Main provider app layout
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/provider/jobs" className="text-xl font-bold text-primary">
              RegularUpkeep
            </Link>
            <Badge variant="secondary">Pro</Badge>
          </div>

          <div className="flex items-center gap-4">
            {/* Online/Offline Toggle */}
            <div className="flex items-center gap-2">
              <Power className={cn("h-4 w-4", isOnline ? "text-green-500" : "text-muted-foreground")} />
              <span className="text-sm font-medium hidden sm:inline">
                {isOnline ? "Online" : "Offline"}
              </span>
              <Switch
                checked={isOnline}
                onCheckedChange={handleOnlineToggle}
                disabled={updating || !provider}
              />
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Bell className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">Notifications</h4>
                  </div>
                  <div className="flex flex-col items-center justify-center py-6 text-center">
                    <BellOff className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      No new notifications
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      You&apos;ll see job alerts and messages here
                    </p>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t z-50">
        <div className="flex items-center justify-around h-16">
          {providerNavItems.map((item) => {
            const isActive = isActiveRoute(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <item.icon className={cn("h-5 w-5", isActive && "text-primary")} />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
