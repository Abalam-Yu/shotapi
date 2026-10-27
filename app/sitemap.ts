import type { MetadataRoute } from "next";

import { competitors } from "@/lib/compare";
import { APP_BASE } from "@/lib/examples";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/docs",
    "/compare",
    ...competitors.map((item) => `/compare/${item.slug}`),
    "/legal/terms",
    "/legal/privacy",
    "/legal/refund",
  ];

  return paths.map((path) => ({
    url: `${APP_BASE}${path === "/" ? "" : path}`,
    changeFrequency: path.startsWith("/compare") ? "monthly" : "weekly",
    priority: path === "/" ? 1 : path.startsWith("/compare") ? 0.8 : 0.5,
  }));
}
