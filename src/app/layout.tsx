import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { brand, seo } from "@/content/site";
import { ChatWidgetProvider } from "@/components/support-chat/chat-widget-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: seo.title,
    template: `%s | ${brand.name}`,
  },
  description: seo.description,
  keywords: seo.keywords,
  authors: [{ name: brand.name }],
  creator: brand.name,
  metadataBase: new URL(brand.url),
  openGraph: {
    type: "website",
    locale: seo.openGraph.locale,
    url: brand.url,
    siteName: seo.openGraph.siteName,
    title: seo.title,
    description: seo.description,
    images: [
      {
        url: "/brand/regularupkeep-logo.png",
        width: 1200,
        height: 630,
        alt: `${brand.name} - ${brand.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: seo.title,
    description: seo.description,
    images: ["/brand/regularupkeep-logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

// JSON-LD Organization Schema
const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: brand.name,
  url: brand.url,
  logo: `${brand.url}/brand/regularupkeep-logo.png`,
  description: seo.description,
  telephone: brand.phone,
  email: brand.email,
  areaServed: {
    "@type": "Place",
    name: brand.serviceArea,
  },
  // Add social media links here when available:
  // sameAs: ["https://facebook.com/...", "https://twitter.com/..."],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationSchema),
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
        <ChatWidgetProvider />
      </body>
    </html>
  );
}
