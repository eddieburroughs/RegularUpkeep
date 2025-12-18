"use client";

import { useState } from "react";
import { Sidebar } from "@/components/app/sidebar";
import { AppHeader } from "@/components/app/app-header";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { Property } from "@/types/database";
import { PropertyContext } from "./property-context";

interface AppShellProps {
  children: React.ReactNode;
  properties: Property[];
  unreadCount: number;
}

export function AppShell({ children, properties, unreadCount }: AppShellProps) {
  const [selectedPropertyId, setSelectedPropertyId] = useState<string | null>(
    properties.length === 1 ? properties[0].id : null
  );
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
          <main className="flex-1 overflow-y-auto p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </PropertyContext.Provider>
  );
}
