import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageHeader, FaqAccordion, CtaBand , MarketingLayout } from "@/components/marketing";
import { brand } from "@/content/site";

export const metadata: Metadata = {
  title: "FAQ",
  description: `Frequently asked questions about ${brand.name}. Learn about our home maintenance management service, pricing, and how we help homeowners.`,
};

export default function FaqPage() {
  return (
    <MarketingLayout>
    <>
      <PageHeader
        title="Frequently Asked Questions"
        subtitle="Everything you need to know about RegularUpkeep. Can't find what you're looking for? Contact us directly."
      />

      <section className="section-padding">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto">
            <FaqAccordion showAll />
          </div>
        </div>
      </section>

      <section className="section-padding bg-muted/30">
        <div className="container-marketing text-center">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Still Have Questions?
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            We're happy to help! Reach out and we'll get back to you as soon as possible.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Button asChild size="lg">
              <Link href="/contact">Contact Us</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={brand.phoneHref}>Call {brand.phone}</Link>
            </Button>
          </div>
        </div>
      </section>

      <CtaBand
        title="Ready to get started?"
        subtitle="Take the first step toward simpler home maintenance today."
      />
    </>
    </MarketingLayout>
  );
}
