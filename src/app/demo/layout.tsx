import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "دموی نرم‌افزار مهرنگار | حسابداری و مدیریت فروش",
  description:
    "نسخه نمایشی نرم‌افزار حسابداری مهرنگار — مدیریت فروش، موجودی، مشتریان و گزارش‌ها را به‌صورت زنده تجربه کنید.",
  robots: { index: false, follow: true },
};

export default function DemoLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
