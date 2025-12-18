import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Plus, Home, MapPin, Bed, Bath, Square } from "lucide-react";
import type { Property } from "@/types/database";

const propertyTypeLabels: Record<string, string> = {
  single_family: "Single Family",
  condo: "Condo",
  townhouse: "Townhouse",
  apartment: "Apartment",
  multi_family: "Multi-Family",
  commercial: "Commercial",
};

export default async function PropertiesPage() {
  const supabase = await createClient();

  const { data: properties } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false }) as { data: Property[] | null };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Properties</h1>
          <p className="text-muted-foreground">
            Manage your homes and properties
          </p>
        </div>
        <Button asChild>
          <Link href="/app/properties/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Link>
        </Button>
      </div>

      {properties && properties.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => (
            <Link key={property.id} href={`/app/properties/${property.id}`}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Home className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">
                          {property.nickname || property.address_line1}
                        </CardTitle>
                        <CardDescription>
                          {propertyTypeLabels[property.property_type] || property.property_type}
                        </CardDescription>
                      </div>
                    </div>
                    {!property.is_active && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                    <div>
                      <p>{property.address_line1}</p>
                      {property.address_line2 && <p>{property.address_line2}</p>}
                      <p>
                        {property.city}, {property.state} {property.postal_code}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    {property.bedrooms && (
                      <div className="flex items-center gap-1">
                        <Bed className="h-4 w-4" />
                        <span>{property.bedrooms} bed</span>
                      </div>
                    )}
                    {property.bathrooms && (
                      <div className="flex items-center gap-1">
                        <Bath className="h-4 w-4" />
                        <span>{property.bathrooms} bath</span>
                      </div>
                    )}
                    {property.square_footage && (
                      <div className="flex items-center gap-1">
                        <Square className="h-4 w-4" />
                        <span>{property.square_footage.toLocaleString()} sqft</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Home className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-1">No properties yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Add your first property to start tracking maintenance
            </p>
            <Button asChild>
              <Link href="/app/properties/new">
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Property
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
