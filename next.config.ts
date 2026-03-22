import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
    runtimeCaching: [
      {
        urlPattern: /^\/api\/(fish|products|categories|customers)/,
        handler: "NetworkFirst",
        options: {
          cacheName: "api-cache",
          expiration: { maxAgeSeconds: 60 * 60 * 24 },
          networkTimeoutSeconds: 5,
        },
      },
    ],
  },
});

const nextConfig: NextConfig = {
  serverExternalPackages: ["@react-pdf/renderer"],
  // Turbopack is default in Next.js 16; declare it explicitly to allow webpack plugins from next-pwa
  experimental: {},
};

export default withPWA(nextConfig);
