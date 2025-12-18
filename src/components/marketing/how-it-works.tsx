import { UserPlus, Bell, CheckCircle } from "lucide-react";
import { howItWorks, type HowItWorksStep } from "@/content/site";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  UserPlus,
  Bell,
  CheckCircle,
};

function StepCard({ step }: { step: HowItWorksStep }) {
  const Icon = iconMap[step.icon] || CheckCircle;

  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Step number */}
      <div className="absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
        {step.step}
      </div>
      {/* Icon */}
      <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <Icon className="h-10 w-10 text-primary" />
      </div>
      {/* Content */}
      <h3 className="mt-6 text-xl font-semibold">{step.title}</h3>
      <p className="mt-3 text-muted-foreground">{step.description}</p>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section className="section-padding bg-muted/30">
      <div className="container-marketing">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Getting started with RegularUpkeep takes just a few minutes. Here&apos;s how we help you stay on top of home maintenance.
          </p>
        </div>

        <div className="mt-16 grid gap-12 md:grid-cols-3 md:gap-8">
          {howItWorks.map((step) => (
            <StepCard key={step.step} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
