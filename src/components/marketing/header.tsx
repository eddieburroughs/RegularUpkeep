"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { Menu, X, Phone, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand, navigation } from "@/content/site";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container-marketing flex h-16 items-center justify-between" aria-label="Main navigation">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src={brand.logo}
            alt={`${brand.name} logo`}
            width={180}
            height={40}
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden lg:flex lg:items-center lg:gap-x-8">
          {navigation.main.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              {item.name}
            </Link>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden lg:flex lg:items-center lg:gap-x-4">
          <Link
            href={brand.phoneHref}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Phone className="h-4 w-4" />
            <span className="hidden xl:inline">{brand.phone}</span>
          </Link>
          <Link
            href={brand.loginUrl}
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <LogIn className="h-4 w-4" />
            <span>Log In</span>
          </Link>
          <Button asChild>
            <Link href={brand.authUrl}>Get Started</Link>
          </Button>
        </div>

        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden inline-flex items-center justify-center rounded-md p-2.5 text-foreground"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
        >
          <span className="sr-only">{mobileMenuOpen ? "Close menu" : "Open menu"}</span>
          {mobileMenuOpen ? (
            <X className="h-6 w-6" aria-hidden="true" />
          ) : (
            <Menu className="h-6 w-6" aria-hidden="true" />
          )}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div id="mobile-menu" className="lg:hidden border-t border-border">
          <div className="container-marketing py-4 space-y-4">
            {navigation.main.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="block text-base font-medium text-foreground hover:text-primary"
                onClick={() => setMobileMenuOpen(false)}
              >
                {item.name}
              </Link>
            ))}
            <div className="pt-4 border-t border-border space-y-3">
              <Link
                href={brand.phoneHref}
                className="flex items-center gap-2 text-base font-medium text-foreground"
              >
                <Phone className="h-5 w-5" />
                {brand.phone}
              </Link>
              <Link
                href={brand.loginUrl}
                className="flex items-center gap-2 text-base font-medium text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                <LogIn className="h-5 w-5" />
                Log In
              </Link>
              <Button asChild className="w-full">
                <Link href={brand.authUrl}>Get Started</Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
