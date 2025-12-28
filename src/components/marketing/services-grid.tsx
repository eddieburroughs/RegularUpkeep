import {
  Thermometer,
  Droplets,
  Zap,
  Home,
  Trees,
  Refrigerator,
  Bug,
  Shield,
  Wrench,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { services, type ServiceCategory } from "@/content/site";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Thermometer,
  Droplets,
  Zap,
  Home,
  Trees,
  Refrigerator,
  Bug,
  Shield,
  Wrench,
};

function ServiceCard({ category }: { category: ServiceCategory }) {
  const Icon = iconMap[category.icon] || Wrench;

  return (
    <Card className="border-border/50 hover:border-primary/20 transition-colors">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <CardTitle className="text-lg">{category.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{category.description}</p>
        <ul className="space-y-2">
          {category.services.map((service, index) => (
            <li key={index} className="text-sm flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
              {service}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

export function ServicesGrid() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {services.map((category) => (
        <ServiceCard key={category.name} category={category} />
      ))}
    </div>
  );
}

export function ServicesSection() {
  return (
    <section className="section-padding">
      <div className="container-marketing">
        <ServicesGrid />

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Service availability varies by location. We work with vetted local professionals in your area.
        </p>
      </div>
    </section>
  );
}
