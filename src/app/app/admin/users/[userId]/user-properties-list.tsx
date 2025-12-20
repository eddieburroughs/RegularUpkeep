"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  MapPin,
  Bed,
  Bath,
  Ruler,
  ChevronRight,
  Edit,
  ClipboardCheck
} from "lucide-react";

interface PropertyWithRole {
  id: string;
  nickname: string | null;
  property_type: string;
  address_line1: string;
  address_line2: string | null;
  city: string;
  state: string;
  postal_code: string;
  year_built: number | null;
  square_footage: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  created_at: string;
  memberRole: string;
  memberId: string;
}

interface UserPropertiesListProps {
  properties: PropertyWithRole[];
  userId: string;
}

export function UserPropertiesList({ properties, userId }: UserPropertiesListProps) {
  if (properties.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No properties added yet</p>
        <p className="text-sm mt-1">
          Add a property to get started with home maintenance tracking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {properties.map((property) => (
        <div
          key={property.id}
          className="p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {property.nickname || property.address_line1}
                  </span>
                  <Badge variant="outline" className="capitalize text-xs">
                    {property.property_type.replace("_", " ")}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {property.address_line1}
                  {property.address_line2 && `, ${property.address_line2}`}
                  , {property.city}, {property.state} {property.postal_code}
                </p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {property.bedrooms && (
                    <span className="flex items-center gap-1">
                      <Bed className="h-3 w-3" />
                      {property.bedrooms} beds
                    </span>
                  )}
                  {property.bathrooms && (
                    <span className="flex items-center gap-1">
                      <Bath className="h-3 w-3" />
                      {property.bathrooms} baths
                    </span>
                  )}
                  {property.square_footage && (
                    <span className="flex items-center gap-1">
                      <Ruler className="h-3 w-3" />
                      {property.square_footage.toLocaleString()} sqft
                    </span>
                  )}
                  {property.year_built && (
                    <span>Built {property.year_built}</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/app/admin/users/${userId}/properties/${property.id}/edit`}>
                  <Edit className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/app/admin/users/${userId}/properties/${property.id}/inspection`}>
                  <ClipboardCheck className="h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/app/admin/users/${userId}/properties/${property.id}`}>
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
