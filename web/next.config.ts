import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";
// NEXT_PUBLIC_STATIC=1 builds the public demo for GitHub Pages: a static export that reads the
// API snapshot in public/demo and simulates transactions in the browser (see src/lib/demo.ts).
const STATIC = process.env.NEXT_PUBLIC_STATIC === "1";
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  ...(STATIC
    ? { output: "export", basePath: BASE_PATH, trailingSlash: true, images: { unoptimized: true } }
    : {
        cacheComponents: true,
        partialPrefetching: true,
        async rewrites() {
          return [{ source: "/api/:path*", destination: `${BACKEND_URL}/api/:path*` }];
        },
      }),
};

export default nextConfig;
