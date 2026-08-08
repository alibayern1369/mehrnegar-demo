"use client";

import { useState } from "react";
import { Glass, SectionTitle, Btn, Badge, Toggle, Progress, Input, Field } from "../ui";
import { I } from "../icons";
import { products } from "@/lib/data";
import { faNumber, toman, faTime } from "@/lib/format";
import { useApp } from "../context";

type Step = { label: string; status: "wait" | "run" | "done" };

function SyncEngine({ steps, onDone }: { steps: string[]; onDone: () => void }) {
  const { online, toast } = useApp();
  const [state, setState] = useState<Step[]>(steps.map((label) => ({ label, status: "wait" })));
  const [running, setRunning] = useState(false);

  const run = () => {
    if (!online) return toast("اتصال اینترنت برقرار نیست — تغییرات در صف آفلاین ذخیره شد", "error");
    setRunning(true);
    setState(steps.map((label) => ({ label, status: "wait" })));
    steps.forEach((_, i) => {
      setTimeout(() => setState((s) => s.map((x, j) => j === i ? { ...x, status: "run" } : x)), i * 900);
      setTimeout(() => setState((s) => s.map((x, j) => j === i ? { ...x, status: "done" } : x)), i * 900 + 800);
    });
    setTimeout(() => { setRunning(false); onDone(); }, steps.length * 900 + 200);
  };

  const doneCount = state.filter((s) => s.status === "done").length;

  return (
    <Glass className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-bold text-strong">پیشرفت همگام‌سازی</h3>
        <Btn onClick={run} disabled={running}>{running ? <I.refresh className="anim-spin-slow" /> : <I.refresh width={16} />} {running ? "در حال همگام‌سازی..." : "همگام‌سازی دستی"}</Btn>
      </div>
      <Progress value={(doneCount / steps.length) * 100} tone="brand" />
      <div className="mt-4 space-y-2">
        {state.map((s, i) => (
          <div key={i} className="flex items-center justify-between rounded-xl glass-2 px-4 py-2.5">
            <span className="flex items-center gap-3 text-sm text-strong">
              <span className={`grid h-6 w-6 place-items-center rounded-full text-xs ${s.status === "done" ? "bg-emerald-500 text-white" : s.status === "run" ? "grad-brand text-white" : "glass-2 text-muted"}`}>
                {s.status === "done" ? <I.check width={14} /> : s.status === "run" ? <I.refresh width={12} className="anim-spin-slow" /> : faNumber(i + 1)}
              </span>
              {s.label}
            </span>
            <Badge tone={s.status === "done" ? "green" : s.status === "run" ? "brand" : "gray"}>
              {s.status === "done" ? "تکمیل" : s.status === "run" ? "در حال اجرا" : "در انتظار"}
            </Badge>
          </div>
        ))}
      </div>
    </Glass>
  );
}

export function WooSync() {
  const { toast, pendingSync } = useApp();
  const [auto, setAuto] = useState(true);
  return (
    <div>
      <SectionTitle icon={<I.globe />} title="همگام‌سازی وب‌سایت (ووکامرس)" sub="اتصال به فروشگاه وردپرس / WooCommerce" />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <SyncEngine steps={["دریافت محصولات از وب‌سایت", "بارگذاری محصولات جدید", "به‌روزرسانی موجودی", "به‌روزرسانی قیمت‌ها", "دریافت سفارش‌های جدید", "حل تعارض‌ها و ثبت تغییرات"]} onDone={() => toast("همگام‌سازی ووکامرس با موفقیت انجام شد")} />
          <Glass className="p-5">
            <h3 className="mb-4 font-bold text-strong">تعارض‌های نیازمند بررسی</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 px-4 py-3">
                <div><p className="text-sm font-semibold text-strong">گلکسی A55</p><p className="text-xs text-muted">موجودی محلی: ۸ • موجودی سایت: ۶</p></div>
                <div className="flex gap-2"><Btn variant="soft" onClick={() => toast("مقدار محلی اعمال شد")}>محلی</Btn><Btn variant="ghost" onClick={() => toast("مقدار سایت اعمال شد")}>سایت</Btn></div>
              </div>
              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 px-4 py-3">
                <div><p className="text-sm font-semibold text-strong">پاوربانک انکر</p><p className="text-xs text-muted">قیمت محلی: ۱٬۸۹۰٬۰۰۰ • سایت: ۱٬۹۵۰٬۰۰۰</p></div>
                <div className="flex gap-2"><Btn variant="soft" onClick={() => toast("مقدار محلی اعمال شد")}>محلی</Btn><Btn variant="ghost" onClick={() => toast("مقدار سایت اعمال شد")}>سایت</Btn></div>
              </div>
            </div>
          </Glass>
        </div>

        <div className="space-y-5">
          <Glass className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-strong">وضعیت اتصال</h3><Badge tone="green"><span className="h-2 w-2 rounded-full bg-emerald-500" /> متصل</Badge>
            </div>
            <div className="space-y-3">
              <Field label="آدرس فروشگاه"><Input defaultValue="shop.mehrnegar.ir" dir="ltr" className="text-left" /></Field>
              <Field label="کلید مصرف‌کننده (Consumer Key)"><Input defaultValue="ck_••••••••••42a9" dir="ltr" className="text-left" /></Field>
              <div className="flex items-center justify-between rounded-2xl glass-2 px-4 py-3">
                <span className="text-sm text-strong">همگام‌سازی خودکار</span><Toggle on={auto} onChange={setAuto} />
              </div>
            </div>
          </Glass>
          <Glass className="p-5">
            <h3 className="mb-3 font-bold text-strong">صف آفلاین</h3>
            <p className="text-sm text-muted">تغییرات در انتظار ارسال: <span className="font-bold text-strong">{faNumber(pendingSync)}</span></p>
            <div className="mt-3 grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl glass-2 p-3"><p className="text-lg font-extrabold grad-text">{faNumber(45)}</p><p className="text-xs text-muted">محصول سایت</p></div>
              <div className="rounded-2xl glass-2 p-3"><p className="text-lg font-extrabold text-strong">{faTime()}</p><p className="text-xs text-muted">آخرین همگام‌سازی</p></div>
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
}

export function DigiKala() {
  const { toast } = useApp();
  const [auto, setAuto] = useState(false);
  const dkProducts = products.filter((p) => p.digikalaStock > 0);
  return (
    <div>
      <SectionTitle icon={<I.bag />} title="مدیریت دیجی‌کالا" sub="تخصیص موجودی و همگام‌سازی فروشگاه دیجی‌کالا" />
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          <SyncEngine steps={["احراز هویت فروشنده دیجی‌کالا", "همگام‌سازی موجودی اختصاصی", "به‌روزرسانی قیمت‌ها", "دریافت سفارش‌های دیجی‌کالا", "ثبت تغییرات"]} onDone={() => toast("همگام‌سازی دیجی‌کالا با موفقیت انجام شد")} />
          <Glass className="p-5">
            <h3 className="mb-4 font-bold text-strong">موجودی اختصاصی دیجی‌کالا</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-muted"><th className="p-2.5 text-right font-medium">محصول</th><th className="p-2.5 text-center font-medium">موجودی دیجی‌کالا</th><th className="p-2.5 text-right font-medium">قیمت</th><th className="p-2.5 text-center font-medium">وضعیت</th></tr></thead>
                <tbody>
                  {dkProducts.map((p) => (
                    <tr key={p.id} className="border-t border-white/8 hover:bg-white/5">
                      <td className="p-2.5 font-medium text-strong"><span className="ml-2">{p.emoji}</span>{p.name.split(" ").slice(0, 3).join(" ")}</td>
                      <td className="p-2.5 text-center font-bold grad-text">{faNumber(p.digikalaStock)}</td>
                      <td className="p-2.5 text-muted">{toman(p.sellingPrice)}</td>
                      <td className="p-2.5 text-center"><Badge tone="green">فعال</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Glass>
        </div>
        <div className="space-y-5">
          <Glass className="p-5">
            <div className="mb-4 flex items-center justify-between"><h3 className="font-bold text-strong">وضعیت اتصال</h3><Badge tone="green"><span className="h-2 w-2 rounded-full bg-emerald-500" /> متصل</Badge></div>
            <div className="space-y-3">
              <Field label="شناسه فروشنده"><Input defaultValue="MEHR-DK-8842" dir="ltr" className="text-left" /></Field>
              <Field label="توکن API"><Input defaultValue="dk_••••••••a17b" dir="ltr" className="text-left" /></Field>
              <div className="flex items-center justify-between rounded-2xl glass-2 px-4 py-3"><span className="text-sm text-strong">همگام‌سازی خودکار</span><Toggle on={auto} onChange={setAuto} /></div>
            </div>
          </Glass>
          <Glass className="p-5">
            <h3 className="mb-3 font-bold text-strong">آمار دیجی‌کالا</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="rounded-2xl glass-2 p-3"><p className="text-lg font-extrabold grad-text">{faNumber(31)}</p><p className="text-xs text-muted">کل موجودی</p></div>
              <div className="rounded-2xl glass-2 p-3"><p className="text-lg font-extrabold text-strong">{faNumber(2)}</p><p className="text-xs text-muted">سفارش امروز</p></div>
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
}
