import type { Metadata } from "next";
import { PageHeader, ServicesSection, CtaBand , MarketingLayout } from "@/components/marketing";
import { brand } from "@/content/site";

export const metadata: Metadata = {
  title: "Services",
  description: `Explore the home maintenance services ${brand.name} helps you manage—from HVAC and plumbing to lawn care and general repairs.`,
};

export default function ServicesPage() {
  return (
    <MarketingLayout>
    <>
      <PageHeader
        title="Services We Help You Manage"
        subtitle="From routine maintenance to unexpected repairs, we help you stay organized and connected to quality providers in your area."
      />

      <ServicesSection />

      <section className="section-padding bg-muted/30">
        <div className="container-marketing">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              How Our Service Works
            </h2>
            <div className="mt-8 space-y-6 text-left">
              <div className="bg-card p-6 rounded-lg border border-border/50">
                <h3 className="font-semibold text-lg">We Don't Do the Work Ourselves</h3>
                <p className="mt-2 text-muted-foreground">
                  RegularUpkeep is a maintenance management service, not a contractor. We help you stay organized, remind you about important tasks, and connect you with qualified local professionals when you need work done.
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg border border-border/50">
                <h3 className="font-semibold text-lg">Vetted Local Providers</h3>
                <p className="mt-2 text-muted-foreground">
                  We evaluate providers based on their credentials, customer feedback, and reliability. When you need a service, we recommend pros who have demonstrated quality work in our network.
                </p>
              </div>
              <div className="bg-card p-6 rounded-lg border border-border/50">
                <h3 className="font-semibold text-lg">Transparent Pricing</h3>
                <p className="mt-2 text-muted-foreground">
                  You pay our membership fee for the platform and coordination services. Provider costs are separate—you'll get quotes directly from providers and pay them for their work.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <CtaBand
        title="Need help managing your home maintenance?"
        subtitle="Get started with RegularUpkeep and let us help you stay on top of everything."
      />
    </>
    </MarketingLayout>
  );
}
