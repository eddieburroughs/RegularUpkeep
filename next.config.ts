import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // SSR for app routes, static for marketing
  trailingSlash: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.regularupkeep.com",
      },
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
};

export default nextConfig;
