"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, MapPin, Star, Phone, Globe, UserPlus, ExternalLink } from "lucide-react";
import { InviteDialog } from "./invite-dialog";

type PropertyWithLocation = {
  id: string;
  nickname: string | null;
  address: string;
  city: string;
  state: string;
  lat: number | null;
  lng: number | null;
};

type ProviderResult = {
  id: string;
  place_id: string;
  name: string;
  primary_service: string;
  service_tags: string[];
  rating: number | null;
  user_ratings_total: number | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  lat: number;
  lng: number;
  distance_miles: number;
  source: "google" | "manual" | "referral";
};

const SERVICE_TYPES = [
  { value: "hvac", label: "HVAC & Climate" },
  { value: "plumbing", label: "Plumbing" },
  { value: "electrical", label: "Electrical" },
  { value: "handyman", label: "Handyman" },
  { value: "roofing", label: "Roofing" },
  { value: "landscaping", label: "Landscaping" },
  { value: "pest_control", label: "Pest Control" },
  { value: "appliances", label: "Appliances" },
];

interface ProviderSearchProps {
  properties: PropertyWithLocation[];
}

export function ProviderSearch({ properties }: ProviderSearchProps) {
  const [selectedProperty, setSelectedProperty] = useState<string>("");
  const [selectedService, setSelectedService] = useState<string>("");
  const [providers, setProviders] = useState<ProviderResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<ProviderResult | null>(null);

  const handleSearch = async () => {
    if (!selectedProperty || !selectedService) {
      setError("Please select a property and service type");
      return;
    }

    setLoading(true);
    setError(null);
    setSearched(true);

    try {
      const response = await fetch("/api/providers/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: selectedProperty,
          serviceType: selectedService,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to search providers");
        setProviders([]);
        return;
      }

      setProviders(data.providers || []);
    } catch (err) {
      setError("An error occurred while searching");
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteClick = (provider: ProviderResult) => {
    setSelectedProvider(provider);
    setInviteDialogOpen(true);
  };

  const selectedPropertyData = properties.find((p) => p.id === selectedProperty);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Search for Providers</CardTitle>
          <CardDescription>
            Find trusted service providers near your property
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Search Form */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Property</label>
              <Select
                value={selectedProperty}
                onValueChange={setSelectedProperty}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((property) => (
                    <SelectItem key={property.id} value={property.id}>
                      {property.nickname || property.address}
                      {!property.lat && (
                        <span className="text-muted-foreground text-xs ml-2">
                          (needs geocoding)
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Service Type</label>
              <Select
                value={selectedService}
                onValueChange={setSelectedService}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select service type" />
                </SelectTrigger>
                <SelectContent>
                  {SERVICE_TYPES.map((service) => (
                    <SelectItem key={service.value} value={service.value}>
                      {service.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={handleSearch}
                disabled={loading || !selectedProperty || !selectedService}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Search Providers
                  </>
                )}
              </Button>
            </div>
          </div>

          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 text-destructive text-sm">
              {error}
            </div>
          )}

          {/* Results */}
          {searched && !loading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {providers.length} provider{providers.length !== 1 ? "s" : ""}{" "}
                  found
                  {selectedPropertyData && (
                    <span>
                      {" "}
                      near {selectedPropertyData.city},{" "}
                      {selectedPropertyData.state}
                    </span>
                  )}
                </p>
              </div>

              {providers.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {providers.map((provider) => (
                    <Card key={provider.id} className="overflow-hidden">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold truncate">
                              {provider.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              {provider.rating && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                                  <span className="font-medium">
                                    {provider.rating.toFixed(1)}
                                  </span>
                                  {provider.user_ratings_total && (
                                    <span className="text-muted-foreground">
                                      ({provider.user_ratings_total})
                                    </span>
                                  )}
                                </div>
                              )}
                              <Badge variant="outline" className="text-xs">
                                <MapPin className="h-3 w-3 mr-1" />
                                {provider.distance_miles.toFixed(1)} mi
                              </Badge>
                            </div>
                            {provider.address && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {provider.address}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleInviteClick(provider)}
                            >
                              <UserPlus className="h-4 w-4 mr-1" />
                              Invite
                            </Button>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mt-3 pt-3 border-t">
                          {provider.phone && (
                            <a
                              href={`tel:${provider.phone}`}
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                            >
                              <Phone className="h-4 w-4" />
                              <span className="hidden sm:inline">
                                {provider.phone}
                              </span>
                            </a>
                          )}
                          {provider.website && (
                            <a
                              href={provider.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                            >
                              <Globe className="h-4 w-4" />
                              <span className="hidden sm:inline">Website</span>
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-1">No providers found</p>
                  <p className="text-sm">
                    Try expanding your search area or selecting a different
                    service type
                  </p>
                </div>
              )}
            </div>
          )}

          {!searched && (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-1">
                Search for local providers
              </p>
              <p className="text-sm">
                Select a property and service type to find trusted providers in
                your area
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {selectedProvider && selectedPropertyData && (
        <InviteDialog
          open={inviteDialogOpen}
          onOpenChange={setInviteDialogOpen}
          provider={selectedProvider}
          property={selectedPropertyData}
          serviceType={selectedService}
        />
      )}
    </>
  );
}
