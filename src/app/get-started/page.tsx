"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Home, Briefcase, ArrowRight } from "lucide-react";
import { brand } from "@/content/site";

export default function GetStartedPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4 py-12">
      {/* Mascot Logo */}
      <Link href={brand.url} className="mb-6 transition-transform hover:scale-105">
        <Image
          src="/brand/regularupkeep-mascot.png"
          alt={brand.name}
          width={120}
          height={120}
          priority
        />
      </Link>

      {/* Tagline */}
      <p className="text-muted-foreground mb-8">{brand.tagline}</p>

      {/* Main Card */}
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Get Started</CardTitle>
          <CardDescription>
            How would you like to use RegularUpkeep?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Homeowner Option */}
          <Link href="/auth/register" className="block">
            <div className="group relative flex items-center gap-4 p-4 rounded-lg border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Home className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">I'm a Homeowner</h3>
                <p className="text-sm text-muted-foreground">
                  Manage your home maintenance, get reminders, and find trusted providers
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          {/* Provider Option */}
          <Link href="/provider/onboarding/signup" className="block">
            <div className="group relative flex items-center gap-4 p-4 rounded-lg border-2 border-muted hover:border-primary hover:bg-primary/5 transition-all cursor-pointer">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                <Briefcase className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg">I'm a Service Provider</h3>
                <p className="text-sm text-muted-foreground">
                  Join our network, get quality leads, and grow your business
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
          </Link>

          {/* Divider */}
          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Already have an account?
              </span>
            </div>
          </div>

          {/* Sign In Button */}
          <Button variant="outline" className="w-full" asChild>
            <Link href="/auth/login">
              Sign In
            </Link>
          </Button>
        </CardContent>
      </Card>

      {/* Footer Links */}
      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          By continuing, you agree to our{" "}
          <Link href="/legal/terms" className="underline hover:text-primary">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/legal/privacy" className="underline hover:text-primary">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}
