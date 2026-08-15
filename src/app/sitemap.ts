import type { MetadataRoute } from "next";
import { getMarketingContent } from "@/lib/marketing/store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const c = await getMarketingContent();
  const base = c.siteUrl.replace(/\/$/, "");
  const now = new Date();

  return [
    {
      url: base,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${base}/demo`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
  ];
}
