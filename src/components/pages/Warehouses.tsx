"use client";

import { useState } from "react";
import { Glass, SectionTitle, Btn, Badge, Modal, Field, Input, Select } from "../ui";
import { I } from "../icons";
import { warehouses, products, movements } from "@/lib/data";
import { faNumber, tomanShort } from "@/lib/format";
import { useApp } from "../context";

export function Warehouses() {
  const { toast } = useApp();
  const [transferOpen, setTransferOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  const whStats = warehouses.map((w) => {
    const items = products.reduce((a, p) => a + (p.warehouseStock[w.id] ?? 0), 0);
    const value = products.reduce((a, p) => a + (p.warehouseStock[w.id] ?? 0) * p.purchasePrice, 0);
    return { ...w, items, value };
  });

  return (
    <div>
      <SectionTitle icon={<I.warehouse />} title="مدیریت انبارها" sub={`${faNumber(warehouses.length)} انبار فعال`}
        action={<Btn onClick={() => setTransferOpen(true)}><I.refresh width={16} /> انتقال بین انبار</Btn>} />

      <div className="stagger grid gap-4 lg:grid-cols-3">
        {whStats.map((w) => (
          <Glass key={w.id} hover className="p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl grad-brand text-white"><I.warehouse /></div>
                <div>
                  <h3 className="font-bold text-strong">{w.name}</h3>
                  <p className="text-xs text-muted">مسئول: {w.manager}</p>
                </div>
              </div>
              <Badge tone="green">فعال</Badge>
            </div>
            <p className="mt-3 text-xs leading-6 text-muted">{w.address}</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-2xl glass-2 p-3 text-center">
                <p className="text-xl font-extrabold grad-text">{faNumber(w.items)}</p>
                <p className="text-xs text-muted">تعداد کالا</p>
              </div>
              <div className="rounded-2xl glass-2 p-3 text-center">
                <p className="text-xl font-extrabold text-strong">{tomanShort(w.value)}</p>
                <p className="text-xs text-muted">ارزش موجودی (ت)</p>
              </div>
            </div>
            <Btn variant="ghost" className="mt-4 w-full" onClick={() => setActive(active === w.id ? null : w.id)}>
              <I.layers width={16} /> {active === w.id ? "بستن تاریخچه" : "تاریخچه انتقال"}
            </Btn>
            {active === w.id && (
              <div className="mt-3 space-y-2 anim-fade-up">
                {movements.filter((m) => m.warehouse.includes(w.name.replace("انبار ", "")) || m.warehouse.includes(w.name)).slice(0, 3).map((m) => (
                  <div key={m.id} className="flex items-center justify-between rounded-xl glass-2 px-3 py-2 text-xs">
                    <span className="text-strong">{m.product}</span>
                    <Badge tone={m.qty > 0 ? "green" : "red"}>{m.qty > 0 ? "+" : ""}{faNumber(m.qty)}</Badge>
                  </div>
                ))}
                {movements.filter((m) => m.warehouse.includes(w.name)).length === 0 && <p className="text-center text-xs text-muted">انتقالی ثبت نشده</p>}
              </div>
            )}
          </Glass>
        ))}
      </div>

      <Glass className="mt-5 p-5">
        <h3 className="mb-4 font-bold text-strong">موجودی تفکیکی محصولات در انبارها</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted">
                <th className="p-3 text-right font-medium">محصول</th>
                {warehouses.map((w) => <th key={w.id} className="p-3 text-center font-medium">{w.name}</th>)}
                <th className="p-3 text-center font-medium">مجموع انبار</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => {
                const t = warehouses.reduce((a, w) => a + (p.warehouseStock[w.id] ?? 0), 0);
                return (
                  <tr key={p.id} className="border-t border-white/8 transition hover:bg-white/5">
                    <td className="p-3 font-medium text-strong"><span className="ml-2">{p.emoji}</span>{p.name.split(" ").slice(0, 3).join(" ")}</td>
                    {warehouses.map((w) => <td key={w.id} className="p-3 text-center text-muted">{faNumber(p.warehouseStock[w.id] ?? 0)}</td>)}
                    <td className="p-3 text-center font-bold grad-text">{faNumber(t)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Glass>

      <Modal open={transferOpen} onClose={() => setTransferOpen(false)} title="انتقال بین انبارها">
        <div className="space-y-4">
          <Field label="محصول"><Select>{products.map((p) => <option key={p.id}>{p.name}</option>)}</Select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="از انبار"><Select>{warehouses.map((w) => <option key={w.id}>{w.name}</option>)}</Select></Field>
            <Field label="به انبار"><Select>{warehouses.slice().reverse().map((w) => <option key={w.id}>{w.name}</option>)}</Select></Field>
          </div>
          <Field label="تعداد"><Input type="number" defaultValue={5} /></Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <Btn variant="ghost" onClick={() => setTransferOpen(false)}>انصراف</Btn>
          <Btn onClick={() => { setTransferOpen(false); toast("انتقال انبار ثبت و در تاریخچه حرکت موجودی درج شد"); }}><I.check width={16} /> ثبت انتقال</Btn>
        </div>
      </Modal>
    </div>
  );
}
