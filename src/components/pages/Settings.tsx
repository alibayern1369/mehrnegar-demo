"use client";

import { useState } from "react";
import { Glass, SectionTitle, Btn, Badge, Toggle, Field, Input, Select, Progress } from "../ui";
import { I } from "../icons";
import { faDate, faTime } from "@/lib/format";
import { useApp } from "../context";

const tabs = [
  { id: "company", label: "اطلاعات شرکت", icon: <I.shield width={16} /> },
  { id: "pos", label: "کارت‌خوان و POS", icon: <I.cart width={16} /> },
  { id: "integration", label: "اتصالات", icon: <I.globe width={16} /> },
  { id: "backup", label: "پشتیبان‌گیری", icon: <I.database width={16} /> },
  { id: "appearance", label: "ظاهر و تم", icon: <I.sun width={16} /> },
];

export function Settings() {
  const { toast, theme, toggleTheme } = useApp();
  const [tab, setTab] = useState("company");
  const [backing, setBacking] = useState(false);
  const [progress, setProgress] = useState(0);

  const backup = () => {
    setBacking(true); setProgress(0);
    const t = setInterval(() => setProgress((p) => { if (p >= 100) { clearInterval(t); setBacking(false); toast("پشتیبان کامل با موفقیت ساخته شد"); return 100; } return p + 10; }), 120);
  };

  return (
    <div>
      <SectionTitle icon={<I.settings />} title="تنظیمات" sub="پیکربندی کامل سامانه مهرنگار" />

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`press inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-sm font-semibold transition ${tab === t.id ? "grad-brand text-white" : "glass-2 text-muted hover:text-strong"}`}>{t.icon}{t.label}</button>
        ))}
      </div>

      {tab === "company" && (
        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          <Glass className="p-6">
            <h3 className="mb-4 font-bold text-strong">اطلاعات شرکت</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="نام شرکت"><Input defaultValue="فروشگاه پوشاک کامفی فیتس" /></Field>
              <Field label="شماره اقتصادی"><Input defaultValue="۱۴۰۱۸۸۲۲۱۴" dir="ltr" className="text-left" /></Field>
              <Field label="تلفن"><Input defaultValue="۰۲۱-۸۸۲۳۴۵۶۷" dir="ltr" className="text-left" /></Field>
              <Field label="واحد پول"><Select><option>تومان</option><option>ریال</option></Select></Field>
              <Field label="نرخ مالیات بر ارزش افزوده (٪)"><Input defaultValue="۹" /></Field>
              <Field label="شعبه اصلی"><Input defaultValue="مشهد - مرکزی" /></Field>
            </div>
            <Btn className="mt-5" onClick={() => toast("اطلاعات شرکت ذخیره شد")}><I.check width={16} /> ذخیره تغییرات</Btn>
          </Glass>
          <Glass className="p-6 text-center">
            <h3 className="mb-4 font-bold text-strong">لوگوی شرکت</h3>
            <div className="mx-auto grid h-32 w-32 place-items-center rounded-3xl grad-brand text-3xl font-black text-white shadow-xl shadow-brand-500/30">CF</div>
            <Btn variant="ghost" className="mt-4 w-full" onClick={() => toast("انتخاب فایل لوگو")}><I.upload width={16} /> بارگذاری لوگو</Btn>
          </Glass>
        </div>
      )}

      {tab === "pos" && (
        <Glass className="p-6">
          <h3 className="mb-2 font-bold text-strong">یکپارچه‌سازی دستگاه کارت‌خوان (POS)</h3>
          <p className="mb-5 text-sm text-muted">معماری نرم‌افزار از انتقال خودکار مبلغ قابل پرداخت به دستگاه‌های کارت‌خوان پشتیبانی می‌کند.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="مدل دستگاه"><Select><option>پکس A920</option><option>سامان کیش S90</option><option>پارسیان P3</option></Select></Field>
            <Field label="درگاه اتصال"><Select><option>USB</option><option>شبکه (LAN)</option><option>بلوتوث</option></Select></Field>
            <Field label="کد پایانه"><Input defaultValue="۸۸۴۲۰۰۱۵" dir="ltr" className="text-left" /></Field>
            <Field label="حساب تسویه"><Input defaultValue="IR۳۲۰۱۲۰۰۰..." dir="ltr" className="text-left" /></Field>
          </div>
          <div className="mt-4 flex items-center justify-between rounded-2xl glass-2 px-4 py-3">
            <span className="text-sm text-strong">ارسال خودکار مبلغ فاکتور به کارت‌خوان</span><Toggle on onChange={() => {}} />
          </div>
          <div className="mt-3 flex gap-2">
            <Btn onClick={() => toast("اتصال با دستگاه کارت‌خوان برقرار شد")}><I.refresh width={16} /> تست اتصال</Btn>
            <Badge tone="green" className="self-center"><span className="h-2 w-2 rounded-full bg-emerald-500" /> دستگاه آماده</Badge>
          </div>
        </Glass>
      )}

      {tab === "integration" && (
        <div className="grid gap-4 sm:grid-cols-2">
          {[["ووکامرس / وردپرس", "🌐", "متصل", "green"], ["دیجی‌کالا", "🛍️", "متصل", "green"], ["پنل پیامک", "✉️", "متصل", "green"], ["درگاه پرداخت", "💳", "غیرفعال", "amber"]].map(([n, e, s, t]) => (
            <Glass key={n} className="flex items-center justify-between p-5">
              <div className="flex items-center gap-3"><span className="text-3xl">{e}</span><span className="font-bold text-strong">{n}</span></div>
              <Badge tone={t as string}>{s}</Badge>
            </Glass>
          ))}
        </div>
      )}

      {tab === "backup" && (
        <div className="grid gap-5 lg:grid-cols-2">
          <Glass className="p-6">
            <h3 className="mb-2 font-bold text-strong">پشتیبان‌گیری</h3>
            <p className="mb-4 text-sm text-muted">آخرین پشتیبان: {faDate()} ساعت {faTime()}</p>
            {backing && <Progress value={progress} />}
            <div className="mt-4 flex gap-2">
              <Btn onClick={backup} disabled={backing}>{backing ? <I.refresh className="anim-spin-slow" /> : <I.database width={16} />} پشتیبان فوری</Btn>
              <Btn variant="ghost" onClick={() => toast("بازیابی از فایل پشتیبان")}><I.upload width={16} /> بازیابی</Btn>
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl glass-2 px-4 py-3">
              <span className="text-sm text-strong">پشتیبان‌گیری خودکار روزانه</span><Toggle on onChange={() => {}} />
            </div>
          </Glass>
          <Glass className="p-6">
            <h3 className="mb-4 font-bold text-strong">وضعیت پایگاه داده</h3>
            <div className="space-y-3">
              {[["نوع", "محلی (PostgreSQL)"], ["حجم", "۱۲۴ مگابایت"], ["جداول", "۱۸ جدول"], ["وضعیت", "سالم"]].map(([l, v]) => (
                <div key={l} className="flex justify-between rounded-2xl glass-2 px-4 py-3 text-sm"><span className="text-muted">{l}</span><span className="font-bold text-strong">{v}</span></div>
              ))}
            </div>
          </Glass>
        </div>
      )}

      {tab === "appearance" && (
        <Glass className="p-6">
          <h3 className="mb-4 font-bold text-strong">ظاهر برنامه</h3>
          <div className="flex items-center justify-between rounded-2xl glass-2 px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-strong">{theme === "dark" ? <I.moon width={18} /> : <I.sun width={18} />} حالت {theme === "dark" ? "تیره" : "روشن"}</span>
            <Toggle on={theme === "dark"} onChange={toggleTheme} />
          </div>
          <p className="mb-2 mt-5 text-sm font-medium text-muted">رنگ اصلی برنامه</p>
          <div className="flex gap-3">
            {["#7c4dff", "#06b6d4", "#10b981", "#f43f5e", "#f59e0b"].map((c) => (
              <button key={c} onClick={() => toast("تم رنگی تغییر کرد")} className="press h-12 w-12 rounded-2xl ring-2 ring-white/20" style={{ background: c }} />
            ))}
          </div>
        </Glass>
      )}
    </div>
  );
}
