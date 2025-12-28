import Link from "next/link";
import Image from "next/image";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/content/site";

interface HeroProps {
  title: string;
  subtitle: string;
  showCtas?: boolean;
  centered?: boolean;
  image?: string;
  imageAlt?: string;
}

export function Hero({ title, subtitle, showCtas = true, centered = false, image, imageAlt = "Hero image" }: HeroProps) {
  const hasImage = !!image;

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-[#0178C7]/5 via-background to-background">
      <div className="container-marketing py-6 md:py-8 !px-8 sm:!px-12 lg:!px-16">
        <div className={hasImage ? "grid gap-8 lg:grid-cols-2 lg:gap-12 items-stretch" : ""}>
          <div className={`${hasImage ? "flex flex-col justify-center" : `max-w-3xl ${centered ? "mx-auto text-center" : ""}`}`}>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl text-balance">
              {title}
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-muted-foreground text-balance">
              {subtitle}
            </p>
            {showCtas && (
              <div className={`mt-6 flex flex-wrap gap-4 ${centered && !hasImage ? "justify-center" : ""}`}>
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
          {hasImage && (
            <div className="relative hidden lg:flex items-center justify-center">
              <Image
                src={image}
                alt={imageAlt}
                width={800}
                height={800}
                className="h-full w-auto max-h-96 object-contain"
                priority
              />
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

export function PageHeader({ title, subtitle, centered = true }: { title: string; subtitle?: string; centered?: boolean }) {
  return (
    <section className="bg-gradient-to-b from-[#0178C7]/5 via-background to-background">
      <div className={`container-marketing py-8 md:py-10 ${centered ? "text-center" : ""}`}>
        <h1 className={`text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl ${centered ? "mx-auto" : ""}`}>
          {title}
        </h1>
        {subtitle && (
          <p className={`mt-4 text-lg text-muted-foreground max-w-2xl ${centered ? "mx-auto" : ""}`}>
            {subtitle}
          </p>
        )}
      </div>
    </section>
  );
}
