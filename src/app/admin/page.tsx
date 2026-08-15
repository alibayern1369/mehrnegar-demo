import type { Metadata } from "next";
import { AdminPanel } from "@/components/marketing/admin/AdminPanel";

export const metadata: Metadata = {
  title: "مدیریت محتوای لندینگ",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminPanel />;
}
