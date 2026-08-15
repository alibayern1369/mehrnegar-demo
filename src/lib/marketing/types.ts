export type MarketingFeature = {
  id: string;
  title: string;
  description: string;
  icon: string;
};

export type MarketingBenefit = {
  id: string;
  title: string;
  description: string;
};

export type MarketingFaq = {
  id: string;
  question: string;
  answer: string;
};

export type MarketingStep = {
  id: string;
  title: string;
  description: string;
};

export type MarketingAudience = {
  id: string;
  title: string;
  description: string;
};

export type MarketingScreenshot = {
  id: string;
  src: string;
  alt: string;
  caption: string;
  demoLabel?: string;
};

export type MarketingContent = {
  siteUrl: string;
  brandName: string;
  logoUrl: string;
  faviconUrl: string;
  ogImageUrl: string;

  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryCtaText: string;
  primaryCtaHref: string;
  secondaryCtaText: string;
  secondaryCtaHref: string;

  aboutTitle: string;
  aboutBody: string;
  aboutAudienceTitle: string;
  aboutAudienceBody: string;

  screenshotsTitle: string;
  screenshotsSubtitle: string;
  screenshots: MarketingScreenshot[];

  featuresTitle: string;
  featuresSubtitle: string;
  features: MarketingFeature[];

  benefitsTitle: string;
  benefitsSubtitle: string;
  benefits: MarketingBenefit[];

  howTitle: string;
  howSubtitle: string;
  steps: MarketingStep[];

  audienceTitle: string;
  audienceSubtitle: string;
  audiences: MarketingAudience[];

  faqTitle: string;
  faqSubtitle: string;
  faqs: MarketingFaq[];

  finalCtaTitle: string;
  finalCtaSubtitle: string;
  finalCtaPrimaryText: string;
  finalCtaSecondaryText: string;

  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  contactAddress: string;
  contactWhatsapp: string;

  footerTagline: string;
  footerDeveloperName: string;
  footerDeveloperUrl: string;
  footerCopyright: string;

  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;

  googleSiteVerification: string;
  recaptchaSiteKey: string;
  recaptchaSecretKey: string;
};
