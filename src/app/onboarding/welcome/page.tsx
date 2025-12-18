import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle2, Calendar, Wrench, FileText, ArrowRight } from "lucide-react";

const features = [
  {
    icon: Calendar,
    title: "Personalized Maintenance Plan",
    description: "Get a customized schedule based on your home's specific needs",
  },
  {
    icon: Wrench,
    title: "Book Trusted Professionals",
    description: "Connect with vetted pros for repairs and maintenance",
  },
  {
    icon: FileText,
    title: "Digital Home Binder",
    description: "Keep all your home documents organized in one place",
  },
];

export default function WelcomePage() {
  return (
    <div className="space-y-8 py-8">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome to RegularUpkeep
        </h1>
        <p className="text-lg text-muted-foreground max-w-md mx-auto">
          Your home deserves regular care. We&apos;ll help you stay on top of maintenance
          so small issues never become big problems.
        </p>
      </div>

      {/* Features */}
      <div className="grid gap-4">
        {features.map((feature) => (
          <Card key={feature.title} className="border-0 shadow-sm">
            <CardContent className="flex items-start gap-4 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <feature.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA */}
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-xl">Ready to get started?</CardTitle>
          <CardDescription>
            Set up your home profile in just a few minutes
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button size="lg" className="w-full" asChild>
            <Link href="/onboarding/home-details">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>

      {/* Progress indicator */}
      <div className="flex justify-center gap-2">
        <div className="h-2 w-8 rounded-full bg-primary" />
        <div className="h-2 w-8 rounded-full bg-muted" />
        <div className="h-2 w-8 rounded-full bg-muted" />
        <div className="h-2 w-8 rounded-full bg-muted" />
      </div>
    </div>
  );
}
