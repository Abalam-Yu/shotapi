import type { MetadataRoute } from "next";

import { APP_BASE } from "@/lib/examples";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: `${APP_BASE}/sitemap.xml`,
  };
}
