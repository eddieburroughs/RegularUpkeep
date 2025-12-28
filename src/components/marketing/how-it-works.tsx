import Image from "next/image";
import { howItWorks, type HowItWorksStep } from "@/content/site";

const stepImages: Record<number, string> = {
  1: "/images/trns-mascot-1-wrench.png",
  2: "/images/trns-mascot-2-hammer.png",
  3: "/images/trns-mascot-3-screwdriver.png",
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
      <h3 className="mt-2 text-xl font-semibold">{step.title}</h3>
      <p className="mt-1 text-muted-foreground">{step.description}</p>
    </div>
  );
}

export function HowItWorksSection() {
  return (
    <section className="py-4 md:py-6 bg-muted/30">
      <div className="container-marketing">
        <div className="grid gap-8 md:grid-cols-3 md:gap-6">
          {howItWorks.map((step) => (
            <StepCard key={step.step} step={step} />
          ))}
        </div>
      </div>
    </section>
  );
}
