import type { Metadata } from "next";
import Link from "next/link";
import { Check, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  PageHeader,
  PricingCards,
  PricingAddons,
  FaqAccordion,
  CtaBand,
  MarketingLayout,
} from "@/components/marketing";
import { brand, pricing, faqs } from "@/content/site";

export const metadata: Metadata = {
  title: "Pricing",
  description: `Simple, transparent pricing for ${brand.name} membership plans. Choose the plan that fits your home maintenance needs.`,
};

const pricingFaqs = faqs.filter((faq) =>
  faq.question.toLowerCase().includes("price") ||
  faq.question.toLowerCase().includes("cost") ||
  faq.question.toLowerCase().includes("cancel") ||
  faq.question.toLowerCase().includes("guarantee")
);

const allPlansInclude = [
  "Personalized maintenance calendar",
  "Seasonal task reminders",
  "Provider recommendations",
  "Basic maintenance records",
  "Cancel anytime",
];

export default function PricingPage() {
  return (
    <MarketingLayout>
    <>
      <PageHeader
        title="Simple, Transparent Pricing"
        subtitle="Choose the plan that fits your needs. No hidden fees, no long-term contracts."
      />

      <section className="section-padding">
        <div className="container-marketing">
          <PricingCards />
          <PricingAddons />

          <p className="mt-8 text-center text-sm text-muted-foreground max-w-2xl mx-auto">
            {pricing.disclaimer}
          </p>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold tracking-tight text-center sm:text-3xl">
              All Plans Include
            </h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {allPlansInclude.map((feature, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 justify-center mb-8">
              <HelpCircle className="h-6 w-6 text-primary" />
              <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Pricing Questions
              </h2>
            </div>
            <FaqAccordion items={pricingFaqs.length > 0 ? pricingFaqs : faqs.slice(0, 4)} />
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-marketing text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Not Sure Which Plan Is Right?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
            Talk to us! We&apos;ll help you figure out the best fit based on your properties and how much hands-on help you want.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/contact">Talk to Us</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/how-it-works">Learn How It Works</Link>
            </Button>
          </div>
        </div>
      </section>

      <CtaBand
        title="Ready to simplify your home maintenance?"
        subtitle="Get started today and take the first step toward stress-free home ownership."
      />
    </>
    </MarketingLayout>
  );
}
