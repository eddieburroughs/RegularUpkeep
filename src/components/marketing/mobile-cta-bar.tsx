"use client";

import Link from "next/link";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/content/site";

export function MobileCtaBar() {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 p-3 md:hidden">
      <div className="flex gap-3">
        <Button asChild variant="outline" className="flex-1">
          <Link href={brand.phoneHref} className="flex items-center justify-center gap-2">
            <Phone className="h-4 w-4" />
            Call Now
          </Link>
        </Button>
        <Button asChild className="flex-1">
          <Link href={brand.authUrl}>Get Started</Link>
        </Button>
      </div>
    </div>
  );
}
