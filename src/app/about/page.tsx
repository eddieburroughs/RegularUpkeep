import type { Metadata } from "next";
import Link from "next/link";
import { Home, Users, Award, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, TestimonialsSection, CtaBand , MarketingLayout } from "@/components/marketing";
import { brand } from "@/content/site";

export const metadata: Metadata = {
  title: "About Us",
  description: `Learn about ${brand.name} and our mission to make home maintenance simple, predictable, and stress-free for homeowners.`,
};

const values = [
  {
    icon: Home,
    title: "Homeowner-First",
    description:
      "Every decision we make starts with one question: does this make homeowners' lives easier? We exist to solve real problems, not create complexity.",
  },
  {
    icon: Users,
    title: "Community",
    description:
      "We're building a network of quality providers and engaged homeowners. When everyone wins, the whole community benefits.",
  },
  {
    icon: Award,
    title: "Quality",
    description:
      "We don't cut corners on provider vetting or customer service. Our reputation depends on consistently delivering value.",
  },
  {
    icon: Heart,
    title: "Honesty",
    description:
      "We're straightforward about what we do and don't do. No hidden fees, no exaggerated claims, no sales pressure.",
  },
];

export default function AboutPage() {
  return (
    <MarketingLayout>
    <>
      <PageHeader
        title="About RegularUpkeep"
        subtitle="We're on a mission to make home maintenance simple, predictable, and stress-free."
      />

      <section className="section-padding">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              The Problem We&apos;re Solving
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground">
              <p>
                Homeownership comes with a never-ending list of maintenance tasks. HVAC filters, gutter cleaning, roof inspections, appliance servicing—it adds up fast. And when something does break, finding a reliable contractor feels like rolling the dice.
              </p>
              <p>
                Most homeowners either forget about maintenance until something breaks (expensive) or spend hours researching, calling, and coordinating (exhausting). Neither option is great.
              </p>
              <p>
                We built RegularUpkeep to change that.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              What We Do
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground">
              <p>
                RegularUpkeep is a home maintenance management service. We help homeowners stay on top of routine maintenance, connect them with vetted local providers, and offer hands-on coordination support.
              </p>
              <p>
                We&apos;re not a contractor—we don&apos;t show up at your door with a toolbox. Instead, we&apos;re your maintenance partner: reminding you what needs attention, recommending quality help, and handling the back-and-forth coordination when you don&apos;t have time.
              </p>
              <p>
                For property owners with multiple homes or rentals, we provide a single dashboard to manage maintenance across all properties.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-marketing">
          <h2 className="text-2xl font-bold tracking-tight text-center sm:text-3xl">
            Our Values
          </h2>
          <div className="mt-12 grid gap-6 sm:grid-cols-2">
            {values.map((value) => (
              <Card key={value.title} className="border-border/50">
                <CardContent className="pt-6">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <value.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{value.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {value.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Where We Serve
            </h2>
            <div className="mt-6 space-y-4 text-muted-foreground">
              <p>
                We currently serve {brand.serviceArea}. Our provider network is growing, and we&apos;re expanding to new areas regularly.
              </p>
              <p>
                Even if you&apos;re outside our current service area, you can still use our maintenance calendar and reminders—we just may not have local provider recommendations yet.
              </p>
            </div>
          </div>
        </div>
      </section>

      <TestimonialsSection />

      <section className="section-padding">
        <div className="container-marketing text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to Simplify Your Home Maintenance?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Join homeowners who have taken control of their home upkeep with RegularUpkeep.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/contact">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/how-it-works">Learn How It Works</Link>
            </Button>
          </div>
        </div>
      </section>

      <CtaBand
        title="Questions about RegularUpkeep?"
        subtitle="We'd love to hear from you. Reach out anytime."
        primaryCta="Contact Us"
        primaryHref="/contact"
      />
    </>
    </MarketingLayout>
  );
}
