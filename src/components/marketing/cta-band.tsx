import Link from "next/link";
import { Phone, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/content/site";

interface CtaBandProps {
  title?: string;
  subtitle?: string;
  primaryCta?: string;
  primaryHref?: string;
  showPhone?: boolean;
}

export function CtaBand({
  title = "Ready to simplify your home maintenance?",
  subtitle = "Join thousands of homeowners who have taken control of their home upkeep.",
  primaryCta = "Get Started Today",
  primaryHref = brand.authUrl,
  showPhone = true,
}: CtaBandProps) {
  return (
    <section className="bg-primary text-primary-foreground">
      <div className="container-marketing section-padding">
        <div className="flex flex-col items-center text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="mt-4 text-lg text-primary-foreground/80 max-w-2xl">
            {subtitle}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <Button
              asChild
              size="lg"
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90"
            >
              <Link href={primaryHref} className="flex items-center gap-2">
                {primaryCta}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
            {showPhone && (
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link href={brand.phoneHref} className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Call {brand.phone}
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
