import type { NextConfig } from "next";

import { browserRuntimeIncludes } from "./lib/server-assets";

const browserRuntime = browserRuntimeIncludes();

const nextConfig: NextConfig = {
  serverExternalPackages: ["playwright-core", "@sparticuz/chromium"],
  // Keep Playwright and Sparticuz external so __dirname / import.meta.url stay
  // inside the real package. browserRuntimeIncludes() adds the files those
  // packages open with computed paths (browsers.json, bin/*.br).
  outputFileTracingIncludes: {
    "/api/v1/render": browserRuntime,
    "/api/v1/demo/render": browserRuntime,
    "/api/v1/health": browserRuntime,
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
