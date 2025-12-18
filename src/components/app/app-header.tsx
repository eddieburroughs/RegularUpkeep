"use client";

import { useState } from "react";
import { Bell, Menu, ChevronDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Property } from "@/types/database";

interface AppHeaderProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onPropertyChange: (propertyId: string | null) => void;
  onMenuClick?: () => void;
  unreadCount?: number;
}

export function AppHeader({
  properties,
  selectedPropertyId,
  onPropertyChange,
  onMenuClick,
  unreadCount = 0,
}: AppHeaderProps) {
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 lg:px-6">
      {/* Mobile menu button */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 -ml-2 text-muted-foreground hover:text-foreground"
      >
        <Menu className="h-6 w-6" />
      </button>

      {/* Property Switcher */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            {selectedProperty ? (
              <>
                <span className="max-w-[200px] truncate">
                  {selectedProperty.nickname || selectedProperty.address_line1}
                </span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </>
            ) : (
              <>
                <span>All Properties</span>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-64">
          <DropdownMenuItem onClick={() => onPropertyChange(null)}>
            All Properties
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {properties.map((property) => (
            <DropdownMenuItem
              key={property.id}
              onClick={() => onPropertyChange(property.id)}
            >
              <div className="flex flex-col">
                <span className="font-medium">
                  {property.nickname || property.address_line1}
                </span>
                {property.nickname && (
                  <span className="text-xs text-muted-foreground">
                    {property.address_line1}
                  </span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/app/properties/new" className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Add Property
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link href="/app/notifications">
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </Badge>
            )}
          </Link>
        </Button>
      </div>
    </header>
  );
}
