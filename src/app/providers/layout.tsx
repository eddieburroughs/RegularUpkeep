import type { Metadata } from "next";
import { brand } from "@/content/site";

export const metadata: Metadata = {
  title: "Join Our Provider Network",
  description: `Partner with ${brand.name} to connect with quality customers, grow your business, and join our trusted provider network.`,
};

export default function ProvidersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
