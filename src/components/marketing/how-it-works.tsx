import Image from "next/image";
import { howItWorks, type HowItWorksStep } from "@/content/site";

const stepImages: Record<number, string> = {
  1: "/images/mascot-1-wrench.png",
  2: "/images/mascot-2-hammer.png",
  3: "/images/mascot-3-screwdriver.png",
};

function StepCard({ step }: { step: HowItWorksStep }) {
  const imageSrc = stepImages[step.step] || stepImages[1];

  return (
    <div className="flex flex-col items-center text-center">
      {/* Mascot Image */}
      <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-white p-2">
        <Image
          src={imageSrc}
          alt={`Step ${step.step}`}
          width={144}
          height={144}
          className="h-36 w-auto object-contain"
        />
      </div>
      {/* Content */}
      <h3 className="mt-4 text-xl font-semibold">{step.title}</h3>
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
          <p className="mt-3 text-lg text-muted-foreground max-w-2xl mx-auto">
            Getting started with RegularUpkeep takes just a few minutes. Here&apos;s how we help you stay on top of home maintenance.
          </p>
        </div>

        <div className="mt-10 grid gap-8 md:grid-cols-3 md:gap-6">
          {howItWorks.map((step) => (
            <StepCard key={step.step} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
