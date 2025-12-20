"use client";

import { createContext, useContext } from "react";
import type { Profile } from "@/types/database";

interface AdminContextType {
  selectedUserId: string | null;
  selectedUser: Profile | null;
  isAdmin: boolean;
}

export const AdminContext = createContext<AdminContextType>({
  selectedUserId: null,
  selectedUser: null,
  isAdmin: false,
});

export function useAdminContext() {
  return useContext(AdminContext);
}
