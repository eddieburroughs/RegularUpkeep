"use client";

/**
 * Sponsor Tile Component
 *
 * Displays sponsor information in a subtle, non-intrusive tile format.
 * Used on homeowner dashboards to show local sponsors.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Phone, Mail, MapPin, Building2, Shield, Wrench } from "lucide-react";
import Link from "next/link";

interface SponsorTileProps {
  id: string;
  businessName: string;
  tagline: string | null;
  logoUrl: string | null;
  websiteUrl: string | null;
  phone: string | null;
  email: string | null;
  sponsorType: "realtor" | "insurance" | "handyman";
  city: string | null;
  impressionCallback?: () => void;
}

const sponsorTypeConfig = {
  realtor: {
    label: "Local Realtor",
    icon: Building2,
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-700",
    badgeColor: "bg-blue-100 text-blue-800",
  },
  insurance: {
    label: "Insurance Partner",
    icon: Shield,
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    textColor: "text-green-700",
    badgeColor: "bg-green-100 text-green-800",
  },
  handyman: {
    label: "Handyman Services",
    icon: Wrench,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-700",
    badgeColor: "bg-amber-100 text-amber-800",
  },
};

export function SponsorTile({
  id,
  businessName,
  tagline,
  logoUrl,
  websiteUrl,
  phone,
  email,
  sponsorType,
  city,
  impressionCallback,
}: SponsorTileProps) {
  const config = sponsorTypeConfig[sponsorType];
  const Icon = config.icon;

  // Track impression when component mounts
  if (impressionCallback) {
    impressionCallback();
  }

  const handleClick = async () => {
    // Track click
    try {
      await fetch("/api/sponsors/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sponsorId: id, action: "click" }),
      });
    } catch {
      // Ignore tracking errors
    }
  };

  return (
    <Card className={`${config.bgColor} ${config.borderColor} border`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Logo */}
          <div className="flex-shrink-0">
            {logoUrl ? (
              <img
                src={logoUrl}
                alt={businessName}
                className="w-12 h-12 rounded-lg object-contain bg-white p-1"
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-white flex items-center justify-center">
                <Icon className={`h-6 w-6 ${config.textColor}`} />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge className={config.badgeColor} variant="secondary">
                {config.label}
              </Badge>
              {city && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {city}
                </span>
              )}
            </div>
            <h4 className="font-semibold text-sm truncate">{businessName}</h4>
            {tagline && (
              <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
                {tagline}
              </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 mt-3">
              {websiteUrl && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs"
                  asChild
                  onClick={handleClick}
                >
                  <Link href={websiteUrl} target="_blank" rel="noopener noreferrer">
                    Visit <ExternalLink className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              )}
              {phone && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  asChild
                  onClick={handleClick}
                >
                  <Link href={`tel:${phone}`}>
                    <Phone className="h-3 w-3" />
                  </Link>
                </Button>
              )}
              {email && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs"
                  asChild
                  onClick={handleClick}
                >
                  <Link href={`mailto:${email}`}>
                    <Mail className="h-3 w-3" />
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground mt-2 text-right">
          Sponsored
        </p>
      </CardContent>
    </Card>
  );
}
