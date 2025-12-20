"use client";

import { useState, useEffect, useCallback } from "react";
import { Bell, Menu, ChevronDown, Plus, Users, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import type { Property, Profile } from "@/types/database";
import { createClient } from "@/lib/supabase/client";

interface AppHeaderProps {
  properties: Property[];
  selectedPropertyId: string | null;
  onPropertyChange: (propertyId: string | null) => void;
  onMenuClick?: () => void;
  unreadCount?: number;
  isAdmin?: boolean;
  selectedUserId?: string | null;
  onUserChange?: (userId: string | null) => void;
}

interface UserWithProfile {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: string;
}

export function AppHeader({
  properties,
  selectedPropertyId,
  onPropertyChange,
  onMenuClick,
  unreadCount = 0,
  isAdmin = false,
  selectedUserId,
  onUserChange,
}: AppHeaderProps) {
  const selectedProperty = properties.find((p) => p.id === selectedPropertyId);
  const [users, setUsers] = useState<UserWithProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // Debounced search for users
  const searchUsers = useCallback(async (query: string) => {
    if (!isAdmin || query.length < 2) {
      setUsers([]);
      return;
    }

    setIsSearching(true);
    const supabase = createClient();

    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name, phone, role")
      .or(`email.ilike.%${query}%,full_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .eq("role", "customer")
      .limit(10);

    if (!error && data) {
      setUsers(data);
    }
    setIsSearching(false);
  }, [isAdmin]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      searchUsers(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, searchUsers]);

  // Load selected user details when selectedUserId changes
  useEffect(() => {
    if (!selectedUserId) {
      setSelectedUser(null);
      return;
    }

    const loadUser = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("id, email, full_name, phone, role")
        .eq("id", selectedUserId)
        .single();

      if (data) {
        setSelectedUser(data);
      }
    };
    loadUser();
  }, [selectedUserId]);

  const handleUserSelect = (user: UserWithProfile) => {
    setSelectedUser(user);
    onUserChange?.(user.id);
    setSearchQuery("");
    setUsers([]);
    setUserDropdownOpen(false);
  };

  const handleClearUser = () => {
    setSelectedUser(null);
    onUserChange?.(null);
    setSearchQuery("");
    setUsers([]);
  };

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

      {/* Admin User Switcher */}
      {isAdmin && (
        <DropdownMenu open={userDropdownOpen} onOpenChange={setUserDropdownOpen}>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="gap-2 ml-2">
              <Users className="h-4 w-4" />
              {selectedUser ? (
                <>
                  <span className="max-w-[150px] truncate">
                    {selectedUser.full_name || selectedUser.email}
                  </span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </>
              ) : (
                <>
                  <span>Select User</span>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-80">
            {/* Search Input */}
            <div className="p-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  className="pl-8 pr-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                />
                {searchQuery && (
                  <button
                    className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSearchQuery("");
                      setUsers([]);
                    }}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
            <DropdownMenuSeparator />

            {/* Selected User */}
            {selectedUser && (
              <>
                <div className="px-2 py-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Currently viewing</p>
                </div>
                <DropdownMenuItem className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="font-medium">{selectedUser.full_name || "No name"}</span>
                    <span className="text-xs text-muted-foreground">{selectedUser.email}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClearUser();
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}

            {/* Search Results */}
            {isSearching ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                Searching...
              </div>
            ) : searchQuery.length >= 2 && users.length === 0 ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                No users found
              </div>
            ) : searchQuery.length < 2 && !selectedUser ? (
              <div className="px-2 py-4 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search
              </div>
            ) : null}

            {users.map((user) => (
              <DropdownMenuItem
                key={user.id}
                onClick={() => handleUserSelect(user)}
                className="cursor-pointer"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{user.full_name || "No name"}</span>
                  <span className="text-xs text-muted-foreground">{user.email}</span>
                  {user.phone && (
                    <span className="text-xs text-muted-foreground">{user.phone}</span>
                  )}
                </div>
              </DropdownMenuItem>
            ))}

            {/* Admin Actions */}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/app/admin/users" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Manage All Users
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

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
