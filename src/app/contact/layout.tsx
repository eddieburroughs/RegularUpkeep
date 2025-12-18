import type { Metadata } from "next";
import { brand } from "@/content/site";

export const metadata: Metadata = {
  title: "Contact Us",
  description: `Get in touch with ${brand.name}. Questions about our home maintenance service? Ready to get started? We'd love to hear from you.`,
};

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
