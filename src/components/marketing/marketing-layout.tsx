"use client";

import { Header, Footer, MobileCtaBar } from "@/components/marketing";

export function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 pb-16 md:pb-0">{children}</main>
      <Footer />
      <MobileCtaBar />
    </div>
  );
}
