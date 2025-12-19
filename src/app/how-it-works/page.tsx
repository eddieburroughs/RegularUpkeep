import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Calendar, Users, Headphones, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader, HowItWorksSection, CtaBand , MarketingLayout } from "@/components/marketing";
import { brand } from "@/content/site";

export const metadata: Metadata = {
  title: "How It Works",
  description: `Learn how ${brand.name} helps you manage home maintenance with smart reminders, trusted providers, and concierge coordination.`,
};

const detailedSteps = [
  {
    icon: Calendar,
    title: "Personalized Maintenance Calendar",
    description:
      "We create a maintenance calendar tailored to your home's age, systems, and local climate. You'll know exactly what needs attention and when, with automatic reminders so nothing falls through the cracks.",
    details: [
      "Seasonal maintenance reminders",
      "System-specific schedules (HVAC, plumbing, etc.)",
      "Local climate considerations",
      "Customizable notification preferences",
    ],
  },
  {
    icon: Users,
    title: "Vetted Provider Network",
    description:
      "When you need work done, we connect you with service providers who have been evaluated for quality, reliability, and professionalism. No more guessing games or bad reviews.",
    details: [
      "Background-checked professionals",
      "Verified insurance and licensing where required",
      "Customer review monitoring",
      "Quality accountability",
    ],
  },
  {
    icon: Headphones,
    title: "Concierge Coordination",
    description:
      "Don't have time to make calls and schedule appointments? Our concierge team can handle communication with providers, coordinate schedules, and follow up on completed work.",
    details: [
      "Appointment scheduling assistance",
      "Provider communication",
      "Quote coordination",
      "Post-service follow-up",
    ],
  },
  {
    icon: Shield,
    title: "Complete Maintenance Records",
    description:
      "Every service, every receipt, every warranty document—all organized in one place. Great for your records and invaluable if you ever sell your home.",
    details: [
      "Digital service history",
      "Receipt and invoice storage",
      "Warranty tracking",
      "Exportable records",
    ],
  },
];

export default function HowItWorksPage() {
  return (
    <MarketingLayout>
    <>
      <PageHeader
        title="How RegularUpkeep Works"
        subtitle="We make home maintenance simple with smart scheduling, trusted providers, and hands-on help when you need it."
      />

      <HowItWorksSection />

      <section className="section-padding">
        <div className="container-marketing">
          <h2 className="text-3xl font-bold tracking-tight text-center sm:text-4xl">
            What You Get
          </h2>
          <p className="mt-4 text-lg text-muted-foreground text-center max-w-2xl mx-auto">
            Each component of our service is designed to save you time and give you peace of mind.
          </p>

          <div className="mt-12 space-y-8">
            {detailedSteps.map((step, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="p-6 md:p-8">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                          <step.icon className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="text-xl font-semibold">{step.title}</h3>
                      </div>
                      <p className="text-muted-foreground">{step.description}</p>
                    </div>
                    <div className="bg-muted/30 p-6 md:p-8">
                      <h4 className="font-semibold mb-4">What's Included:</h4>
                      <ul className="space-y-3">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                            <span className="text-sm">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-marketing text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to Get Started?
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Setting up takes about 15 minutes. Add your property details, and we'll create your personalized maintenance plan.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/contact" className="flex items-center gap-2">
                Get Started
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/pricing">View Pricing</Link>
            </Button>
          </div>
        </div>
      </section>

      <CtaBand
        title="Questions? We're here to help."
        subtitle="Reach out to learn more about how RegularUpkeep can work for your home."
        primaryCta="Contact Us"
        primaryHref="/contact"
      />
    </>
    </MarketingLayout>
  );
}
