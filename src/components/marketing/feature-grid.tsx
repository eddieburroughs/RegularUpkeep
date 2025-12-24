import {
  Calendar,
  Building2,
  Users,
  Headphones,
  FileText,
  DollarSign,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { features, type Feature } from "@/content/site";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Calendar,
  Building2,
  Users,
  Headphones,
  FileText,
  DollarSign,
};

function FeatureCard({ feature }: { feature: Feature }) {
  const Icon = iconMap[feature.icon] || Calendar;

  return (
    <Card className="border-border/50 bg-card/50 backdrop-blur transition-colors hover:border-primary/20 hover:bg-card">
      <CardContent className="pt-6">
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-6 w-6 text-primary" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">{feature.title}</h3>
        <p className="mt-2 text-sm text-muted-foreground">{feature.description}</p>
      </CardContent>
    </Card>
  );
}

export function FeatureGrid() {
  return (
    <section className="section-padding">
      <div className="container-marketing">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything You Need to Stay Ahead of Maintenance
          </h2>
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            From smart reminders to hands-on help, we give you the tools and support to keep your home in top shape.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <FeatureCard key={feature.title} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}
