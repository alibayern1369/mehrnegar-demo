import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { getMarketingContent } from "@/lib/marketing/store";

const fallbackTitle = "مهرنگار | نرم افزار حسابداری مهرنگار";
const fallbackDescription =
  "مهرنگار؛ نرم افزار حسابداری و مدیریت کسب و کار برای فروش، موجودی، مشتریان و گزارش‌های حرفه‌ای.";

export async function generateMetadata(): Promise<Metadata> {
  const c = await getMarketingContent().catch(() => null);
  const verification = c?.googleSiteVerification || process.env.GOOGLE_SITE_VERIFICATION || "";

  return {
    metadataBase: new URL(
      (c?.siteUrl || process.env.NEXT_PUBLIC_SITE_URL || "https://mehrnegar.ir").replace(/\/$/, ""),
    ),
    title: {
      default: c?.seoTitle || fallbackTitle,
      template: `%s | ${c?.brandName || "مهرنگار"}`,
    },
    description: c?.seoDescription || fallbackDescription,
    applicationName: c?.brandName || "مهرنگار",
    appleWebApp: {
      capable: true,
      title: c?.brandName || "مهرنگار",
      statusBarStyle: "default",
    },
    formatDetection: { telephone: false },
    icons: {
      icon: [{ url: c?.faviconUrl || "/icon", sizes: "512x512", type: "image/png" }],
      apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
      shortcut: c?.faviconUrl || "/icon",
    },
    verification: verification ? { google: verification } : undefined,
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f7fb",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
