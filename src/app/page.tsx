import type { Metadata } from "next";
import { LandingPage } from "@/components/marketing/LandingPage";
import { MarketingJsonLd } from "@/components/marketing/JsonLd";
import { getMarketingContent } from "@/lib/marketing/store";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getMarketingContent();
  const canonical = c.siteUrl.replace(/\/$/, "");

  return {
    title: c.seoTitle,
    description: c.seoDescription,
    keywords: c.seoKeywords.split(",").map((k) => k.trim()).filter(Boolean),
    applicationName: c.brandName,
    authors: [{ name: c.footerDeveloperName, url: c.footerDeveloperUrl }],
    creator: c.footerDeveloperName,
    publisher: c.brandName,
    alternates: {
      canonical,
      languages: { "fa-IR": canonical },
    },
    openGraph: {
      type: "website",
      locale: "fa_IR",
      url: canonical,
      siteName: c.brandName,
      title: c.ogTitle || c.seoTitle,
      description: c.ogDescription || c.seoDescription,
      images: [
        {
          url: c.ogImageUrl.startsWith("http") ? c.ogImageUrl : `${canonical}${c.ogImageUrl}`,
          width: 1200,
          height: 630,
          alt: `${c.brandName} — نرم افزار حسابداری`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: c.twitterTitle || c.seoTitle,
      description: c.twitterDescription || c.seoDescription,
      images: [c.ogImageUrl.startsWith("http") ? c.ogImageUrl : `${canonical}${c.ogImageUrl}`],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 },
    },
    other: c.googleSiteVerification
      ? { "google-site-verification": c.googleSiteVerification }
      : undefined,
  };
}

export default async function HomePage() {
  const content = await getMarketingContent();
  return (
    <>
      <MarketingJsonLd content={content} />
      <LandingPage content={content} />
    </>
  );
}
