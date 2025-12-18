"use client";

import { createContext, useContext } from "react";
import type { Property } from "@/types/database";

interface PropertyContextValue {
  selectedPropertyId: string | null;
  properties: Property[];
}

export const PropertyContext = createContext<PropertyContextValue>({
  selectedPropertyId: null,
  properties: [],
});

export function useProperty() {
  return useContext(PropertyContext);
}
