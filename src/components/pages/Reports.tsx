"use client";

import { useState } from "react";
import { Glass, SectionTitle, Btn, Badge } from "../ui";
import { I } from "../icons";
import { LineChart, BarChart, HBars, Donut } from "../charts";
import { products, users, salesTrend, monthlyRevenue, topCategories } from "@/lib/data";
import { toman, faNumber, tomanShort } from "@/lib/format";
import { useApp } from "../context";

const reportTabs = [
  { id: "sales", label: "فروش", icon: <I.bag width={16} /> },
  { id: "inventory", label: "موجودی", icon: <I.box width={16} /> },
  { id: "products", label: "محصولات", icon: <I.tag width={16} /> },
  { id: "staff", label: "کارکنان", icon: <I.users width={16} /> },
  { id: "channels", label: "کانال‌ها", icon: <I.globe width={16} /> },
];

const allReports = [
  "خلاصه فروش", "فروش امروز", "فروش ماهانه", "فروش سالانه", "درآمد", "سود",
  "پرفروش‌ترین محصولات", "کم‌فروش‌ترین محصولات", "دسته‌های برتر", "محصولات راکد",
  "موجودی کم", "اتمام موجودی", "ارزش موجودی", "مقایسه انبارها", "گزارش تأمین‌کنندگان",
  "گزارش مشتریان", "فعالیت روزانه", "گزارش هفتگی", "گزارش ماهانه", "عملکرد کاربران",
  "موفق‌ترین فروشنده", "ضعیف‌ترین فروشنده", "میانگین ارزش فاکتور", "سریع‌ترین فروش",
  "کندترین فروش", "کهنگی موجودی", "سودآورترین محصولات", "بیشترین مرجوعی",
  "فروش وب‌سایت", "فروش دیجی‌کالا", "انتقال انبارها",
];

export function Reports() {
  const { toast } = useApp();
  const [tab, setTab] = useState("sales");
  const best = [...products].sort((a, b) => b.sold30 - a.sold30).slice(0, 5).map((p) => ({ label: p.name.split(" ").slice(0, 2).join(" "), value: p.sold30 }));
  const sellers = users.filter((u) => u.sales > 0).sort((a, b) => b.sales - a.sales);

  return (
    <div>
      <SectionTitle icon={<I.chart />} title="مرکز گزارش‌گیری" sub="گزارش‌های تحلیلی و تعاملی کسب‌وکار"
        action={<div className="flex gap-2">
          <Btn variant="ghost" onClick={() => toast("فایل PDF آماده دانلود شد")}><I.download width={16} /> PDF</Btn>
          <Btn variant="ghost" onClick={() => toast("فایل اکسل آماده دانلود شد")}><I.download width={16} /> Excel</Btn>
          <Btn variant="soft" onClick={() => toast("ارسال به چاپگر")}><I.printer width={16} /> چاپ</Btn>
        </div>} />

      <div className="mb-5 flex flex-wrap gap-2">
        {reportTabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`press inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${tab === t.id ? "grad-brand text-white" : "glass-2 text-muted hover:text-strong"}`}>{t.icon}{t.label}</button>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {tab === "sales" && <>
          <Glass className="p-5 xl:col-span-2"><h3 className="mb-4 font-bold text-strong">روند فروش</h3><LineChart data={salesTrend} /></Glass>
          <Glass className="p-5">
            <h3 className="mb-4 font-bold text-strong">شاخص‌های کلیدی</h3>
            <div className="space-y-3">
              {[["درآمد ماه", toman(3120000000)], ["سود ناخالص", toman(842000000)], ["میانگین فاکتور", toman(12400000)], ["تعداد فاکتور", faNumber(251) + " فاکتور"]].map(([l, v]) => (
                <div key={l} className="flex items-center justify-between rounded-2xl glass-2 px-4 py-3"><span className="text-sm text-muted">{l}</span><span className="font-bold text-strong">{v}</span></div>
              ))}
            </div>
          </Glass>
          <Glass className="p-5 xl:col-span-3"><h3 className="mb-4 font-bold text-strong">درآمد ماهانه</h3><BarChart data={monthlyRevenue} /></Glass>
        </>}

        {tab === "inventory" && <>
          <Glass className="p-5"><h3 className="mb-4 font-bold text-strong">ارزش موجودی به تفکیک دسته</h3><Donut data={topCategories} /></Glass>
          <Glass className="p-5 xl:col-span-2">
            <h3 className="mb-4 font-bold text-strong">هشدارهای موجودی</h3>
            <div className="space-y-2">
              {products.filter((p) => p.status !== "active").map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-xl glass-2 px-4 py-3">
                  <span className="text-sm font-medium text-strong"><span className="ml-2">{p.emoji}</span>{p.name.split(" ").slice(0,3).join(" ")}</span>
                  <Badge tone={p.status === "out" ? "red" : "amber"}>{p.status === "out" ? "ناموجود" : "موجودی کم"}</Badge>
                </div>
              ))}
            </div>
          </Glass>
        </>}

        {tab === "products" && <>
          <Glass className="p-5"><h3 className="mb-4 font-bold text-strong">پرفروش‌ترین‌ها</h3><HBars data={best} color="#10b981" /></Glass>
          <Glass className="p-5 xl:col-span-2">
            <h3 className="mb-4 font-bold text-strong">سودآوری محصولات</h3>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-muted"><th className="p-2.5 text-right font-medium">محصول</th><th className="p-2.5 text-center font-medium">فروش ۳۰ روز</th><th className="p-2.5 text-right font-medium">سود واحد</th></tr></thead>
              <tbody>{products.map((p) => (<tr key={p.id} className="border-t border-white/8 hover:bg-white/5"><td className="p-2.5 font-medium text-strong">{p.name.split(" ").slice(0,3).join(" ")}</td><td className="p-2.5 text-center text-muted">{faNumber(p.sold30)}</td><td className="p-2.5 font-bold text-emerald-500">{tomanShort(p.sellingPrice - p.purchasePrice)} ت</td></tr>))}</tbody></table></div>
          </Glass>
        </>}

        {tab === "staff" && <Glass className="p-5 xl:col-span-3">
          <h3 className="mb-4 font-bold text-strong">عملکرد فروشندگان کامفی فیتس</h3>
          <div className="space-y-3">{sellers.map((u, i) => (
            <div key={u.id} className="flex items-center gap-4 rounded-2xl glass-2 px-4 py-3">
              <span className={`grid h-9 w-9 place-items-center rounded-xl font-bold ${i === 0 ? "grad-brand text-white" : "bg-white/10 text-strong"}`}>{faNumber(i + 1)}</span>
              <span className="text-2xl">{u.avatar}</span>
              <div className="flex-1"><p className="text-sm font-semibold text-strong">{u.name}</p><p className="text-xs text-muted">{u.role}</p></div>
              <span className="font-bold grad-text">{toman(u.sales)}</span>
              {i === 0 && <Badge tone="green">برترین فروشنده</Badge>}
              {i === sellers.length - 1 && <Badge tone="amber">نیازمند بهبود</Badge>}
            </div>
          ))}</div>
        </Glass>}

        {tab === "channels" && <>
          <Glass className="p-5"><h3 className="mb-4 font-bold text-strong">سهم کانال‌های فروش</h3><Donut data={[{label:"حضوری",value:52,color:"#7c4dff"},{label:"وب‌سایت",value:31,color:"#06b6d4"},{label:"دیجی‌کالا",value:17,color:"#f43f5e"}]} /></Glass>
          <Glass className="p-5 xl:col-span-2"><h3 className="mb-4 font-bold text-strong">مقایسه درآمد کانال‌ها</h3><HBars data={[{label:"فروش حضوری",value:1620},{label:"فروش وب‌سایت",value:968},{label:"فروش دیجی‌کالا",value:531}]} color="#7c4dff" /></Glass>
        </>}
      </div>

      <Glass className="mt-5 p-5">
        <h3 className="mb-4 font-bold text-strong">همه گزارش‌های موجود</h3>
        <div className="flex flex-wrap gap-2">
          {allReports.map((r) => (
            <button key={r} onClick={() => toast(`گزارش «${r}» در حال تولید است`)} className="press rounded-xl glass-2 px-3 py-2 text-xs text-muted transition hover:text-strong hover:bg-white/10">{r}</button>
          ))}
        </div>
      </Glass>
    </div>
  );
}
