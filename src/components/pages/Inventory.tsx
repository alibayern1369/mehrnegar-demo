"use client";

import { useState } from "react";
import { Glass, SectionTitle, Btn, Badge } from "../ui";
import { I } from "../icons";
import { products, warehouses, movements } from "@/lib/data";
import { faNumber } from "@/lib/format";
import { useApp } from "../context";

const typeTone: Record<string, string> = {
  "خرید": "green", "فروش": "sky", "مرجوعی": "amber", "انتقال انبار": "brand", "اصلاح": "red", "ویرایش دستی": "gray",
};

export function Inventory() {
  const { toast } = useApp();
  const [sel, setSel] = useState(products[0].id);
  const p = products.find((x) => x.id === sel)!;
  const [alloc, setAlloc] = useState({ wh: 0, web: p.webStock, dk: p.digikalaStock });

  const whTotal = Object.values(p.warehouseStock).reduce((a, b) => a + b, 0);
  const total = whTotal + alloc.web + alloc.dk;
  const remaining = whTotal - alloc.web - alloc.dk;

  const pick = (id: number) => {
    const np = products.find((x) => x.id === id)!;
    setSel(id);
    setAlloc({ wh: 0, web: np.webStock, dk: np.digikalaStock });
  };

  const Stepper = ({ label, val, set, tone }: { label: string; val: number; set: (n: number) => void; tone: string }) => (
    <div className="rounded-2xl glass-2 p-4">
      <p className="mb-2 text-sm font-medium text-muted">{label}</p>
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => set(Math.max(0, val - 1))} className="press grid h-9 w-9 place-items-center rounded-xl glass-2 text-strong hover:bg-white/10">−</button>
        <span className={`text-2xl font-extrabold ${tone}`}>{faNumber(val)}</span>
        <button onClick={() => set(val + 1)} className="press grid h-9 w-9 place-items-center rounded-xl grad-brand text-white">+</button>
      </div>
    </div>
  );

  return (
    <div>
      <SectionTitle icon={<I.layers />} title="تخصیص موجودی" sub="موجودی هر محصول را میان انبار، وب‌سایت و دیجی‌کالا تقسیم کنید" />

      <div className="grid gap-5 lg:grid-cols-[300px_1fr]">
        <Glass className="max-h-[560px] overflow-y-auto p-3">
          {products.map((x) => (
            <button key={x.id} onClick={() => pick(x.id)} className={`press mb-1 flex w-full items-center gap-3 rounded-2xl p-3 text-right transition ${sel === x.id ? "grad-brand text-white" : "hover:bg-white/8 text-strong"}`}>
              <span className="text-2xl">{x.emoji}</span>
              <span className="flex-1 truncate text-sm font-medium">{x.name.split(" ").slice(0, 3).join(" ")}</span>
            </button>
          ))}
        </Glass>

        <div className="space-y-5">
          <Glass className="p-6">
            <div className="mb-5 flex items-center gap-4">
              <div className="grid h-16 w-16 place-items-center rounded-2xl text-4xl" style={{ background: "linear-gradient(140deg, rgba(124,77,255,0.2), rgba(6,182,212,0.12))" }}>{p.emoji}</div>
              <div>
                <h3 className="font-bold text-strong">{p.name}</h3>
                <p className="text-sm text-muted">موجودی فیزیکی انبارها: <span className="font-bold text-strong">{faNumber(whTotal)}</span></p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <Stepper label="سهم وب‌سایت" val={alloc.web} set={(n) => setAlloc({ ...alloc, web: n })} tone="text-sky-500" />
              <Stepper label="سهم دیجی‌کالا" val={alloc.dk} set={(n) => setAlloc({ ...alloc, dk: n })} tone="text-rose-500" />
              <div className="rounded-2xl glass-2 p-4 text-center">
                <p className="mb-2 text-sm font-medium text-muted">باقی‌مانده انبار</p>
                <p className={`text-2xl font-extrabold ${remaining < 0 ? "text-rose-500" : "text-emerald-500"}`}>{faNumber(remaining)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-brand-500/10 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted">موجودی کل قابل فروش</span>
                <span className="text-lg font-extrabold grad-text">{faNumber(total)}</span>
              </div>
              <div className="mt-3 flex gap-2 text-xs">
                {warehouses.map((w) => (
                  <Badge key={w.id} tone="gray">{w.name}: {faNumber(p.warehouseStock[w.id] ?? 0)}</Badge>
                ))}
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => pick(p.id)}>بازنشانی</Btn>
              <Btn disabled={remaining < 0} onClick={() => toast("تخصیص موجودی ذخیره و مجموع‌ها به‌روزرسانی شد")}><I.check width={16} /> ذخیره تخصیص</Btn>
            </div>
          </Glass>

          <Glass className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-bold text-strong">تاریخچه حرکت موجودی</h3>
              <Badge tone="brand">تاریخچه هرگز حذف نمی‌شود</Badge>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="text-muted">
                  <th className="p-2.5 text-right font-medium">محصول</th>
                  <th className="p-2.5 text-right font-medium">نوع</th>
                  <th className="p-2.5 text-center font-medium">تعداد</th>
                  <th className="p-2.5 text-right font-medium">انبار</th>
                  <th className="p-2.5 text-right font-medium">کاربر</th>
                  <th className="p-2.5 text-right font-medium">تاریخ</th>
                </tr></thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-t border-white/8 hover:bg-white/5">
                      <td className="p-2.5 font-medium text-strong">{m.product}</td>
                      <td className="p-2.5"><Badge tone={typeTone[m.type]}>{m.type}</Badge></td>
                      <td className={`p-2.5 text-center font-bold ${m.qty > 0 ? "text-emerald-500" : "text-rose-500"}`}>{m.qty > 0 ? "+" : ""}{faNumber(m.qty)}</td>
                      <td className="p-2.5 text-muted">{m.warehouse}</td>
                      <td className="p-2.5 text-muted">{m.user}</td>
                      <td className="p-2.5 text-muted">{m.date} • {m.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Glass>
        </div>
      </div>
    </div>
  );
}
