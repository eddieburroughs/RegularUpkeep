import Link from "next/link";
import Image from "next/image";
import { Phone, Mail, MapPin } from "lucide-react";
import { brand, navigation } from "@/content/site";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#013A5E] text-white" role="contentinfo">
      <div className="container-marketing section-padding">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4">
          {/* Brand & Mission */}
          <div className="lg:col-span-2">
            <Link href="/" className="inline-block">
              <Image
                src={brand.logo}
                alt={`${brand.name} logo`}
                width={180}
                height={40}
                className="h-8 w-auto brightness-0 invert"
              />
            </Link>
            <p className="mt-4 text-sm text-white/80 max-w-md">
              {brand.mission}
            </p>
            <div className="mt-6 flex items-center gap-2 text-sm text-white/70">
              <MapPin className="h-4 w-4 shrink-0" />
              <span>Service areas: {brand.serviceArea}</span>
            </div>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
              Navigation
            </h3>
            <ul className="mt-4 space-y-3">
              {navigation.main.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact & Legal */}
          <div>
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/90">
              Contact Us
            </h3>
            <ul className="mt-4 space-y-3">
              <li>
                <Link
                  href={brand.phoneHref}
                  className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                >
                  <Phone className="h-4 w-4 shrink-0" />
                  {brand.phone}
                </Link>
              </li>
              <li>
                <Link
                  href={brand.emailHref}
                  className="flex items-center gap-2 text-sm text-white/70 transition-colors hover:text-white"
                >
                  <Mail className="h-4 w-4 shrink-0" />
                  {brand.email}
                </Link>
              </li>
            </ul>
            <h3 className="mt-8 text-sm font-semibold uppercase tracking-wider text-white/90">
              Legal
            </h3>
            <ul className="mt-4 space-y-3">
              {navigation.footer.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-sm text-white/70 transition-colors hover:text-white"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="mt-12 border-t border-white/10 pt-8">
          <p className="text-center text-sm text-white/60">
            &copy; {currentYear} {brand.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
