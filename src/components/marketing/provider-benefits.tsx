import {
  TrendingUp,
  Star,
  ClipboardCheck,
  Award,
  MessageSquare,
  CreditCard,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { providerBenefits, type ProviderBenefit } from "@/content/site";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  Star,
  ClipboardCheck,
  Award,
  MessageSquare,
  CreditCard,
};

function BenefitCard({ benefit }: { benefit: ProviderBenefit }) {
  const Icon = iconMap[benefit.icon] || Star;

  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="pt-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{benefit.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{benefit.description}</p>
      </CardContent>
    </Card>
  );
}

export function ProviderBenefitsGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {providerBenefits.map((benefit) => (
        <BenefitCard key={benefit.title} benefit={benefit} />
      ))}
    </div>
  );
}
