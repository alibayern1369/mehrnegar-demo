"use client";

import type { SampleProduct } from "@/lib/data";
import { warehouses } from "@/lib/data";
import { toman, faNumber, toFa } from "@/lib/format";
import { Badge, Btn, Progress } from "./ui";
import { Barcode, QR } from "./barcode";
import { I } from "./icons";
import { useApp } from "./context";

const statusInfo = {
  active: { tone: "green", label: "موجود" },
  low: { tone: "amber", label: "موجودی کم" },
  out: { tone: "red", label: "ناموجود" },
} as const;

export function ProductCard({ p, onAction }: { p: SampleProduct; onAction?: (a: string) => void }) {
  const { toast } = useApp();
  const totalWh = Object.values(p.warehouseStock).reduce((a, b) => a + b, 0);
  const total = totalWh + p.webStock + p.digikalaStock;
  const si = statusInfo[p.status];
  const act = (label: string, msg: string) => { onAction?.(label); toast(msg); };

  return (
    <div className="anim-scale-in">
      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        {/* Left: visual + identity */}
        <div className="space-y-4">
          <div className="relative grid h-52 place-items-center overflow-hidden rounded-3xl" style={{ background: "linear-gradient(140deg, rgba(124,77,255,0.25), rgba(6,182,212,0.18))" }}>
            <span className="text-8xl anim-float">{p.emoji}</span>
            <div className="absolute right-4 top-4"><Badge tone={si.tone}>{si.label}</Badge></div>
            <div className="absolute left-4 top-4"><Badge tone="gray">{p.category}</Badge></div>
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-strong">{p.name}</h2>
            <p className="mt-1 text-sm text-muted">{p.brand} • کد محصول: <span dir="ltr">{p.sku}</span></p>
          </div>
          <div className="flex items-center gap-4 rounded-2xl glass-2 p-4">
            <Barcode value={p.barcode} />
            <div className="h-12 w-px bg-white/10" />
            <QR value={p.barcode} />
          </div>
        </div>

        {/* Right: data */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl glass-2 p-3">
              <p className="text-xs text-muted">قیمت خرید</p>
              <p className="mt-1 font-bold text-strong">{toman(p.purchasePrice)}</p>
            </div>
            <div className="rounded-2xl glass-2 p-3">
              <p className="text-xs text-muted">قیمت فروش</p>
              <p className="mt-1 font-bold grad-text">{toman(p.sellingPrice)}</p>
            </div>
          </div>

          <div className="rounded-2xl glass-2 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-strong">موجودی کل</span>
              <span className="text-lg font-extrabold grad-text">{faNumber(total)}</span>
            </div>
            <div className="space-y-2.5">
              {warehouses.map((w) => {
                const v = p.warehouseStock[w.id] ?? 0;
                return (
                  <div key={w.id}>
                    <div className="mb-1 flex justify-between text-xs"><span className="text-muted">{w.name}</span><span className="font-bold text-strong">{faNumber(v)}</span></div>
                    <Progress value={total ? (v / total) * 100 : 0} tone="brand" />
                  </div>
                );
              })}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="rounded-xl bg-sky-500/10 p-2 text-center"><p className="text-xs text-muted">وب‌سایت</p><p className="font-bold text-sky-500">{faNumber(p.webStock)}</p></div>
                <div className="rounded-xl bg-rose-500/10 p-2 text-center"><p className="text-xs text-muted">دیجی‌کالا</p><p className="font-bold text-rose-500">{faNumber(p.digikalaStock)}</p></div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-2xl glass-2 p-4 text-sm">
            <div className="flex justify-between"><span className="text-muted">تأمین‌کننده</span><span className="font-medium text-strong">{p.supplier}</span></div>
            <div className="flex justify-between"><span className="text-muted">رنگ</span><span className="font-medium text-strong">{p.color}</span></div>
            <div className="flex justify-between"><span className="text-muted">آخرین فروش</span><span className="font-medium text-strong">{p.lastSale}</span></div>
            <div className="flex justify-between"><span className="text-muted">آخرین خرید</span><span className="font-medium text-strong">{p.lastPurchase}</span></div>
            <div className="flex justify-between"><span className="text-muted">مالیات</span><span className="font-medium text-strong">{toFa(p.tax)}٪</span></div>
            <div className="flex justify-between"><span className="text-muted">سایز</span><span className="font-medium text-strong">{p.size}</span></div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Btn onClick={() => act("فروش", "محصول به سبد فروش اضافه شد و موجودی کاهش یافت")}><I.cart width={16} /> فروش محصول</Btn>
        <Btn variant="soft" onClick={() => act("دریافت", "رسید ورود کالا ثبت شد")}><I.download width={16} /> دریافت موجودی</Btn>
        <Btn variant="soft" onClick={() => act("انتقال", "فرم انتقال بین انبار باز شد")}><I.warehouse width={16} /> انتقال</Btn>
        <Btn variant="ghost" onClick={() => act("ویرایش", "حالت ویرایش فعال شد")}><I.edit width={16} /> ویرایش</Btn>
        <Btn variant="ghost" onClick={() => act("چاپ", "برچسب محصول برای چاپ آماده شد")}><I.printer width={16} /> چاپ برچسب</Btn>
      </div>
    </div>
  );
}
