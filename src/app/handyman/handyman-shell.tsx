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
  Wrench,
  User,
  Bell,
  Power,
  BellOff,
  MessageSquare,
  ClipboardCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Handyman {
  id: string;
  is_available: boolean;
  bio: string | null;
  skills: string[] | null;
  hourly_rate: number | null;
  provider_id: string | null;
}

interface ProviderInfo {
  id: string;
  business_name: string;
}

const handymanNavItems = [
  { name: "Jobs", href: "/handyman/jobs", icon: Wrench },
  { name: "Inspect", href: "/handyman/inspection/new", icon: ClipboardCheck },
  { name: "Messages", href: "/handyman/messages", icon: MessageSquare },
  { name: "Profile", href: "/handyman/profile", icon: User },
];

interface HandymanShellProps {
  children: React.ReactNode;
  handyman: Handyman | null;
  provider: ProviderInfo | null;
}

export function HandymanShell({ children, handyman, provider }: HandymanShellProps) {
  const pathname = usePathname();
  const [isAvailable, setIsAvailable] = useState(handyman?.is_available ?? false);
  const [updating, setUpdating] = useState(false);

  const isOnboarding = pathname.startsWith("/handyman/onboarding");

  const handleAvailabilityToggle = async (checked: boolean) => {
    if (!handyman) return;
    setUpdating(true);

    const supabase = createClient();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("handymen") as any)
      .update({ is_available: checked })
      .eq("id", handyman.id);

    setIsAvailable(checked);
    setUpdating(false);
  };

  const isActiveRoute = (href: string) => {
    if (href === "/handyman/jobs") {
      return pathname === "/handyman/jobs" || pathname.startsWith("/handyman/jobs/");
    }
    if (href === "/handyman/inspection/new") {
      return pathname.startsWith("/handyman/inspection");
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
              Handyman
            </Badge>
          </div>
        </header>
        <main className="container mx-auto px-4 py-8 max-w-2xl">
          {children}
        </main>
      </div>
    );
  }

  // Main handyman app layout
  return (
    <div className="flex min-h-screen flex-col bg-muted/30">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/handyman/jobs" className="text-xl font-bold text-primary">
              {provider ? provider.business_name : "RegularUpkeep"}
            </Link>
            <Badge variant="outline">{provider ? "Employee" : "Independent"}</Badge>
          </div>

          <div className="flex items-center gap-4">
            {/* Available Toggle */}
            <div className="flex items-center gap-2">
              <Power className={cn("h-4 w-4", isAvailable ? "text-green-500" : "text-muted-foreground")} />
              <span className="text-sm font-medium hidden sm:inline">
                {isAvailable ? "Available" : "Unavailable"}
              </span>
              <Switch
                checked={isAvailable}
                onCheckedChange={handleAvailabilityToggle}
                disabled={updating || !handyman}
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
                      You&apos;ll see job assignments here
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
          {handymanNavItems.map((item) => {
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
