"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Building2,
  Phone,
  Mail,
  Star,
  CheckCircle,
  Clock,
  Wrench,
  MapPin,
} from "lucide-react";

interface ConnectedProvider {
  id: string;
  business_name: string;
  contact_name: string;
  phone: string | null;
  email: string | null;
  service_categories: string[];
  verification_status: string;
  rating: number | null;
  reviews_count: number;
  is_online: boolean;
  invite_id: string;
  service_type: string;
  connected_at: string;
  property: {
    id: string;
    nickname: string | null;
    address_line1: string;
    city: string;
    state: string;
  } | null;
}

const SERVICE_LABELS: Record<string, string> = {
  hvac: "HVAC & Climate",
  plumbing: "Plumbing",
  electrical: "Electrical",
  handyman: "Handyman",
  roofing: "Roofing",
  landscaping: "Landscaping",
  pest_control: "Pest Control",
  appliances: "Appliances",
  general: "General",
};

const VERIFICATION_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  verified: { label: "Verified", variant: "default" },
  preferred: { label: "Preferred", variant: "default" },
  unverified: { label: "New", variant: "outline" },
};

export function ConnectedProviders() {
  const router = useRouter();
  const [providers, setProviders] = useState<ConnectedProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConnectedProviders();
  }, []);

  const fetchConnectedProviders = async () => {
    try {
      const response = await fetch("/api/providers/connected");
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to load providers");
        return;
      }

      setProviders(data.providers || []);
    } catch (err) {
      setError("Failed to load connected providers");
    } finally {
      setLoading(false);
    }
  };

  const handleRequestService = (provider: ConnectedProvider) => {
    // Navigate to new service request with provider pre-selected
    const params = new URLSearchParams({
      providerId: provider.id,
      providerName: provider.business_name,
    });

    // If provider has a specific service category, use it
    if (provider.service_categories.length === 1) {
      params.set("category", provider.service_categories[0]);
    } else if (provider.service_type) {
      params.set("category", provider.service_type);
    }

    // If connected via a specific property, pre-select it
    if (provider.property) {
      params.set("propertyId", provider.property.id);
    }

    router.push(`/app/requests/new?${params.toString()}`);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-destructive">
            <p>{error}</p>
            <Button
              variant="outline"
              onClick={fetchConnectedProviders}
              className="mt-4"
            >
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (providers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>My Providers</CardTitle>
          <CardDescription>
            Providers who have joined your network
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium mb-1">No connected providers yet</p>
            <p className="text-sm">
              Search for providers and send invites to build your trusted network
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>My Providers</CardTitle>
        <CardDescription>
          Request service directly from providers in your network
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2">
          {providers.map((provider) => (
            <Card key={provider.id} className="overflow-hidden border-2">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold truncate">
                        {provider.business_name}
                      </h3>
                      {provider.is_online && (
                        <span className="flex h-2 w-2 rounded-full bg-green-500" title="Online" />
                      )}
                    </div>

                    <p className="text-sm text-muted-foreground">
                      {provider.contact_name}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      {/* Verification badge */}
                      <Badge
                        variant={VERIFICATION_BADGES[provider.verification_status]?.variant || "outline"}
                        className="flex items-center gap-1"
                      >
                        {provider.verification_status === "verified" || provider.verification_status === "preferred" ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <Clock className="h-3 w-3" />
                        )}
                        {VERIFICATION_BADGES[provider.verification_status]?.label || provider.verification_status}
                      </Badge>

                      {/* Rating if available */}
                      {provider.rating && (
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                          {provider.rating.toFixed(1)}
                          {provider.reviews_count > 0 && (
                            <span className="text-muted-foreground">
                              ({provider.reviews_count})
                            </span>
                          )}
                        </Badge>
                      )}
                    </div>

                    {/* Service categories */}
                    <div className="flex flex-wrap gap-1 mt-3">
                      {provider.service_categories.slice(0, 3).map((category) => (
                        <Badge key={category} variant="outline" className="text-xs">
                          {SERVICE_LABELS[category] || category}
                        </Badge>
                      ))}
                      {provider.service_categories.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{provider.service_categories.length - 3} more
                        </Badge>
                      )}
                    </div>

                    {/* Property connection */}
                    {provider.property && (
                      <p className="flex items-center gap-1 text-xs text-muted-foreground mt-2">
                        <MapPin className="h-3 w-3" />
                        Connected for {provider.property.nickname || provider.property.address_line1}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRequestService(provider)}
                    >
                      <Wrench className="h-4 w-4 mr-1" />
                      Request Service
                    </Button>
                  </div>
                </div>

                {/* Contact info */}
                <div className="flex items-center gap-4 mt-3 pt-3 border-t">
                  {provider.phone && (
                    <a
                      href={`tel:${provider.phone}`}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Phone className="h-4 w-4" />
                      <span className="hidden sm:inline">{provider.phone}</span>
                    </a>
                  )}
                  {provider.email && (
                    <a
                      href={`mailto:${provider.email}`}
                      className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <Mail className="h-4 w-4" />
                      <span className="hidden sm:inline truncate max-w-[150px]">
                        {provider.email}
                      </span>
                    </a>
                  )}
                </div>

                {/* Connected date */}
                <p className="text-xs text-muted-foreground mt-2">
                  Connected {new Date(provider.connected_at).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
