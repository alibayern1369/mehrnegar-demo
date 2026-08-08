"use client";

import { useState } from "react";
import { Glass, SectionTitle, Btn, Field, Input, Select, FullPagePanel } from "../ui";
import { I } from "../icons";
import { faNumber } from "@/lib/format";
import { useApp } from "../context";
import { LabelPrinter, type LabelItem } from "../LabelPrinter";

type VarRow = { color: string; size: string; price: string; quantity: string };

const defaultCats = ["هودی و سوئیشرت", "شلوار", "تی‌شرت", "پیراهن", "لباس ورزشی", "کت و بلیزر", "مانتو", "پالتو", "دامن", "لباس مجلسی"];
const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "فری سایز"];

export function ProductCreate() {
  const { token, toast } = useApp();
  const [cats, setCats] = useState<string[]>(defaultCats);
  const [newCatOpen, setNewCatOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [saving, setSaving] = useState(false);
  const [customSize, setCustomSize] = useState("");
  const [labelOpen, setLabelOpen] = useState(false);
  const [labels, setLabels] = useState<LabelItem[]>([]);
  const [form, setForm] = useState({
    name: "", sku: "", category: defaultCats[0], brand: "کامفی فیتس",
    price: "", colorsText: "", sizes: ["M"] as string[], defaultQty: "0",
  });
  const [varRows, setVarRows] = useState<VarRow[]>([]);

  const parseColors = (text: string) =>
    text.split(/[,،\n]/).map((c) => c.trim()).filter(Boolean);

  const generateCombinations = () => {
    const colors = parseColors(form.colorsText);
    const sizes = form.sizes.length ? form.sizes : ["فری سایز"];
    if (!colors.length) { toast("حداقل یک رنگ وارد کنید", "error"); return; }
    const price = form.price;
    const qty = form.defaultQty || "0";
    const rows: VarRow[] = [];
    for (const color of colors) {
      for (const size of sizes) {
        rows.push({ color, size, price, quantity: qty });
      }
    }
    setVarRows(rows);
    toast(`${faNumber(rows.length)} ورییشن ساخته شد`);
  };

  const applyPriceAll = () => {
    const price = form.price;
    setVarRows((rows) => rows.map((r) => ({ ...r, price })));
    toast("قیمت برای همه ورییشن‌ها اعمال شد");
  };

  const applyQtyAll = () => {
    const quantity = form.defaultQty || "0";
    setVarRows((rows) => rows.map((r) => ({ ...r, quantity })));
    toast("تعداد برای همه ورییشن‌ها اعمال شد");
  };

  const toggleSize = (s: string) => {
    setForm((f) => ({
      ...f,
      sizes: f.sizes.includes(s) ? f.sizes.filter((x) => x !== s) : [...f.sizes, s],
    }));
  };

  const addCustomSize = () => {
    const s = customSize.trim();
    if (!s) return;
    setForm((f) => ({ ...f, sizes: f.sizes.includes(s) ? f.sizes : [...f.sizes, s] }));
    setCustomSize("");
  };

  const resetForm = () => {
    setForm({ name: "", sku: "", category: cats[0], brand: "کامفی فیتس", price: "", colorsText: "", sizes: ["M"], defaultQty: "0" });
    setVarRows([]);
    setCustomSize("");
  };

  const save = async () => {
    if (!form.name.trim()) { toast("نام محصول الزامی است", "error"); return; }
    if (!varRows.length) { toast("ابتدا ورییشن‌ها را بسازید", "error"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: form.name,
          sku: form.sku || undefined,
          category: form.category,
          brand: form.brand,
          price: Number(form.price) || 0,
          variations: varRows.map((r) => ({
            color: r.color,
            size: r.size,
            price: Number(r.price) || Number(form.price) || 0,
            quantity: Number(r.quantity) || 0,
          })),
        }),
      });
      const d = await res.json();
      if (!d.ok) { toast(d.error ?? "خطا", "error"); return; }

      const createdLabels: LabelItem[] = [];
      for (const v of d.variations ?? []) {
        const price = Number(v.price ?? form.price) || 0;
        for (const bc of (v.barcodes as string[] | undefined) ?? []) {
          createdLabels.push({
            productName: form.name.trim(),
            color: v.color,
            size: v.size,
            barcode: bc,
            price,
          });
        }
      }
      setLabels(createdLabels);
      resetForm();
      toast(`محصول ثبت شد — ${faNumber(d.totalUnits ?? 0)} واحد در انبار مرکزی`);
      if (createdLabels.length) setLabelOpen(true);
    } catch { toast("خطا در ذخیره", "error"); }
    finally { setSaving(false); }
  };

  const addCategory = () => {
    const name = newCatName.trim();
    if (!name || cats.includes(name)) return;
    setCats([...cats, name]);
    setForm({ ...form, category: name });
    setNewCatOpen(false);
    setNewCatName("");
    toast(`دسته‌بندی «${name}» اضافه شد`);
  };

  return (
    <div>
      <SectionTitle
        icon={<I.plus />}
        title="ثبت محصول"
        sub="عنوان، رنگ و سایز → ساخت ورییشن‌ها → ذخیره در انبار مرکزی"
        action={
          <div className="flex gap-2">
            <Btn variant="ghost" onClick={() => setNewCatOpen(true)}><I.tag width={16} /> دسته جدید</Btn>
            <Btn onClick={save} disabled={saving}>{saving ? "..." : <><I.check width={16} /> ذخیره محصول</>}</Btn>
          </div>
        }
      />

      <Glass className="p-5 space-y-4">
        <div className="rounded-2xl bg-sky-500/10 border border-sky-500/20 px-4 py-3 text-xs text-sky-600 dark:text-sky-300">
          ۱) عنوان محصول → ۲) رنگ‌ها و سایزها → ۳) ساخت خودکار ترکیب‌ها → ۴) قیمت/تعداد هر ورییشن. هر واحد بارکد یکتا می‌گیرد. موجودی اولیه فقط در <strong>انبار مرکزی</strong>.
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="عنوان محصول *"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="تی‌شرت راهین" /></Field>
          <Field label="کد SKU"><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} dir="ltr" placeholder="خودکار" /></Field>
          <Field label="دسته‌بندی">
            <div className="flex gap-2">
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="flex-1">{cats.map((c) => <option key={c}>{c}</option>)}</Select>
              <button type="button" onClick={() => setNewCatOpen(true)} className="press shrink-0 rounded-2xl glass-2 px-3 text-muted hover:text-strong"><I.plus width={16} /></button>
            </div>
          </Field>
          <Field label="برند"><Input value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} /></Field>
          <Field label="قیمت پیش‌فرض (تومان)"><Input type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} dir="ltr" /></Field>
          <Field label="تعداد پیش‌فرض هر ورییشن"><Input type="number" value={form.defaultQty} onChange={(e) => setForm({ ...form, defaultQty: e.target.value })} dir="ltr" /></Field>
        </div>

        <Field label="انتخاب رنگ‌ها (با ویرگول جدا کنید)">
          <Input value={form.colorsText} onChange={(e) => setForm({ ...form, colorsText: e.target.value })} placeholder="مشکی، سفید، سبز" />
        </Field>

        <div>
          <p className="mb-2 text-xs font-medium text-muted">انتخاب سایزها</p>
          <div className="flex flex-wrap gap-2">
            {SIZE_PRESETS.map((s) => (
              <button key={s} type="button" onClick={() => toggleSize(s)}
                className={`press rounded-full px-3 py-1.5 text-xs font-semibold ${form.sizes.includes(s) ? "grad-brand text-white" : "glass-2 text-muted"}`}>
                {s}
              </button>
            ))}
            {form.sizes.filter((s) => !SIZE_PRESETS.includes(s)).map((s) => (
              <button key={s} type="button" onClick={() => toggleSize(s)}
                className="press rounded-full px-3 py-1.5 text-xs font-semibold grad-brand text-white">{s}</button>
            ))}
          </div>
          <div className="mt-2 flex gap-2">
            <Input value={customSize} onChange={(e) => setCustomSize(e.target.value)} placeholder="سایز سفارشی..." onKeyDown={(e) => e.key === "Enter" && addCustomSize()} />
            <Btn variant="ghost" onClick={addCustomSize}><I.plus width={14} /> افزودن</Btn>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Btn variant="soft" onClick={generateCombinations}><I.refresh width={14} /> ساخت خودکار ترکیب‌ها</Btn>
          <Btn variant="ghost" onClick={applyPriceAll} disabled={!varRows.length}>یک قیمت برای همه</Btn>
          <Btn variant="ghost" onClick={applyQtyAll} disabled={!varRows.length}>یک تعداد برای همه</Btn>
        </div>

        {varRows.length > 0 && (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-[var(--modal-bg)]">
                <tr className="text-muted border-b border-white/10">
                  <th className="p-2 text-right font-medium">رنگ</th>
                  <th className="p-2 text-right font-medium">سایز</th>
                  <th className="p-2 text-right font-medium">قیمت</th>
                  <th className="p-2 text-right font-medium">تعداد</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {varRows.map((r, idx) => (
                  <tr key={`${r.color}-${r.size}-${idx}`} className="border-b border-white/5">
                    <td className="p-2"><Input value={r.color} onChange={(e) => setVarRows((rows) => rows.map((x, i) => i === idx ? { ...x, color: e.target.value } : x))} /></td>
                    <td className="p-2"><Input value={r.size} onChange={(e) => setVarRows((rows) => rows.map((x, i) => i === idx ? { ...x, size: e.target.value } : x))} /></td>
                    <td className="p-2"><Input type="number" dir="ltr" value={r.price} onChange={(e) => setVarRows((rows) => rows.map((x, i) => i === idx ? { ...x, price: e.target.value } : x))} /></td>
                    <td className="p-2"><Input type="number" dir="ltr" value={r.quantity} onChange={(e) => setVarRows((rows) => rows.map((x, i) => i === idx ? { ...x, quantity: e.target.value } : x))} /></td>
                    <td className="p-2"><button type="button" onClick={() => setVarRows((rows) => rows.filter((_, i) => i !== idx))} className="text-rose-400"><I.trash width={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="ghost" onClick={resetForm}>پاک کردن فرم</Btn>
          <Btn onClick={save} disabled={saving}>{saving ? "..." : <><I.check width={16} /> ذخیره محصول</>}</Btn>
        </div>
      </Glass>

      <FullPagePanel
        open={newCatOpen}
        onClose={() => setNewCatOpen(false)}
        title="دسته‌بندی جدید"
        footer={
          <div className="flex justify-end gap-2">
            <Btn variant="ghost" onClick={() => setNewCatOpen(false)}>انصراف</Btn>
            <Btn onClick={addCategory}><I.check width={16} /> افزودن</Btn>
          </div>
        }
      >
        <div className="mx-auto max-w-md">
          <Field label="نام دسته‌بندی">
            <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addCategory()} autoFocus />
          </Field>
        </div>
      </FullPagePanel>

      <LabelPrinter open={labelOpen} onClose={() => setLabelOpen(false)} labels={labels} title="چاپ برچسب واحدها" />
    </div>
  );
}
