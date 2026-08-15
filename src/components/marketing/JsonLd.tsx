import type { MarketingContent } from "@/lib/marketing/types";

export function MarketingJsonLd({ content: c }: { content: MarketingContent }) {
  const org = {
    "@type": "Organization",
    name: c.brandName,
    url: c.siteUrl,
    logo: `${c.siteUrl}${c.logoUrl.startsWith("http") ? "" : c.logoUrl}`,
    email: c.contactEmail || undefined,
    telephone: c.contactPhone || undefined,
    sameAs: [c.footerDeveloperUrl].filter(Boolean),
  };

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: c.brandName,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    inLanguage: "fa",
    description: c.seoDescription,
    url: c.siteUrl,
    image: `${c.siteUrl}${c.ogImageUrl.startsWith("http") ? "" : c.ogImageUrl}`,
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "IRR",
      description: "درخواست مشاوره و مشاهده دمو",
    },
    featureList: c.features.map((f) => f.title),
    provider: org,
  };

  const product = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `نرم افزار حسابداری ${c.brandName}`,
    description: c.seoDescription,
    brand: { "@type": "Brand", name: c.brandName },
    image: `${c.siteUrl}${c.logoUrl.startsWith("http") ? "" : c.logoUrl}`,
    url: c.siteUrl,
    category: "نرم افزار حسابداری",
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: c.brandName,
    url: c.siteUrl,
    inLanguage: "fa-IR",
    potentialAction: {
      "@type": "SearchAction",
      target: `${c.siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "خانه",
        item: c.siteUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "دموی نرم‌افزار",
        item: `${c.siteUrl}/demo`,
      },
    ],
  };

  const faq = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: c.faqs.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  const graphs = [software, product, website, breadcrumb, faq, { "@context": "https://schema.org", ...org }];

  return (
    <>
      {graphs.map((data, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
        />
      ))}
    </>
  );
}
