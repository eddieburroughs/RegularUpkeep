"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/app/sidebar";
import { AppHeader } from "@/components/app/app-header";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { Home, Calendar, Wrench, ClipboardList, User } from "lucide-react";
import type { Property } from "@/types/database";
import { PropertyContext } from "./property-context";

// Mobile bottom nav items matching wireframe labels
const mobileNavItems = [
  { name: "Home", href: "/app", icon: Home },
  { name: "Plan", href: "/app/calendar", icon: Calendar },
  { name: "Book", href: "/app/requests/new", icon: Wrench },
  { name: "History", href: "/app/requests", icon: ClipboardList },
  { name: "Profile", href: "/app/profile", icon: User },
];

interface AppShellProps {
  children: React.ReactNode;
  properties: Property[];
  unreadCount: number;
}

export function AppShell({ children, properties, unreadCount }: AppShellProps) {
  const pathname = usePathname();
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    properties.length === 1 ? properties[0].id : null
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActiveRoute = (href: string) => {
    if (href === "/app") return pathname === "/app";
    if (href === "/app/requests/new") return pathname === "/app/requests/new";
    return pathname.startsWith(href);
  };

  return (
    <PropertyContext.Provider value={{ selectedPropertyId, properties }}>
      <div className="flex h-screen bg-muted/30">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex">
          <Sidebar />
        </div>

        {/* Mobile Sidebar */}
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetContent side="left" className="p-0 w-64">
            <Sidebar />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <AppHeader
            properties={properties}
            selectedPropertyId={selectedPropertyId}
            onPropertyChange={setSelectedPropertyId}
            onMenuClick={() => setMobileMenuOpen(true)}
            unreadCount={unreadCount}
          />
          <main className="flex-1 overflow-y-auto p-4 lg:p-6 pb-20 lg:pb-6">
            {children}
          </main>

          {/* Mobile Bottom Navigation */}
          <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-background border-t safe-area-inset-bottom">
            <div className="flex items-center justify-around h-16">
              {mobileNavItems.map((item) => {
                const isActive = isActiveRoute(item.href);
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={cn(
                      "flex flex-col items-center justify-center flex-1 h-full gap-1 text-xs transition-colors",
                      isActive
                        ? "text-primary"
                        : "text-muted-foreground"
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
      </div>
    </PropertyContext.Provider>
  );
}
