import Link from "next/link";
import { Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brand, pricing, type PricingPlan } from "@/content/site";

function PricingCard({ plan }: { plan: PricingPlan }) {
  return (
    <Card
      className={`relative flex flex-col ${
        plan.popular
          ? "border-primary shadow-lg scale-[1.02]"
          : "border-border/50"
      }`}
    >
      {plan.badge && (
        <Badge
          className={`absolute -top-3 left-1/2 -translate-x-1/2 ${
            plan.popular ? "bg-primary" : "bg-secondary"
          }`}
        >
          {plan.badge}
        </Badge>
      )}
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        <CardDescription className="text-sm">{plan.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pt-4">
        <div className="text-center">
          <span className="text-4xl font-bold">{plan.price}</span>
          <span className="text-muted-foreground">{plan.period}</span>
        </div>
        <ul className="mt-6 space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="pt-4">
        <Button
          asChild
          className="w-full"
          variant={plan.popular ? "default" : "outline"}
        >
          <Link href={brand.authUrl}>{plan.cta}</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

export function PricingCards() {
  return (
    <div className="grid gap-8 md:grid-cols-3">
      {pricing.plans.map((plan) => (
        <PricingCard key={plan.name} plan={plan} />
      ))}
    </div>
  );
}

export function PricingAddons() {
  return (
    <div className="mt-12">
      <h3 className="text-xl font-semibold text-center mb-6">Add-Ons</h3>
      <div className="grid gap-4 sm:grid-cols-2 max-w-2xl mx-auto">
        {pricing.addons.map((addon) => (
          <Card key={addon.name} className="border-border/50">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold">{addon.name}</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {addon.description}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 ml-4">
                  {addon.price}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function PricingSection() {
  return (
    <section className="section-padding">
      <div className="container-marketing">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Simple, Transparent Pricing
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose the plan that fits your needs. All plans include our core maintenance calendar and provider recommendations.
          </p>
        </div>

        <div className="mt-12">
          <PricingCards />
          <PricingAddons />
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground max-w-2xl mx-auto">
          {pricing.disclaimer}
        </p>
      </div>
    </section>
  );
}
