import type { MetadataRoute } from "next";
import { getMarketingContent } from "@/lib/marketing/store";

export default async function robots(): Promise<MetadataRoute.Robots> {
  const c = await getMarketingContent();
  const base = c.siteUrl.replace(/\/$/, "");

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/api/"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
