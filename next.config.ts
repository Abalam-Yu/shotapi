import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  // The Chromium pack is read from disk at runtime, not imported as a JS module.
  outputFileTracingIncludes: {
    "/api/v1/render": ["./node_modules/@sparticuz/chromium/**/*"],
    "/api/v1/demo/render": ["./node_modules/@sparticuz/chromium/**/*"],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
