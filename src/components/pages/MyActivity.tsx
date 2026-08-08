"use client";

import { useState, useEffect } from "react";
import { Glass, SectionTitle, Badge } from "../ui";
import { I } from "../icons";
import { useApp } from "../context";
import { toman, faNumber } from "@/lib/format";

export function MyActivity() {
  const { token, user } = useApp();
  const [data, setData] = useState<{
    invoices: { id: number; invoiceNumber: string; grandTotal: number | null; createdAt: string | Date | null }[];
    returns:  { id: number; returnId: string; productName: string; quantity: number; createdAt: string | Date | null }[];
    products: { id: number; name: string; barcode: string; createdAt: string | Date | null }[];
    todayCount: number; todayTotal: number;
  } | null>(null);

  useEffect(() => {
    if (!token) return;
    fetch("/api/reports?type=my_activity", { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(d => d.ok && setData(d.data)).catch(() => {});
  }, [token]);

  return (
    <div>
      <SectionTitle icon={<I.chart />} title="فعالیت‌های من" sub={`فقط عملیات‌های ثبت‌شده توسط ${user?.name}`} />

      <div className="grid gap-4 sm:grid-cols-3 mb-5">
        {[
          { label: "فاکتور امروز",        value: faNumber(data?.todayCount ?? 0),              tone: "brand" },
          { label: "فروش امروز",          value: toman(data?.todayTotal ?? 0),                  tone: "green" },
          { label: "کل فاکتورهای من",     value: faNumber(data?.invoices?.length ?? 0) + " فاکتور", tone: "sky" },
        ].map((s) => (
          <Glass key={s.label} className="p-5">
            <p className="text-2xl font-extrabold text-strong">{s.value}</p>
            <p className="text-sm text-muted mt-1">{s.label}</p>
          </Glass>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Glass className="p-5">
          <h3 className="mb-4 font-bold text-strong flex items-center gap-2"><I.cart width={18} /> فاکتورهای من</h3>
          <div className="space-y-2">
            {(data?.invoices ?? []).map((inv) => (
              <div key={inv.id} className="flex justify-between rounded-xl glass-2 px-4 py-2.5 text-sm">
                <span className="font-mono text-xs text-brand-400">{inv.invoiceNumber}</span>
                <span className="font-bold grad-text">{toman(inv.grandTotal ?? 0)}</span>
              </div>
            ))}
            {!data?.invoices?.length && <p className="text-center text-sm text-muted py-6">فاکتوری ثبت نشده</p>}
          </div>
        </Glass>

        <Glass className="p-5">
          <h3 className="mb-4 font-bold text-strong flex items-center gap-2"><I.refresh width={18} /> مرجوعی‌های من</h3>
          <div className="space-y-2">
            {(data?.returns ?? []).map((r) => (
              <div key={r.id} className="flex justify-between rounded-xl glass-2 px-4 py-2.5 text-sm">
                <span className="text-strong">{r.productName}</span>
                <Badge tone="amber">{faNumber(r.quantity)} عدد</Badge>
              </div>
            ))}
            {!data?.returns?.length && <p className="text-center text-sm text-muted py-6">مرجوعی ثبت نشده</p>}
          </div>
        </Glass>

        <Glass className="p-5 lg:col-span-2">
          <h3 className="mb-4 font-bold text-strong flex items-center gap-2"><I.box width={18} /> محصولات ایجادشده توسط من</h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {(data?.products ?? []).map((p) => (
              <div key={p.id} className="flex items-center gap-3 rounded-xl glass-2 px-4 py-2.5">
                <span className="text-xl">👗</span>
                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-strong truncate">{p.name}</p><p className="text-xs text-muted" dir="ltr">{p.barcode}</p></div>
              </div>
            ))}
            {!data?.products?.length && <p className="col-span-2 text-center text-sm text-muted py-6">محصولی ایجاد نشده</p>}
          </div>
        </Glass>
      </div>
    </div>
  );
}
