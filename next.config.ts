import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AI import sends photos/CSVs via Server Actions. Default 1 MB limit is too
  // small for typical phone camera photos (often 2–8 MB).
  // https://nextjs.org/docs/app/api-reference/config/next-config-js/serverActions#bodysizelimit
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
