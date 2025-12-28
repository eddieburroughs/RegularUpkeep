import {
  Hero,
  HowItWorksSection,
  FeatureGrid,
  FaqSection,
  CtaBand,
  MarketingLayout,
} from "@/components/marketing";
import { brand } from "@/content/site";

export default function HomePage() {
  return (
    <MarketingLayout>
      <Hero
        title={`Home Maintenance, Simplified.`}
        subtitle={`${brand.tagline}. Get smart reminders, connect with trusted providers, and let our concierge team handle the coordination. Stop worrying about what you're forgetting.`}
        image="/images/hero-image.png"
        imageAlt="Home maintenance made simple"
      />
      <FeatureGrid />
      <HowItWorksSection />
      <FaqSection />
      <CtaBand
        title="Take control of your home maintenance"
        subtitle="Join homeowners who have simplified their upkeep with RegularUpkeep. Start with a free consultation."
      />
    </MarketingLayout>
  );
}
