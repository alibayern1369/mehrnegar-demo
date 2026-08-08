"use client";

import { useEffect, useState } from "react";
import { useApp } from "../context";
import { Glass } from "../ui";
import { I } from "../icons";
import { toman, faNumber, faDate, faTime } from "@/lib/format";
import { hasAnyProductPagePermission, hasAnyReportPermission, hasPermission } from "@/lib/permissions";

type NavFn = (page: string) => void;

// ─── Manager Overview ─────────────────────────────────────────────────────────
export function ManagerOverview({ navigate }: { navigate: NavFn }) {
  const { user } = useApp();

  const shortcuts = [
    { id: "create",     icon: "plus",      emoji: "📦", label: "ثبت محصول جدید",   sub: "اضافه کردن لباس یا کالا به سیستم",  color: "from-brand-500/30 to-brand-400/10",   border: "border-brand-400/30",  btn: "grad-brand"   },
    { id: "sell",       icon: "cart",      emoji: "🛍️", label: "ثبت فروش",         sub: "اسکن بارکد و صدور فاکتور فروش",     color: "from-emerald-500/30 to-emerald-400/10", border: "border-emerald-400/30", btn: "bg-emerald-500" },
    { id: "edit-order", icon: "edit",      emoji: "✏️", label: "ویرایش سفارش",     sub: "مرجوعی و تعویض با محاسبه بدهکار/بستانکار", color: "from-cyan-500/30 to-cyan-400/10", border: "border-cyan-400/30", btn: "bg-cyan-500" },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 text-center">
        <p className="text-4xl mb-3">👋</p>
        <h1 className="text-2xl font-extrabold text-strong">سلام، {user?.name}</h1>
        <p className="mt-1 text-muted">{faDate()} • {faTime()}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {shortcuts.map((s) => (
          <button key={s.id} onClick={() => navigate(s.id)}
            className={`press group relative overflow-hidden rounded-3xl border p-8 text-right transition hover:-translate-y-1 hover:shadow-2xl ${s.border}`}
            style={{ background: `linear-gradient(135deg, ${s.color.split(" ")[0].replace("from-","").replace(/\[.*\]/,"")})` }}>
            <div className={`absolute inset-0 bg-gradient-to-br ${s.color}`} />
            <div className="relative">
              <span className="text-5xl mb-4 block">{s.emoji}</span>
              <h3 className="text-xl font-extrabold text-strong mb-2">{s.label}</h3>
              <p className="text-sm text-muted leading-relaxed">{s.sub}</p>
            </div>
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Glass className="p-4 cursor-pointer hover-lift" onClick={() => navigate("reports")}>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-500/15 text-brand-500"><I.chart width={20} /></div>
            <div><p className="font-bold text-strong">گزارش‌ها</p><p className="text-xs text-muted">آمار فروش و موجودی</p></div>
            <I.arrow width={16} className="mr-auto rotate-180 text-muted" />
          </div>
        </Glass>
        <Glass className="p-4 cursor-pointer hover-lift" onClick={() => navigate("warehouses")}>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-cyan-500/15 text-cyan-500"><I.warehouse width={20} /></div>
            <div><p className="font-bold text-strong">مدیریت انبارها</p><p className="text-xs text-muted">موجودی و انتقال</p></div>
            <I.arrow width={16} className="mr-auto rotate-180 text-muted" />
          </div>
        </Glass>
        <Glass className="p-4 cursor-pointer hover-lift" onClick={() => navigate("stocktake")}>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-teal-500/15 text-teal-500"><I.layers width={20} /></div>
            <div><p className="font-bold text-strong">انبارگردانی</p><p className="text-xs text-muted">اظهار موجودی و مقایسه با سیستم</p></div>
            <I.arrow width={16} className="mr-auto rotate-180 text-muted" />
          </div>
        </Glass>
        <Glass className="p-4 cursor-pointer hover-lift" onClick={() => navigate("users")}>
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-emerald-500/15 text-emerald-500"><I.users width={20} /></div>
            <div><p className="font-bold text-strong">کاربران</p><p className="text-xs text-muted">مدیریت دسترسی‌ها</p></div>
            <I.arrow width={16} className="mr-auto rotate-180 text-muted" />
          </div>
        </Glass>
      </div>
    </div>
  );
}

// ─── User Overview ────────────────────────────────────────────────────────────
export function UserOverview({ navigate }: { navigate: NavFn }) {
  const { user, token } = useApp();
  const [data, setData] = useState<{ todayCount: number; todayTotal: number; invoices: { id: number; invoiceNumber: string; grandTotal: number | null; createdAt: string | Date | null }[] } | null>(null);

  useEffect(() => {
    if (!token || !hasPermission(user, "report_my_sales")) return;
    fetch("/api/reports?type=my_activity", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then((d) => d.ok && setData(d.data)).catch(() => {});
  }, [token, user]);

  const shortcuts = [
    { id: "create", permission: "create_product", emoji: "📦", label: "ثبت محصول", color: "from-brand-500 to-brand-600" },
    { id: "sell", permission: "sell", emoji: "🛍️", label: "ثبت فروش", color: "from-emerald-500 to-emerald-600" },
    { id: "edit-order", permission: "edit_order", emoji: "✏️", label: "ویرایش سفارش", color: "from-cyan-500 to-cyan-600" },
    { id: "return", permission: "return", emoji: "↩️", label: "مرجوعی", color: "from-amber-500 to-orange-600" },
    { id: "barcode-tracking", permission: "barcode_tracking", emoji: "🔎", label: "رهگیری بارکد", color: "from-sky-500 to-blue-600" },
  ].filter((item) => hasPermission(user, item.permission));

  const links = [
    { id: "products", label: "محصولات", show: hasAnyProductPagePermission(user) },
    { id: "reports", label: "گزارش‌ها", show: hasAnyReportPermission(user) },
    { id: "warehouses", label: "انبارها", show: hasPermission(user, "warehouses") },
    { id: "stocktake", label: "انبارگردانی", show: hasPermission(user, "stocktake") || hasPermission(user, "warehouses") },
    { id: "customers", label: "مشتریان", show: hasPermission(user, "customers") },
    { id: "reprint", label: "چاپ مجدد فاکتور", show: hasPermission(user, "reprint_invoice") },
    { id: "sms", label: "پیامک", show: hasPermission(user, "sms") },
  ].filter((item) => item.show);

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 text-center">
        <p className="text-3xl mb-2">👋</p>
        <h1 className="text-xl font-extrabold text-strong">سلام، {user?.name}</h1>
        <p className="text-sm text-muted">{faDate()}</p>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3">
        {shortcuts.map((s) => (
          <button key={s.id} onClick={() => navigate(s.id)}
            className={`press flex flex-col items-center justify-center gap-3 rounded-3xl p-6 text-white font-bold shadow-lg transition hover:-translate-y-1 bg-gradient-to-br ${s.color}`}>
            <span className="text-4xl">{s.emoji}</span>
            <span className="text-sm">{s.label}</span>
          </button>
        ))}
      </div>

      {!!links.length && (
        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          {links.map((item) => (
            <Glass key={item.id} className="cursor-pointer p-4 hover-lift" onClick={() => navigate(item.id)}>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-500/15 text-brand-500"><I.arrow width={17} className="rotate-180" /></span>
                <span className="text-sm font-bold text-strong">{item.label}</span>
              </div>
            </Glass>
          ))}
        </div>
      )}

      {hasPermission(user, "report_my_sales") && <Glass className="p-5">
        <h3 className="mb-4 font-bold text-strong flex items-center gap-2"><I.chart width={18} /> فروش‌های امروز من</h3>
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-2xl glass-2 p-4 text-center">
            <p className="text-2xl font-extrabold grad-text">{faNumber(data?.todayCount ?? 0)}</p>
            <p className="text-xs text-muted mt-1">فاکتور امروز</p>
          </div>
          <div className="rounded-2xl glass-2 p-4 text-center">
            <p className="text-xl font-extrabold text-strong">{toman(data?.todayTotal ?? 0)}</p>
            <p className="text-xs text-muted mt-1">مجموع فروش امروز</p>
          </div>
        </div>
        <div className="space-y-2">
          {(data?.invoices ?? []).slice(0, 5).map((inv) => (
            <div key={inv.id} className="flex items-center justify-between rounded-xl glass-2 px-4 py-2.5 text-sm">
              <span className="font-medium text-strong">{inv.invoiceNumber}</span>
              <span className="font-bold grad-text">{toman(inv.grandTotal ?? 0)}</span>
            </div>
          ))}
          {(!data?.invoices?.length) && <p className="text-center text-sm text-muted py-4">هنوز فروشی ثبت نشده</p>}
        </div>
        {hasPermission(user, "my_activity") && <button onClick={() => navigate("my-activity")} className="mt-3 w-full text-center text-sm text-brand-500 hover:underline">مشاهده همه فعالیت‌هایم</button>}
      </Glass>}
    </div>
  );
}
