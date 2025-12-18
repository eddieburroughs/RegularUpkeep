import Link from "next/link";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/content/site";

interface HeroProps {
  title: string;
  subtitle: string;
  showCtas?: boolean;
  centered?: boolean;
}

export function Hero({ title, subtitle, showCtas = true, centered = false }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0178C7]/5 via-background to-background">
      <div className="container-marketing section-padding">
        <div className={`max-w-3xl ${centered ? "mx-auto text-center" : ""}`}>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-balance">
            {title}
          </h1>
          <p className="mt-6 text-lg sm:text-xl text-muted-foreground text-balance">
            {subtitle}
          </p>
          {showCtas && (
            <div className={`mt-10 flex flex-wrap gap-4 ${centered ? "justify-center" : ""}`}>
              <Button asChild size="lg" className="text-base">
                <Link href={brand.authUrl}>Get Started</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="text-base">
                <Link href={brand.phoneHref} className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Call {brand.phone}
                </Link>
              </Button>
            </div>
          )}
        </div>
      </div>
      {/* Decorative background elements */}
      <div className="absolute inset-x-0 top-0 -z-10 transform-gpu overflow-hidden blur-3xl" aria-hidden="true">
        <div
          className="relative left-[calc(50%-11rem)] aspect-[1155/678] w-[36.125rem] -translate-x-1/2 rotate-[30deg] bg-gradient-to-tr from-[#0178C7] to-[#F8D096] opacity-20 sm:left-[calc(50%-30rem)] sm:w-[72.1875rem]"
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
        />
      </div>
    </section>
  );
}

export function PageHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <section className="bg-gradient-to-b from-[#0178C7]/5 via-background to-background">
      <div className="container-marketing py-12 md:py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl">
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
